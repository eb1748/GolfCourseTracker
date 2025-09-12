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

// Custom golf pin icon SVG based on access type, status, and zoom scale
const createGolfPinIcon = (accessType: AccessType, status: CourseStatus, scale: number = 1) => {
  // Status-based colors (matching golf theme colors)
  const statusColors = {
    'played': '#1a4d33', // hsl(142, 60%, 25%) - Dark green
    'want-to-play': '#d4af37', // hsl(45, 85%, 55%) - Gold/yellow
    'not-played': '#ffffff' // White
  };
  
  // Icon color based on status (white for played/want-to-play, black for not-played)
  const iconColor = status === 'not-played' ? 'black' : 'white';
  
  // Access type-based icons (optimized for golf ball shape)
  const accessTypeIcons = {
    'public': `
      <!-- Golf flag (simplified) -->
      <rect x="10.25" y="6" width="1.5" height="9" fill="${iconColor}"/>
      <path d="M11.75 6 L18.25 7.5 L11.75 10.5 Z" fill="${iconColor}"/>`,
    'private': `
      <!-- Padlock symbol (simplified) -->
      <rect x="9.5" y="11" width="5" height="4.5" rx="0.5" fill="${iconColor}"/>
      <path d="M10.5 11 L10.5 9.5 Q10.5 8 12 8 Q13.5 8 13.5 9.5 L13.5 11" stroke="${iconColor}" stroke-width="1.2" fill="none"/>
      <circle cx="12" cy="13" r="0.8" fill="${statusColors[status]}"/>`,
    'resort': `
      <!-- Beach umbrella with segments -->
      <g transform="translate(12,12)">
        <!-- Umbrella segments -->
        <path d="M -4.5 -4 Q -3 -6 0 -6 Q 1.5 -5.5 3 -4 Q 1.5 -2.5 0 -2.5 Q -1.5 -2.5 -4.5 -4" fill="${iconColor}" stroke="none"/>
        <path d="M 0 -6 Q 1.5 -6 4.5 -4 Q 3 -2.5 0 -2.5 Q -1.5 -2.5 0 -6" fill="${iconColor}" stroke="none"/>
        <path d="M -4.5 -4 Q -1.5 -2.5 0 -2.5 Q -1.5 -1 -4.5 -2.5 Q -4.5 -3.25 -4.5 -4" fill="${iconColor}" stroke="none"/>
        <path d="M 4.5 -4 Q 1.5 -2.5 0 -2.5 Q 1.5 -1 4.5 -2.5 Q 4.5 -3.25 4.5 -4" fill="${iconColor}" stroke="none"/>
        <!-- Umbrella pole -->
        <rect x="-0.3" y="-2.5" width="0.6" height="5" fill="${iconColor}"/>
        <!-- Ground base -->
        <ellipse cx="0" cy="2.8" rx="2" ry="0.4" fill="${iconColor}"/>
      </g>`
  };
  
  const color = statusColors[status];
  const icon = accessTypeIcons[accessType];
  
  // Calculate scaled dimensions (base size 24x24)
  const baseSize = 24;
  const scaledSize = Math.round(baseSize * scale);
  const halfSize = Math.round(scaledSize / 2);
  
  return L.divIcon({
    html: `
      <div style="position: relative;">
        <svg width="${scaledSize}" height="${scaledSize}" viewBox="0 0 24 24" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));">
          <!-- Golf ball body with gradient -->
          <defs>
            <radialGradient id="ballGradient-${status}" cx="0.35" cy="0.35" r="0.8">
              <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
              <stop offset="70%" stop-color="${color}" stop-opacity="0.95"/>
              <stop offset="100%" stop-color="rgba(0,0,0,0.15)" stop-opacity="1"/>
            </radialGradient>
          </defs>
          <circle cx="12" cy="12" r="11" fill="url(#ballGradient-${status})" stroke="rgba(0,0,0,0.3)" stroke-width="0.4"/>
          
          <!-- Realistic dimples - crescent shapes arranged in curved rows -->
          <!-- Outermost perimeter row - very close to edge -->
          <path d="M 6 4.8 A 0.6 0.6 0 0 1 6.6 5.4 A 0.6 0.6 0 0 1 6 6" stroke="rgba(0,0,0,0.35)" stroke-width="0.25" fill="none"/>
          <path d="M 9 3.5 A 0.7 0.7 0 0 1 9.7 4.2 A 0.7 0.7 0 0 1 9 4.9" stroke="rgba(0,0,0,0.38)" stroke-width="0.25" fill="none"/>
          <path d="M 12 3 A 0.8 0.8 0 0 1 12.8 3.8 A 0.8 0.8 0 0 1 12 4.6" stroke="rgba(0,0,0,0.4)" stroke-width="0.25" fill="none"/>
          <path d="M 15 3.5 A 0.7 0.7 0 0 1 15.7 4.2 A 0.7 0.7 0 0 1 15 4.9" stroke="rgba(0,0,0,0.38)" stroke-width="0.25" fill="none"/>
          <path d="M 18 4.8 A 0.6 0.6 0 0 1 18.6 5.4 A 0.6 0.6 0 0 1 18 6" stroke="rgba(0,0,0,0.35)" stroke-width="0.25" fill="none"/>
          
          <!-- Left and right edge dimples -->
          <path d="M 3.5 9 A 0.7 0.7 0 0 1 4.2 9.7 A 0.7 0.7 0 0 1 3.5 10.4" stroke="rgba(0,0,0,0.36)" stroke-width="0.25" fill="none"/>
          <path d="M 3 12 A 0.8 0.8 0 0 1 3.8 12.8 A 0.8 0.8 0 0 1 3 13.6" stroke="rgba(0,0,0,0.38)" stroke-width="0.25" fill="none"/>
          <path d="M 3.5 15 A 0.7 0.7 0 0 1 4.2 15.7 A 0.7 0.7 0 0 1 3.5 16.4" stroke="rgba(0,0,0,0.36)" stroke-width="0.25" fill="none"/>
          <path d="M 20.5 9 A 0.7 0.7 0 0 1 21.2 9.7 A 0.7 0.7 0 0 1 20.5 10.4" stroke="rgba(0,0,0,0.34)" stroke-width="0.25" fill="none"/>
          <path d="M 21 12 A 0.8 0.8 0 0 1 21.8 12.8 A 0.8 0.8 0 0 1 21 13.6" stroke="rgba(0,0,0,0.36)" stroke-width="0.25" fill="none"/>
          <path d="M 20.5 15 A 0.7 0.7 0 0 1 21.2 15.7 A 0.7 0.7 0 0 1 20.5 16.4" stroke="rgba(0,0,0,0.34)" stroke-width="0.25" fill="none"/>
          
          <!-- Bottom perimeter row -->
          <path d="M 6 18 A 0.6 0.6 0 0 1 6.6 18.6 A 0.6 0.6 0 0 1 6 19.2" stroke="rgba(0,0,0,0.33)" stroke-width="0.25" fill="none"/>
          <path d="M 9 19.5 A 0.7 0.7 0 0 1 9.7 20.2 A 0.7 0.7 0 0 1 9 20.9" stroke="rgba(0,0,0,0.35)" stroke-width="0.25" fill="none"/>
          <path d="M 12 21 A 0.8 0.8 0 0 1 12.8 21.8 A 0.8 0.8 0 0 1 12 22.6" stroke="rgba(0,0,0,0.36)" stroke-width="0.25" fill="none"/>
          <path d="M 15 19.5 A 0.7 0.7 0 0 1 15.7 20.2 A 0.7 0.7 0 0 1 15 20.9" stroke="rgba(0,0,0,0.35)" stroke-width="0.25" fill="none"/>
          <path d="M 18 18 A 0.6 0.6 0 0 1 18.6 18.6 A 0.6 0.6 0 0 1 18 19.2" stroke="rgba(0,0,0,0.33)" stroke-width="0.25" fill="none"/>
          
          <!-- Top arc row -->
          <path d="M 8.5 5.5 A 0.8 0.8 0 0 1 9.3 6.3 A 0.8 0.8 0 0 1 8.5 7.1" stroke="rgba(0,0,0,0.4)" stroke-width="0.3" fill="none"/>
          <path d="M 11 5 A 0.9 0.9 0 0 1 11.9 5.9 A 0.9 0.9 0 0 1 11 6.8" stroke="rgba(0,0,0,0.45)" stroke-width="0.3" fill="none"/>
          <path d="M 13 5 A 0.9 0.9 0 0 1 13.9 5.9 A 0.9 0.9 0 0 1 13 6.8" stroke="rgba(0,0,0,0.45)" stroke-width="0.3" fill="none"/>
          <path d="M 15.5 5.5 A 0.8 0.8 0 0 1 16.3 6.3 A 0.8 0.8 0 0 1 15.5 7.1" stroke="rgba(0,0,0,0.4)" stroke-width="0.3" fill="none"/>
          
          <!-- Upper-middle arc row -->
          <path d="M 6.8 8 A 0.7 0.7 0 0 1 7.5 8.7 A 0.7 0.7 0 0 1 6.8 9.4" stroke="rgba(0,0,0,0.38)" stroke-width="0.3" fill="none"/>
          <path d="M 9.2 7.5 A 0.8 0.8 0 0 1 10 8.3 A 0.8 0.8 0 0 1 9.2 9.1" stroke="rgba(0,0,0,0.4)" stroke-width="0.3" fill="none"/>
          <path d="M 11.5 7.2 A 0.9 0.9 0 0 1 12.4 8.1 A 0.9 0.9 0 0 1 11.5 9" stroke="rgba(0,0,0,0.42)" stroke-width="0.3" fill="none"/>
          <path d="M 14 7.5 A 0.8 0.8 0 0 1 14.8 8.3 A 0.8 0.8 0 0 1 14 9.1" stroke="rgba(0,0,0,0.4)" stroke-width="0.3" fill="none"/>
          <path d="M 16.5 8.2 A 0.7 0.7 0 0 1 17.2 8.9 A 0.7 0.7 0 0 1 16.5 9.6" stroke="rgba(0,0,0,0.38)" stroke-width="0.3" fill="none"/>
          
          <!-- Middle arc row -->
          <path d="M 6 11 A 0.8 0.8 0 0 1 6.8 11.8 A 0.8 0.8 0 0 1 6 12.6" stroke="rgba(0,0,0,0.4)" stroke-width="0.3" fill="none"/>
          <path d="M 8.5 10.2 A 0.9 0.9 0 0 1 9.4 11.1 A 0.9 0.9 0 0 1 8.5 12" stroke="rgba(0,0,0,0.42)" stroke-width="0.3" fill="none"/>
          <path d="M 11 9.8 A 1 1 0 0 1 12 10.8 A 1 1 0 0 1 11 11.8" stroke="rgba(0,0,0,0.45)" stroke-width="0.3" fill="none"/>
          <path d="M 13.5 10 A 0.9 0.9 0 0 1 14.4 10.9 A 0.9 0.9 0 0 1 13.5 11.8" stroke="rgba(0,0,0,0.43)" stroke-width="0.3" fill="none"/>
          <path d="M 16 10.8 A 0.8 0.8 0 0 1 16.8 11.6 A 0.8 0.8 0 0 1 16 12.4" stroke="rgba(0,0,0,0.41)" stroke-width="0.3" fill="none"/>
          
          <!-- Lower-middle arc row -->
          <path d="M 6.2 14 A 0.7 0.7 0 0 1 6.9 14.7 A 0.7 0.7 0 0 1 6.2 15.4" stroke="rgba(0,0,0,0.38)" stroke-width="0.3" fill="none"/>
          <path d="M 8.8 13.2 A 0.8 0.8 0 0 1 9.6 14 A 0.8 0.8 0 0 1 8.8 14.8" stroke="rgba(0,0,0,0.4)" stroke-width="0.3" fill="none"/>
          <path d="M 11.2 12.8 A 0.9 0.9 0 0 1 12.1 13.7 A 0.9 0.9 0 0 1 11.2 14.6" stroke="rgba(0,0,0,0.42)" stroke-width="0.3" fill="none"/>
          <path d="M 13.8 13 A 0.8 0.8 0 0 1 14.6 13.8 A 0.8 0.8 0 0 1 13.8 14.6" stroke="rgba(0,0,0,0.41)" stroke-width="0.3" fill="none"/>
          <path d="M 16.2 13.5 A 0.7 0.7 0 0 1 16.9 14.2 A 0.7 0.7 0 0 1 16.2 14.9" stroke="rgba(0,0,0,0.39)" stroke-width="0.3" fill="none"/>
          
          <!-- Bottom arc row -->
          <path d="M 8 16.5 A 0.7 0.7 0 0 1 8.7 17.2 A 0.7 0.7 0 0 1 8 17.9" stroke="rgba(0,0,0,0.37)" stroke-width="0.3" fill="none"/>
          <path d="M 10.5 16.8 A 0.8 0.8 0 0 1 11.3 17.6 A 0.8 0.8 0 0 1 10.5 18.4" stroke="rgba(0,0,0,0.39)" stroke-width="0.3" fill="none"/>
          <path d="M 13 17 A 0.8 0.8 0 0 1 13.8 17.8 A 0.8 0.8 0 0 1 13 18.6" stroke="rgba(0,0,0,0.38)" stroke-width="0.3" fill="none"/>
          <path d="M 15.2 17.2 A 0.7 0.7 0 0 1 15.9 17.9 A 0.7 0.7 0 0 1 15.2 18.6" stroke="rgba(0,0,0,0.36)" stroke-width="0.3" fill="none"/>
          
          <!-- Additional scattered dimples for density -->
          <path d="M 7.5 12.5 A 0.5 0.5 0 0 1 8 13 A 0.5 0.5 0 0 1 7.5 13.5" stroke="rgba(0,0,0,0.35)" stroke-width="0.25" fill="none"/>
          <path d="M 9.8 15.2 A 0.6 0.6 0 0 1 10.4 15.8 A 0.6 0.6 0 0 1 9.8 16.4" stroke="rgba(0,0,0,0.36)" stroke-width="0.25" fill="none"/>
          <path d="M 12.5 15.8 A 0.5 0.5 0 0 1 13 16.3 A 0.5 0.5 0 0 1 12.5 16.8" stroke="rgba(0,0,0,0.35)" stroke-width="0.25" fill="none"/>
          <path d="M 15.8 11.2 A 0.5 0.5 0 0 1 16.3 11.7 A 0.5 0.5 0 0 1 15.8 12.2" stroke="rgba(0,0,0,0.34)" stroke-width="0.25" fill="none"/>
          <path d="M 10.2 12.8 A 0.4 0.4 0 0 1 10.6 13.2 A 0.4 0.4 0 0 1 10.2 13.6" stroke="rgba(0,0,0,0.13)" stroke-width="0.25" fill="none"/>
          
          <!-- Near-edge corner dimples -->
          <path d="M 4.5 6.5 A 0.5 0.5 0 0 1 5 7 A 0.5 0.5 0 0 1 4.5 7.5" stroke="rgba(0,0,0,0.14)" stroke-width="0.25" fill="none"/>
          <path d="M 19.5 6.5 A 0.5 0.5 0 0 1 20 7 A 0.5 0.5 0 0 1 19.5 7.5" stroke="rgba(0,0,0,0.12)" stroke-width="0.25" fill="none"/>
          <path d="M 4.5 17.5 A 0.5 0.5 0 0 1 5 18 A 0.5 0.5 0 0 1 4.5 18.5" stroke="rgba(0,0,0,0.12)" stroke-width="0.25" fill="none"/>
          <path d="M 19.5 17.5 A 0.5 0.5 0 0 1 20 18 A 0.5 0.5 0 0 1 19.5 18.5" stroke="rgba(0,0,0,0.11)" stroke-width="0.25" fill="none"/>
          
          <!-- Access type icon -->
          ${icon}
        </svg>
      </div>
    `,
    className: 'golf-ball-icon',
    iconSize: [scaledSize, scaledSize],
    iconAnchor: [halfSize, halfSize],
    popupAnchor: [0, -halfSize]
  });
};

