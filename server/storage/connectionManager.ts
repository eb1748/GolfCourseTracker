import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { sql } from "drizzle-orm";

export interface ConnectionConfig {
  maxConnections?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableHealthCheck?: boolean;
  healthCheckInterval?: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  connectionErrors: number;
  queryCount: number;
  avgQueryTime: number;
  lastHealthCheck: Date | null;
  isHealthy: boolean;
}

export class DatabaseConnectionManager {
  private pool: any = null;
  private db: any = null;
  private connectionValid = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    idleConnections: 0,
    activeConnections: 0,
    connectionErrors: 0,
    queryCount: 0,
    avgQueryTime: 0,
    lastHealthCheck: null,
    isHealthy: false
  };
  private queryTimes: number[] = [];

  constructor(private config: ConnectionConfig = {}) {
    this.initialize();
  }

  private initialize(): void {
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL not provided, database features will be unavailable");
      return;
    }

    const dbUrl = process.env.DATABASE_URL;
    const maskedUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log("Initializing database connection pool:", maskedUrl);

    try {
      // Create connection pool optimized for high concurrency
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        // Connection pool settings for scalability
        max: this.config.maxConnections || 20, // Maximum number of connections in pool
        min: 2, // Minimum number of connections to maintain
        idleTimeoutMillis: this.config.idleTimeout || 30000, // Close idle connections after 30s
        connectionTimeoutMillis: this.config.connectionTimeout || 10000, // Timeout for new connections
        allowExitOnIdle: false, // Keep pool alive
        // Performance settings
        statement_timeout: 30000, // 30s statement timeout
        query_timeout: 25000, // 25s query timeout
        idle_in_transaction_session_timeout: 10000 // 10s idle in transaction timeout
      });

      // Set up connection event handlers for monitoring
      this.setupConnectionEventHandlers();

      this.db = drizzle(this.pool);
      console.log("✅ Database connection pool initialized successfully");

      // Start health monitoring if enabled
      if (this.config.enableHealthCheck !== false) {
        this.startHealthMonitoring();
      }

      // Perform initial connection test
      this.testConnection();
    } catch (error) {
      console.error("❌ Failed to initialize database connection pool:", error);
      this.metrics.connectionErrors++;
    }
  }

  private setupConnectionEventHandlers(): void {
    if (!this.pool) return;

    this.pool.on('connect', () => {
      this.metrics.totalConnections++;
      console.log('New database connection established');
    });

    this.pool.on('error', (err: Error) => {
      console.error('Database connection pool error:', err);
      this.metrics.connectionErrors++;
      this.connectionValid = false;
      this.metrics.isHealthy = false;
    });

    this.pool.on('remove', () => {
      this.metrics.totalConnections--;
      console.log('Database connection removed from pool');
    });
  }

  private startHealthMonitoring(): void {
    const interval = this.config.healthCheckInterval || 60000; // Default 60s

    this.healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await this.performHealthCheck();
        this.metrics.isHealthy = isHealthy;
        this.metrics.lastHealthCheck = new Date();

        if (!isHealthy) {
          console.warn("⚠️ Database health check failed");
        }
      } catch (error) {
        console.error("❌ Health check error:", error);
        this.metrics.isHealthy = false;
      }
    }, interval);
  }

  private async performHealthCheck(): Promise<boolean> {
    if (!this.db) return false;

    try {
      const startTime = Date.now();
      await this.db.execute(sql`SELECT 1 as health_check`);
      const queryTime = Date.now() - startTime;

      // Update metrics
      this.metrics.queryCount++;
      this.queryTimes.push(queryTime);

      // Keep only last 100 query times for average calculation
      if (this.queryTimes.length > 100) {
        this.queryTimes.shift();
      }

      this.metrics.avgQueryTime = this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;

      // Health check passes if query completed in reasonable time
      return queryTime < 5000; // 5 second threshold
    } catch (error) {
      this.metrics.connectionErrors++;
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.db) {
      console.log("No database client available for connection test");
      return false;
    }

    try {
      console.log("Testing database connection...");
      const startTime = Date.now();
      await this.db.execute(sql`SELECT 1 as test`);
      const queryTime = Date.now() - startTime;

      console.log(`✅ Database connection test successful (${queryTime}ms)`);
      this.connectionValid = true;
      this.metrics.isHealthy = true;
      return true;
    } catch (error) {
      console.error("❌ Database connection test failed:", error);
      this.connectionValid = false;
      this.metrics.isHealthy = false;
      this.metrics.connectionErrors++;
      return false;
    }
  }

  // Get database instance for queries
  getDatabase() {
    return this.db;
  }

  // Get connection pool instance
  getPool() {
    return this.pool;
  }

  // Check if database connection is valid
  isConnected(): boolean {
    return this.connectionValid && this.metrics.isHealthy;
  }

  // Get connection metrics for monitoring
  getMetrics(): ConnectionMetrics {
    if (this.pool) {
      this.metrics.totalConnections = this.pool.totalCount;
      this.metrics.idleConnections = this.pool.idleCount;
      this.metrics.activeConnections = this.pool.totalCount - this.pool.idleCount;
    }
    return { ...this.metrics };
  }

  // Execute query with automatic retry logic
  async executeWithRetry<T>(
    queryFn: () => Promise<T>,
    retryAttempts: number = this.config.retryAttempts || 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const startTime = Date.now();
        const result = await queryFn();
        const queryTime = Date.now() - startTime;

        // Update metrics
        this.metrics.queryCount++;
        this.queryTimes.push(queryTime);
        if (this.queryTimes.length > 100) {
          this.queryTimes.shift();
        }
        this.metrics.avgQueryTime = this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;

        return result;
      } catch (error) {
        lastError = error as Error;
        this.metrics.connectionErrors++;

        if (attempt === retryAttempts) {
          console.error(`❌ Query failed after ${retryAttempts} attempts:`, error);
          break;
        }

        // Exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`⚠️ Query attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Query failed after retries');
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    console.log("Shutting down database connection manager...");

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.pool) {
      try {
        await this.pool.end();
        console.log("✅ Database connection pool closed gracefully");
      } catch (error) {
        console.error("❌ Error closing database connection pool:", error);
      }
    }

    this.connectionValid = false;
    this.metrics.isHealthy = false;
  }
}

// Singleton instance for application-wide use
let connectionManager: DatabaseConnectionManager | null = null;

export function getConnectionManager(config?: ConnectionConfig): DatabaseConnectionManager {
  if (!connectionManager) {
    connectionManager = new DatabaseConnectionManager(config);
  }
  return connectionManager;
}

export function shutdownConnectionManager(): Promise<void> {
  if (connectionManager) {
    return connectionManager.shutdown();
  }
  return Promise.resolve();
}