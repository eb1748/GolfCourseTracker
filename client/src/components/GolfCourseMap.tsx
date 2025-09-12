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

// Custom golf pin icon SVG based on access type
const createGolfPinIcon = (accessType: AccessType) => {
  const accessTypeConfig = {
    'public': {
      color: '#2563eb', // Blue
      icon: `
        <!-- Golf flag -->
        <rect x="14" y="8" width="2" height="8" fill="white"/>
        <path d="M16 8 L24 10 L16 14 Z" fill="white"/>
        <!-- Hole -->
        <circle cx="16" cy="20" r="2" fill="white"/>`
    },
    'private': {
      color: '#7c3aed', // Purple  
      icon: `
        <!-- Key symbol -->
        <circle cx="16" cy="14" r="3" fill="white"/>
        <circle cx="16" cy="14" r="1.5" fill="#7c3aed"/>
        <rect x="15" y="17" width="2" height="4" fill="white"/>
        <rect x="17" y="19" width="2" height="1" fill="white"/>`
    },
    'resort': {
      color: '#dc2626', // Red
      icon: `
        <!-- Resort/Hotel building -->
        <rect x="12" y="12" width="8" height="8" fill="white"/>
        <rect x="13" y="13" width="2" height="2" fill="#dc2626"/>
        <rect x="15" y="13" width="2" height="2" fill="#dc2626"/>
        <rect x="17" y="13" width="2" height="2" fill="#dc2626"/>
        <rect x="13" y="15" width="2" height="2" fill="#dc2626"/>
        <rect x="17" y="15" width="2" height="2" fill="#dc2626"/>
        <rect x="15" y="17" width="2" height="3" fill="#dc2626"/>`
    }
  };
  
  const config = accessTypeConfig[accessType];
  
  return L.divIcon({
    html: `
      <div style="position: relative;">
        <svg width="32" height="40" viewBox="0 0 32 40" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
          <!-- Pin body -->
          <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="${config.color}"/>
          ${config.icon}
        </svg>
      </div>
    `,
    className: 'golf-pin-icon',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40]
  });
};

export default function GolfCourseMap({ courses, onStatusChange, filterStatus = 'all' }: GolfCourseMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
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
        { icon: createGolfPinIcon(course.accessType) }
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

  const handleStatusChange = (courseId: string, newStatus: CourseStatus) => {
    onStatusChange(courseId, newStatus);
    console.log(`Status changed for course ${courseId}: ${newStatus}`);
  };

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

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-md" />
      
      {/* Course Details Popup */}
      {selectedCourse && (
        <div className="absolute top-4 right-4 w-80 z-[1000]">
          <Card className="shadow-lg">
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className={getStatusColor(selectedCourse.status || 'not-played')}>
                    {getStatusLabel(selectedCourse.status || 'not-played')}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={selectedCourse.status === 'played' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(selectedCourse.id, 'played')}
                    className="text-xs"
                    data-testid={`button-status-played-${selectedCourse.id}`}
                  >
                    Played
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedCourse.status === 'want-to-play' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(selectedCourse.id, 'want-to-play')}
                    className="text-xs"
                    data-testid={`button-status-want-${selectedCourse.id}`}
                  >
                    Want to Play
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedCourse.status === 'not-played' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(selectedCourse.id, 'not-played')}
                    className="text-xs"
                    data-testid={`button-status-not-played-${selectedCourse.id}`}
                  >
                    Not Played
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}