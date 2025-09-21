import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GolfCourseWithStatus, CourseStatus, AccessType } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Star, Phone, Globe } from 'lucide-react';
import { playClickSound, handleInteractiveClick } from '@/utils/interactiveEffects';

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
      <!-- Beach umbrella with segments, leaning at angle -->
      <g transform="translate(12,12) rotate(15)">
        <!-- Left segment -->
        <path d="M -4.5 -3.5 Q -3 -5.5 -1 -5.8 Q -2 -2.8 -4.5 -2.2 Z" fill="${iconColor}" stroke="none"/>
        <!-- Left-center segment -->
        <path d="M -1.2 -5.8 Q 0 -6 1.2 -5.8 Q 0 -2.8 -1.2 -2.8 Z" fill="${iconColor}" stroke="none"/>
        <!-- Right-center segment -->
        <path d="M 1 -5.8 Q 3 -5.5 4.5 -3.5 Q 2 -2.8 1 -2.8 Z" fill="${iconColor}" stroke="none"/>
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
      <div class="map-icon-button" style="position: relative;">
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

// Custom cluster data structure
interface CustomCluster {
  id: string;
  courses: GolfCourseWithStatus[];
  centerPosition: L.LatLng;
  marker?: L.Marker;
}

// Custom cluster icon creation with golf theme - now for custom clusters
const createCustomClusterIcon = (courses: GolfCourseWithStatus[]): L.DivIcon => {
  const childCount = courses.length;

  // Determine cluster size based on child count - smaller thresholds for better grouping
  let size: 'small' | 'medium' | 'large';
  if (childCount <= 5) {
    size = 'small';
  } else if (childCount <= 12) {
    size = 'medium';
  } else {
    size = 'large';
  }

  // Calculate icon size based on cluster size
  const iconSize: number = size === 'small' ? 32 : size === 'medium' ? 40 : 50;

  return L.divIcon({
    html: `
      <div class="golf-cluster-${size}">
        <div class="golf-cluster-ball">
          <span class="cluster-count">${childCount}</span>
        </div>
      </div>
    `,
    className: 'golf-cluster-marker',
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2]
  });
};

// Find the most geographically central course within a cluster
// Returns the course with minimum total distance to all other courses
const findMostCentralCourse = (courses: GolfCourseWithStatus[]): L.LatLng => {
  if (courses.length === 0) return L.latLng(0, 0);
  if (courses.length === 1) {
    return L.latLng(parseFloat(courses[0].latitude), parseFloat(courses[0].longitude));
  }

  let centralCourse = courses[0];
  let minTotalDistance = Infinity;

  courses.forEach(candidateCourse => {
    const candidatePos = L.latLng(parseFloat(candidateCourse.latitude), parseFloat(candidateCourse.longitude));

    // Calculate total distance from this candidate to all other courses
    const totalDistance = courses.reduce((sum, otherCourse) => {
      if (candidateCourse === otherCourse) return sum;
      const otherPos = L.latLng(parseFloat(otherCourse.latitude), parseFloat(otherCourse.longitude));
      return sum + candidatePos.distanceTo(otherPos);
    }, 0);

    // Update if this candidate is more central
    if (totalDistance < minTotalDistance) {
      minTotalDistance = totalDistance;
      centralCourse = candidateCourse;
    }
  });

  return L.latLng(parseFloat(centralCourse.latitude), parseFloat(centralCourse.longitude));
};


// Get maximum geographic distance for clustering (in meters) - single source of truth for clustering decisions
const getMaxClusterDistance = (zoom: number): number => {
  // Progressive clustering thresholds based purely on geographic distance
  if (zoom <= 3) return 800000;   // 800km max - prevents Alaska/Continental US clustering
  if (zoom <= 4) return 500000;   // 500km max - regional clustering only
  if (zoom <= 5) return 200000;   // 200km max - multi-state regions (reduced from 300km)
  if (zoom <= 6) return 100000;   // 100km max - state-level clusters (reduced from 150km)
  if (zoom <= 7) return 50000;    // 50km max - metropolitan areas (increased from 30km for better grouping)
  if (zoom <= 8) return 15000;    // 15km max - city districts
  if (zoom <= 9) return 8000;     // 8km max - neighborhoods
  if (zoom <= 10) return 4000;    // 4km max - local areas
  if (zoom <= 11) return 2000;    // 2km max - very local areas
  return 1000; // 1km max for closest zoom levels
};

