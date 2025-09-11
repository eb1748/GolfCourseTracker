import GolfCourseMap from '../GolfCourseMap';
import { TOP_100_GOLF_COURSES } from '../../data/golfCourses';
import type { GolfCourseWithStatus, CourseStatus } from '@shared/schema';
import { useState } from 'react';

export default function GolfCourseMapExample() {
  const [courses, setCourses] = useState<GolfCourseWithStatus[]>(() => 
    TOP_100_GOLF_COURSES.slice(0, 10).map(course => ({
      ...course,
      status: Math.random() > 0.6 ? 'played' : Math.random() > 0.3 ? 'want-to-play' : 'not-played' as CourseStatus
    }))
  );

  const handleStatusChange = (courseId: string, status: CourseStatus) => {
    setCourses(prev => prev.map(course => 
      course.id === courseId ? { ...course, status } : course
    ));
  };

  return (
    <div className="h-[600px] w-full">
      <GolfCourseMap 
        courses={courses}
        onStatusChange={handleStatusChange}
        filterStatus="all"
      />
    </div>
  );
}