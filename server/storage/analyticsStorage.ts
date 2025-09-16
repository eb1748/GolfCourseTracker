import {
  type UserActivityLog,
  type InsertUserActivityLog,
  type ActivityType,
  userActivityLogs,
  users,
  userCourseStatus
} from "@shared/schema";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";
import { DatabaseConnectionManager } from "./connectionManager";

export interface IAnalyticsStorage {
  // User activity tracking
  logUserActivity(userId: string, activityType: ActivityType): Promise<void>;

  // DAU/MAU analytics
  getDailyActiveUsers(date: Date): Promise<number>;
  getMonthlyActiveUsers(year: number, month: number): Promise<number>;
  getActivityStats(startDate: Date, endDate: Date): Promise<{ date: string; activeUsers: number }[]>;

  // Advanced analytics for scale
  getWeeklyActiveUsers(startDate: Date): Promise<number>;
  getUserRetention(cohortStartDate: Date, periodDays: number): Promise<{ day: number; retentionRate: number }[]>;
  getActivityTrends(days: number): Promise<{ date: string; loginCount: number; interactionCount: number; viewCount: number }[]>;

  // User engagement analytics
  getUserEngagementMetrics(userId: string, days: number): Promise<{
    totalSessions: number;
    avgSessionsPerDay: number;
    lastActiveDate: string | null;
    courseInteractions: number;
  }>;

  // System-wide analytics
  getSystemMetrics(): Promise<{
    totalUsers: number;
    activeUsersToday: number;
    activeUsersThisWeek: number;
    activeUsersThisMonth: number;
    totalActivities: number;
    avgActivitiesPerUser: number;
  }>;
}

export class AnalyticsStorage implements IAnalyticsStorage {
  private db: any;

  constructor(private connectionManager: DatabaseConnectionManager) {
    this.db = connectionManager.getDatabase();
  }

  // Privacy-friendly activity logging for DAU/MAU analytics
  async logUserActivity(userId: string, activityType: ActivityType): Promise<void> {
    if (!this.db) {
      return;
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    try {
      await this.connectionManager.executeWithRetry(async () => {
        await this.db.insert(userActivityLogs)
          .values({
            userId,
            activityDate: today,
            activityType
          })
          .onConflictDoNothing(); // Ignore if already exists (unique constraint)
      });
    } catch (error) {
      // Silently ignore conflicts - this is expected for duplicate activities
      console.log(`Activity already logged for user ${userId} on ${today} for ${activityType}`);
    }
  }

  // Get Daily Active Users count for a specific date
  async getDailyActiveUsers(date: Date): Promise<number> {
    if (!this.db) {
      return 0;
    }

    return this.connectionManager.executeWithRetry(async () => {
      const dateStr = date.toISOString().split('T')[0];

      const result = await this.db.select({
        count: sql<number>`COUNT(DISTINCT user_id)`.as('count')
      })
        .from(userActivityLogs)
        .where(eq(userActivityLogs.activityDate, dateStr));

      return result[0]?.count || 0;
    });
  }

  // Get Monthly Active Users count for a specific month/year
  async getMonthlyActiveUsers(year: number, month: number): Promise<number> {
    if (!this.db) {
      return 0;
    }

    return this.connectionManager.executeWithRetry(async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const result = await this.db.select({
        count: sql<number>`COUNT(DISTINCT user_id)`.as('count')
      })
        .from(userActivityLogs)
        .where(and(
          gte(userActivityLogs.activityDate, startDate),
          lte(userActivityLogs.activityDate, endDate)
        ));

      return result[0]?.count || 0;
    });
  }

