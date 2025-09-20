# Changelog

All notable changes to the Golf Course Tracker project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Mobile UI improvements documentation in `feature_dev_markdowns/Mobile_UI_improvements.md`
- Comprehensive design review recommendations for mobile optimization
- Collapsible mobile filter system with toggle button for both map and list views
- Mobile-first responsive layout for map and list views
- Enhanced touch targets meeting WCAG 44px minimum requirements
- Mobile-specific marker scaling for better touch interaction
- Responsive popup positioning preventing overflow on mobile
- Mobile detection and state management
- CSS optimizations for mobile touch performance
- Mobile swipe functionality between map view and list view (50px minimum distance)
- Touch gesture navigation matching overview/map swipe patterns
- Multi-touch detection system preventing map gesture interference
- Full 3-tab swipe navigation (hero ↔ map ↔ list) with circular routing
- Optimized mobile map height following industry standards (60% viewport vs 85%)
- Always-visible quick filter buttons on mobile with proper text wrapping
- Responsive map height system across all device breakpoints

### Fixed
- Backend user stats calculation for authenticated users
- Course counting logic for both authenticated and unauthenticated users
- "Not played" calculation to exclude want-to-play courses
- "Courses tracked" display to show actual tracked count instead of total
- FilterControls 2-column mobile layout changed to single column
- Map popup overflow on mobile devices
- Poor touch targets on mobile (now 44px minimum)
- Mobile map height utilization and touch interactions
- Mobile swipe functionality interference from Radix UI components
- Touch event propagation issues preventing swipe detection
- Mobile detection to include actual touch capability verification
- Critical mobile functionality freeze where users couldn't scroll, click, or interact
- Overly aggressive preventDefault() calls blocking all mobile touch interactions
- Touch action restrictions preventing normal mobile gestures and scrolling
- Mobile header overlap issue with courses tracked badge and Sign In button
- Statistics boxes vertical stacking on mobile wasting screen space
- Multi-touch interference with map pan/zoom gestures during swipe detection
- Limited swipe navigation scope that excluded hero tab from gesture controls
- Mobile map height consuming 85% of viewport causing poor information hierarchy
- Mobile filter button text overflow and intersection issues

### Changed
- FilterControls component: Single-column layout on mobile with improved spacing
- Home component: Mobile-first flexbox layout with collapsible filters for both map and list views
- GolfCourseMap component: Enhanced mobile touch handling and marker scaling
- Button sizing from "sm" to "default" for better mobile touch targets
- Map initialization with mobile-specific touch optimizations
- List view layout: Added collapsible mobile filter system matching map view
- Touch event handling: Added swipe detection for tab navigation on mobile
- Overview statistics layout: Changed from vertical stack to horizontal grid on mobile
- Mobile header layout: Optimized spacing and element positioning to prevent overlap
- AuthNav component: Responsive text and button sizing for better mobile fit

### Technical
- Enhanced LocalStorageService with `getTrackedCoursesCount()` method
- Added mobile detection useEffect with window resize listener
- Updated calculateIconScale function with mobile parameter
- Implemented responsive popup positioning classes
- Added mobile-optimized CSS media queries for touch targets
- Touch/swipe state management with touchStart, touchEnd tracking
- Swipe detection logic with 50px minimum distance threshold
- Touch event handlers (onTouchStart, onTouchMove, onTouchEnd) on Tabs component
- Mobile filter toggle state sharing between map and list views
- Enhanced mobile detection with touch capability verification (`ontouchstart` and `maxTouchPoints`)
- Added preventDefault() calls to prevent browser default touch behaviors
- Dedicated swipe area wrapper with `touchAction: 'pan-x'` for horizontal panning
- Comprehensive debug logging for touch event tracking and swipe detection
- Enhanced touch coordinate tracking with x/y position objects instead of single values
- Intelligent gesture differentiation between horizontal swipes and vertical scrolling
- Selective preventDefault() usage - only called when actually handling swipe gestures
- Changed touchAction from 'pan-x' to 'auto' to restore all normal mobile interactions
- Statistics grid responsive layout: grid-cols-3 with responsive padding and font sizes
- Mobile header responsive spacing: gap-1 sm:gap-2 and flex-shrink-0 for element optimization
- AuthNav responsive text: Conditional display based on screen size for compact mobile layout
- Multi-touch gesture detection system with `isMultiTouch` state management
- Enhanced touch event handlers to differentiate single vs multi-finger gestures
- Circular swipe navigation logic supporting all 3 tabs (hero→map→list→hero)
- Comprehensive swipe direction handling for both left and right swipe gestures
- Mobile map height optimization from 85% to 60% viewport following industry standards
- Always-visible mobile quick filters with responsive single-row layout
- Mobile filter button text wrapping system preventing overflow and intersection

## [2025-09-20] - Course Statistics Fix

### Fixed
- Removed status update popup notification for cleaner UX
- Corrected total course count to always show 100 for unauthenticated users
- Fixed "courses tracked" badge to show session changes, not total courses
- Backend stats endpoint now correctly calculates not-played as (100 - played courses)
- Improved mobile header layout responsiveness

### Technical
- Enhanced LocalStorageService with `getTrackedCoursesCount()` method
- Updated useStoredDataStatus hook to include trackedCount property
- Modified AuthNav component to use accurate course tracking counts

## [2025-09-17] - Username Migration System

### Added
- Complete username-based authentication system
- Real-time username availability checking
- Reserved word protection for usernames
- Automated migration for existing users from email prefixes

### Changed
- Replaced "Full Name" field with unique username system
- Username validation: 3-20 characters, alphanumeric + underscore/hyphen
- Updated all authentication flows to use username instead of full names

### Technical
- Updated database schema for username field
- Modified authentication endpoints and validation
- Enhanced user registration and login forms

## [Earlier Releases]

### Analytics System
- Daily/monthly user activity tracking
- Engagement metrics for user interactions and course visits
- API endpoints: `/api/analytics/daily-activity`, `/api/analytics/monthly-activity`

### Interactive Map Features
- Leaflet integration for interactive golf course mapping
- Course filtering by state, rating, and access type
- Visual progress indicators for visited/planned courses
- Interactive course detail popups

### Core Features
- Full-stack TypeScript application with React frontend and Express backend
- PostgreSQL database with Drizzle ORM
- Custom session-based authentication with bcrypt
- Railway deployment with auto-deploy from main branch
- 100 curated golf courses across America
- User progress tracking system
- Responsive design with Tailwind CSS

### Architecture
- Project structure with separated client/server/shared code
- Database schema with users, golf_courses, user_course_status, and user_activity_logs tables
- Development environment with hot reload and concurrent frontend/backend
- Security measures including rate limiting and input validation

---

*For detailed technical implementation information, see [CLAUDE.md](./CLAUDE.md)*