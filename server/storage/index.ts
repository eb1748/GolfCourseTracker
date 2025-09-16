// Unified storage module for Golf Course Tracker
// This index file provides a clean API for accessing all storage functionality
// Optimized for scalability with millions of users

import {
  DatabaseConnectionManager,
  getConnectionManager,
  shutdownConnectionManager,
  type ConnectionConfig,
  type ConnectionMetrics
} from "./connectionManager";

import {
  UserStorage,
  createUserStorage,
  type IUserStorage
} from "./userStorage";

import {
  CourseStorage,
  createCourseStorage,
  type ICourseStorage
} from "./courseStorage";

import {
  AnalyticsStorage,
  createAnalyticsStorage,
  type IAnalyticsStorage
} from "./analyticsStorage";

// Legacy compatibility - maintain interface from original storage.ts
import {
  type User,
  type InsertUserForm,
  type UserPreferences,
  type GolfCourse,
  type InsertGolfCourse,
  type UserCourseStatus,
  type InsertUserCourseStatus,
  type GolfCourseWithStatus,
  type CourseStatus,
  type ActivityType
} from "@shared/schema";

// Main storage interface that combines all sub-storage modules
export interface IStorage extends IUserStorage, ICourseStorage, IAnalyticsStorage {
  // Connection management
  isConnected(): boolean;
  getMetrics(): ConnectionMetrics;
  shutdown(): Promise<void>;

  // Health checks for all modules
  healthCheckAll(): Promise<{
    user: { healthy: boolean; responseTime: number };
    course: { healthy: boolean; responseTime: number; courseCount: number };
    analytics: { healthy: boolean; responseTime: number; totalActivities: number };
    connection: ConnectionMetrics;
  }>;
}

// Unified storage implementation
export class UnifiedStorage implements IStorage {
  private connectionManager: DatabaseConnectionManager;
  private userStorage: UserStorage;
  private courseStorage: CourseStorage;
  private analyticsStorage: AnalyticsStorage;

  // Session store for compatibility
  public sessionStore: any;

  constructor(config?: ConnectionConfig) {
    this.connectionManager = getConnectionManager(config);
    this.userStorage = createUserStorage(this.connectionManager);
    this.courseStorage = createCourseStorage(this.connectionManager);
    this.analyticsStorage = createAnalyticsStorage(this.connectionManager);

    // Expose session store from user storage for compatibility
    this.sessionStore = this.userStorage.sessionStore;
  }

  // Connection management methods
  isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  getMetrics(): ConnectionMetrics {
    return this.connectionManager.getMetrics();
  }

  async shutdown(): Promise<void> {
    return this.connectionManager.shutdown();
  }

  // User storage methods - delegate to userStorage
  async getUser(id: string): Promise<User | undefined> {
    return this.userStorage.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userStorage.getUserByEmail(email);
  }

  async createUser(user: InsertUserForm): Promise<User> {
    const newUser = await this.userStorage.createUser(user);

    // Log initial signup activity
    try {
      await this.analyticsStorage.logUserActivity(newUser.id, 'login');
    } catch (error) {
      console.warn('Failed to log initial signup activity:', error);
    }

    return newUser;
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return this.userStorage.comparePassword(password, hashedPassword);
  }

  async updateUserActivity(userId: string): Promise<void> {
    await this.userStorage.updateUserActivity(userId);
    // Also log the activity for analytics
    try {
      await this.analyticsStorage.logUserActivity(userId, 'login');
    } catch (error) {
      console.warn('Failed to log user activity for analytics:', error);
    }
  }

  async updateUserLastActive(userId: string): Promise<void> {
    return this.userStorage.updateUserLastActive(userId);
  }

  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<User> {
    return this.userStorage.updateUserPreferences(userId, preferences);
  }

  // Course storage methods - delegate to courseStorage
  async getAllCourses(): Promise<GolfCourse[]> {
    return this.courseStorage.getAllCourses();
  }

  async getCourse(id: string): Promise<GolfCourse | undefined> {
    return this.courseStorage.getCourse(id);
  }

  async createCourse(course: InsertGolfCourse): Promise<GolfCourse> {
    return this.courseStorage.createCourse(course);
  }

  async createMultipleCourses(courses: InsertGolfCourse[]): Promise<GolfCourse[]> {
    return this.courseStorage.createMultipleCourses(courses);
  }

