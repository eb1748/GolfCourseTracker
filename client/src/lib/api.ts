import type { GolfCourseWithStatus, CourseStatus } from "@shared/schema";

const API_BASE = "";

// Simple user session management for demo
const USER_ID = "demo-user-123";

export const api = {
  async getAllCourses(): Promise<GolfCourseWithStatus[]> {
    const response = await fetch(`${API_BASE}/api/courses?userId=${USER_ID}`);
    if (!response.ok) {
      throw new Error("Failed to fetch courses");
    }
    return response.json();
  },

  async searchCourses(query: string): Promise<GolfCourseWithStatus[]> {
    const response = await fetch(
      `${API_BASE}/api/courses/search?q=${encodeURIComponent(query)}&userId=${USER_ID}`
    );
    if (!response.ok) {
      throw new Error("Failed to search courses");
    }
    return response.json();
  },

  async getCoursesByStatus(status: CourseStatus): Promise<GolfCourseWithStatus[]> {
    const response = await fetch(
      `${API_BASE}/api/courses/status/${status}?userId=${USER_ID}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch courses by status");
    }
    return response.json();
  },

  async updateCourseStatus(courseId: string, status: CourseStatus): Promise<void> {
    const response = await fetch(`${API_BASE}/api/courses/${courseId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: USER_ID,
        status,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update course status");
    }
  },

  async getUserStats(): Promise<{
    total: number;
    played: number;
    wantToPlay: number;
    notPlayed: number;
  }> {
    const response = await fetch(`${API_BASE}/api/users/${USER_ID}/stats`);
    if (!response.ok) {
      throw new Error("Failed to fetch user stats");
    }
    return response.json();
  },
};