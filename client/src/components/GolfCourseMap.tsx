import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GolfCourseWithStatus, CourseStatus, AccessType } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Star, Phone, Globe } from 'lucide-react';

interface GolfCourseMapProps {
  courses: GolfCourseWithStatus[];
  onStatusChange: (courseId: string, status: CourseStatus) => void;
  filterStatus?: CourseStatus | 'all';
}

// Custom golf pin icon SVG based on access type and status
const createGolfPinIcon = (accessType: AccessType, status: CourseStatus) => {
  // Status-based colors (matching golf theme colors)
  const statusColors = {
    'played': '#5db37e', // hsl(142, 60%, 25%) - Dark green
    'want-to-play': '#d4af37', // hsl(45, 85%, 55%) - Gold/yellow
    'not-played': '#8b95a6' // hsl(220, 15%, 65%) - Blue-gray
  };
  
  // Access type-based icons (optimized for golf ball shape)
  const accessTypeIcons = {
    'public': `
      <!-- Golf flag (simplified) -->
      <rect x="10.25" y="6" width="1.5" height="9" fill="white"/>
      <path d="M11.75 6 L18.25 7.5 L11.75 10.5 Z" fill="white"/>`,
    'private': `
      <!-- Key symbol (simplified) -->
      <circle cx="12" cy="9.5" r="3" fill="white"/>
      <circle cx="12" cy="9.5" r="1.5" fill="${statusColors[status]}"/>
      <rect x="11.25" y="12.5" width="1.5" height="3" fill="white"/>
      <rect x="12.75" y="14" width="1.5" height="0.75" fill="white"/>`,
    'resort': `
      <!-- Resort/Hotel building (simplified) -->
      <rect x="7.5" y="7" width="9" height="7.5" fill="white"/>
      <rect x="8.5" y="8.25" width="1.5" height="1.5" fill="${statusColors[status]}"/>
      <rect x="10.75" y="8.25" width="1.5" height="1.5" fill="${statusColors[status]}"/>
      <rect x="13" y="8.25" width="1.5" height="1.5" fill="${statusColors[status]}"/>
      <rect x="8.5" y="10.5" width="1.5" height="1.5" fill="${statusColors[status]}"/>
      <rect x="13" y="10.5" width="1.5" height="1.5" fill="${statusColors[status]}"/>
      <rect x="10.75" y="12" width="1.5" height="2.25" fill="${statusColors[status]}"/>`
  };
  
  const color = statusColors[status];
  const icon = accessTypeIcons[accessType];
  
  return L.divIcon({
    html: `
      <div style="position: relative;">
        <svg width="24" height="24" viewBox="0 0 24 24" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));">
          <!-- Golf ball body -->
          <circle cx="12" cy="12" r="11" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
          
          <!-- Golf ball dimples -->
          <circle cx="8" cy="8" r="0.8" fill="rgba(0,0,0,0.1)"/>
          <circle cx="12" cy="7" r="0.8" fill="rgba(0,0,0,0.1)"/>
          <circle cx="16" cy="8" r="0.8" fill="rgba(0,0,0,0.1)"/>
          <circle cx="7" cy="12" r="0.8" fill="rgba(0,0,0,0.1)"/>
          <circle cx="17" cy="12" r="0.8" fill="rgba(0,0,0,0.1)"/>
          <circle cx="8" cy="16" r="0.8" fill="rgba(0,0,0,0.1)"/>
          <circle cx="12" cy="17" r="0.8" fill="rgba(0,0,0,0.1)"/>
          <circle cx="16" cy="16" r="0.8" fill="rgba(0,0,0,0.1)"/>
          <circle cx="10" cy="12" r="0.6" fill="rgba(0,0,0,0.08)"/>
          <circle cx="14" cy="12" r="0.6" fill="rgba(0,0,0,0.08)"/>
          <circle cx="12" cy="10" r="0.6" fill="rgba(0,0,0,0.08)"/>
          <circle cx="12" cy="14" r="0.6" fill="rgba(0,0,0,0.08)"/>
          
          <!-- Access type icon -->
          ${icon}
        </svg>
      </div>
    `,
    className: 'golf-ball-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

export default function GolfCourseMap({ courses, onStatusChange, filterStatus = 'all' }: GolfCourseMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const popupRef = useRef<HTMLDivElement>(null);
  const [selectedCourse, setSelectedCourse] = useState<GolfCourseWithStatus | null>(null);

  const filteredCourses = courses.filter(course => 
    filterStatus === 'all' || course.status === filterStatus
  );

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [39.8283, -98.5795], // Center of US
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for filtered courses
    filteredCourses.forEach(course => {
      const marker = L.marker(
        [parseFloat(course.latitude), parseFloat(course.longitude)],
        { icon: createGolfPinIcon(course.accessType, course.status || 'not-played') }
      );

      marker.addTo(mapInstanceRef.current!);
      
      marker.on('click', () => {
        setSelectedCourse(course);
        console.log(`Golf course selected: ${course.name}`);
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
    };
  }, [filteredCourses]);

  // Handle outside clicks to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedCourse && popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setSelectedCourse(null);
        console.log('Popup closed by clicking outside');
      }
    };

    if (selectedCourse) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedCourse]);

  const handleStatusChange = (courseId: string, newStatus: CourseStatus) => {
    onStatusChange(courseId, newStatus);
    
    // Update the selectedCourse state immediately for instant UI feedback
    if (selectedCourse && selectedCourse.id === courseId) {
      setSelectedCourse({ ...selectedCourse, status: newStatus });
    }
    
    console.log(`Status changed for course ${courseId}: ${newStatus}`);
  };

  const getStatusColor = (status: CourseStatus) => {
    switch (status) {
      case 'played': return { backgroundColor: '#1a4d33', color: 'white' };
      case 'want-to-play': return { backgroundColor: '#d4af37', color: 'black' };
      case 'not-played': return { backgroundColor: '#8b95a6', color: 'white' };
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

  const getStatusButtonProps = (status: CourseStatus, isSelected: boolean) => {
    if (!isSelected) {
      return {
        variant: 'outline' as const,
        className: 'text-xs pointer-events-auto cursor-pointer bg-background text-foreground border-input no-default-hover-elevate no-default-active-elevate',
        style: {}
      };
    }
    
    // For selected buttons, use the golf colors with Tailwind classes
    const baseStyle = {
      variant: 'default' as const,
      className: 'text-xs pointer-events-auto cursor-pointer no-default-hover-elevate no-default-active-elevate hover:opacity-90',
      style: {} as React.CSSProperties
    };
    
    switch (status) {
      case 'played':
        return {
          ...baseStyle,
          className: 'text-xs pointer-events-auto cursor-pointer bg-golf-played text-white border-golf-played no-default-hover-elevate no-default-active-elevate hover:opacity-90'
        };
      case 'want-to-play':
        return {
          ...baseStyle,
          className: 'text-xs pointer-events-auto cursor-pointer bg-golf-want text-black border-golf-want no-default-hover-elevate no-default-active-elevate hover:opacity-90'
        };
      case 'not-played':
        return {
          ...baseStyle,
          className: 'text-xs pointer-events-auto cursor-pointer bg-golf-not-played text-white border-golf-not-played no-default-hover-elevate no-default-active-elevate hover:opacity-90'
        };
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-md" />
      
      {/* Course Details Popup */}
      {selectedCourse && (
        <div ref={popupRef} className="absolute top-4 right-4 w-80 z-[1000] pointer-events-auto">
          <Card className="shadow-lg pointer-events-auto">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-poppins">{selectedCourse.name}</CardTitle>
                  <p className="text-muted-foreground text-sm flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedCourse.location}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedCourse(null)}
                  data-testid="button-close-popup"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCourse.rating && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-golf-want text-golf-want" />
                  <span className="font-medium">{selectedCourse.rating}</span>
                </div>
              )}
              
              {selectedCourse.description && (
                <p className="text-sm text-muted-foreground">{selectedCourse.description}</p>
              )}
              
              <div className="flex flex-col gap-2">
                {selectedCourse.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4" />
                    <span>{selectedCourse.phone}</span>
                  </div>
                )}
                {selectedCourse.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4" />
                    <a 
                      href={selectedCourse.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Course Type:</span>
                  <Badge className={getCourseTypeColor(selectedCourse.accessType)}>
                    {getCourseTypeLabel(selectedCourse.accessType)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge style={getStatusColor(selectedCourse.status || 'not-played')}>
                    {getStatusLabel(selectedCourse.status || 'not-played')}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pointer-events-auto">
                  {(() => {
                    const playedProps = getStatusButtonProps('played', selectedCourse.status === 'played');
                    return (
                      <Button
                        size="sm"
                        variant={playedProps.variant}
                        onClick={() => handleStatusChange(selectedCourse.id, 'played')}
                        className={playedProps.className}
                        style={playedProps.style}
                        data-testid={`button-status-played-${selectedCourse.id}`}
                      >
                        Played
                      </Button>
                    );
                  })()}
                  {(() => {
                    const wantProps = getStatusButtonProps('want-to-play', selectedCourse.status === 'want-to-play');
                    return (
                      <Button
                        size="sm"
                        variant={wantProps.variant}
                        onClick={() => handleStatusChange(selectedCourse.id, 'want-to-play')}
                        className={wantProps.className}
                        style={wantProps.style}
                        data-testid={`button-status-want-${selectedCourse.id}`}
                      >
                        Want to Play
                      </Button>
                    );
                  })()}
                  {(() => {
                    const notPlayedProps = getStatusButtonProps('not-played', selectedCourse.status === 'not-played');
                    return (
                      <Button
                        size="sm"
                        variant={notPlayedProps.variant}
                        onClick={() => handleStatusChange(selectedCourse.id, 'not-played')}
                        className={notPlayedProps.className}
                        style={notPlayedProps.style}
                        data-testid={`button-status-not-played-${selectedCourse.id}`}
                      >
                        Not Played
                      </Button>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}