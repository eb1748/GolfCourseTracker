import { useAuth } from '@/contexts/AuthContext';
import { LocalStorageService } from '@/lib/localStorage';
import { apiRequest } from '@/lib/queryClient';
import type { GolfCourseWithStatus, CourseStatus } from '@shared/schema';

/**
 * Authentication-aware courses API that handles both authenticated (database) 
 * and guest (localStorage) users seamlessly
 */

// Types for API responses
interface UserStats {
  total: number;
  played: number;
  wantToPlay: number;
  notPlayed: number;
}

/**
 * Get all courses with status for current user (authenticated or guest)
 */
export async function getAllCoursesWithStatus(isAuthenticated: boolean): Promise<GolfCourseWithStatus[]> {
  if (isAuthenticated) {
    // Authenticated user - fetch from database with user status
    const response = await apiRequest('GET', '/api/courses');
    return await response.json();
  } else {
    // Guest user - fetch courses from unified endpoint and merge with localStorage status
    const response = await fetch('/api/courses');
    if (!response.ok) {
      throw new Error('Failed to fetch courses');
    }
    const courses: GolfCourseWithStatus[] = await response.json();
    
    // Merge with localStorage status
    return courses.map(course => {
      const storedStatus = LocalStorageService.getCourseStatus(course.id);
      return {
        ...course,
        status: storedStatus ?? 'not-played'
      };
    });
  }
}

/**
 * Search courses with status for current user
 */
