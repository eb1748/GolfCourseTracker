import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import {
  corsConfig,
  helmetConfig,
  apiRateLimit,
  validateContentType,
  validateRequestSize,
  secureHeaders
} from "./security";

const app = express();

// Security middleware - temporarily disabled for Railway debugging
// TODO: Re-enable with Railway-compatible CORS config
// if (process.env.NODE_ENV === 'production') {
//   app.use(secureHeaders);
//   app.use(helmetConfig);
//   app.use(corsConfig);
// }

// Request parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Input validation middleware
app.use(validateContentType);
app.use(validateRequestSize);

// General API rate limiting
app.use('/api', apiRateLimit);

// Trust proxy for Railway deployment - properly configure for Railway's reverse proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy (Railway's load balancer)
} else {
  app.set('trust proxy', 'loopback'); // Trust only local connections in development
}

// Session middleware configuration with enhanced security
app.use(session({
  store: storage.sessionStore,
  secret: (() => {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET environment variable is required in production');
      }
      console.warn('⚠️  Using default session secret in development - set SESSION_SECRET for production');
      return 'dev-secret-for-local-testing-only';
    }
    return secret;
  })(),
  resave: false,
  saveUninitialized: false,
  name: 'golf-session',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Enable secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

  // Add health check endpoint for Railway
  app.get('/health', (req, res) => {
    console.log("Health check requested");
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Add root endpoint debugging
  app.get('/', (req, res, next) => {
    console.log("Root request received:", {
      method: req.method,
      url: req.url,
      headers: Object.keys(req.headers),
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin')
    });
    next();
  });

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Only send response if not already sent
    if (!res.headersSent) {
      res.status(status).json({ message });
    }

    // Log error but don't throw in production to avoid crashing
    if (process.env.NODE_ENV === 'production') {
      console.error('Error handled:', err);
    } else {
      throw err;
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  console.log("Server environment check:");
  console.log("- NODE_ENV:", process.env.NODE_ENV);
  console.log("- app.get('env'):", app.get("env"));

  if (app.get("env") === "development") {
    console.log("Setting up Vite development server");
    await setupVite(app, server);
  } else {
    console.log("Setting up static file serving for production");
    serveStatic(app);
  }

  // Railway debugging - log all environment info
  console.log("Railway environment debug:");
  console.log("- PORT env var:", process.env.PORT);
  console.log("- All env vars containing 'PORT':", Object.keys(process.env).filter(k => k.includes('PORT')).map(k => `${k}=${process.env[k]}`));
  console.log("- Railway specific vars:", {
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME,
    RAILWAY_PROJECT_NAME: process.env.RAILWAY_PROJECT_NAME
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = process.env.NODE_ENV === 'production' ? "0.0.0.0" : "localhost";

  console.log("Final server config:");
  console.log("- Port:", port);
  console.log("- Host:", host);

  server.listen(port, host, () => {
    log(`serving on ${host}:${port}`);
  });
})();
