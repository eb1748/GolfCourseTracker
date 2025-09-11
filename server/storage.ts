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

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private courses: Map<string, GolfCourse>;
  private userCourseStatuses: Map<string, UserCourseStatus>;

  constructor() {
    this.users = new Map();
    this.courses = new Map();
    this.userCourseStatuses = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
      phone: insertCourse.phone || null
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