export async function searchCoursesWithStatus(query: string, isAuthenticated: boolean): Promise<GolfCourseWithStatus[]> {
  if (isAuthenticated) {
    // Authenticated user - search with user status from database
    const response = await apiRequest('GET', `/api/courses/search?q=${encodeURIComponent(query)}`);
    return await response.json();
  } else {
    // Guest user - search courses from unified endpoint and merge with localStorage
    const response = await fetch(`/api/courses/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search courses');
    }
    const courses: GolfCourseWithStatus[] = await response.json();
    
    // Merge with localStorage status
    return courses.map(course => {
      const storedStatus = LocalStorageService.getCourseStatus(course.id);
      return {
        ...course,
        status: storedStatus ?? 'not-played'
      };
    });
  }
}

/**
 * Get courses by status for current user
 */
export async function getCoursesByStatus(status: CourseStatus, isAuthenticated: boolean): Promise<GolfCourseWithStatus[]> {
  if (isAuthenticated) {
    // Authenticated user - get from database
    const response = await apiRequest('GET', `/api/courses/status/${status}`);
    return await response.json();
  } else {
    // Guest user - filter localStorage data
    const allCourses = await getAllCoursesWithStatus(false);
    return allCourses.filter(course => course.status === status);
  }
}

/**
 * Update course status for current user
 */
export async function updateCourseStatus(courseId: string, status: CourseStatus, isAuthenticated: boolean): Promise<void> {
  if (isAuthenticated) {
    // Authenticated user - update database
    await apiRequest('POST', `/api/courses/${courseId}/status`, { status });
  } else {
    // Guest user - update localStorage
    LocalStorageService.setCourseStatus(courseId, status);
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(isAuthenticated: boolean): Promise<UserStats> {
  if (isAuthenticated) {
    // Authenticated user - get from database
    const response = await apiRequest('GET', '/api/users/me/stats');
    return await response.json();
  } else {
    // Guest user - calculate from localStorage
    return LocalStorageService.getStats();
  }
}

/**
 * React Query optimistic update helpers
 */
export const optimisticUpdates = {
  /**
   * Updates course status optimistically in the query cache
   */
  updateCourseStatus: (
    queryClient: any,
    courseId: string,
    newStatus: CourseStatus,
    isAuthenticated: boolean
  ) => {
    // Update all courses query
    queryClient.setQueryData(
      ['courses', { isAuthenticated }],
      (oldData: GolfCourseWithStatus[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(course =>
          course.id === courseId
            ? { ...course, status: newStatus }
            : course
        );
      }
    );

    // Update filtered queries
    const statusFilters: (CourseStatus | 'all')[] = ['all', 'played', 'want-to-play', 'not-played'];
    statusFilters.forEach(status => {
      queryClient.setQueryData(
        ['courses', { status, isAuthenticated }],
        (oldData: GolfCourseWithStatus[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(course =>
            course.id === courseId
              ? { ...course, status: newStatus }
              : course
          );
        }
      );
    });

    // Update search queries - this is more complex, so we'll invalidate instead
    const queryKeys = queryClient.getQueryCache().getAll()
      .map(query => query.queryKey)
      .filter(key =>
        Array.isArray(key) &&
        key[0] === 'courses' &&
        typeof key[1] === 'object' &&
        'searchQuery' in key[1]
      );

    queryKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));

    // Update user stats optimistically
    queryClient.setQueryData(
      ['user-stats', { isAuthenticated }],
      (oldStats: UserStats | undefined) => {
        if (!oldStats) return oldStats;

        // We need the previous status to calculate the correct stats update
        const coursesData = queryClient.getQueryData(['courses', { isAuthenticated }]) as GolfCourseWithStatus[] | undefined;
        if (!coursesData) return oldStats;

        const course = coursesData.find(c => c.id === courseId);
        const previousStatus = course?.status;

        if (!previousStatus || previousStatus === newStatus) return oldStats;

        let newStats = { ...oldStats };

        // Decrease count for previous status
        if (previousStatus === 'played') newStats.played--;
        else if (previousStatus === 'want-to-play') newStats.wantToPlay--;

        // Increase count for new status
        if (newStatus === 'played') newStats.played++;
        else if (newStatus === 'want-to-play') newStats.wantToPlay++;

        // Update not played count (total - played)
        newStats.notPlayed = newStats.total - newStats.played;

        return newStats;
      }
    );
  },

  /**
   * Creates a rollback function for optimistic updates
   */
  createRollback: (
    queryClient: any,
    courseId: string,
    originalStatus: CourseStatus,
    isAuthenticated: boolean
  ) => {
    return () => {
      optimisticUpdates.updateCourseStatus(queryClient, courseId, originalStatus, isAuthenticated);
    };
  }
};

/**
 * React Query compatible functions that use authentication context
 */
export const useCoursesApi = () => {
  const { isAuthenticated } = useAuth();

  return {
    getAllCourses: () => getAllCoursesWithStatus(isAuthenticated),
    searchCourses: (query: string) => searchCoursesWithStatus(query, isAuthenticated),
    getCoursesByStatus: (status: CourseStatus) => getCoursesByStatus(status, isAuthenticated),
    updateCourseStatus: (courseId: string, status: CourseStatus) => updateCourseStatus(courseId, status, isAuthenticated),
    getUserStats: () => getUserStats(isAuthenticated),
  };
};

/**
 * Direct API functions for use in components (with hooks)
 */
export const coursesApi = {
  /**
   * Get all courses with authentication awareness
   */
  getAllCourses: async (isAuthenticated: boolean): Promise<GolfCourseWithStatus[]> => {
    return getAllCoursesWithStatus(isAuthenticated);
  },

  /**
   * Search courses with authentication awareness  
   */
  searchCourses: async (query: string, isAuthenticated: boolean): Promise<GolfCourseWithStatus[]> => {
    return searchCoursesWithStatus(query, isAuthenticated);
  },

  /**
   * Get courses by status with authentication awareness
   */
  getCoursesByStatus: async (status: CourseStatus, isAuthenticated: boolean): Promise<GolfCourseWithStatus[]> => {
    return getCoursesByStatus(status, isAuthenticated);
  },

  /**
   * Update course status with authentication awareness
   */
  updateCourseStatus: async (courseId: string, status: CourseStatus, isAuthenticated: boolean): Promise<void> => {
    return updateCourseStatus(courseId, status, isAuthenticated);
  },

  /**
   * Get user stats with authentication awareness
   */
  getUserStats: async (isAuthenticated: boolean): Promise<UserStats> => {
    return getUserStats(isAuthenticated);
  },
};