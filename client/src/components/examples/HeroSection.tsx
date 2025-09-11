import HeroSection from '../HeroSection';
import { useState } from 'react';

export default function HeroSectionExample() {
  const [totalCourses] = useState(100);
  const [coursesPlayed] = useState(23);

  const handleGetStarted = () => {
    console.log('Get started action triggered');
  };

  return (
    <HeroSection
      totalCourses={totalCourses}
      coursesPlayed={coursesPlayed}
      onGetStarted={handleGetStarted}
    />
  );
}