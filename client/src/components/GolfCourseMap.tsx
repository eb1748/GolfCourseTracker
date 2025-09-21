import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
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

// Custom cluster icon creation with golf theme and improved positioning
const createClusterIcon = (cluster: L.MarkerCluster): L.DivIcon => {
  const childCount = cluster.getChildCount();
  const childMarkers = cluster.getAllChildMarkers();

  // Store the most central course position for proper click handling
  if (childMarkers.length > 1) {
    const centralPosition = findMostCentralCourse(childMarkers);
    (cluster as any)._centralPosition = centralPosition;
    console.log(`🎯 Stored central position for cluster with ${childCount} courses: ${centralPosition.lat.toFixed(6)}, ${centralPosition.lng.toFixed(6)}`);
  }

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

// Create land-validated cluster positioning function
// Most central course positioning - uses actual course coordinates to avoid projection issues
// Finds the course with minimum total distance to all other courses in the cluster
const findMostCentralCourse = (markers: L.Marker[]): L.LatLng => {
  if (markers.length === 0) return L.latLng(0, 0);
  if (markers.length === 1) return markers[0].getLatLng();

  let centralMarker = markers[0];
  let minTotalDistance = Infinity;

  markers.forEach(candidateMarker => {
    // Calculate total distance from this candidate to all other markers
    const totalDistance = markers.reduce((sum, otherMarker) => {
      if (candidateMarker === otherMarker) return sum;
      return sum + candidateMarker.getLatLng().distanceTo(otherMarker.getLatLng());
    }, 0);

    // Update if this candidate is more central
    if (totalDistance < minTotalDistance) {
      minTotalDistance = totalDistance;
      centralMarker = candidateMarker;
    }
  });

  const centralPosition = centralMarker.getLatLng();
  console.log(`🎯 Most central course selected for ${markers.length} markers: ${centralPosition.lat.toFixed(6)}, ${centralPosition.lng.toFixed(6)} (total distance: ${minTotalDistance.toFixed(0)}m)`);

  return centralPosition;
};

// Anti-collision system for overlapping markers at close zoom levels
const detectOverlappingMarkers = (markers: L.Marker[], zoom: number): { marker: L.Marker, conflicts: L.Marker[] }[] => {
  const iconSize = calculateIconScale(zoom, window.innerWidth < 1024) * 25; // Base icon size scaled
  const minDistance = iconSize * 1.5; // Minimum distance to avoid overlap
  const overlaps: { marker: L.Marker, conflicts: L.Marker[] }[] = [];

  markers.forEach(marker => {
    const conflicts = markers.filter(other => {
      if (marker === other) return false;
      const distance = marker.getLatLng().distanceTo(other.getLatLng());
      return distance < minDistance;
    });

    if (conflicts.length > 0) {
      overlaps.push({ marker, conflicts });
    }
  });

  return overlaps;
};

const calculateAntiCollisionOffset = (
  marker: L.Marker,
  conflicts: L.Marker[],
  index: number,
  zoom: number
): { lat: number, lng: number } => {
  const iconSize = calculateIconScale(zoom, window.innerWidth < 1024) * 25;
  const separationDistance = iconSize * 2; // 2x icon size separation

  // Calculate offset in radial pattern to avoid overlaps
  const angle = (2 * Math.PI * index) / (conflicts.length + 1);
  const offsetMeters = separationDistance;

  // Convert meters to degrees (approximate)
  const latOffset = (offsetMeters / 111000) * Math.cos(angle); // ~111km per degree lat
  const lngOffset = (offsetMeters / (111000 * Math.cos(marker.getLatLng().lat * Math.PI / 180))) * Math.sin(angle);

  return { lat: latOffset, lng: lngOffset };
};

const applyAntiCollisionPositioning = (markers: L.Marker[], zoom: number): { marker: L.Marker, originalPosition: L.LatLng, newPosition: L.LatLng }[] => {
  // Only apply anti-collision at very close zoom levels
  if (zoom < 11) return [];

  const overlaps = detectOverlappingMarkers(markers, zoom);
  const displacements: { marker: L.Marker, originalPosition: L.LatLng, newPosition: L.LatLng }[] = [];

  overlaps.forEach(({ marker, conflicts }, index) => {
    const originalPosition = marker.getLatLng();
    const offset = calculateAntiCollisionOffset(marker, conflicts, index, zoom);
    const newPosition = L.latLng(
      originalPosition.lat + offset.lat,
      originalPosition.lng + offset.lng
    );

    // Apply the offset to the marker
    marker.setLatLng(newPosition);
    displacements.push({ marker, originalPosition, newPosition });

    console.log(`🚧 Anti-collision: Moved ${marker.options.alt || 'marker'} by ${offset.lat.toFixed(6)}, ${offset.lng.toFixed(6)}`);
  });

  return displacements;
};

// SVG Leader Lines for displaced markers
const createLeaderLine = (
  originalPosition: L.LatLng,
  newPosition: L.LatLng,
  map: L.Map
): L.Polyline => {
  const leaderLine = L.polyline(
    [originalPosition, newPosition],
    {
      color: '#d4af37', // Golf-themed gold color
      weight: 2,
      opacity: 0.7,
      dashArray: '5, 8', // Dotted line pattern
      className: 'golf-leader-line'
    }
  );

  leaderLine.addTo(map);
  console.log(`🔗 Leader line created from ${originalPosition.lat.toFixed(6)}, ${originalPosition.lng.toFixed(6)} to ${newPosition.lat.toFixed(6)}, ${newPosition.lng.toFixed(6)}`);

  return leaderLine;
};

const addLeaderLines = (
  displacements: { marker: L.Marker, originalPosition: L.LatLng, newPosition: L.LatLng }[],
  map: L.Map,
  leaderLinesRef: React.MutableRefObject<L.Polyline[]>
): void => {
  // Clear existing leader lines
  removeLeaderLines(map, leaderLinesRef);

  // Create new leader lines for displaced markers
  displacements.forEach(({ originalPosition, newPosition }) => {
    const leaderLine = createLeaderLine(originalPosition, newPosition, map);
    leaderLinesRef.current.push(leaderLine);
  });

  console.log(`📏 Added ${displacements.length} leader lines`);
};

const removeLeaderLines = (
  map: L.Map,
  leaderLinesRef: React.MutableRefObject<L.Polyline[]>
): void => {
  leaderLinesRef.current.forEach(line => {
    map.removeLayer(line);
  });
  leaderLinesRef.current = [];
  console.log(`🧹 Removed all leader lines`);
};

const createClusterGroup = (
  iconCreateFunction: (cluster: L.MarkerCluster) => L.DivIcon,
  mapInstance: L.Map
): L.MarkerClusterGroup => {
  // Create a standard cluster group with custom icon function
  const clusterGroup = L.markerClusterGroup({
    iconCreateFunction: iconCreateFunction,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: true,
    zoomToBoundsOnClick: false, // Disable default to implement custom behavior
    spiderfyDistanceMultiplier: 1.5,
    chunkedLoading: true,
    chunkProgress: null,
    maxClusterRadius: (zoom: number) => {
      // Progressive declustering - more aggressive separation at close zoom levels
      // Ensures courses like Winged Foot separate naturally without anti-collision
      if (zoom <= 3) return 80;  // World view clustering
      if (zoom <= 4) return 60;  // Continental clustering
      if (zoom <= 5) return 40;  // Regional clustering (reduced)
      if (zoom <= 6) return 25;  // State-level clustering (reduced)
      if (zoom <= 7) return 18;  // Metropolitan clustering (reduced)
      if (zoom <= 8) return 12;  // City-level clustering (reduced)
      if (zoom <= 9) return 8;   // Local area clustering (reduced)
      if (zoom <= 10) return 5;  // Neighborhood clustering (heavily reduced)
      if (zoom <= 11) return 3;  // Close-up separation for adjacent courses
      return 0; // Individual markers only at maximum zoom
    },
    disableClusteringAtZoom: 15,
    animate: true,
    animateAddingMarkers: true,
    spiderfyShapePositions: function(count: number, centerPt: L.Point) {
      // Custom spiderfy positioning for golf aesthetic
      const angle = Math.PI * 2 / count;
      const radius = 25;
      const positions: L.Point[] = [];

      for (let i = 0; i < count; i++) {
        const x = centerPt.x + radius * Math.cos(i * angle);
        const y = centerPt.y + radius * Math.sin(i * angle);
        positions.push(L.point(x, y));
      }

      return positions;
    }
  });

  // Add custom cluster click handler to fix navigation issues
  clusterGroup.on('clusterclick', function(event: any) {
    try {
      const cluster = event.layer as L.MarkerCluster;
      const centralPosition = (cluster as any)._centralPosition;
      const currentZoom = mapInstance.getZoom();

      console.log(`🖱️ Cluster clicked: ${cluster.getChildCount()} courses, current zoom: ${currentZoom}`);

      if (centralPosition) {
        // Use the stored central position for accurate navigation
        console.log(`🎯 Zooming to central position: ${centralPosition.lat.toFixed(6)}, ${centralPosition.lng.toFixed(6)}`);
        mapInstance.setView(centralPosition, Math.min(currentZoom + 2, 15), {
          animate: true,
          duration: 0.5
        });
      } else {
        // Fallback to default cluster bounds behavior
        console.log(`📍 Using default cluster bounds behavior`);
        const childMarkers = cluster.getAllChildMarkers();
        if (childMarkers.length > 0) {
          const group = new L.featureGroup(childMarkers);
          mapInstance.fitBounds(group.getBounds(), {
            padding: [20, 20],
            maxZoom: 15
          });
        }
      }

      // Prevent any default navigation behavior
      if (event.originalEvent) {
        event.originalEvent.preventDefault();
        event.originalEvent.stopPropagation();
      }
    } catch (error) {
      console.error('❌ Cluster click handling failed:', error);
      // Fallback: just zoom in slightly if custom handling fails
      mapInstance.zoomIn();
    }
  });

  return clusterGroup;
};


export default function GolfCourseMap({ courses, onStatusChange, filterStatus = 'all' }: GolfCourseMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const outlierMarkersRef = useRef<L.Marker[]>([]);
  const leaderLinesRef = useRef<L.Polyline[]>([]);
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
        console.log(`🌎 Showing geographic outlier individually: ${course.name} at ${lat}, ${lng}`);
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

  // Function to update all markers with new scale
  const updateMarkersScale = (scale: number) => {
    if (clusterGroupRef.current) {
      // Get all markers from the cluster group
      clusterGroupRef.current.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Marker) {
          const marker = layer as L.Marker;
          const course = filteredCourses.find(c =>
            marker.getLatLng().lat === parseFloat(c.latitude) &&
            marker.getLatLng().lng === parseFloat(c.longitude)
          );
          if (course) {
            const newIcon = createGolfPinIcon(course.accessType, course.status || 'not-played', scale);
            marker.setIcon(newIcon);
          }
        }
      });
    }
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
        tap: true,
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

      // Add zoom event listener to update icon sizes
      mapInstanceRef.current.on('zoomend', () => {
        const currentZoom = mapInstanceRef.current!.getZoom();
        const isMobile = window.innerWidth < 1024;
        const newScale = calculateIconScale(currentZoom, isMobile);
        setIconScale(newScale);
        updateMarkersScale(newScale);
      });

      // Set initial scale based on initial zoom
      const initialZoom = mapInstanceRef.current.getZoom();
      const isMobile = window.innerWidth < 1024;
      const initialScale = calculateIconScale(initialZoom, isMobile);
      setIconScale(initialScale);

      // Initialize cluster group with improved click handling
      // Geographic outliers (e.g., Nova Scotia) are filtered upstream in filteredCourses
      clusterGroupRef.current = createClusterGroup(createClusterIcon, mapInstanceRef.current);

      // Add cluster group to map
      mapInstanceRef.current.addLayer(clusterGroupRef.current);
    }

    // Clear existing markers from cluster group
    if (clusterGroupRef.current) {
      clusterGroupRef.current.clearLayers();
    }
    markersRef.current = [];

    // Add clusterable courses (continental US) to cluster group
    clusterableCourses.forEach(course => {
      const marker = L.marker(
        [parseFloat(course.latitude), parseFloat(course.longitude)],
        { icon: createGolfPinIcon(course.accessType, course.status || 'not-played', iconScale) }
      );

      // Add marker to cluster group
      if (clusterGroupRef.current) {
        clusterGroupRef.current.addLayer(marker);
      }
      
      // Click handler for full details popup
      marker.on('click', (e) => {
        console.log(`[DEBUG] Marker clicked for course: ${course.name}`);
        // Clear any hover preview immediately
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setPreviewCourse(null);
        setPreviewPosition(null);
        
        playClickSound();
        setSelectedCourse(course);
        console.log(`Golf course selected: ${course.name}`);
        // Stop event propagation to prevent map clicks
        L.DomEvent.stopPropagation(e);
      });
      
      // Hover handlers for preview
      marker.on('mouseover', (e) => {
        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        
        // Set timeout for 175ms delay (middle of 150-200ms range)
        hoverTimeoutRef.current = setTimeout(() => {
          // Check if popup is open at the time of showing preview, not when hovering starts
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

      markersRef.current.push(marker);
    });

    // Add outlier courses (geographic outliers like Nova Scotia) as individual markers
    // These are shown on the map but not included in clustering to prevent ocean clusters
    outlierCourses.forEach(course => {
      const marker = L.marker(
        [parseFloat(course.latitude), parseFloat(course.longitude)],
        { icon: createGolfPinIcon(course.accessType, course.status || 'not-played', iconScale) }
      );

      // Add marker directly to map (not to cluster group)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.addLayer(marker);
      }

      // Click handler for full details popup
      marker.on('click', (e) => {
        console.log(`[DEBUG] Outlier marker clicked for course: ${course.name}`);
        // Clear any hover preview immediately
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setPreviewCourse(null);
        setPreviewPosition(null);

        playClickSound();
        setSelectedCourse(course);
        console.log(`Geographic outlier course selected: ${course.name}`);
        // Stop event propagation to prevent map clicks
        L.DomEvent.stopPropagation(e);
      });

      // Hover handlers for preview
      marker.on('mouseover', (e) => {
        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }

        // Set timeout for 175ms delay (middle of 150-200ms range)
        hoverTimeoutRef.current = setTimeout(() => {
          // Check if popup is open at the time of showing preview, not when hovering starts
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

      markersRef.current.push(marker);
    });

    // Store outlier markers separately for cleanup
    outlierMarkersRef.current = outlierCourses.map(course =>
      markersRef.current[markersRef.current.length - outlierCourses.length + outlierCourses.indexOf(course)]
    );

    // Note: Cluster positioning is now handled safely in the createClusterIcon function
    // This avoids direct manipulation of Leaflet's internal state that was causing click issues

    // Apply anti-collision positioning to all individual markers at close zoom levels
    const currentZoom = mapInstanceRef.current?.getZoom() || 4;
    const individualMarkers = outlierMarkersRef.current; // Only outlier markers are individual (clusterable are in cluster group)
    const displacements = applyAntiCollisionPositioning(individualMarkers, currentZoom);

    // Add leader lines for displaced markers
    if (displacements.length > 0 && mapInstanceRef.current) {
      addLeaderLines(displacements, mapInstanceRef.current, leaderLinesRef);
      console.log(`✨ Enhanced clustering system active: ${displacements.length} markers displaced with leader lines`);
    }

    return () => {
      // Cleanup is handled by clearing the cluster group above
      // Clean up individual outlier markers
      outlierMarkersRef.current.forEach(marker => {
        if (mapInstanceRef.current && marker) {
          mapInstanceRef.current.removeLayer(marker);
        }
      });
      outlierMarkersRef.current = [];

      // Clean up leader lines
      if (mapInstanceRef.current) {
        removeLeaderLines(mapInstanceRef.current, leaderLinesRef);
      }
    };
  }, [filteredCourses, iconScale]); // Removed selectedCourse and onStatusChange to prevent marker recreation

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