import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Phone, Globe } from 'lucide-react';
import type { GolfCourseWithStatus, CourseStatus, AccessType } from '@shared/schema';
import { handleInteractiveClick } from '@/utils/interactiveEffects';

interface CourseListCardProps {
  course: GolfCourseWithStatus;
  onStatusChange: (courseId: string, status: CourseStatus) => void;
  onLocationClick: (courseId: string) => void;
}

export default function CourseListCard({ course, onStatusChange, onLocationClick }: CourseListCardProps) {
  const getStatusColor = (status: CourseStatus) => {
    switch (status) {
      case 'played': return 'bg-golf-played text-white';
      case 'want-to-play': return 'bg-golf-want text-black';
      case 'not-played': return 'bg-golf-not-played text-white';
    }
  };

  const getStatusLabel = (status: CourseStatus) => {
    switch (status) {
      case 'played': return 'Played';
      case 'want-to-play': return 'Want to Play';
      case 'not-played': return 'Not Played';
    }
  };

  const getCourseTypeLabel = (accessType: AccessType) => {
    switch (accessType) {
      case 'public': return 'Public';
      case 'private': return 'Private';
      case 'resort': return 'Resort';
    }
  };

  const getCourseTypeColor = (accessType: AccessType) => {
    switch (accessType) {
      case 'public': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'private': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'resort': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  const handleStatusChange = (newStatus: CourseStatus) => {
    onStatusChange(course.id, newStatus);
    console.log(`Status changed for ${course.name}: ${newStatus}`);
  };

  const handleLocationClick = () => {
    onLocationClick(course.id);
    console.log(`Location clicked for: ${course.name}`);
  };

  return (
    <Card className="hover-elevate">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-poppins font-semibold text-lg leading-tight">{course.name}</h3>
            <button 
              onClick={(e) => handleInteractiveClick(e, handleLocationClick)}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary text-sm mt-1 transition-colors enhanced-button"
              data-testid={`button-location-${course.id}`}
            >
              <MapPin className="w-4 h-4 icon-element" />
              {course.location}
            </button>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Badge className={getCourseTypeColor(course.accessType)}>
              {getCourseTypeLabel(course.accessType)}
            </Badge>
            <Badge className={getStatusColor(course.status || 'not-played')}>
              {getStatusLabel(course.status || 'not-played')}
            </Badge>
          </div>
        </div>

        {/* Rating */}
        {course.rating && (
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 fill-golf-want text-golf-want" />
            <span className="font-medium">{course.rating}</span>
            <span className="text-muted-foreground text-sm">rating</span>
          </div>
        )}

        {/* Description */}
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
        )}

        {/* Contact Info */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {course.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>{course.phone}</span>
            </div>
          )}
          {course.website && (
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <a 
                href={course.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                data-testid={`link-website-${course.id}`}
              >
                Website
              </a>
            </div>
          )}
        </div>

        {/* Status Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button
            size="sm"
            variant={course.status === 'played' ? 'default' : 'outline'}
            onClick={(e) => handleInteractiveClick(e, () => handleStatusChange('played'))}
            className={course.status === 'played' ? 'text-xs bg-golf-played text-white border-golf-played enhanced-button' : 'text-xs enhanced-button'}
            data-testid={`button-status-played-${course.id}`}
          >
            Played
          </Button>
          <Button
            size="sm"
            variant={course.status === 'want-to-play' ? 'default' : 'outline'}
            onClick={(e) => handleInteractiveClick(e, () => handleStatusChange('want-to-play'))}
            className={course.status === 'want-to-play' ? 'text-xs bg-golf-want text-black border-golf-want enhanced-button' : 'text-xs enhanced-button'}
            data-testid={`button-status-want-${course.id}`}
          >
            Want to Play
          </Button>
          <Button
            size="sm"
            variant={course.status === 'not-played' ? 'default' : 'outline'}
            onClick={(e) => handleInteractiveClick(e, () => handleStatusChange('not-played'))}
            className={course.status === 'not-played' ? 'text-xs bg-golf-not-played text-white border-golf-not-played enhanced-button' : 'text-xs enhanced-button'}
            data-testid={`button-status-not-played-${course.id}`}
          >
            Not Played
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}