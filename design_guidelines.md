# Golf Course Destination Tracker - Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from travel and outdoor adventure platforms like Airbnb, AllTrails, and Google Maps to create an engaging, exploration-focused experience that makes golf course discovery feel like planning an adventure.

## Core Design Elements

### Color Palette
**Primary Colors:**
- Golf Green: 142 45% 35% (rich forest green for brand identity)
- Course Fairway: 110 25% 55% (muted sage green for secondary elements)

**Status Colors:**
- Played: 142 60% 25% (deep green for completed courses)
- Want to Play: 45 85% 55% (warm golden yellow for aspirational courses)  
- Not Played: 220 15% 65% (neutral gray for unvisited courses)

**Background & UI:**
- Light mode: Clean whites (0 0% 98%) with subtle green undertones
- Dark mode: Deep charcoal (220 10% 12%) with green accent touches

### Typography
**Google Fonts via CDN:**
- Primary: Inter (clean, modern sans-serif for UI elements)
- Display: Poppins (friendly, rounded for headings and course names)
- Sizes: Large headings (2xl-4xl), body text (base-lg), small labels (sm)

### Layout System
**Tailwind Spacing Units:** Consistent use of 2, 4, 6, 8, 12, and 16 units
- Tight spacing: p-2, m-2 for compact elements
- Standard spacing: p-4, gap-4 for general layout
- Generous spacing: p-8, mb-12 for section separation

### Component Library

**Map Interface:**
- Full-screen interactive map as primary focus
- Custom golf pin icons (flag and pin design) with status-based colors
- Smooth zoom and pan interactions with course clustering at distance

**Course Cards & Popups:**
- Clean, card-based design with course imagery
- Status selector with prominent visual feedback
- Rating display with golf-themed iconography
- Quick action buttons for status changes

**Navigation & Filters:**
- Floating filter panel with status toggles
- Search bar with autocomplete for course names
- Progress indicator showing completion statistics
- Mobile-optimized bottom sheet design

**Status Management:**
- Color-coded visual system across all components
- One-click status switching with smooth animations
- Visual progress tracking with completion percentages

### Interactive Elements
- Hover states for all clickable elements with subtle green accent
- Smooth transitions (200-300ms) for status changes
- Map marker clustering and decluttering at different zoom levels
- Responsive touch targets for mobile interaction

### Images
**Course Photography:**
- Hero section: Large panoramic golf course landscape image (1920x600px)
- Course cards: Square format thumbnails (300x200px) showing signature holes or course features
- Map markers: Custom golf pin SVG icons with status-based coloring
- Background: Subtle golf texture or aerial course photography for empty states

### Mobile Considerations
- Bottom sheet navigation for mobile map interaction
- Swipe gestures for course card browsing
- Large touch targets for status selection
- Optimized map controls for thumb navigation

This design creates an aspirational, adventure-focused experience that transforms golf course tracking into an engaging journey of discovery and achievement.