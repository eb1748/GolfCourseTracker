// Legacy compatibility file - re-exports from the new modular storage system
// This file maintains backward compatibility for imports

export { getStorage, shutdownStorage } from "./storage/index";
export type { IStorage } from "./storage/index";

// Re-export all the types for backward compatibility
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
} from "./storage/index";