// Detect if coordinates are likely over major open water (basic ocean boundaries only)
const isOverWater = (lat: number, lng: number): boolean => {
  // Only prevent clusters truly over open ocean - removed coastal restrictions

  // Far Atlantic Ocean (well offshore)
  if (lng > -60) return true;

  // Far Pacific Ocean (well offshore)
  if (lng < -130) return true;

  // Gulf of Mexico (only southern offshore areas)
  if (lat < 26 && lng > -95 && lng < -82) return true;

  return false;
};

// Simplified bounds validation for cluster positions
const isValidClusterPosition = (lat: number, lng: number): boolean => {
  // Continental US bounds (simplified - no zoom dependency)
  const isWithinContinentalBounds = lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66;

  if (!isWithinContinentalBounds) return false;

  // Check if over major open water
  if (isOverWater(lat, lng)) return false;

  return true;
};



// Custom clustering algorithm - groups courses based on geographic distance
const createCustomClusters = (
  courses: GolfCourseWithStatus[],
  zoom: number,
  mapBounds: L.LatLngBounds,
  mapInstance: L.Map
): CustomCluster[] => {
  // No clustering at maximum zoom levels - show individual markers only
  if (zoom >= 15) {
    return courses.map((course, index) => ({
      id: `single-${course.id}-${index}`,
      courses: [course],
      centerPosition: L.latLng(parseFloat(course.latitude), parseFloat(course.longitude))
    }));
  }

  const clusters: CustomCluster[] = [];
  const used = new Set<string>();

  courses.forEach((course, index) => {
    if (used.has(course.id)) return;

    const coursePos = L.latLng(parseFloat(course.latitude), parseFloat(course.longitude));
    const clusterCourses: GolfCourseWithStatus[] = [course];
    used.add(course.id);

    // Find nearby courses within geographic distance threshold
    courses.forEach((otherCourse, otherIndex) => {
      if (otherIndex <= index || used.has(otherCourse.id)) return;

      const otherPos = L.latLng(parseFloat(otherCourse.latitude), parseFloat(otherCourse.longitude));

      // Calculate geographic distance between courses
      const distance = coursePos.distanceTo(otherPos);

      // Get maximum allowed distance for this zoom level
      const maxDistance = getMaxClusterDistance(zoom);

      // Use geographic distance for clustering decisions
      if (distance <= maxDistance) {
        clusterCourses.push(otherCourse);
        used.add(otherCourse.id);
      }
    });

    // Create cluster with central position and validate bounds
    const centerPosition = findMostCentralCourse(clusterCourses);

    // Simplified validation: basic bounds + water detection
    const lat = centerPosition.lat;
    const lng = centerPosition.lng;
    const isValidPosition = isValidClusterPosition(lat, lng);

    // Ensure cluster center is reasonable and close to actual courses
    const maxDistanceFromCenter = getMaxClusterDistance(zoom) * 0.5; // 50% of max clustering distance (reduced from 75%)
    const isReasonableCenter = clusterCourses.every(course => {
      const coursePos = L.latLng(parseFloat(course.latitude), parseFloat(course.longitude));
      const distanceFromCenter = centerPosition.distanceTo(coursePos);
      return distanceFromCenter <= maxDistanceFromCenter;
    });

    const hasNearbyActualCourse = clusterCourses.some(course => {
      const coursePos = L.latLng(parseFloat(course.latitude), parseFloat(course.longitude));
      return centerPosition.distanceTo(coursePos) <= maxDistanceFromCenter * 0.4; // Tightened from 0.5 to 0.4
    });

    if (isValidPosition && isReasonableCenter && hasNearbyActualCourse) {
      clusters.push({
        id: `cluster-${index}-${clusterCourses.length}`,
        courses: clusterCourses,
        centerPosition
      });
    } else {
      // If cluster center is invalid, create individual markers for each course
      clusterCourses.forEach((invalidCourse, courseIndex) => {
        clusters.push({
          id: `fallback-${invalidCourse.id}-${courseIndex}`,
          courses: [invalidCourse],
          centerPosition: L.latLng(parseFloat(invalidCourse.latitude), parseFloat(invalidCourse.longitude))
        });
      });
    }
  });

  return clusters;
};

