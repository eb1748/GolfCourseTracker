// Custom hooks for the Golf Journey Map application

// Data fetching hooks
export { useCourses } from './useCourses';
export type { UseCoursesOptions, UseCoursesReturn, CourseStats } from './useCourses';

// Authentication hooks
export { useAuthImproved, useAuthStatus, useAuthLoading } from './useAuthImproved';
export type {
  AuthUser,
  AuthState,
  AuthActions,
  UseAuthImprovedReturn
} from './useAuthImproved';

// LocalStorage hooks
export { useLocalStorage, useStoredDataStatus } from './useLocalStorage';
export type {
  LocalStorageStats,
  UseLocalStorageReturn
} from './useLocalStorage';

// Re-export commonly used hooks for convenience
export { useAuth } from '@/contexts/AuthContext';
export { useToast } from './use-toast';