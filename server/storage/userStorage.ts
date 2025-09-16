import {
  type User,
  type InsertUserForm,
  type UserPreferences,
  users
} from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import createMemoryStore from "memorystore";
import ConnectPgSimple from "connect-pg-simple";
import { eq, sql } from "drizzle-orm";
import { DatabaseConnectionManager } from "./connectionManager";

export interface IUserStorage {
  // User CRUD operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUserForm): Promise<User>;
  updateUserPreferences(userId: string, preferences: UserPreferences): Promise<User>;

  // Authentication
  comparePassword(password: string, hashedPassword: string): Promise<boolean>;
  updateUserActivity(userId: string): Promise<void>;
  updateUserLastActive(userId: string): Promise<void>;

  // Session management
  sessionStore: any;
}

export class UserStorage implements IUserStorage {
  public sessionStore: any;
  private db: any;

  constructor(private connectionManager: DatabaseConnectionManager) {
    this.db = connectionManager.getDatabase();
    this.initializeSessionStore();
  }

  private initializeSessionStore(): void {
    const MemoryStore = createMemoryStore(session);
    const PgSession = ConnectPgSimple(session);

    // Use PostgreSQL session store if database available, otherwise fallback to memory
    if (process.env.DATABASE_URL && this.connectionManager.isConnected()) {
      try {
        this.sessionStore = new PgSession({
          conString: process.env.DATABASE_URL,
          tableName: 'session', // Table name for storing sessions
          createTableIfMissing: true, // Create the session table if it doesn't exist
        });
        console.log("✅ PostgreSQL session store initialized");
      } catch (error) {
        console.warn("⚠️ Failed to create PostgreSQL session store, using memory store:", error);
        this.sessionStore = new MemoryStore({
          checkPeriod: 86400000, // prune expired entries every 24h
        });
      }
    } else {
      console.warn("⚠️ No DATABASE_URL or connection unavailable, using memory session store");
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      });
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    if (!this.db) {
      throw new Error('Database not available');
    }

    return this.connectionManager.executeWithRetry(async () => {
      const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!this.db) {
      return undefined;
    }

    return this.connectionManager.executeWithRetry(async () => {
      const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0];
    });
  }

  async createUser(insertUser: InsertUserForm): Promise<User> {
    console.log("UserStorage.createUser called with:", { email: insertUser.email, name: insertUser.name });

    if (!this.db) {
      console.error("No database client available for user creation");
      throw new Error("Database connection not available for user creation");
    }

    console.log("🔗 Using UserStorage for user creation");
    console.log("💾 Attempting direct database user creation...");

    return this.connectionManager.executeWithRetry(async () => {
      console.log("🔐 Hashing password...");

      // Hash the password with bcrypt using 12 rounds for security
      // For high-scale applications, consider using scrypt or argon2 for better security
      const hashedPassword = await bcrypt.hash(insertUser.password, 12);
      console.log("✅ Password hashed successfully");

      // Insert user with transaction safety
      const result = await this.db.insert(users).values({
        name: insertUser.name,
        email: insertUser.email,
        passwordHash: hashedPassword,
        preferences: {}, // Initialize with empty preferences object
      }).returning();

      console.log("🎉 ✅ User created successfully in PostgreSQL database!");
      console.log("📝 Created user details:", {
        id: result[0].id,
        email: result[0].email,
        name: result[0].name,
        createdAt: result[0].createdAt
      });

      return result[0];
    });
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async updateUserActivity(userId: string): Promise<void> {
    if (!this.db) {
      return;
    }

    return this.connectionManager.executeWithRetry(async () => {
      await this.db.update(users)
        .set({ lastActiveAt: new Date() })
        .where(eq(users.id, userId));
    });
  }

  async updateUserLastActive(userId: string): Promise<void> {
    try {
      await this.updateUserActivity(userId);
    } catch (error) {
      console.warn('Failed to update user last active:', error);
      // Don't throw to avoid breaking the main request
    }
  }

  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<User> {
    if (!this.db) {
      throw new Error('Database not available for preferences update');
    }

    return this.connectionManager.executeWithRetry(async () => {
      const result = await this.db.update(users)
        .set({
          preferences: preferences,
          lastActiveAt: new Date() // Update activity when preferences change
        })
        .where(eq(users.id, userId))
        .returning();

      return result[0];
    });
  }

  // Advanced user operations for scalability

  async getUserBatch(userIds: string[]): Promise<User[]> {
    if (!this.db || userIds.length === 0) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      const result = await this.db.select()
        .from(users)
        .where(sql`${users.id} = ANY(${userIds})`);
      return result;
    });
  }

  async getUsersByEmailBatch(emails: string[]): Promise<User[]> {
    if (!this.db || emails.length === 0) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      const result = await this.db.select()
        .from(users)
        .where(sql`${users.email} = ANY(${emails})`);
      return result;
    });
  }

  async getUserStats(): Promise<{ totalUsers: number; activeUsersLast30Days: number }> {
    if (!this.db) {
      return { totalUsers: 0, activeUsersLast30Days: 0 };
    }

    return this.connectionManager.executeWithRetry(async () => {
      // Get total user count
      const totalResult = await this.db.select({ count: sql`count(*)` }).from(users);
      const totalUsers = parseInt(totalResult[0]?.count || '0');

      // Get active users in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeResult = await this.db.select({ count: sql`count(*)` })
        .from(users)
        .where(sql`last_active_at >= ${thirtyDaysAgo}`);

      const activeUsersLast30Days = parseInt(activeResult[0]?.count || '0');

      return { totalUsers, activeUsersLast30Days };
    });
  }

  // User management operations for admin

  async deactivateUser(userId: string): Promise<User> {
    if (!this.db) {
      throw new Error('Database not available');
    }

    return this.connectionManager.executeWithRetry(async () => {
      // For now we just update preferences, but in a full implementation
      // you might have a separate 'active' field
      const result = await this.db.update(users)
        .set({
          preferences: { ...{}, deactivated: true },
          lastActiveAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      return result[0];
    });
  }

  async reactivateUser(userId: string): Promise<User> {
    if (!this.db) {
      throw new Error('Database not available');
    }

    return this.connectionManager.executeWithRetry(async () => {
      const result = await this.db.update(users)
        .set({
          preferences: { ...{}, deactivated: false },
          lastActiveAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      return result[0];
    });
  }

  // Health check for this storage module
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number }> {
    if (!this.db) {
      return { healthy: false, responseTime: -1 };
    }

    const startTime = Date.now();
    try {
      await this.connectionManager.executeWithRetry(async () => {
        await this.db.select().from(users).limit(1);
      });
      return { healthy: true, responseTime: Date.now() - startTime };
    } catch (error) {
      return { healthy: false, responseTime: Date.now() - startTime };
    }
  }
}

// Factory function for creating user storage instances
export function createUserStorage(connectionManager: DatabaseConnectionManager): UserStorage {
  return new UserStorage(connectionManager);
}