  async getUserCourseStatus(userId: string, courseId: string): Promise<UserCourseStatus | undefined> {
    return this.courseStorage.getUserCourseStatus(userId, courseId);
  }

  async setUserCourseStatus(status: InsertUserCourseStatus): Promise<UserCourseStatus> {
    const result = await this.courseStorage.setUserCourseStatus(status);

    // Log course interaction for analytics
    try {
      await this.analyticsStorage.logUserActivity(status.userId, 'course_interaction');
    } catch (error) {
      console.warn('Failed to log course interaction for analytics:', error);
    }

    return result;
  }

  async getAllUserCourseStatuses(userId: string): Promise<UserCourseStatus[]> {
    return this.courseStorage.getAllUserCourseStatuses(userId);
  }

  async getCoursesWithStatus(userId?: string): Promise<GolfCourseWithStatus[]> {
    const result = await this.courseStorage.getCoursesWithStatus(userId);

    // Log view activity for analytics if user is provided
    if (userId) {
      try {
        await this.analyticsStorage.logUserActivity(userId, 'view');
      } catch (error) {
        console.warn('Failed to log view activity for analytics:', error);
      }
    }

    return result;
  }

  async searchCourses(query: string, userId?: string): Promise<GolfCourseWithStatus[]> {
    const result = await this.courseStorage.searchCourses(query, userId);

    // Log view activity for analytics if user is provided
    if (userId) {
      try {
        await this.analyticsStorage.logUserActivity(userId, 'view');
      } catch (error) {
        console.warn('Failed to log view activity for analytics:', error);
      }
    }

    return result;
  }

  async getCoursesByStatus(status: CourseStatus, userId: string): Promise<GolfCourseWithStatus[]> {
    const result = await this.courseStorage.getCoursesByStatus(status, userId);

    // Log view activity for analytics
    try {
      await this.analyticsStorage.logUserActivity(userId, 'view');
    } catch (error) {
      console.warn('Failed to log view activity for analytics:', error);
    }

    return result;
  }

  // Analytics storage methods - delegate to analyticsStorage
  async logUserActivity(userId: string, activityType: ActivityType): Promise<void> {
    return this.analyticsStorage.logUserActivity(userId, activityType);
  }

  async getDailyActiveUsers(date: Date): Promise<number> {
    return this.analyticsStorage.getDailyActiveUsers(date);
  }

  async getMonthlyActiveUsers(year: number, month: number): Promise<number> {
    return this.analyticsStorage.getMonthlyActiveUsers(year, month);
  }

  async getActivityStats(startDate: Date, endDate: Date): Promise<{ date: string; activeUsers: number }[]> {
    return this.analyticsStorage.getActivityStats(startDate, endDate);
  }

  // Enhanced methods that leverage multiple storage modules
  async getUserDashboardData(userId: string): Promise<{
    user: User;
    courseStats: {
      played: number;
      wantToPlay: number;
      notPlayed: number;
      totalCourses: number;
    };
    recentActivity: {
      lastActiveDate: string | null;
      totalSessions: number;
      courseInteractions: number;
    };
  }> {
    // Get user data
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get course status stats
    const userStatuses = await this.getAllUserCourseStatuses(userId);
    const totalCourses = (await this.getAllCourses()).length;

    const courseStats = {
      played: userStatuses.filter(s => s.status === 'played').length,
      wantToPlay: userStatuses.filter(s => s.status === 'want-to-play').length,
      notPlayed: totalCourses - userStatuses.length,
      totalCourses
    };

    // Get user engagement metrics
    const recentActivity = await this.analyticsStorage.getUserEngagementMetrics(userId, 30);

    return {
      user,
      courseStats,
      recentActivity
    };
  }

  // Health check for all modules
  async healthCheckAll(): Promise<{
    user: { healthy: boolean; responseTime: number };
    course: { healthy: boolean; responseTime: number; courseCount: number };
    analytics: { healthy: boolean; responseTime: number; totalActivities: number };
    connection: ConnectionMetrics;
  }> {
    const [userHealth, courseHealth, analyticsHealth] = await Promise.all([
      this.userStorage.healthCheck(),
      this.courseStorage.healthCheck(),
      this.analyticsStorage.healthCheck()
    ]);

    return {
      user: userHealth,
      course: courseHealth,
      analytics: analyticsHealth,
      connection: this.getMetrics()
    };
  }

