import {
  type GolfCourse,
  type InsertGolfCourse,
  type UserCourseStatus,
  type InsertUserCourseStatus,
  type GolfCourseWithStatus,
  type CourseStatus,
  golfCourses,
  userCourseStatus
} from "@shared/schema";
import { eq, sql, and, ilike, or, inArray } from "drizzle-orm";
import { DatabaseConnectionManager } from "./connectionManager";

export interface ICourseStorage {
  // Golf course CRUD operations
  getAllCourses(): Promise<GolfCourse[]>;
  getCourse(id: string): Promise<GolfCourse | undefined>;
  createCourse(course: InsertGolfCourse): Promise<GolfCourse>;
  createMultipleCourses(courses: InsertGolfCourse[]): Promise<GolfCourse[]>;
  updateCourse(id: string, course: Partial<InsertGolfCourse>): Promise<GolfCourse>;
  deleteCourse(id: string): Promise<boolean>;

  // User course status operations
  getUserCourseStatus(userId: string, courseId: string): Promise<UserCourseStatus | undefined>;
  setUserCourseStatus(status: InsertUserCourseStatus): Promise<UserCourseStatus>;
  getAllUserCourseStatuses(userId: string): Promise<UserCourseStatus[]>;
  getCoursesWithStatus(userId?: string): Promise<GolfCourseWithStatus[]>;

  // Search and filter operations
  searchCourses(query: string, userId?: string): Promise<GolfCourseWithStatus[]>;
  getCoursesByStatus(status: CourseStatus, userId: string): Promise<GolfCourseWithStatus[]>;
  getCoursesByRegion(state?: string, userId?: string): Promise<GolfCourseWithStatus[]>;
  getCoursesByRating(minRating: number, userId?: string): Promise<GolfCourseWithStatus[]>;
  getCoursesNearLocation(latitude: number, longitude: number, radiusKm: number, userId?: string): Promise<GolfCourseWithStatus[]>;
}

export class CourseStorage implements ICourseStorage {
  private db: any;

  constructor(private connectionManager: DatabaseConnectionManager) {
    this.db = connectionManager.getDatabase();
  }

  // Golf course CRUD operations

  async getAllCourses(): Promise<GolfCourse[]> {
    if (!this.db) {
      throw new Error('Database not available');
    }

    return this.connectionManager.executeWithRetry(async () => {
      return await this.db.select().from(golfCourses).orderBy(golfCourses.name);
    });
  }

  async getCourse(id: string): Promise<GolfCourse | undefined> {
    if (!this.db) {
      return undefined;
    }

    return this.connectionManager.executeWithRetry(async () => {
      const result = await this.db.select().from(golfCourses).where(eq(golfCourses.id, id)).limit(1);
      return result[0];
    });
  }

  async createCourse(insertCourse: InsertGolfCourse): Promise<GolfCourse> {
    if (!this.db) {
      throw new Error('Database not available');
    }

    return this.connectionManager.executeWithRetry(async () => {
      const result = await this.db.insert(golfCourses).values({
        name: insertCourse.name,
        location: insertCourse.location,
        state: insertCourse.state,
        latitude: insertCourse.latitude,
        longitude: insertCourse.longitude,
        rating: insertCourse.rating || null,
        description: insertCourse.description || null,
        website: insertCourse.website || null,
        phone: insertCourse.phone || null,
        accessType: insertCourse.accessType || 'public'
      }).returning();

      return result[0];
    });
  }

