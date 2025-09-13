import { 
  type User, 
  type InsertUser, 
  type GolfCourse, 
  type InsertGolfCourse,
  type UserCourseStatus,
  type InsertUserCourseStatus,
  type GolfCourseWithStatus,
  type CourseStatus
} from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcrypt";

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

export const storage = new MemStorage();
