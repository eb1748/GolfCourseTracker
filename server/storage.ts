import { 
  type User, 
  type InsertUser,
  type InsertUserForm,
  type UserPreferences,
  type GolfCourse, 
  type InsertGolfCourse,
  type UserCourseStatus,
  type InsertUserCourseStatus,
  type UserActivityLog,
  type InsertUserActivityLog,
  type GolfCourseWithStatus,
  type CourseStatus,
  type ActivityType,
  users,
  golfCourses,
  userCourseStatus,
  userActivityLogs
} from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import ConnectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, sql, and, ilike, or } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUserForm): Promise<User>; // Now accepts form data with 'password'
  comparePassword(password: string, hashedPassword: string): Promise<boolean>;
  updateUserActivity(userId: string): Promise<void>; // Update last_active_at
  updateUserLastActive(userId: string): Promise<void>; // Alias for updateUserActivity
  updateUserPreferences(userId: string, preferences: UserPreferences): Promise<User>;
  
  // Session store for authentication
  sessionStore: any;
  
  // Analytics methods for DAU/MAU tracking (privacy-friendly)
  logUserActivity(userId: string, activityType: ActivityType): Promise<void>;
  getDailyActiveUsers(date: Date): Promise<number>;
  getMonthlyActiveUsers(year: number, month: number): Promise<number>;
  getActivityStats(startDate: Date, endDate: Date): Promise<{ date: string; activeUsers: number }[]>;
  
  // Golf course methods
  getAllCourses(): Promise<GolfCourse[]>;
  getCourse(id: string): Promise<GolfCourse | undefined>;
  createCourse(course: InsertGolfCourse): Promise<GolfCourse>;
  createMultipleCourses(courses: InsertGolfCourse[]): Promise<GolfCourse[]>;
  
  // User course status methods
  getUserCourseStatus(userId: string, courseId: string): Promise<UserCourseStatus | undefined>;
  setUserCourseStatus(status: InsertUserCourseStatus): Promise<UserCourseStatus>;
  getAllUserCourseStatuses(userId: string): Promise<UserCourseStatus[]>;
  getCoursesWithStatus(userId?: string): Promise<GolfCourseWithStatus[]>;
  
  // Search and filter methods
  searchCourses(query: string, userId?: string): Promise<GolfCourseWithStatus[]>;
  getCoursesByStatus(status: CourseStatus, userId: string): Promise<GolfCourseWithStatus[]>;
}

const MemoryStore = createMemoryStore(session);
const PgSession = ConnectPgSimple(session);

// Database connection setup
const sql_conn = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_conn);