export default function GolfCourseMap({ courses, onStatusChange, filterStatus = 'all' }: GolfCourseMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const popupRef = useRef<HTMLDivElement>(null);
  const [selectedCourse, setSelectedCourse] = useState<GolfCourseWithStatus | null>(null);
  const [iconScale, setIconScale] = useState<number>(1);

  const filteredCourses = courses.filter(course => 
    filterStatus === 'all' || course.status === filterStatus
  );

  // Calculate scale factor based on zoom level (max 450%)
  const calculateIconScale = (zoom: number): number => {
    // Base zoom is 4, scale linearly up to max 4.5x at higher zooms
    // At zoom 4: scale = 1.0
    // At zoom 10 and above: scale = 4.5 (450%)
    const baseZoom = 4;
    const maxZoom = 10;
    const minScale = 1.0;
    const maxScale = 4.5;
    
    if (zoom <= baseZoom) return minScale;
    if (zoom >= maxZoom) return maxScale;
    
    const progress = (zoom - baseZoom) / (maxZoom - baseZoom);
    return minScale + (maxScale - minScale) * progress;
  };

  // Function to update all markers with new scale
  const updateMarkersScale = (scale: number) => {
    markersRef.current.forEach(marker => {
      const course = filteredCourses.find(c => 
        marker.getLatLng().lat === parseFloat(c.latitude) && 
        marker.getLatLng().lng === parseFloat(c.longitude)
      );
      if (course) {
        const newIcon = createGolfPinIcon(course.accessType, course.status || 'not-played', scale);
        marker.setIcon(newIcon);
      }
    });
  };

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

      // Add zoom event listener to update icon sizes
      mapInstanceRef.current.on('zoomend', () => {
        const currentZoom = mapInstanceRef.current!.getZoom();
        const newScale = calculateIconScale(currentZoom);
        setIconScale(newScale);
        updateMarkersScale(newScale);
      });

      // Set initial scale based on initial zoom
      const initialZoom = mapInstanceRef.current.getZoom();
      const initialScale = calculateIconScale(initialZoom);
      setIconScale(initialScale);
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for filtered courses with current scale
    filteredCourses.forEach(course => {
      const marker = L.marker(
        [parseFloat(course.latitude), parseFloat(course.longitude)],
        { icon: createGolfPinIcon(course.accessType, course.status || 'not-played', iconScale) }
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
  }, [filteredCourses, iconScale]);

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