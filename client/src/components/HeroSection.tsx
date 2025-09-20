import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Target, Trophy } from 'lucide-react';
import pebbleBeachImage from '@assets/generated_images/Pebble_Beach_ocean_view_4de242ed.png';
import augustaImage from '@assets/generated_images/Augusta_National_Amen_Corner_9cb1227c.png';
import pinehurstImage from '@assets/generated_images/Pinehurst_classic_design_60b7ea06.png';

interface HeroSectionProps {
  totalCourses: number;
  coursesPlayed: number;
  onGetStarted: () => void;
}

export default function HeroSection({ totalCourses, coursesPlayed, onGetStarted }: HeroSectionProps) {
  const progressPercentage = Math.round((coursesPlayed / totalCourses) * 100);

  // Rotating background images array
  const backgroundImages = [
    pebbleBeachImage,
    augustaImage, 
    pinehurstImage
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Rotate background images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentImageIndex(nextImageIndex);
        setNextImageIndex((nextImageIndex + 1) % backgroundImages.length);
        setIsTransitioning(false);
      }, 1000); // 1 second fade duration
      
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [nextImageIndex, backgroundImages.length]);

  const handleGetStarted = () => {
    onGetStarted();
    console.log('Get started clicked');
  };

  return (
    <div className="relative w-full overflow-hidden rounded-lg min-h-[420px] md:min-h-[500px]">
      {/* Rotating Background Images */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{ 
          backgroundImage: `url(${backgroundImages[currentImageIndex]})`,
          opacity: 1
        }}
      />
      {isTransitioning && (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ 
            backgroundImage: `url(${backgroundImages[nextImageIndex]})`,
            opacity: 1
          }}
        />
      )}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Content */}
      <div className="relative flex items-center justify-center px-6 py-6 md:py-8">
        <div className="text-center text-white space-y-4 md:space-y-6 max-w-2xl">
          {/* Badge */}
          <Badge variant="outline" className="bg-white/20 border-white/30 text-white backdrop-blur-sm">
            <MapPin className="w-4 h-4 mr-2" />
            America's Best Golf Courses
          </Badge>

          {/* Main Heading */}
          <div className="space-y-3 md:space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold font-poppins leading-tight">
              Track Your Golf
              <br />
              <span className="text-golf-want">Destination Journey</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/90 leading-relaxed">
              Discover, explore, and conquer the greatest golf courses across America.
              Mark your progress and plan your next golf adventure.
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 md:gap-8 py-3 md:py-4">
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Target className="w-5 h-5 text-golf-want" />
                <span className="text-2xl font-bold">{totalCourses}</span>
              </div>
              <p className="text-sm text-white/80">Total Courses</p>
            </div>
            
            <div className="w-px h-12 bg-white/30" />
            
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Trophy className="w-5 h-5 text-golf-want" />
                <span className="text-2xl font-bold">{coursesPlayed}</span>
              </div>
              <p className="text-sm text-white/80">Courses Played</p>
            </div>
            
            <div className="w-px h-12 bg-white/30" />
            
            <div className="text-center">
              <div className="text-2xl font-bold text-golf-want">{progressPercentage}%</div>
              <p className="text-sm text-white/80">Complete</p>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            className="bg-white/20 border border-white/30 text-white hover:bg-white/30 backdrop-blur-sm transition-all duration-300"
            data-testid="button-get-started"
          >
            <MapPin className="w-5 h-5 mr-2" />
            Explore the Map
          </Button>
        </div>
      </div>
    </div>
  );
}