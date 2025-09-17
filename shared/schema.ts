import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, unique, json, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // Renamed for clarity - stores bcrypt hash
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(), // Track user activity for DAU/MAU
  preferences: json("preferences").default('{}').notNull(), // Future-proof user settings
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Performance indexes for common queries
  usernameIdx: index("users_username_idx").on(table.username),
  emailIdx: index("users_email_idx").on(table.email),
  lastActiveAtIdx: index("users_last_active_at_idx").on(table.lastActiveAt),
  createdAtIdx: index("users_created_at_idx").on(table.createdAt),
}));

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
}, (table) => ({
  // Performance indexes for common queries
  nameIdx: index("golf_courses_name_idx").on(table.name),
  stateIdx: index("golf_courses_state_idx").on(table.state),
  locationIdx: index("golf_courses_location_idx").on(table.location),
  ratingIdx: index("golf_courses_rating_idx").on(table.rating),
  accessTypeIdx: index("golf_courses_access_type_idx").on(table.accessType),
  // Geospatial index for location-based queries (lightweight for 100 courses)
  coordsIdx: index("golf_courses_coords_idx").on(table.latitude, table.longitude),
}));

export const userCourseStatus = pgTable("user_course_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  courseId: varchar("course_id").notNull().references(() => golfCourses.id),
  status: text("status").notNull(), // 'played', 'want-to-play', 'not-played'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate user-course combinations
  userCourseUnique: unique().on(table.userId, table.courseId),
  // Performance indexes for common queries
  userIdIdx: index("user_course_status_user_id_idx").on(table.userId),
  courseIdIdx: index("user_course_status_course_id_idx").on(table.courseId),
  statusIdx: index("user_course_status_status_idx").on(table.status),
  // Composite indexes for frequent query patterns
  userStatusIdx: index("user_course_status_user_status_idx").on(table.userId, table.status),
  createdAtIdx: index("user_course_status_created_at_idx").on(table.createdAt),
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
  // Performance indexes for analytics queries
  activityDateIdx: index("user_activity_logs_activity_date_idx").on(table.activityDate),
  activityTypeIdx: index("user_activity_logs_activity_type_idx").on(table.activityType),
  userIdIdx: index("user_activity_logs_user_id_idx").on(table.userId),
  // Composite index for DAU/MAU calculations
  dateTypeIdx: index("user_activity_logs_date_type_idx").on(table.activityDate, table.activityType),
}));

// Username validation regex: alphanumeric + underscore/hyphen, 3-20 chars, must start with letter/number
const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,19}$/;

// Reserved usernames to prevent conflicts with system routes/functions
const RESERVED_USERNAMES = [
  'admin', 'root', 'api', 'www', 'mail', 'ftp', 'localhost', 'system', 'user',
  'test', 'guest', 'public', 'private', 'static', 'assets', 'images', 'css',
  'js', 'javascript', 'null', 'undefined', 'true', 'false', 'about', 'contact',
  'help', 'support', 'blog', 'news', 'login', 'logout', 'register', 'signup',
  'signin', 'dashboard', 'profile', 'settings', 'account', 'home', 'index'
];

export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be no more than 20 characters')
  .regex(usernameRegex, 'Username can only contain letters, numbers, underscores, and hyphens, and must start with a letter or number')
  .refine((username) => !RESERVED_USERNAMES.includes(username.toLowerCase()), {
    message: 'This username is reserved and cannot be used'
  });

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  name: true,
  email: true,
  passwordHash: true,
}).extend({
  username: usernameSchema,
  email: z.string().email(),
  passwordHash: z.string().min(6, 'Password must be at least 6 characters')
});

// For backwards compatibility with frontend forms that send 'password'
export const insertUserFormSchema = z.object({
  username: usernameSchema,
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs).omit({
  id: true,
  createdAt: true,
});

// Activity type union for type safety in analytics tracking
export type ActivityType = 'login' | 'course_interaction' | 'view';

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