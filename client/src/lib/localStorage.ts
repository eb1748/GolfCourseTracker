import { type CourseStatus } from "@shared/schema";

// Types for localStorage data
export interface StoredCourseStatus {
  courseId: string;
  status: CourseStatus;
  updatedAt: string; // ISO date string
}

export interface LocalStorageData {
  courseStatuses: StoredCourseStatus[];
  lastUpdated: string;
}

const STORAGE_KEY = 'golf-journey-guest-data';

/**
 * localStorage service for managing guest user course data
 * Provides functions to store, retrieve, and sync course status data
 */
export class LocalStorageService {
  
  /**
   * Get all stored course statuses from localStorage
   */
  static getCourseStatuses(): StoredCourseStatus[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      
      const parsed: LocalStorageData = JSON.parse(data);
      return parsed.courseStatuses || [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  /**
   * Get status for a specific course
   */
  static getCourseStatus(courseId: string): CourseStatus | undefined {
    const statuses = this.getCourseStatuses();
    const courseStatus = statuses.find(status => status.courseId === courseId);
    return courseStatus?.status;
  }

  /**
   * Set status for a specific course
   */
  static setCourseStatus(courseId: string, status: CourseStatus): void {
    try {
      const existingStatuses = this.getCourseStatuses();
      const now = new Date().toISOString();
      
      // Remove existing status for this course
      const filteredStatuses = existingStatuses.filter(s => s.courseId !== courseId);
      
      // Add new status
      const newStatus: StoredCourseStatus = {
        courseId,
        status,
        updatedAt: now
      };
      
      const updatedData: LocalStorageData = {
        courseStatuses: [...filteredStatuses, newStatus],
        lastUpdated: now
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }

  /**
   * Remove status for a specific course
   */
  static removeCourseStatus(courseId: string): void {
    try {
      const existingStatuses = this.getCourseStatuses();
      const filteredStatuses = existingStatuses.filter(s => s.courseId !== courseId);
      
      const updatedData: LocalStorageData = {
        courseStatuses: filteredStatuses,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  /**
   * Get all course statuses in the format expected by the sync API
   */
  static getCourseStatusesForSync(): Array<{ courseId: string; status: CourseStatus }> {
    return this.getCourseStatuses().map(({ courseId, status }) => ({
      courseId,
      status
    }));
  }

  /**
   * Clear all stored course data (typically called after successful sync)
   */
  static clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Get storage statistics
   */
  static getStats(): {
    total: number;
    played: number;
    wantToPlay: number;
    notPlayed: number;
  } {
    const statuses = this.getCourseStatuses();
    
    return {
      total: statuses.length,
      played: statuses.filter(s => s.status === 'played').length,
      wantToPlay: statuses.filter(s => s.status === 'want-to-play').length,
      notPlayed: statuses.filter(s => s.status === 'not-played').length
    };
  }

  /**
   * Check if there is any stored data
   */
  static hasStoredData(): boolean {
    return this.getCourseStatuses().length > 0;
  }

  /**
   * Get the last updated timestamp
   */
  static getLastUpdated(): string | undefined {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return undefined;
      
      const parsed: LocalStorageData = JSON.parse(data);
      return parsed.lastUpdated;
    } catch (error) {
      console.error('Error reading lastUpdated from localStorage:', error);
      return undefined;
    }
  }

  /**
   * Import data from server (used during sync)
   */
  static importFromServer(serverData: Array<{ courseId: string; status: CourseStatus }>): void {
    try {
      const now = new Date().toISOString();
      const courseStatuses: StoredCourseStatus[] = serverData.map(item => ({
        courseId: item.courseId,
        status: item.status,
        updatedAt: now
      }));

      const data: LocalStorageData = {
        courseStatuses,
        lastUpdated: now
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error importing server data to localStorage:', error);
    }
  }
}

// Helper functions for easier access
export const getStoredCourseStatus = LocalStorageService.getCourseStatus.bind(LocalStorageService);
export const setStoredCourseStatus = LocalStorageService.setCourseStatus.bind(LocalStorageService);
export const hasStoredCourseData = LocalStorageService.hasStoredData.bind(LocalStorageService);
export const clearStoredCourseData = LocalStorageService.clearAllData.bind(LocalStorageService);
export const getStoredCourseStats = LocalStorageService.getStats.bind(LocalStorageService);