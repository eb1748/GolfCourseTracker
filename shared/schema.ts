import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, unique, json, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // Renamed for clarity - stores bcrypt hash
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(), // Track user activity for DAU/MAU
  preferences: json("preferences").default('{}').notNull(), // Future-proof user settings
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const golfCourses = pgTable("golf_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location").notNull(),
  state: text("state").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  rating: decimal("rating", { precision: 3, scale: 1 }),
  description: text("description"),
  website: text("website"),
  phone: text("phone"),
  accessType: text("access_type", { enum: ['public', 'private', 'resort'] }).notNull().default('public'),
});

export const userCourseStatus = pgTable("user_course_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  courseId: varchar("course_id").notNull().references(() => golfCourses.id),
  status: text("status").notNull(), // 'played', 'want-to-play', 'not-played'
}, (table) => ({
  // Unique constraint to prevent duplicate user-course combinations
  userCourseUnique: unique().on(table.userId, table.courseId),
}));

// Privacy-friendly analytics tracking table for DAU/MAU calculations
// Stores only date and anonymized user identifier, no personal data
export const userActivityLogs = pgTable("user_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  activityDate: date("activity_date").notNull(), // Track by date for DAU/MAU
  activityType: text("activity_type").notNull(), // 'login', 'course_interaction', 'view'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate activity logs per user per day per type
  userDateActivityUnique: unique().on(table.userId, table.activityDate, table.activityType),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  passwordHash: true,
}).extend({
  email: z.string().email(),
  passwordHash: z.string().min(6, 'Password must be at least 6 characters')
});

// For backwards compatibility with frontend forms that send 'password'
export const insertUserFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs).omit({
  id: true,
  createdAt: true,
});

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
  }).optional(),
  privacy: z.object({
    shareStats: z.boolean().optional(),
    analyticsOptOut: z.boolean().optional(),
  }).optional(),
}).optional();

export const insertGolfCourseSchema = createInsertSchema(golfCourses).omit({
  id: true,
});

export const insertUserCourseStatusSchema = createInsertSchema(userCourseStatus).omit({
  id: true,
}).extend({
  status: z.enum(['played', 'want-to-play', 'not-played'])
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertUserForm = z.infer<typeof insertUserFormSchema>;
export type User = typeof users.$inferSelect;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type GolfCourse = typeof golfCourses.$inferSelect;
export type InsertGolfCourse = z.infer<typeof insertGolfCourseSchema>;
export type UserCourseStatus = typeof userCourseStatus.$inferSelect;
export type InsertUserCourseStatus = z.infer<typeof insertUserCourseStatusSchema>;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;

export type CourseStatus = 'played' | 'want-to-play' | 'not-played';
export type AccessType = 'public' | 'private' | 'resort';

export interface GolfCourseWithStatus extends GolfCourse {
  status?: CourseStatus;
}