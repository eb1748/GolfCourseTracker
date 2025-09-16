import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { coursesApi, optimisticUpdates } from '@/lib/coursesApi';
import { useAuth } from '@/contexts/AuthContext';
import type { GolfCourseWithStatus, CourseStatus, AccessType } from '@shared/schema';

export interface UseCoursesOptions {
  activeFilter?: CourseStatus | 'all';
  activeAccessFilter?: AccessType | 'all';
  searchQuery?: string;
}

export interface CourseStats {
  total: number;
  played: number;
  wantToPlay: number;
  notPlayed: number;
  public: number;
  private: number;
  resort: number;
}

export interface UseCoursesReturn {
  // Data
  courses: GolfCourseWithStatus[];
  filteredCourses: GolfCourseWithStatus[];
  stats: CourseStats;

  // Loading states
  isLoading: boolean;
  isStatsLoading: boolean;
  isUpdatingStatus: boolean;

  // Error states
  error: Error | null;

  // Actions
  updateCourseStatus: (courseId: string, status: CourseStatus) => void;
  refetchCourses: () => Promise<unknown>;
  refetchStats: () => Promise<unknown>;
}

export function useCourses(options: UseCoursesOptions = {}): UseCoursesReturn {
  const { activeFilter = 'all', activeAccessFilter = 'all', searchQuery = '' } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Fetch courses data
  const {
    data: courses = [],
    isLoading: coursesLoading,
    error: coursesError,
    refetch: refetchCourses
  } = useQuery({
    queryKey: ['courses', { isAuthenticated }],
    queryFn: () => coursesApi.getAllCourses(isAuthenticated),
  });

  // Fetch user stats
  const {
    data: apiStats,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['user-stats', { isAuthenticated }],
    queryFn: () => coursesApi.getUserStats(isAuthenticated),
  });

  // Status update mutation with optimistic updates
  const statusMutation = useMutation({
    mutationFn: ({ courseId, status }: { courseId: string; status: CourseStatus }) =>
      coursesApi.updateCourseStatus(courseId, status, isAuthenticated),
    onMutate: async ({ courseId, status }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['courses'] });
      await queryClient.cancelQueries({ queryKey: ['user-stats'] });

      // Get the current course data to determine previous status
      const coursesData = queryClient.getQueryData(['courses', { isAuthenticated }]) as GolfCourseWithStatus[] | undefined;
      const previousStatus = coursesData?.find(course => course.id === courseId)?.status;

      // Snapshot previous values for potential rollback
      const previousCoursesData = queryClient.getQueryData(['courses', { isAuthenticated }]);
      const previousStatsData = queryClient.getQueryData(['user-stats', { isAuthenticated }]);

      // Apply optimistic updates
      optimisticUpdates.updateCourseStatus(queryClient, courseId, status, isAuthenticated);

      // Return context with snapshot for rollback
      return {
        previousCoursesData,
        previousStatsData,
        courseId,
        previousStatus,
        isAuthenticated
      };
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Course status updated successfully.",
        variant: "default",
      });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates on error
      if (context) {
        queryClient.setQueryData(['courses', { isAuthenticated: context.isAuthenticated }], context.previousCoursesData);
        queryClient.setQueryData(['user-stats', { isAuthenticated: context.isAuthenticated }], context.previousStatsData);
      }

      toast({
        title: "Update Failed",
        description: "Failed to update course status. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after mutation settles (success or error) to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });

  // Filter and search courses
  const filteredCourses = useMemo(() => {
    let filtered = courses;

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(course => course.status === activeFilter);
    }

    // Apply access type filter
    if (activeAccessFilter !== 'all') {
      filtered = filtered.filter(course => course.accessType === activeAccessFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(course =>
        course.name.toLowerCase().includes(query) ||
        course.location.toLowerCase().includes(query) ||
        course.state.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [courses, activeFilter, activeAccessFilter, searchQuery]);

  // Calculate stats (fallback to calculated if API stats not available)
  const stats = useMemo((): CourseStats => {
    // Use API stats if available, otherwise calculate from courses
    if (apiStats && typeof apiStats === 'object') {
      return {
        total: apiStats.total || courses.length,
        played: apiStats.played || courses.filter(c => c.status === 'played').length,
        wantToPlay: apiStats.wantToPlay || courses.filter(c => c.status === 'want-to-play').length,
        notPlayed: apiStats.notPlayed || (courses.length - courses.filter(c => c.status === 'played').length),
        public: apiStats.public || courses.filter(c => c.accessType === 'public').length,
        private: apiStats.private || courses.filter(c => c.accessType === 'private').length,
        resort: apiStats.resort || courses.filter(c => c.accessType === 'resort').length,
      };
    }

    // Fallback calculation
    const total = courses.length;
    const played = courses.filter(c => c.status === 'played').length;
    const wantToPlay = courses.filter(c => c.status === 'want-to-play').length;
    const notPlayed = total - played;
    const publicCourses = courses.filter(c => c.accessType === 'public').length;
    const privateCourses = courses.filter(c => c.accessType === 'private').length;
    const resortCourses = courses.filter(c => c.accessType === 'resort').length;

    return {
      total,
      played,
      wantToPlay,
      notPlayed,
      public: publicCourses,
      private: privateCourses,
      resort: resortCourses
    };
  }, [courses, apiStats]);

  return {
    // Data
    courses,
    filteredCourses,
    stats,

    // Loading states
    isLoading: coursesLoading,
    isStatsLoading: statsLoading,
    isUpdatingStatus: statusMutation.isPending,

    // Error states
    error: coursesError,

    // Actions
    updateCourseStatus: (courseId: string, status: CourseStatus) => {
      statusMutation.mutate({ courseId, status });
    },
    refetchCourses,
    refetchStats,
  };
}