// Create common marker event handlers
const attachMarkerEventHandlers = (
  marker: L.Marker,
  course: GolfCourseWithStatus,
  hoverTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  setPreviewCourse: (course: GolfCourseWithStatus | null) => void,
  setPreviewPosition: (position: { x: number, y: number } | null) => void,
  setSelectedCourse: (course: GolfCourseWithStatus | null) => void
) => {
  // Click handler for full details popup
  marker.on('click', (e) => {
    // Clear any hover preview immediately
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setPreviewCourse(null);
    setPreviewPosition(null);

    playClickSound();
    setSelectedCourse(course);
    // Stop event propagation to prevent map clicks
    L.DomEvent.stopPropagation(e);
  });

  // Hover handlers for preview
  marker.on('mouseover', (e) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set timeout for 175ms delay
    hoverTimeoutRef.current = setTimeout(() => {
      // Check if popup is open at the time of showing preview
      const isPopupOpen = document.querySelector('.golf-popup-card') !== null;
      if (isPopupOpen) return;

      const containerPoint = e.containerPoint;
      if (containerPoint) {
        setPreviewCourse(course);
        setPreviewPosition({
          x: containerPoint.x,
          y: containerPoint.y
        });
      }
    }, 175);
  });

  marker.on('mouseout', () => {
    // Cancel the timeout if mouse leaves before preview shows
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Hide preview if it's showing
    setPreviewCourse(null);
    setPreviewPosition(null);
  });
};

// Custom cluster event handlers with spiderfy-like behavior
const attachClusterEventHandlers = (
  marker: L.Marker,
  cluster: CustomCluster,
  mapInstance: L.Map,
  setSelectedCourse: (course: GolfCourseWithStatus | null) => void,
  iconScale: number,
  hoverTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  setPreviewCourse: (course: GolfCourseWithStatus | null) => void,
  setPreviewPosition: (position: { x: number, y: number } | null) => void
) => {
  marker.on('click', (e) => {
    playClickSound();

    // If single course, show details
    if (cluster.courses.length === 1) {
      setSelectedCourse(cluster.courses[0]);
    } else {
      const currentZoom = mapInstance.getZoom();

      // At high zoom levels (13+), spiderfy the cluster instead of zooming further
      if (currentZoom >= 13) {
        spiderfyCluster(cluster, mapInstance, iconScale, setSelectedCourse, hoverTimeoutRef, setPreviewCourse, setPreviewPosition);
      } else {
        // Multiple courses - zoom to central position
        mapInstance.setView(cluster.centerPosition, Math.min(currentZoom + 2, 15), {
          animate: true,
          duration: 0.5
        });
      }
    }

    // Stop event propagation
    L.DomEvent.stopPropagation(e);
  });

  // Show course count on hover for multi-course clusters
  if (cluster.courses.length > 1) {
    marker.on('mouseover', () => {
      marker.bindTooltip(`${cluster.courses.length} courses`, {
        permanent: false,
        direction: 'top',
        offset: [0, -10]
      }).openTooltip();
    });

    marker.on('mouseout', () => {
      marker.closeTooltip();
    });
  }
};

