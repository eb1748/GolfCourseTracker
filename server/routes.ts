import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserCourseStatusSchema, insertUserFormSchema, type CourseStatus, type User, type ActivityType } from "@shared/schema";
import { FULL_TOP_100_GOLF_COURSES } from "../client/src/data/fullGolfCourses";

// Extend session interface for TypeScript
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// Middleware to attach user ID if authenticated, but never block with 401
const attachUserIfAuthenticated = (req: any, res: any, next: any) => {
  const userId = req.session?.userId;
  if (userId) {
    req.userId = userId;
  }
  // Always continue - no 401 for unauthenticated users
  next();
};

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Activity tracking middleware for analytics
const trackUserActivity = (activityType: ActivityType) => {
  return async (req: any, res: any, next: any) => {
    try {
      if (req.session?.userId) {
        await storage.updateUserLastActive(req.session.userId);
        await storage.logUserActivity(req.session.userId, activityType);
      }
    } catch (error) {
      // Don't fail the request if activity tracking fails
      console.warn('Activity tracking failed:', error);
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize golf courses data on startup
  await initializeGolfCourses();

  // Golf Courses Routes
  app.get("/api/courses", attachUserIfAuthenticated, trackUserActivity('view'), async (req, res) => {
    try {
      const userId = (req as any).userId; // Optional - from session or undefined
      const courses = await storage.getCoursesWithStatus(userId);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/search", attachUserIfAuthenticated, trackUserActivity('view'), async (req, res) => {
    try {
      const query = req.query.q as string;
      const userId = (req as any).userId; // Optional - from session or undefined
      
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }

      const courses = await storage.searchCourses(query, userId);
      res.json(courses);
    } catch (error) {
      console.error("Error searching courses:", error);
      res.status(500).json({ error: "Failed to search courses" });
    }
  });

  app.get("/api/courses/status/:status", requireAuth, async (req, res) => {
    try {
      const status = req.params.status as CourseStatus;
      const userId = req.session.userId!;

      const courses = await storage.getCoursesByStatus(status, userId);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses by status:", error);
      res.status(500).json({ error: "Failed to fetch courses by status" });
    }
  });

  // User Course Status Routes
  app.post("/api/courses/:courseId/status", requireAuth, trackUserActivity('course_interaction'), async (req, res) => {
    try {
      const { courseId } = req.params;
      const { status } = req.body;
      const userId = req.session.userId!;

      // Validate input
      const validationResult = insertUserCourseStatusSchema.safeParse({
        userId,
        courseId,
        status,
      });

      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid input data" });
      }

      const updatedStatus = await storage.setUserCourseStatus(validationResult.data);
      res.json(updatedStatus);
    } catch (error) {
      console.error("Error updating course status:", error);
      res.status(500).json({ error: "Failed to update course status" });
    }
  });

  app.get("/api/users/me/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const courses = await storage.getCoursesWithStatus(userId);
      
      const stats = {
        total: courses.length,
        played: courses.filter(c => c.status === 'played').length,
        wantToPlay: courses.filter(c => c.status === 'want-to-play').length,
        notPlayed: courses.filter(c => c.status === 'not-played').length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // Analytics Routes (for admin/insights dashboard)
  app.get("/api/analytics/dau", requireAuth, async (req, res) => {
    try {
      const dateParam = req.query.date as string;
      const date = dateParam ? new Date(dateParam) : new Date();
      
      const dailyActiveUsers = await storage.getDailyActiveUsers(date);
      res.json({ date: date.toISOString().split('T')[0], activeUsers: dailyActiveUsers });
    } catch (error) {
      console.error("Error fetching DAU:", error);
      res.status(500).json({ error: "Failed to fetch daily active users" });
    }
  });

  app.get("/api/analytics/mau", requireAuth, async (req, res) => {
    try {
      const yearParam = req.query.year as string;
      const monthParam = req.query.month as string;
      
      const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
      const month = monthParam ? parseInt(monthParam) : new Date().getMonth() + 1;
      
      const monthlyActiveUsers = await storage.getMonthlyActiveUsers(year, month);
      res.json({ year, month, activeUsers: monthlyActiveUsers });
    } catch (error) {
      console.error("Error fetching MAU:", error);
      res.status(500).json({ error: "Failed to fetch monthly active users" });
    }
  });

  app.get("/api/analytics/activity-stats", requireAuth, async (req, res) => {
    try {
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;
      
      const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = endDateParam ? new Date(endDateParam) : new Date();
      
      const activityStats = await storage.getActivityStats(startDate, endDate);
      res.json(activityStats);
    } catch (error) {
      console.error("Error fetching activity stats:", error);
      res.status(500).json({ error: "Failed to fetch activity statistics" });
    }
  });

  // Authentication Routes
  
  // Helper function to sanitize user object (remove password hash)
  const sanitizeUser = (user: User) => {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  };

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name } = req.body;

      // Validate input using form schema
      const validationResult = insertUserFormSchema.safeParse({ email, password, name });
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid input data", details: validationResult.error.errors });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Create user (storage handles password hashing)
      const user = await storage.createUser(validationResult.data);
      
      // Set session
      req.session.userId = user.id;

      // Save session explicitly to ensure it's persisted
      req.session.save(async (err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        // Track login activity for new signup
        try {
          await storage.updateUserLastActive(user.id);
          await storage.logUserActivity(user.id, 'login');
        } catch (error) {
          console.warn('Failed to log signup activity:', error);
        }
        res.status(201).json({ user: sanitizeUser(user) });
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await storage.comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;

      // Save session explicitly to ensure it's persisted
      req.session.save(async (err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        // Track login activity
        try {
          await storage.updateUserLastActive(user.id);
          await storage.logUserActivity(user.id, 'login');
        } catch (error) {
          console.warn('Failed to log signin activity:', error);
        }
        res.json({ user: sanitizeUser(user) });
      });

    } catch (error) {
      console.error("Error signing in:", error);
      res.status(500).json({ error: "Failed to sign in" });
    }
  });

  app.post("/api/auth/signout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Failed to sign out" });
      }
      res.json({ message: "Successfully signed out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ error: "Failed to fetch current user" });
    }
  });

  app.post("/api/auth/sync", async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { courseStatuses } = req.body;

      if (!Array.isArray(courseStatuses)) {
        return res.status(400).json({ error: "Course statuses must be an array" });
      }

      // Sync each course status
      const syncResults = [];
      for (const courseStatus of courseStatuses) {
        try {
          const validationResult = insertUserCourseStatusSchema.safeParse({
            ...courseStatus,
            userId
          });

          if (validationResult.success) {
            const result = await storage.setUserCourseStatus(validationResult.data);
            syncResults.push(result);
          }
        } catch (error) {
          console.error("Error syncing course status:", courseStatus, error);
        }
      }

      res.json({ syncedCount: syncResults.length, synced: syncResults });
    } catch (error) {
      console.error("Error syncing course data:", error);
      res.status(500).json({ error: "Failed to sync course data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Initialize golf courses data
async function initializeGolfCourses() {
  try {
    const existingCourses = await storage.getAllCourses();
    if (existingCourses.length === 0) {
      console.log("Initializing golf courses data...");
      await storage.createMultipleCourses(FULL_TOP_100_GOLF_COURSES);
      console.log(`Initialized ${FULL_TOP_100_GOLF_COURSES.length} golf courses`);
    }
  } catch (error) {
    console.error("Error initializing golf courses:", error);
  }
}