export class DatabaseStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    // Use PostgreSQL session store instead of memory
    this.sessionStore = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session', // Table name for storing sessions
      createTableIfMissing: true, // Create the session table if it doesn't exist
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUserForm): Promise<User> {
    // Hash the password with bcrypt using 12 rounds for security
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    
    const result = await db.insert(users).values({
      name: insertUser.name,
      email: insertUser.email,
      passwordHash: hashedPassword,
      preferences: {}, // Initialize with empty preferences object
    }).returning();
    
    // Log initial signup activity
    await this.logUserActivity(result[0].id, 'login');
    
    return result[0];
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Update user's last active timestamp
  async updateUserActivity(userId: string): Promise<void> {
    await db.update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Alias for updateUserActivity for clearer naming in middleware
  async updateUserLastActive(userId: string): Promise<void> {
    try {
      await this.updateUserActivity(userId);
    } catch (error) {
      console.warn('Failed to update user last active:', error);
      // Don't throw to avoid breaking the main request
    }
  }

  // Update user preferences
  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<User> {
    const result = await db.update(users)
      .set({ 
        preferences: preferences,
        lastActiveAt: new Date() // Update activity when preferences change
      })
      .where(eq(users.id, userId))
      .returning();
    
    return result[0];
  }

  // Privacy-friendly activity logging for DAU/MAU analytics
  async logUserActivity(userId: string, activityType: 'login' | 'course_interaction' | 'view'): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    try {
      await db.insert(userActivityLogs)
        .values({
          userId,
          activityDate: today,
          activityType
        })
        .onConflictDoNothing(); // Ignore if already exists (unique constraint)
    } catch (error) {
      // Silently ignore conflicts - this is expected for duplicate activities
      console.log(`Activity already logged for user ${userId} on ${today} for ${activityType}`);
    }
  }

  // Get Daily Active Users count for a specific date
  async getDailyActiveUsers(date: Date): Promise<number> {
    const dateStr = date.toISOString().split('T')[0];
    
    const result = await db.select({ 
      count: sql<number>`COUNT(DISTINCT user_id)`.as('count')
    })
    .from(userActivityLogs)
    .where(eq(userActivityLogs.activityDate, dateStr));
    
    return result[0]?.count || 0;
  }

  // Get Monthly Active Users count for a specific month/year
  async getMonthlyActiveUsers(year: number, month: number): Promise<number> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const result = await db.select({ 
      count: sql<number>`COUNT(DISTINCT user_id)`.as('count')
    })
    .from(userActivityLogs)
    .where(and(
      sql`activity_date >= ${startDate}`,
      sql`activity_date <= ${endDate}`
    ));
    
    return result[0]?.count || 0;
  }

  // Get activity statistics for a date range (for analytics dashboard)
  async getActivityStats(startDate: Date, endDate: Date): Promise<{ date: string; activeUsers: number }[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    const result = await db.select({
      date: userActivityLogs.activityDate,
      activeUsers: sql<number>`COUNT(DISTINCT user_id)`.as('activeUsers')
    })
    .from(userActivityLogs)
    .where(and(
      sql`activity_date >= ${start}`,
      sql`activity_date <= ${end}`
    ))
    .groupBy(userActivityLogs.activityDate)
    .orderBy(userActivityLogs.activityDate);
    
    return result.map(row => ({
      date: row.date,
      activeUsers: row.activeUsers
    }));
  }

  // Golf course methods
  async getAllCourses(): Promise<GolfCourse[]> {
    return await db.select().from(golfCourses);
  }

  async getCourse(id: string): Promise<GolfCourse | undefined> {
    const result = await db.select().from(golfCourses).where(eq(golfCourses.id, id)).limit(1);
    return result[0];
  }

  async createCourse(insertCourse: InsertGolfCourse): Promise<GolfCourse> {
    const result = await db.insert(golfCourses).values({
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
  }

  async createMultipleCourses(insertCourses: InsertGolfCourse[]): Promise<GolfCourse[]> {
    if (insertCourses.length === 0) return [];
    
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
    
    return await db.insert(golfCourses).values(coursesToInsert).returning();
  }

  // User course status methods
  async getUserCourseStatus(userId: string, courseId: string): Promise<UserCourseStatus | undefined> {
    const result = await db.select()
      .from(userCourseStatus)
      .where(and(
        eq(userCourseStatus.userId, userId),
        eq(userCourseStatus.courseId, courseId)
      ))
      .limit(1);
    
    return result[0];
  }

  async setUserCourseStatus(insertStatus: InsertUserCourseStatus): Promise<UserCourseStatus> {
    // Use atomic upsert to handle concurrent requests safely
    const result = await db.insert(userCourseStatus)
      .values({
        userId: insertStatus.userId,
        courseId: insertStatus.courseId,
        status: insertStatus.status
      })
      .onConflictDoUpdate({
        target: [userCourseStatus.userId, userCourseStatus.courseId],
        set: {
          status: insertStatus.status
        }
      })
      .returning();
    
    return result[0];
  }

  async getAllUserCourseStatuses(userId: string): Promise<UserCourseStatus[]> {
    return await db.select()
      .from(userCourseStatus)
      .where(eq(userCourseStatus.userId, userId));
  }

  async getCoursesWithStatus(userId?: string): Promise<GolfCourseWithStatus[]> {
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
  }

  // Search and filter methods
  async searchCourses(query: string, userId?: string): Promise<GolfCourseWithStatus[]> {
    const lowerQuery = `%${query.toLowerCase()}%`;
    
    // First get courses matching the search query
    const matchingCourses = await db.select()
      .from(golfCourses)
      .where(
        or(
          ilike(golfCourses.name, lowerQuery),
          ilike(golfCourses.location, lowerQuery),
          ilike(golfCourses.state, lowerQuery),
          ilike(golfCourses.description, lowerQuery)
        )
      );
    
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
  }

  async getCoursesByStatus(status: CourseStatus, userId: string): Promise<GolfCourseWithStatus[]> {
    // Get user statuses first, then join with courses
    const userStatusesWithCourses = await db.select({
      id: golfCourses.id,
      name: golfCourses.name,
      location: golfCourses.location,
      state: golfCourses.state,
      latitude: golfCourses.latitude,
      longitude: golfCourses.longitude,
      rating: golfCourses.rating,
      description: golfCourses.description,
      website: golfCourses.website,
      phone: golfCourses.phone,
      accessType: golfCourses.accessType,
      status: userCourseStatus.status
    })
    .from(userCourseStatus)
    .innerJoin(golfCourses, eq(userCourseStatus.courseId, golfCourses.id))
    .where(and(
      eq(userCourseStatus.userId, userId),
      eq(userCourseStatus.status, status)
    ));

    // For 'not-played' status, we need to get courses NOT in the user's status list
    if (status === 'not-played') {
      const allCourses = await this.getAllCourses();
      const userStatuses = await this.getAllUserCourseStatuses(userId);
      const statusMap = new Set(userStatuses.map(s => s.courseId));
      
      return allCourses
        .filter(course => !statusMap.has(course.id))
        .map(course => ({ ...course, status: 'not-played' as CourseStatus }));
    }

    return userStatusesWithCourses.map(course => ({
      ...course,
      status: course.status as CourseStatus
    }));
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private courses: Map<string, GolfCourse>;
  private userCourseStatuses: Map<string, UserCourseStatus>;
  public sessionStore: any; // Using any for compatibility with different session store types

  constructor() {
    this.users = new Map();
    this.courses = new Map();
    this.userCourseStatuses = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUserForm): Promise<User> {
    const id = randomUUID();
    
    // Hash the password with bcrypt using 12 rounds for security
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    
    const user: User = { 
      id,
      name: insertUser.name,
      email: insertUser.email,
      passwordHash: hashedPassword, // Store the hashed password
      lastActiveAt: new Date(),
      preferences: {},
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Stub implementations for analytics methods (MemStorage doesn't persist analytics)
  async updateUserActivity(userId: string): Promise<void> {
    // Update user's lastActiveAt in memory
    const user = this.users.get(userId);
    if (user) {
      user.lastActiveAt = new Date();
    }
  }

  // Alias for updateUserActivity for clearer naming in middleware
  async updateUserLastActive(userId: string): Promise<void> {
    await this.updateUserActivity(userId);
  }

  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.preferences = preferences;
    user.lastActiveAt = new Date();
    return user;
  }

  async logUserActivity(userId: string, activityType: 'login' | 'course_interaction' | 'view'): Promise<void> {
    // MemStorage doesn't persist activity logs - this is a no-op
    console.log(`Activity logged: ${userId} - ${activityType}`);
  }

  async getDailyActiveUsers(date: Date): Promise<number> {
    // MemStorage can't provide meaningful analytics
    return 0;
  }

  async getMonthlyActiveUsers(year: number, month: number): Promise<number> {
    // MemStorage can't provide meaningful analytics
    return 0;
  }

  async getActivityStats(startDate: Date, endDate: Date): Promise<{ date: string; activeUsers: number }[]> {
    // MemStorage can't provide meaningful analytics
    return [];
  }

  // Golf course methods
  async getAllCourses(): Promise<GolfCourse[]> {
    return Array.from(this.courses.values());
  }

  async getCourse(id: string): Promise<GolfCourse | undefined> {
    return this.courses.get(id);
  }

  async createCourse(insertCourse: InsertGolfCourse): Promise<GolfCourse> {
    const id = randomUUID();
    const course: GolfCourse = { 
      ...insertCourse, 
      id,
      rating: insertCourse.rating || null,
      description: insertCourse.description || null,
      website: insertCourse.website || null,
      phone: insertCourse.phone || null,
      accessType: insertCourse.accessType || 'public'
    };
    this.courses.set(id, course);
    return course;
  }

  async createMultipleCourses(insertCourses: InsertGolfCourse[]): Promise<GolfCourse[]> {
    const courses: GolfCourse[] = [];
    for (const insertCourse of insertCourses) {
      const course = await this.createCourse(insertCourse);
      courses.push(course);
    }
    return courses;
  }

  // User course status methods
  async getUserCourseStatus(userId: string, courseId: string): Promise<UserCourseStatus | undefined> {
    const key = `${userId}-${courseId}`;
    return this.userCourseStatuses.get(key);
  }

  async setUserCourseStatus(insertStatus: InsertUserCourseStatus): Promise<UserCourseStatus> {
    const id = randomUUID();
    const key = `${insertStatus.userId}-${insertStatus.courseId}`;
    const status: UserCourseStatus = { ...insertStatus, id };
    this.userCourseStatuses.set(key, status);
    return status;
  }

  async getAllUserCourseStatuses(userId: string): Promise<UserCourseStatus[]> {
    return Array.from(this.userCourseStatuses.values()).filter(
      status => status.userId === userId
    );
  }

  async getCoursesWithStatus(userId?: string): Promise<GolfCourseWithStatus[]> {
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
  }

  // Search and filter methods
  async searchCourses(query: string, userId?: string): Promise<GolfCourseWithStatus[]> {
    const coursesWithStatus = await this.getCoursesWithStatus(userId);
    const lowerQuery = query.toLowerCase();
    
    return coursesWithStatus.filter(course =>
      course.name.toLowerCase().includes(lowerQuery) ||
      course.location.toLowerCase().includes(lowerQuery) ||
      course.state.toLowerCase().includes(lowerQuery) ||
      (course.description && course.description.toLowerCase().includes(lowerQuery))
    );
  }

  async getCoursesByStatus(status: CourseStatus, userId: string): Promise<GolfCourseWithStatus[]> {
    const coursesWithStatus = await this.getCoursesWithStatus(userId);
    return coursesWithStatus.filter(course => course.status === status);
  }
}

export const storage = new DatabaseStorage();