  // Advanced batch operations for high performance
  async getUsersWithCourseStats(userIds: string[]): Promise<Map<string, {
    user: User;
    playedCount: number;
    wantToPlayCount: number;
  }>> {
    if (userIds.length === 0) {
      return new Map();
    }

    // Get users in batch
    const users = await this.userStorage.getUserBatch(userIds);
    const userMap = new Map(users.map(u => [u.id, u]));

    // Get course statuses for all users
    const results = new Map();

    for (const userId of userIds) {
      const user = userMap.get(userId);
      if (user) {
        const statuses = await this.getAllUserCourseStatuses(userId);
        results.set(userId, {
          user,
          playedCount: statuses.filter(s => s.status === 'played').length,
          wantToPlayCount: statuses.filter(s => s.status === 'want-to-play').length
        });
      }
    }

    return results;
  }

  // System administration methods
  async getSystemOverview(): Promise<{
    connection: ConnectionMetrics;
    health: {
      user: { healthy: boolean; responseTime: number };
      course: { healthy: boolean; responseTime: number; courseCount: number };
      analytics: { healthy: boolean; responseTime: number; totalActivities: number };
    };
    metrics: {
      totalUsers: number;
      activeUsersToday: number;
      activeUsersThisWeek: number;
      activeUsersThisMonth: number;
      totalActivities: number;
      avgActivitiesPerUser: number;
    };
  }> {
    const [health, metrics] = await Promise.all([
      this.healthCheckAll(),
      this.analyticsStorage.getSystemMetrics()
    ]);

    return {
      connection: health.connection,
      health: {
        user: health.user,
        course: health.course,
        analytics: health.analytics
      },
      metrics
    };
  }
}

// Singleton instance for application use
let storageInstance: UnifiedStorage | null = null;

// Factory function to get storage instance
export function getStorage(config?: ConnectionConfig): UnifiedStorage {
  if (!storageInstance) {
    storageInstance = new UnifiedStorage(config);
  }
  return storageInstance;
}

// Graceful shutdown function
export async function shutdownStorage(): Promise<void> {
  if (storageInstance) {
    await storageInstance.shutdown();
    storageInstance = null;
  }
  return shutdownConnectionManager();
}

// Export all types and classes for advanced usage
export {
  DatabaseConnectionManager,
  UserStorage,
  CourseStorage,
  AnalyticsStorage,
  type IUserStorage,
  type ICourseStorage,
  type IAnalyticsStorage,
  type ConnectionConfig,
  type ConnectionMetrics
};

