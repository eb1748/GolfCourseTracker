import CourseListCard from '../CourseListCard';
import { TOP_100_GOLF_COURSES } from '../../data/golfCourses';
import type { GolfCourseWithStatus, CourseStatus } from '@shared/schema';
import { useState } from 'react';

export default function CourseListCardExample() {
  const [course, setCourse] = useState<GolfCourseWithStatus>({
    ...TOP_100_GOLF_COURSES[0],
    status: 'want-to-play'
  });

  const handleStatusChange = (courseId: string, status: CourseStatus) => {
    setCourse(prev => ({ ...prev, status }));
  };

  const handleLocationClick = (courseId: string) => {
    console.log(`Location clicked for course: ${courseId}`);
  };

  return (
    <div className="w-96">
      <CourseListCard
        course={course}
        onStatusChange={handleStatusChange}
        onLocationClick={handleLocationClick}
      />
    </div>
  );
}