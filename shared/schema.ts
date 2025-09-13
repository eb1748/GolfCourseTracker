import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
}).extend({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const insertGolfCourseSchema = createInsertSchema(golfCourses).omit({
  id: true,
});

export const insertUserCourseStatusSchema = createInsertSchema(userCourseStatus).omit({
  id: true,
}).extend({
  status: z.enum(['played', 'want-to-play', 'not-played'])
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GolfCourse = typeof golfCourses.$inferSelect;
export type InsertGolfCourse = z.infer<typeof insertGolfCourseSchema>;
export type UserCourseStatus = typeof userCourseStatus.$inferSelect;
export type InsertUserCourseStatus = z.infer<typeof insertUserCourseStatusSchema>;

export type CourseStatus = 'played' | 'want-to-play' | 'not-played';
export type AccessType = 'public' | 'private' | 'resort';

export interface GolfCourseWithStatus extends GolfCourse {
  status?: CourseStatus;
}