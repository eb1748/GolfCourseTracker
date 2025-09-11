# Golf Course Destination Tracker

## Overview

This is a full-stack web application that helps golf enthusiasts track their progress through America's top 100 public golf courses. The application provides an interactive map interface where users can mark courses as "played," "want to play," or "not played," search for specific courses, and visualize their golf destination journey. Built with modern web technologies, it offers both map and list views with filtering capabilities, creating an engaging exploration-focused experience similar to travel platforms like Airbnb and AllTrails.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Styling**: Tailwind CSS with custom design system based on shadcn/ui components
- **Component Library**: Radix UI primitives for accessible, unstyled components
- **Map Integration**: Leaflet for interactive mapping with custom golf pin icons
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules for consistency across the stack
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Storage Strategy**: Flexible storage interface with in-memory implementation (MemStorage) for development
- **API Design**: RESTful endpoints for course data, search, and status management
- **Development Server**: Integrated Vite middleware for hot module replacement

### Data Storage Solutions
- **Database**: PostgreSQL (configured via Drizzle but using in-memory storage currently)
- **Schema Design**: Three main entities - users, golf courses, and user course status relationships
- **Data Initialization**: Comprehensive dataset of top 100 public golf courses with location coordinates
- **Caching**: TanStack Query provides client-side caching with optimistic updates

### Authentication and Authorization
- **User Management**: Simple username/password system with user sessions
- **Session Strategy**: Currently using demo user ID for development
- **Security**: Prepared for production authentication with proper user isolation

### Design System
- **Color Palette**: Golf-themed colors with semantic status colors (green for played, gold for want-to-play, gray for not-played)
- **Typography**: Google Fonts (Inter for UI, Poppins for headings) loaded via CDN
- **Component Variants**: Consistent button, card, and input styling with hover/active states
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Theme Support**: Light/dark mode toggle with CSS custom properties

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, TypeScript support
- **Routing**: Wouter for lightweight routing
- **State Management**: TanStack React Query for server state
- **Form Management**: React Hook Form with Hookform Resolvers

### UI and Styling
- **Component Library**: Complete Radix UI suite (dialogs, dropdowns, forms, navigation)
- **Styling**: Tailwind CSS with PostCSS and Autoprefixer
- **Icons**: Lucide React for consistent iconography
- **Design Tokens**: shadcn/ui configuration with custom color palette

### Database and Backend
- **Database**: Neon Database (serverless PostgreSQL)
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **Validation**: Zod for runtime type checking and schema validation
- **Session Management**: Connect-pg-simple for PostgreSQL session store

### Mapping and Visualization
- **Maps**: Leaflet with TypeScript definitions for interactive maps
- **Date Handling**: date-fns for date manipulation and formatting
- **Utilities**: clsx and class-variance-authority for conditional styling

### Development Tools
- **Build Tool**: Vite with React plugin and runtime error overlay
- **Development**: tsx for TypeScript execution, ESBuild for production bundling
- **Replit Integration**: Replit-specific plugins for development environment
- **Error Handling**: Runtime error modal for development debugging