  // Get Weekly Active Users count starting from a specific date
  async getWeeklyActiveUsers(startDate: Date): Promise<number> {
    if (!this.db) {
      return 0;
    }

    return this.connectionManager.executeWithRetry(async () => {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6); // 7 days total

      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      const result = await this.db.select({
        count: sql<number>`COUNT(DISTINCT user_id)`.as('count')
      })
        .from(userActivityLogs)
        .where(and(
          gte(userActivityLogs.activityDate, start),
          lte(userActivityLogs.activityDate, end)
        ));

      return result[0]?.count || 0;
    });
  }

  // Get activity statistics for a date range (for analytics dashboard)
  async getActivityStats(startDate: Date, endDate: Date): Promise<{ date: string; activeUsers: number }[]> {
    if (!this.db) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      const result = await this.db.select({
        date: userActivityLogs.activityDate,
        activeUsers: sql<number>`COUNT(DISTINCT user_id)`.as('activeUsers')
      })
        .from(userActivityLogs)
        .where(and(
          gte(userActivityLogs.activityDate, start),
          lte(userActivityLogs.activityDate, end)
        ))
        .groupBy(userActivityLogs.activityDate)
        .orderBy(userActivityLogs.activityDate);

      return result.map(row => ({
        date: row.date,
        activeUsers: row.activeUsers
      }));
    });
  }

  // Advanced user retention analysis
  async getUserRetention(cohortStartDate: Date, periodDays: number): Promise<{ day: number; retentionRate: number }[]> {
    if (!this.db) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      const cohortStart = cohortStartDate.toISOString().split('T')[0];
      const cohortEnd = new Date(cohortStartDate);
      cohortEnd.setDate(cohortEnd.getDate() + 1);
      const cohortEndStr = cohortEnd.toISOString().split('T')[0];

      // Get users who joined in the cohort period
      const cohortUsers = await this.db.select({
        userId: userActivityLogs.userId
      })
        .from(userActivityLogs)
        .where(and(
          gte(userActivityLogs.activityDate, cohortStart),
          lte(userActivityLogs.activityDate, cohortEndStr),
          eq(userActivityLogs.activityType, 'login')
        ))
        .groupBy(userActivityLogs.userId);

      const cohortSize = cohortUsers.length;
      if (cohortSize === 0) {
        return [];
      }

      const cohortUserIds = cohortUsers.map(u => u.userId);
      const retentionData: { day: number; retentionRate: number }[] = [];

      // Calculate retention for each day in the period
      for (let day = 1; day <= periodDays; day++) {
        const checkDate = new Date(cohortStartDate);
        checkDate.setDate(checkDate.getDate() + day);
        const checkDateStr = checkDate.toISOString().split('T')[0];

        const activeUsers = await this.db.select({
          count: sql<number>`COUNT(DISTINCT user_id)`.as('count')
        })
          .from(userActivityLogs)
          .where(and(
            eq(userActivityLogs.activityDate, checkDateStr),
            sql`user_id = ANY(${cohortUserIds})`
          ));

        const activeCount = activeUsers[0]?.count || 0;
        const retentionRate = (activeCount / cohortSize) * 100;

        retentionData.push({ day, retentionRate });
      }

      return retentionData;
    });
  }

  // Get activity trends for analytics dashboard
  async getActivityTrends(days: number): Promise<{ date: string; loginCount: number; interactionCount: number; viewCount: number }[]> {
    if (!this.db) {
      return [];
    }

    return this.connectionManager.executeWithRetry(async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      const result = await this.db.select({
        date: userActivityLogs.activityDate,
        activityType: userActivityLogs.activityType,
        count: sql<number>`COUNT(*)`.as('count')
      })
        .from(userActivityLogs)
        .where(and(
          gte(userActivityLogs.activityDate, start),
          lte(userActivityLogs.activityDate, end)
        ))
        .groupBy(userActivityLogs.activityDate, userActivityLogs.activityType)
        .orderBy(userActivityLogs.activityDate);

      // Transform data into the desired format
      const trendMap = new Map<string, { loginCount: number; interactionCount: number; viewCount: number }>();

      result.forEach(row => {
        const existing = trendMap.get(row.date) || { loginCount: 0, interactionCount: 0, viewCount: 0 };

        switch (row.activityType) {
          case 'login':
            existing.loginCount = row.count;
            break;
          case 'course_interaction':
            existing.interactionCount = row.count;
            break;
          case 'view':
            existing.viewCount = row.count;
            break;
        }

        trendMap.set(row.date, existing);
      });

      return Array.from(trendMap.entries()).map(([date, counts]) => ({
        date,
        ...counts
      })).sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  // Get user engagement metrics for a specific user
  async getUserEngagementMetrics(userId: string, days: number): Promise<{
    totalSessions: number;
    avgSessionsPerDay: number;
    lastActiveDate: string | null;
    courseInteractions: number;
  }> {
    if (!this.db) {
      return { totalSessions: 0, avgSessionsPerDay: 0, lastActiveDate: null, courseInteractions: 0 };
    }

    return this.connectionManager.executeWithRetry(async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      // Get login sessions
      const loginSessions = await this.db.select({
        count: sql<number>`COUNT(*)`.as('count')
      })
        .from(userActivityLogs)
        .where(and(
          eq(userActivityLogs.userId, userId),
          eq(userActivityLogs.activityType, 'login'),
          gte(userActivityLogs.activityDate, start),
          lte(userActivityLogs.activityDate, end)
        ));

      // Get course interactions
      const courseInteractions = await this.db.select({
        count: sql<number>`COUNT(*)`.as('count')
      })
        .from(userActivityLogs)
        .where(and(
          eq(userActivityLogs.userId, userId),
          eq(userActivityLogs.activityType, 'course_interaction'),
          gte(userActivityLogs.activityDate, start),
          lte(userActivityLogs.activityDate, end)
        ));

      // Get last active date
      const lastActive = await this.db.select({
        lastDate: sql<string>`MAX(activity_date)`.as('lastDate')
      })
        .from(userActivityLogs)
        .where(eq(userActivityLogs.userId, userId));

      const totalSessions = loginSessions[0]?.count || 0;
      const avgSessionsPerDay = totalSessions / days;
      const lastActiveDate = lastActive[0]?.lastDate || null;
      const interactions = courseInteractions[0]?.count || 0;

      return {
        totalSessions,
        avgSessionsPerDay: Math.round(avgSessionsPerDay * 100) / 100, // Round to 2 decimal places
        lastActiveDate,
        courseInteractions: interactions
      };
    });
  }

  // Get system-wide analytics metrics
  async getSystemMetrics(): Promise<{
    totalUsers: number;
    activeUsersToday: number;
    activeUsersThisWeek: number;
    activeUsersThisMonth: number;
    totalActivities: number;
    avgActivitiesPerUser: number;
  }> {
    if (!this.db) {
      return {
        totalUsers: 0,
        activeUsersToday: 0,
        activeUsersThisWeek: 0,
        activeUsersThisMonth: 0,
        totalActivities: 0,
        avgActivitiesPerUser: 0
      };
    }

    return this.connectionManager.executeWithRetry(async () => {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      const todayStr = today.toISOString().split('T')[0];
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      const monthAgoStr = monthAgo.toISOString().split('T')[0];

      // Total users
      const totalUsersResult = await this.db.select({
        count: sql<number>`COUNT(*)`.as('count')
      }).from(users);

      // Active users today
      const activeUsersToday = await this.getDailyActiveUsers(today);

      // Active users this week
      const activeUsersThisWeekResult = await this.db.select({
        count: sql<number>`COUNT(DISTINCT user_id)`.as('count')
      })
        .from(userActivityLogs)
        .where(gte(userActivityLogs.activityDate, weekAgoStr));

      // Active users this month
      const activeUsersThisMonthResult = await this.db.select({
        count: sql<number>`COUNT(DISTINCT user_id)`.as('count')
      })
        .from(userActivityLogs)
        .where(gte(userActivityLogs.activityDate, monthAgoStr));

      // Total activities
      const totalActivitiesResult = await this.db.select({
        count: sql<number>`COUNT(*)`.as('count')
      }).from(userActivityLogs);

      const totalUsers = totalUsersResult[0]?.count || 0;
      const activeUsersThisWeek = activeUsersThisWeekResult[0]?.count || 0;
      const activeUsersThisMonth = activeUsersThisMonthResult[0]?.count || 0;
      const totalActivities = totalActivitiesResult[0]?.count || 0;
      const avgActivitiesPerUser = totalUsers > 0 ? totalActivities / totalUsers : 0;

      return {
        totalUsers,
        activeUsersToday,
        activeUsersThisWeek,
        activeUsersThisMonth,
        totalActivities,
        avgActivitiesPerUser: Math.round(avgActivitiesPerUser * 100) / 100
      };
    });
  }

  // Batch analytics operations for performance

  async getMultipleUserEngagementMetrics(userIds: string[], days: number): Promise<Map<string, {
    totalSessions: number;
    avgSessionsPerDay: number;
    lastActiveDate: string | null;
    courseInteractions: number;
  }>> {
    if (!this.db || userIds.length === 0) {
      return new Map();
    }

    return this.connectionManager.executeWithRetry(async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      // Get all user activities in batch
      const activities = await this.db.select({
        userId: userActivityLogs.userId,
        activityType: userActivityLogs.activityType,
        activityDate: userActivityLogs.activityDate,
        count: sql<number>`COUNT(*)`.as('count')
      })
        .from(userActivityLogs)
        .where(and(
          sql`user_id = ANY(${userIds})`,
          gte(userActivityLogs.activityDate, start),
          lte(userActivityLogs.activityDate, end)
        ))
        .groupBy(userActivityLogs.userId, userActivityLogs.activityType, userActivityLogs.activityDate);

      // Process results into user metrics
      const userMetrics = new Map();

      userIds.forEach(userId => {
        userMetrics.set(userId, {
          totalSessions: 0,
          avgSessionsPerDay: 0,
          lastActiveDate: null,
          courseInteractions: 0
        });
      });

      activities.forEach(activity => {
        const metrics = userMetrics.get(activity.userId);
        if (metrics) {
          if (activity.activityType === 'login') {
            metrics.totalSessions += activity.count;
          } else if (activity.activityType === 'course_interaction') {
            metrics.courseInteractions += activity.count;
          }

          // Update last active date
          if (!metrics.lastActiveDate || activity.activityDate > metrics.lastActiveDate) {
            metrics.lastActiveDate = activity.activityDate;
          }
        }
      });

      // Calculate averages
      userMetrics.forEach((metrics, userId) => {
        metrics.avgSessionsPerDay = Math.round((metrics.totalSessions / days) * 100) / 100;
      });

      return userMetrics;
    });
  }

  // Health check for this storage module
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; totalActivities: number }> {
    if (!this.db) {
      return { healthy: false, responseTime: -1, totalActivities: 0 };
    }

    const startTime = Date.now();
    try {
      const result = await this.connectionManager.executeWithRetry(async () => {
        const countResult = await this.db.select({
          count: sql<number>`COUNT(*)`.as('count')
        }).from(userActivityLogs);
        return countResult[0]?.count || 0;
      });

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
        totalActivities: result
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        totalActivities: 0
      };
    }
  }

  // Data cleanup and maintenance (for GDPR compliance and performance)
  async cleanupOldActivities(olderThanDays: number): Promise<number> {
    if (!this.db) {
      return 0;
    }

    return this.connectionManager.executeWithRetry(async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      const result = await this.db.delete(userActivityLogs)
        .where(lte(userActivityLogs.activityDate, cutoffStr));

      return result.changes || 0;
    });
  }

  // Privacy compliance - delete all activities for a user
  async deleteUserActivities(userId: string): Promise<number> {
    if (!this.db) {
      return 0;
    }

    return this.connectionManager.executeWithRetry(async () => {
      const result = await this.db.delete(userActivityLogs)
        .where(eq(userActivityLogs.userId, userId));

      return result.changes || 0;
    });
  }
}

// Factory function for creating analytics storage instances
export function createAnalyticsStorage(connectionManager: DatabaseConnectionManager): AnalyticsStorage {
  return new AnalyticsStorage(connectionManager);
}