// Spiderfy cluster to show individual course markers
const spiderfyCluster = (
  cluster: CustomCluster,
  mapInstance: L.Map,
  iconScale: number,
  setSelectedCourse: (course: GolfCourseWithStatus | null) => void,
  hoverTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  setPreviewCourse: (course: GolfCourseWithStatus | null) => void,
  setPreviewPosition: (position: { x: number, y: number } | null) => void
) => {
  const centerPoint = mapInstance.latLngToLayerPoint(cluster.centerPosition);
  const radius = 60; // Pixels from center
  const courses = cluster.courses;

  // Remove cluster marker temporarily
  if (cluster.marker) {
    mapInstance.removeLayer(cluster.marker);
  }

  // Create spiderfied markers in a circle around the center
  const spiderMarkers: L.Marker[] = [];
  courses.forEach((course, index) => {
    const angle = (360 / courses.length) * index;
    const radian = (angle * Math.PI) / 180;

    // Calculate position around circle
    const offsetX = radius * Math.cos(radian);
    const offsetY = radius * Math.sin(radian);
    const spiderPoint = L.point(centerPoint.x + offsetX, centerPoint.y + offsetY);
    const spiderLatLng = mapInstance.layerPointToLatLng(spiderPoint);

    // Create individual course marker
    const spiderMarker = L.marker(spiderLatLng, {
      icon: createGolfPinIcon(course.accessType, course.status || 'not-played', iconScale)
    });

    // Add event handlers for individual course
    attachMarkerEventHandlers(
      spiderMarker,
      course,
      hoverTimeoutRef,
      setPreviewCourse,
      setPreviewPosition,
      setSelectedCourse
    );

    // Add connection line from center to marker
    const line = L.polyline([cluster.centerPosition, spiderLatLng], {
      color: 'rgba(26, 77, 51, 0.6)',
      weight: 1.5,
      opacity: 0.8
    });

    mapInstance.addLayer(line);
    mapInstance.addLayer(spiderMarker);
    spiderMarkers.push(spiderMarker);

    // Store line reference for cleanup
    (spiderMarker as any)._spiderLine = line;
  });

  // Add click handler to map to unspiderfy when clicking elsewhere
  const unspiderfyHandler = () => {
    // Remove all spider markers and lines
    spiderMarkers.forEach(spiderMarker => {
      mapInstance.removeLayer(spiderMarker);
      if ((spiderMarker as any)._spiderLine) {
        mapInstance.removeLayer((spiderMarker as any)._spiderLine);
      }
    });

    // Restore cluster marker
    if (cluster.marker) {
      mapInstance.addLayer(cluster.marker);
    }

    // Remove this handler
    mapInstance.off('click', unspiderfyHandler);
  };

  // Add the unspiderfy handler with a small delay to avoid immediate triggering
  setTimeout(() => {
    mapInstance.on('click', unspiderfyHandler);
  }, 100);
};