  async createMultipleCourses(insertCourses: InsertGolfCourse[]): Promise<GolfCourse[]> {
    if (!this.db || insertCourses.length === 0) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      const coursesToInsert = insertCourses.map(course => ({
        name: course.name,
        location: course.location,
        state: course.state,
        latitude: course.latitude,
        longitude: course.longitude,
        rating: course.rating || null,
        description: course.description || null,
        website: course.website || null,
        phone: course.phone || null,
        accessType: course.accessType || 'public'
      }));

      // For very large batches, consider chunking
      if (coursesToInsert.length > 1000) {
        const results: GolfCourse[] = [];
        const chunkSize = 500;

        for (let i = 0; i < coursesToInsert.length; i += chunkSize) {
          const chunk = coursesToInsert.slice(i, i + chunkSize);
          const chunkResult = await this.db.insert(golfCourses).values(chunk).returning();
          results.push(...chunkResult);
        }

        return results;
      }

      return await this.db.insert(golfCourses).values(coursesToInsert).returning();
    });
  }

  async updateCourse(id: string, course: Partial<InsertGolfCourse>): Promise<GolfCourse> {
    if (!this.db) {
      throw new Error('Database not available');
    }

    return this.connectionManager.executeWithRetry(async () => {
      const result = await this.db.update(golfCourses)
        .set(course)
        .where(eq(golfCourses.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error(`Course with ID ${id} not found`);
      }

      return result[0];
    });
  }

  async deleteCourse(id: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not available');
    }

    return this.connectionManager.executeWithRetry(async () => {
      // First delete all user course statuses for this course
      await this.db.delete(userCourseStatus).where(eq(userCourseStatus.courseId, id));

      // Then delete the course
      const result = await this.db.delete(golfCourses).where(eq(golfCourses.id, id));
      return result.changes > 0;
    });
  }

  // User course status operations

  async getUserCourseStatus(userId: string, courseId: string): Promise<UserCourseStatus | undefined> {
    if (!this.db) {
      return undefined;
    }

    return this.connectionManager.executeWithRetry(async () => {
      const result = await this.db.select()
        .from(userCourseStatus)
        .where(and(
          eq(userCourseStatus.userId, userId),
          eq(userCourseStatus.courseId, courseId)
        ))
        .limit(1);

      return result[0];
    });
  }

  async setUserCourseStatus(insertStatus: InsertUserCourseStatus): Promise<UserCourseStatus> {
    console.log("CourseStorage.setUserCourseStatus called with:", insertStatus);

    if (!this.db) {
      throw new Error("Database connection not available for course status update");
    }

    return this.connectionManager.executeWithRetry(async () => {
      // Validate that the course exists before setting status
      const courseExists = await this.db.select({ id: golfCourses.id })
        .from(golfCourses)
        .where(eq(golfCourses.id, insertStatus.courseId))
        .limit(1);

      if (courseExists.length === 0) {
        console.error("Course not found:", insertStatus.courseId);
        throw new Error(`Course with ID ${insertStatus.courseId} not found`);
      }

      // Use atomic upsert to handle concurrent requests safely
      const result = await this.db.insert(userCourseStatus)
        .values({
          userId: insertStatus.userId,
          courseId: insertStatus.courseId,
          status: insertStatus.status
        })
        .onConflictDoUpdate({
          target: [userCourseStatus.userId, userCourseStatus.courseId],
          set: {
            status: insertStatus.status,
            updatedAt: new Date()
          }
        })
        .returning();

      console.log("CourseStorage.setUserCourseStatus successful:", result[0]);
      return result[0];
    });
  }

  async getAllUserCourseStatuses(userId: string): Promise<UserCourseStatus[]> {
    if (!this.db) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      return await this.db.select()
        .from(userCourseStatus)
        .where(eq(userCourseStatus.userId, userId))
        .orderBy(userCourseStatus.updatedAt);
    });
  }

  async getCoursesWithStatus(userId?: string): Promise<GolfCourseWithStatus[]> {
    if (!this.db) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      const courses = await this.getAllCourses();

      if (!userId) {
        return courses.map(course => ({ ...course, status: 'not-played' as CourseStatus }));
      }

      const userStatuses = await this.getAllUserCourseStatuses(userId);
      const statusMap = new Map(
        userStatuses.map(status => [status.courseId, status.status as CourseStatus])
      );

      return courses.map(course => ({
        ...course,
        status: statusMap.get(course.id) || 'not-played'
      }));
    });
  }

  // Search and filter operations

  async searchCourses(query: string, userId?: string): Promise<GolfCourseWithStatus[]> {
    if (!this.db) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      const lowerQuery = `%${query.toLowerCase()}%`;

      // Optimized search query with indexes
      const matchingCourses = await this.db.select()
        .from(golfCourses)
        .where(
          or(
            ilike(golfCourses.name, lowerQuery),
            ilike(golfCourses.location, lowerQuery),
            ilike(golfCourses.state, lowerQuery),
            ilike(golfCourses.description, lowerQuery)
          )
        )
        .orderBy(golfCourses.rating); // Order by rating for relevance

      if (!userId) {
        return matchingCourses.map(course => ({ ...course, status: 'not-played' as CourseStatus }));
      }

      const userStatuses = await this.getAllUserCourseStatuses(userId);
      const statusMap = new Map(
        userStatuses.map(status => [status.courseId, status.status as CourseStatus])
      );

      return matchingCourses.map(course => ({
        ...course,
        status: statusMap.get(course.id) || 'not-played'
      }));
    });
  }

  async getCoursesByStatus(status: CourseStatus, userId: string): Promise<GolfCourseWithStatus[]> {
    if (!this.db) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      // Get user statuses for the specified status
      const statusRows = await this.db.select()
        .from(userCourseStatus)
        .where(and(
          eq(userCourseStatus.userId, userId),
          eq(userCourseStatus.status, status)
        ));

      if (statusRows.length === 0) {
        return [];
      }

      const courseIds = statusRows.map(row => row.courseId);

      // Get the courses with the specified status
      const courses = await this.db.select()
        .from(golfCourses)
        .where(inArray(golfCourses.id, courseIds))
        .orderBy(golfCourses.name);

      return courses.map(course => ({
        ...course,
        status: status
      }));
    });
  }

  async getCoursesByRegion(state?: string, userId?: string): Promise<GolfCourseWithStatus[]> {
    if (!this.db) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      let coursesQuery = this.db.select().from(golfCourses);

      if (state) {
        coursesQuery = coursesQuery.where(eq(golfCourses.state, state));
      }

      const courses = await coursesQuery.orderBy(golfCourses.rating);

      if (!userId) {
        return courses.map(course => ({ ...course, status: 'not-played' as CourseStatus }));
      }

      const userStatuses = await this.getAllUserCourseStatuses(userId);
      const statusMap = new Map(
        userStatuses.map(status => [status.courseId, status.status as CourseStatus])
      );

      return courses.map(course => ({
        ...course,
        status: statusMap.get(course.id) || 'not-played'
      }));
    });
  }

  async getCoursesByRating(minRating: number, userId?: string): Promise<GolfCourseWithStatus[]> {
    if (!this.db) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      const courses = await this.db.select()
        .from(golfCourses)
        .where(sql`rating >= ${minRating}`)
        .orderBy(sql`rating DESC`);

      if (!userId) {
        return courses.map(course => ({ ...course, status: 'not-played' as CourseStatus }));
      }

      const userStatuses = await this.getAllUserCourseStatuses(userId);
      const statusMap = new Map(
        userStatuses.map(status => [status.courseId, status.status as CourseStatus])
      );

      return courses.map(course => ({
        ...course,
        status: statusMap.get(course.id) || 'not-played'
      }));
    });
  }

  // Geospatial search for courses near a location
  async getCoursesNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number,
    userId?: string
  ): Promise<GolfCourseWithStatus[]> {
    if (!this.db) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      // Using Haversine formula for distance calculation
      // This is a simplified version - for production scale, consider PostGIS
      const courses = await this.db.select()
        .from(golfCourses)
        .where(sql`
          (6371 * acos(
            cos(radians(${latitude})) *
            cos(radians(latitude)) *
            cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) *
            sin(radians(latitude))
          )) <= ${radiusKm}
        `)
        .orderBy(sql`
          (6371 * acos(
            cos(radians(${latitude})) *
            cos(radians(latitude)) *
            cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) *
            sin(radians(latitude))
          ))
        `);

      if (!userId) {
        return courses.map(course => ({ ...course, status: 'not-played' as CourseStatus }));
      }

      const userStatuses = await this.getAllUserCourseStatuses(userId);
      const statusMap = new Map(
        userStatuses.map(status => [status.courseId, status.status as CourseStatus])
      );

      return courses.map(course => ({
        ...course,
        status: statusMap.get(course.id) || 'not-played'
      }));
    });
  }

  // Batch operations for performance

  async getUserCourseStatusBatch(userId: string, courseIds: string[]): Promise<Map<string, CourseStatus>> {
    if (!this.db || courseIds.length === 0) {
      return new Map();
    }

    return this.connectionManager.executeWithRetry(async () => {
      const statuses = await this.db.select()
        .from(userCourseStatus)
        .where(and(
          eq(userCourseStatus.userId, userId),
          inArray(userCourseStatus.courseId, courseIds)
        ));

      return new Map(
        statuses.map(status => [status.courseId, status.status as CourseStatus])
      );
    });
  }

  async getCoursesBatch(courseIds: string[]): Promise<GolfCourse[]> {
    if (!this.db || courseIds.length === 0) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      return await this.db.select()
        .from(golfCourses)
        .where(inArray(golfCourses.id, courseIds));
    });
  }

  // Analytics and reporting

  async getCourseStats(): Promise<{
    totalCourses: number;
    coursesByState: { state: string; count: number }[];
    averageRating: number;
  }> {
    if (!this.db) {
      return { totalCourses: 0, coursesByState: [], averageRating: 0 };
    }

    return this.connectionManager.executeWithRetry(async () => {
      // Total courses
      const totalResult = await this.db.select({ count: sql`count(*)` }).from(golfCourses);
      const totalCourses = parseInt(totalResult[0]?.count || '0');

      // Courses by state
      const stateResult = await this.db.select({
        state: golfCourses.state,
        count: sql<number>`count(*)`.as('count')
      })
        .from(golfCourses)
        .groupBy(golfCourses.state)
        .orderBy(sql`count DESC`);

      const coursesByState = stateResult.map(row => ({
        state: row.state,
        count: row.count
      }));

      // Average rating
      const ratingResult = await this.db.select({
        avgRating: sql<number>`avg(rating)`.as('avgRating')
      }).from(golfCourses).where(sql`rating IS NOT NULL`);

      const averageRating = parseFloat(ratingResult[0]?.avgRating?.toString() || '0');

      return { totalCourses, coursesByState, averageRating };
    });
  }

  // Health check for this storage module
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; courseCount: number }> {
    if (!this.db) {
      return { healthy: false, responseTime: -1, courseCount: 0 };
    }

    const startTime = Date.now();
    try {
      const result = await this.connectionManager.executeWithRetry(async () => {
        const countResult = await this.db.select({ count: sql`count(*)` }).from(golfCourses);
        return parseInt(countResult[0]?.count || '0');
      });

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
        courseCount: result
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        courseCount: 0
      };
    }
  }
}

// Factory function for creating course storage instances
export function createCourseStorage(connectionManager: DatabaseConnectionManager): CourseStorage {
  return new CourseStorage(connectionManager);
}