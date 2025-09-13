import { 
  type User, 
  type InsertUser, 
  type GolfCourse, 
  type InsertGolfCourse,
  type UserCourseStatus,
  type InsertUserCourseStatus,
  type GolfCourseWithStatus,
  type CourseStatus,
  users,
  golfCourses,
  userCourseStatus
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
  createUser(user: InsertUser): Promise<User>;
  comparePassword(password: string, hashedPassword: string): Promise<boolean>;
  
  // Session store for authentication
  sessionStore: any;
  
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

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password with bcrypt using 12 rounds for security
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    
    const result = await db.insert(users).values({
      name: insertUser.name,
      email: insertUser.email,
      password: hashedPassword,
    }).returning();
    
    return result[0];
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
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
    // First, try to update existing status
    const existing = await this.getUserCourseStatus(insertStatus.userId, insertStatus.courseId);
    
    if (existing) {
      // Update existing record
      const result = await db.update(userCourseStatus)
        .set({ status: insertStatus.status })
        .where(and(
          eq(userCourseStatus.userId, insertStatus.userId),
          eq(userCourseStatus.courseId, insertStatus.courseId)
        ))
        .returning();
      
      return result[0];
    } else {
      // Create new record
      const result = await db.insert(userCourseStatus)
        .values({
          userId: insertStatus.userId,
          courseId: insertStatus.courseId,
          status: insertStatus.status
        })
        .returning();
      
      return result[0];
    }
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    
    // Hash the password with bcrypt using 12 rounds for security
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    
    const user: User = { 
      ...insertUser,
      password: hashedPassword, // Store the hashed password
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
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