export default function GolfCourseMap({ courses, onStatusChange, filterStatus = 'all' }: GolfCourseMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const clustersRef = useRef<CustomCluster[]>([]);
  const outlierMarkersRef = useRef<L.Marker[]>([]);
  const popupRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [selectedCourse, setSelectedCourse] = useState<GolfCourseWithStatus | null>(null);
  const [previewCourse, setPreviewCourse] = useState<GolfCourseWithStatus | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ x: number, y: number } | null>(null);
  const [iconScale, setIconScale] = useState<number>(1);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter courses by status only - keep all geographic locations
  const filteredCourses = useMemo(() => {
    return courses.filter(course =>
      filterStatus === 'all' || course.status === filterStatus
    );
  }, [courses, filterStatus]);

  // Separate courses for clustering vs individual display
  const { clusterableCourses, outlierCourses } = useMemo(() => {
    const clusterable: GolfCourseWithStatus[] = [];
    const outliers: GolfCourseWithStatus[] = [];

    filteredCourses.forEach(course => {
      const lat = parseFloat(course.latitude);
      const lng = parseFloat(course.longitude);

      // Continental US bounds: roughly 24-49°N latitude, -125 to -66°W longitude
      const isWithinUSBounds = lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66;

      if (isWithinUSBounds) {
        clusterable.push(course);
      } else {
        outliers.push(course);
      }
    });

    return { clusterableCourses: clusterable, outlierCourses: outliers };
  }, [filteredCourses]);

  // Calculate scale factor based on zoom level (max 450%)
  const calculateIconScale = (zoom: number, isMobile: boolean = false): number => {
    // Base zoom is 4, scale linearly up to max at higher zooms
    // Mobile gets larger base size for better touch targets
    const baseZoom = 4;
    const maxZoom = 10;
    const minScale = isMobile ? 1.2 : 1.0; // Larger base size on mobile
    const maxScale = isMobile ? 5.0 : 4.5; // Larger max size on mobile

    if (zoom <= baseZoom) return minScale;
    if (zoom >= maxZoom) return maxScale;

    const progress = (zoom - baseZoom) / (maxZoom - baseZoom);
    return minScale + (maxScale - minScale) * progress;
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [39.8283, -98.5795], // Center of US
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: true,
        // Enhanced touch support for iOS
        tapTolerance: 15,
        touchZoom: true,
        bounceAtZoomLimits: false,
        // Improve mobile performance
        preferCanvas: true,
        // Disable hover previews on mobile
        dragging: !('ontouchstart' in window)
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        // Mobile optimizations
        maxZoom: 18,
        tileSize: 256,
        zoomOffset: 0
      }).addTo(mapInstanceRef.current);

      // Custom zoom control positioned for mobile
      if (mapInstanceRef.current.zoomControl) {
        mapInstanceRef.current.zoomControl.setPosition('bottomright');
      }

      // Add zoom event listener to update icon scale and re-cluster
      mapInstanceRef.current.on('zoomend', () => {
        const currentZoom = mapInstanceRef.current!.getZoom();
        const isMobile = window.innerWidth < 1024;
        const newScale = calculateIconScale(currentZoom, isMobile);
        setIconScale(newScale);
        // Re-clustering happens automatically via useEffect dependency on iconScale
      });

      // Set initial scale based on initial zoom
      const initialZoom = mapInstanceRef.current.getZoom();
      const isMobile = window.innerWidth < 1024;
      const initialScale = calculateIconScale(initialZoom, isMobile);
      setIconScale(initialScale);

      // Custom clustering will be managed in the marker update section
    }

    // Clear all existing markers
    markersRef.current.forEach(marker => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(marker);
      }
    });
    markersRef.current = [];

    // Clear existing clusters
    clustersRef.current.forEach(cluster => {
      if (cluster.marker && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(cluster.marker);
      }
    });
    clustersRef.current = [];

    // Clear outlier markers
    outlierMarkersRef.current.forEach(marker => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(marker);
      }
    });
    outlierMarkersRef.current = [];

    if (!mapInstanceRef.current) return;

    const currentZoom = mapInstanceRef.current.getZoom();
    const mapBounds = mapInstanceRef.current.getBounds();

    // Create custom clusters for clusterable courses
    const clusters = createCustomClusters(clusterableCourses, currentZoom, mapBounds, mapInstanceRef.current);
    clustersRef.current = clusters;

    // Add cluster markers to map
    clusters.forEach(cluster => {
      if (cluster.courses.length === 1) {
        // Single course - use regular golf pin icon
        const course = cluster.courses[0];
        const marker = L.marker(
          [cluster.centerPosition.lat, cluster.centerPosition.lng],
          { icon: createGolfPinIcon(course.accessType, course.status || 'not-played', iconScale) }
        );

        // Attach individual course event handlers
        attachMarkerEventHandlers(
          marker,
          course,
          hoverTimeoutRef,
          setPreviewCourse,
          setPreviewPosition,
          setSelectedCourse
        );

        cluster.marker = marker;
        mapInstanceRef.current.addLayer(marker);
        markersRef.current.push(marker);
      } else {
        // Multiple courses - use cluster icon
        const clusterIcon = createCustomClusterIcon(cluster.courses);
        const marker = L.marker(
          [cluster.centerPosition.lat, cluster.centerPosition.lng],
          { icon: clusterIcon }
        );

        // Attach cluster event handlers
        attachClusterEventHandlers(
          marker,
          cluster,
          mapInstanceRef.current,
          setSelectedCourse,
          iconScale,
          hoverTimeoutRef,
          setPreviewCourse,
          setPreviewPosition
        );

        cluster.marker = marker;
        mapInstanceRef.current.addLayer(marker);
        markersRef.current.push(marker);
      }
    });

    // Add outlier courses as individual markers (no clustering)
    outlierCourses.forEach(course => {
      const marker = L.marker(
        [parseFloat(course.latitude), parseFloat(course.longitude)],
        { icon: createGolfPinIcon(course.accessType, course.status || 'not-played', iconScale) }
      );

      // Attach individual course event handlers
      attachMarkerEventHandlers(
        marker,
        course,
        hoverTimeoutRef,
        setPreviewCourse,
        setPreviewPosition,
        setSelectedCourse
      );

      mapInstanceRef.current.addLayer(marker);
      markersRef.current.push(marker);
      outlierMarkersRef.current.push(marker);
    });

    return () => {
      // Cleanup all markers
      markersRef.current.forEach(marker => {
        if (mapInstanceRef.current && marker) {
          mapInstanceRef.current.removeLayer(marker);
        }
      });
      markersRef.current = [];

      // Clear clusters
      clustersRef.current.forEach(cluster => {
        if (cluster.marker && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(cluster.marker);
        }
      });
      clustersRef.current = [];

      // Clear outlier markers
      outlierMarkersRef.current.forEach(marker => {
        if (mapInstanceRef.current && marker) {
          mapInstanceRef.current.removeLayer(marker);
        }
      });
      outlierMarkersRef.current = [];
    };
  }, [filteredCourses, iconScale]); // Removed selectedCourse and onStatusChange to prevent marker recreation

  // Handle outside clicks to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedCourse && popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setSelectedCourse(null);
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
        <div ref={popupRef} className="absolute top-4 left-4 right-4 lg:top-4 lg:right-4 lg:left-auto lg:w-80 z-[1000] pointer-events-auto max-w-sm lg:max-w-none" data-testid="course-details-popup">
          <Card className="shadow-lg pointer-events-auto golf-popup-card">
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
                  className="enhanced-button"
                  onClick={(e) => handleInteractiveClick(e, () => setSelectedCourse(null))}
                  data-testid="button-close-popup"
                >
                  <span className="icon-element">×</span>
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
                        onClick={(e) => handleInteractiveClick(e, () => handleStatusChange(selectedCourse.id, 'played'))}
                        className={`${playedProps.className} enhanced-button`}
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
                        onClick={(e) => handleInteractiveClick(e, () => handleStatusChange(selectedCourse.id, 'want-to-play'))}
                        className={`${wantProps.className} enhanced-button`}
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
                        onClick={(e) => handleInteractiveClick(e, () => handleStatusChange(selectedCourse.id, 'not-played'))}
                        className={`${notPlayedProps.className} enhanced-button`}
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
      
      {/* Hover Preview - Lightweight and non-interactive */}
      {previewCourse && previewPosition && !selectedCourse && (
        <div 
          ref={previewRef}
          className="absolute z-[999] pointer-events-none"
          style={{
            left: `${previewPosition.x + 20}px`,
            top: `${previewPosition.y - 10}px`,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="bg-popover text-popover-foreground rounded-md shadow-lg border p-3 max-w-[200px]">
            <div className="space-y-1">
              <div className="font-semibold text-sm leading-tight">
                {previewCourse.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {previewCourse.location}
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Badge className={`text-[10px] py-0 px-1 ${getCourseTypeColor(previewCourse.accessType)}`}>
                  {getCourseTypeLabel(previewCourse.accessType)}
                </Badge>
                <Badge className="text-[10px] py-0 px-1" style={getStatusColor(previewCourse.status || 'not-played')}>
                  {getStatusLabel(previewCourse.status || 'not-played')}
                </Badge>
              </div>
              {previewCourse.rating && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Star className="w-3 h-3 fill-golf-want text-golf-want" />
                  <span>{previewCourse.rating}</span>
                </div>
              )}
              <div className="text-[10px] text-muted-foreground italic mt-2">
                Click for full details
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}