// Legacy memory storage fallback for compatibility
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcrypt";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private courses: Map<string, GolfCourse>;
  private userCourseStatuses: Map<string, UserCourseStatus>;
  public sessionStore: any;

  constructor() {
    this.users = new Map();
    this.courses = new Map();
    this.userCourseStatuses = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  isConnected(): boolean { return true; }
  getMetrics(): ConnectionMetrics {
    return {
      totalConnections: 1,
      idleConnections: 0,
      activeConnections: 1,
      connectionErrors: 0,
      queryCount: 0,
      avgQueryTime: 0,
      lastHealthCheck: new Date(),
      isHealthy: true
    };
  }
  async shutdown(): Promise<void> {}

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async createUser(insertUser: InsertUserForm): Promise<User> {
    const id = Math.random().toString(36).substr(2, 9);
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    const user: User = {
      id,
      email: insertUser.email,
      name: insertUser.name,
      passwordHash: hashedPassword,
      preferences: {},
      createdAt: new Date(),
      lastActiveAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async updateUserActivity(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.lastActiveAt = new Date();
      this.users.set(userId, user);
    }
  }

  async updateUserLastActive(userId: string): Promise<void> {
    await this.updateUserActivity(userId);
  }

  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    user.preferences = preferences;
    user.lastActiveAt = new Date();
    this.users.set(userId, user);
    return user;
  }

  async getAllCourses(): Promise<GolfCourse[]> {
    return Array.from(this.courses.values());
  }

  async getCourse(id: string): Promise<GolfCourse | undefined> {
    return this.courses.get(id);
  }

  async createCourse(course: InsertGolfCourse): Promise<GolfCourse> {
    const id = Math.random().toString(36).substr(2, 9);
    const newCourse: GolfCourse = {
      id,
      name: course.name,
      location: course.location,
      state: course.state,
      latitude: course.latitude,
      longitude: course.longitude,
      rating: course.rating || null,
      description: course.description || null,
      website: course.website || null,
      phone: course.phone || null,
      accessType: course.accessType || "public"
    };
    this.courses.set(id, newCourse);
    return newCourse;
  }

  async createMultipleCourses(courses: InsertGolfCourse[]): Promise<GolfCourse[]> {
    return Promise.all(courses.map(course => this.createCourse(course)));
  }

  async getUserCourseStatus(userId: string, courseId: string): Promise<UserCourseStatus | undefined> {
    const key = `${userId}-${courseId}`;
    return this.userCourseStatuses.get(key);
  }

  async setUserCourseStatus(status: InsertUserCourseStatus): Promise<UserCourseStatus> {
    const key = `${status.userId}-${status.courseId}`;
    const newStatus: UserCourseStatus = {
      ...status,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userCourseStatuses.set(key, newStatus);
    return newStatus;
  }

  async getAllUserCourseStatuses(userId: string): Promise<UserCourseStatus[]> {
    return Array.from(this.userCourseStatuses.values()).filter(s => s.userId === userId);
  }

  async getCoursesWithStatus(userId?: string): Promise<GolfCourseWithStatus[]> {
    const courses = Array.from(this.courses.values());
    return courses.map(course => ({
      ...course,
      status: userId ? this.getUserCourseStatus(userId, course.id) as any : null
    }));
  }

  async searchCourses(query: string, userId?: string): Promise<GolfCourseWithStatus[]> {
    const allCourses = await this.getCoursesWithStatus(userId);
    return allCourses.filter(course =>
      course.name.toLowerCase().includes(query.toLowerCase()) ||
      course.location.toLowerCase().includes(query.toLowerCase()) ||
      course.state.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getCoursesByStatus(status: CourseStatus, userId: string): Promise<GolfCourseWithStatus[]> {
    const allCourses = await this.getCoursesWithStatus(userId);
    return allCourses.filter(course => course.status && course.status.status === status);
  }

  // Analytics stubs
  async logUserActivity(userId: string, activityType: ActivityType): Promise<void> {}
  async getDailyActiveUsers(date: Date): Promise<number> { return 0; }
  async getMonthlyActiveUsers(year: number, month: number): Promise<number> { return 0; }
  async getActivityStats(startDate: Date, endDate: Date): Promise<{ date: string; activeUsers: number }[]> { return []; }

  async getUserDashboardData(userId: string) {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const userStatuses = await this.getAllUserCourseStatuses(userId);
    const totalCourses = (await this.getAllCourses()).length;

    return {
      user,
      courseStats: {
        played: userStatuses.filter(s => s.status === 'played').length,
        wantToPlay: userStatuses.filter(s => s.status === 'want-to-play').length,
        notPlayed: totalCourses - userStatuses.length,
        totalCourses
      },
      recentActivity: {
        lastActiveDate: user.lastActiveAt?.toISOString() || null,
        totalSessions: 0,
        courseInteractions: userStatuses.length
      }
    };
  }

  async healthCheckAll() {
    return {
      user: { healthy: true, responseTime: 1 },
      course: { healthy: true, responseTime: 1, courseCount: this.courses.size },
      analytics: { healthy: true, responseTime: 1, totalActivities: 0 },
      connection: this.getMetrics()
    };
  }

  async getUsersWithCourseStats(userIds: string[]) {
    const results = new Map();
    for (const userId of userIds) {
      const user = this.users.get(userId);
      if (user) {
        const statuses = await this.getAllUserCourseStatuses(userId);
        results.set(userId, {
          user,
          playedCount: statuses.filter(s => s.status === 'played').length,
          wantToPlayCount: statuses.filter(s => s.status === 'want-to-play').length
        });
      }
    }
    return results;
  }

  async getSystemOverview() {
    return {
      connection: this.getMetrics(),
      health: await this.healthCheckAll(),
      metrics: {
        totalUsers: this.users.size,
        activeUsersToday: 0,
        activeUsersThisWeek: 0,
        activeUsersThisMonth: 0,
        totalActivities: 0,
        avgActivitiesPerUser: 0
      }
    };
  }
}

// Legacy exports for backward compatibility
export { UnifiedStorage as DatabaseStorage };

// Re-export schema types for convenience
export type {
  User,
  InsertUserForm,
  UserPreferences,
  GolfCourse,
  InsertGolfCourse,
  UserCourseStatus,
  InsertUserCourseStatus,
  GolfCourseWithStatus,
  CourseStatus,
  ActivityType
} from "@shared/schema";