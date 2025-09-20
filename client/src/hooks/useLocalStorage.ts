import { useState, useEffect, useCallback } from 'react';
import { LocalStorageService, type StoredCourseStatus } from '@/lib/localStorage';
import type { CourseStatus } from '@shared/schema';

export interface LocalStorageStats {
  total: number;
  played: number;
  wantToPlay: number;
  notPlayed: number;
}

export interface UseLocalStorageReturn {
  // Data
  courseStatuses: StoredCourseStatus[];
  stats: LocalStorageStats;
  hasStoredData: boolean;
  lastUpdated: string | undefined;

  // Actions
  getCourseStatus: (courseId: string) => CourseStatus | undefined;
  setCourseStatus: (courseId: string, status: CourseStatus) => void;
  removeCourseStatus: (courseId: string) => void;
  clearAllData: () => void;
  getCourseStatusesForSync: () => Array<{ courseId: string; status: CourseStatus }>;
  importFromServer: (serverData: Array<{ courseId: string; status: CourseStatus }>) => void;
  refreshData: () => void;
}

/**
 * Custom hook for managing localStorage operations with reactive state updates
 *
 * This hook provides a reactive interface to the LocalStorageService,
 * automatically updating state when localStorage changes occur.
 */
export function useLocalStorage(): UseLocalStorageReturn {
  const [courseStatuses, setCourseStatuses] = useState<StoredCourseStatus[]>([]);
  const [hasStoredData, setHasStoredData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();

  // Refresh data from localStorage
  const refreshData = useCallback(() => {
    const statuses = LocalStorageService.getCourseStatuses();
    const hasData = LocalStorageService.hasStoredData();
    const updated = LocalStorageService.getLastUpdated();

    setCourseStatuses(statuses);
    setHasStoredData(hasData);
    setLastUpdated(updated);
  }, []);

  // Initialize data on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Listen for storage events to sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'golf-journey-guest-data' || e.key === null) {
        refreshData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshData]);

  // Listen for focus events to refresh data
  useEffect(() => {
    const handleFocus = () => refreshData();
    window.addEventListener('focus', handleFocus);

    // Check every 30 seconds while page is visible
    const interval = setInterval(refreshData, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [refreshData]);

  // Calculate stats
  const stats: LocalStorageStats = {
    total: courseStatuses.length,
    played: courseStatuses.filter(s => s.status === 'played').length,
    wantToPlay: courseStatuses.filter(s => s.status === 'want-to-play').length,
    notPlayed: courseStatuses.filter(s => s.status === 'not-played').length
  };

  // Action handlers that update localStorage and refresh state
  const getCourseStatus = useCallback((courseId: string): CourseStatus | undefined => {
    return LocalStorageService.getCourseStatus(courseId);
  }, []);

  const setCourseStatus = useCallback((courseId: string, status: CourseStatus) => {
    LocalStorageService.setCourseStatus(courseId, status);
    refreshData();
  }, [refreshData]);

  const removeCourseStatus = useCallback((courseId: string) => {
    LocalStorageService.removeCourseStatus(courseId);
    refreshData();
  }, [refreshData]);

  const clearAllData = useCallback(() => {
    LocalStorageService.clearAllData();
    refreshData();
  }, [refreshData]);

  const getCourseStatusesForSync = useCallback(() => {
    return LocalStorageService.getCourseStatusesForSync();
  }, []);

  const importFromServer = useCallback((serverData: Array<{ courseId: string; status: CourseStatus }>) => {
    LocalStorageService.importFromServer(serverData);
    refreshData();
  }, [refreshData]);

  return {
    // Data
    courseStatuses,
    stats,
    hasStoredData,
    lastUpdated,

    // Actions
    getCourseStatus,
    setCourseStatus,
    removeCourseStatus,
    clearAllData,
    getCourseStatusesForSync,
    importFromServer,
    refreshData,
  };
}

/**
 * Hook for checking if user has stored data to sync
 * This is a lighter version that only tracks the essentials for sync status
 */
export function useStoredDataStatus() {
  const [hasStoredData, setHasStoredData] = useState(LocalStorageService.hasStoredData());
  const [storedStats, setStoredStats] = useState(() => ({
    ...LocalStorageService.getStats(),
    trackedCount: LocalStorageService.getTrackedCoursesCount()
  }));

  const refreshStoredData = useCallback(() => {
    setHasStoredData(LocalStorageService.hasStoredData());
    setStoredStats({
      ...LocalStorageService.getStats(),
      trackedCount: LocalStorageService.getTrackedCoursesCount()
    });
  }, []);

  useEffect(() => {
    // Check for stored data changes periodically or on focus
    const handleFocus = () => refreshStoredData();
    window.addEventListener('focus', handleFocus);

    // Check every 30 seconds while page is visible
    const interval = setInterval(refreshStoredData, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [refreshStoredData]);

  // Listen for storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'golf-journey-guest-data' || e.key === null) {
        refreshStoredData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshStoredData]);

  return {
    hasStoredData,
    storedStats,
    refreshStoredData,
  };
}