import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "public");

  console.log("Static file serving debug:");
  console.log("- import.meta.url:", import.meta.url);
  console.log("- __dirname equivalent:", path.dirname(fileURLToPath(import.meta.url)));
  console.log("- Resolved distPath:", distPath);
  console.log("- distPath exists:", fs.existsSync(distPath));

  if (fs.existsSync(distPath)) {
    console.log("- Contents of distPath:", fs.readdirSync(distPath));
  }

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Debug all static file requests
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) {
      console.log("Static request:", req.method, req.path);
    }
    next();
  });

  app.use(express.static(distPath, {
    setHeaders: (res, path) => {
      console.log("Setting headers for static file:", path);
      // Ensure proper MIME types for key file types
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (path.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    console.log("Serving fallback index.html for:", req.path);
    const indexPath = path.resolve(distPath, "index.html");
    console.log("Index file path:", indexPath);
    console.log("Index file exists:", fs.existsSync(indexPath));

    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf-8');
      console.log("Index file size:", content.length, "bytes");
      console.log("Index file starts with:", content.substring(0, 100));
    }

    // Explicitly set Content-Type header for HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(indexPath);
  });
}
