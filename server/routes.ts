import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserCourseStatusSchema, type CourseStatus } from "@shared/schema";
import { FULL_TOP_100_GOLF_COURSES } from "../client/src/data/fullGolfCourses";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize golf courses data on startup
  await initializeGolfCourses();

  // Golf Courses Routes
  app.get("/api/courses", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const courses = await storage.getCoursesWithStatus(userId);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const userId = req.query.userId as string;
      
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

  app.get("/api/courses/status/:status", async (req, res) => {
    try {
      const status = req.params.status as CourseStatus;
      const userId = req.query.userId as string;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const courses = await storage.getCoursesByStatus(status, userId);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses by status:", error);
      res.status(500).json({ error: "Failed to fetch courses by status" });
    }
  });

  // User Course Status Routes
  app.post("/api/courses/:courseId/status", async (req, res) => {
    try {
      const { courseId } = req.params;
      const { userId, status } = req.body;

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

  app.get("/api/users/:userId/stats", async (req, res) => {
    try {
      const { userId } = req.params;
      const courses = await storage.getCoursesWithStatus(userId);
      
      const stats = {
        total: courses.length,
        played: courses.filter(c => c.status === 'played').length,
        wantToPlay: courses.filter(c => c.status === 'want-to-play').length,
        notPlayed: courses.length - courses.filter(c => c.status === 'played').length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
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
