import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Target, Trophy } from 'lucide-react';
import heroImage from '@assets/generated_images/Golf_course_hero_image_e087bb08.png';

interface HeroSectionProps {
  totalCourses: number;
  coursesPlayed: number;
  onGetStarted: () => void;
}

export default function HeroSection({ totalCourses, coursesPlayed, onGetStarted }: HeroSectionProps) {
  const progressPercentage = Math.round((coursesPlayed / totalCourses) * 100);

  const handleGetStarted = () => {
    onGetStarted();
    console.log('Get started clicked');
  };

  return (
    <div className="relative w-full overflow-hidden rounded-lg min-h-[520px] md:h-[500px]">
      {/* Background Image with Dark Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Content */}
      <div className="relative flex items-center justify-center px-6 py-8">
        <div className="text-center text-white space-y-6 max-w-2xl">
          {/* Badge */}
          <Badge variant="outline" className="bg-white/20 border-white/30 text-white backdrop-blur-sm">
            <MapPin className="w-4 h-4 mr-2" />
            America's Best Golf Courses
          </Badge>

          {/* Main Heading */}
          <div className="space-y-4">
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
          <div className="flex items-center justify-center gap-8 py-4">
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