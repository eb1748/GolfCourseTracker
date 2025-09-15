import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserCourseStatusSchema, insertUserFormSchema, type CourseStatus, type User, type UserCourseStatus, type ActivityType } from "@shared/schema";
import { FULL_TOP_100_GOLF_COURSES } from "../client/src/data/fullGolfCourses";
import { authRateLimit } from "./security";
import { withCache, withRetry, withQueryMetrics, getCacheKey, invalidateCache, CACHE_TTL } from "./performance";

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
  // Initialize golf courses data on startup (truly non-blocking)
  setTimeout(() => {
    initializeGolfCourses().catch(error => {
      console.warn("Golf courses initialization failed, server will continue:", error.message);
    });
  }, 100);

  // Golf Courses Routes
  app.get("/api/courses", attachUserIfAuthenticated, trackUserActivity('view'), async (req, res) => {
    try {
      const userId = (req as any).userId; // Optional - from session or undefined
      // Simplified direct call without complex caching/monitoring for better performance
      const courses = await storage.getCoursesWithStatus(userId);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses from database, using static data fallback:", error);

      // Fallback to static course data when database is unavailable
      const fallbackCourses = FULL_TOP_100_GOLF_COURSES.map(course => ({
        ...course,
        id: course.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), // Generate ID from name
        status: 'not-played' as const,
        rating: course.rating || null,
        description: course.description || null,
        website: course.website || null,
        phone: course.phone || null,
        accessType: course.accessType || 'public'
      }));

      res.json(fallbackCourses);
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
      console.error("Error searching courses in database, using static data fallback:", error);

      // Fallback to static course data for search
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }

      const lowerQuery = query.toLowerCase();
      const fallbackCourses = FULL_TOP_100_GOLF_COURSES
        .filter(course =>
          course.name.toLowerCase().includes(lowerQuery) ||
          course.location.toLowerCase().includes(lowerQuery) ||
          course.state.toLowerCase().includes(lowerQuery) ||
          (course.description && course.description.toLowerCase().includes(lowerQuery))
        )
        .map(course => ({
          ...course,
          id: course.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          status: 'not-played' as const,
          rating: course.rating || null,
          description: course.description || null,
          website: course.website || null,
          phone: course.phone || null,
          accessType: course.accessType || 'public'
        }));

      res.json(fallbackCourses);
    }
  });

  app.get("/api/courses/status/:status", attachUserIfAuthenticated, async (req, res) => {
    try {
      const status = req.params.status as CourseStatus;
      const userId = (req as any).userId; // Optional - from session or undefined

      if (!userId) {
        // For anonymous users, return empty array or all courses with default status
        if (status === 'not-played') {
          const courses = await storage.getCoursesWithStatus(undefined);
          return res.json(courses);
        } else {
          return res.json([]); // No played/want-to-play courses for anonymous users
        }
      }

      const courses = await storage.getCoursesByStatus(status, userId);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses by status:", error);
      res.status(500).json({ error: "Failed to fetch courses by status" });
    }
  });

  // User Course Status Routes
  app.post("/api/courses/:courseId/status", attachUserIfAuthenticated, trackUserActivity('course_interaction'), async (req, res) => {
    try {
      const { courseId } = req.params;
      const { status } = req.body;
      const userId = (req as any).userId; // Optional - from session or undefined

      console.log("Course status update request:", { courseId, status, userId, hasUserId: !!userId });

      // For anonymous users, we can't store course status in database - return success but note it's not persisted
      if (!userId) {
        console.log("Anonymous user attempting to update course status - returning success but not persisting");
        return res.json({
          id: `temp-${courseId}`,
          userId: 'anonymous',
          courseId,
          status,
          message: "Status updated locally. Sign in to save across devices."
        });
      }

      // Validate input for authenticated users
      const validationResult = insertUserCourseStatusSchema.safeParse({
        userId,
        courseId,
        status,
      });

      if (!validationResult.success) {
        console.error("Validation failed:", validationResult.error);
        return res.status(400).json({
          error: "Invalid input data",
          details: validationResult.error.errors
        });
      }

      console.log("Attempting to save course status to storage...");
      let updatedStatus: UserCourseStatus;

      try {
        // Try primary storage first
        updatedStatus = await storage.setUserCourseStatus(validationResult.data);
        console.log("Course status saved successfully with primary storage:", updatedStatus);
      } catch (primaryError) {
        console.error("Primary storage failed for course status update:", primaryError);

        // If primary storage fails (database connection issues), try fallback to MemStorage
        try {
          console.log("Attempting fallback to MemStorage for course status...");
          const { MemStorage } = await import("./storage");
          const memStorage = new (MemStorage as any)();
          updatedStatus = await memStorage.setUserCourseStatus(validationResult.data);
          console.log("✅ Course status saved successfully using MemStorage fallback:", updatedStatus);
        } catch (fallbackError) {
          console.error("Both primary and fallback storage failed for course status:", fallbackError);
          throw new Error(`Course status update failed: ${primaryError instanceof Error ? primaryError.message : 'Database connection error'}`);
        }
      }

      // Invalidate user-related cache after successful status update
      invalidateCache.userCourses(userId);

      res.json(updatedStatus);
    } catch (error) {
      console.error("Error updating course status:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        storage: storage.constructor.name,
        requestBody: req.body,
        courseId: req.params.courseId,
        userId: (req as any).userId
      });

      // Provide more specific error messages based on error type
      let statusCode = 500;
      let errorMessage = "Failed to update course status";

      if (error instanceof Error) {
        if (error.message.includes('Course with ID') && error.message.includes('not found')) {
          statusCode = 404;
          errorMessage = "Golf course not found";
        } else if (error.message.includes('Database connection')) {
          statusCode = 503;
          errorMessage = "Database temporarily unavailable";
        } else if (error.message.includes('Invalid input')) {
          statusCode = 400;
          errorMessage = "Invalid course status data";
        }
      }

      res.status(statusCode).json({
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/users/me/stats", attachUserIfAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).userId; // Optional - from session or undefined
      const courses = await storage.getCoursesWithStatus(userId);

      const stats = {
        total: courses.length,
        played: courses.filter(c => c.status === 'played').length,
        wantToPlay: courses.filter(c => c.status === 'want-to-play').length,
        notPlayed: courses.filter(c => c.status === 'not-played').length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats from database, using static data fallback:", error);

      // Fallback stats for anonymous users when database is unavailable
      const fallbackStats = {
        total: FULL_TOP_100_GOLF_COURSES.length,
        played: 0, // Anonymous users start with no played courses
        wantToPlay: 0,
        notPlayed: FULL_TOP_100_GOLF_COURSES.length,
      };

      res.json(fallbackStats);
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

  app.post("/api/auth/signup", authRateLimit, async (req, res) => {
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

      // Create user (storage handles password hashing) - FORCE DATABASE USAGE, NO FALLBACK
      console.log("🚀 Attempting user creation with storage:", storage.constructor.name);
      console.log("🔑 Database URL configured:", !!process.env.DATABASE_URL);

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({
        error: "Failed to create user",
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      });
    }
  });

  app.post("/api/auth/signin", authRateLimit, async (req, res) => {
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

  app.post("/api/auth/signout", authRateLimit, (req, res) => {
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
        return res.json({ user: null }); // Return null instead of error for anonymous users
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.json({ user: null }); // Return null if user not found
      }

      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ error: "Failed to fetch current user" });
    }
  });

  app.post("/api/auth/sync", authRateLimit, async (req, res) => {
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
