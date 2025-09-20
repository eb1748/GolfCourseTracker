# CLAUDE.md - Coding Agent Context

## Project Overview
**Golf Course Tracker** - America's Bucketlist Courses
- Interactive web application for tracking golf courses across America
- Full-stack TypeScript application with React frontend and Express backend
- PostgreSQL database with Drizzle ORM
- Deployed on Railway with GitHub integration

## Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Express.js, TypeScript, tsx for development
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom session-based auth with bcrypt
- **Deployment**: Railway (auto-deploy from main branch)
- **Development**: Hot reload with concurrent frontend/backend

### Key Technologies
- **Drizzle ORM**: Database schema and migrations
- **Zod**: Runtime validation and type safety
- **React Hook Form**: Form handling with validation
- **Leaflet**: Interactive maps for golf course locations
- **Express Rate Limit**: API protection
- **Express Session**: Session management

## Project Structure

```
/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── data/          # Static data files
│   │   ├── hooks/         # Custom React hooks
│   │   └── main.tsx       # App entry point
├── server/                # Express backend
│   ├── routes.ts          # API endpoints
│   ├── storage/           # Database layer
│   └── index.ts           # Server entry point
├── shared/                # Shared code
│   └── schema.ts          # Database schema & validation
├── migrations/            # Database migrations
└── feature_dev_markdowns/ # Development documentation
```

## Database Schema

### Core Tables
1. **users** - User accounts with username system
   - `id` (varchar, PK), `username` (unique), `name`, `email` (unique)
   - `password_hash`, `last_active_at`, `preferences` (JSON), `created_at`

2. **golf_courses** - Golf course information
   - `id` (varchar, PK), `name`, `location`, `state`
   - `latitude`, `longitude`, `rating`, `description`, `website`, `phone`
   - `access_type` (public/private)

3. **user_course_status** - User progress tracking
   - Links users to courses with status (visited, want_to_visit, etc.)
   - Unique constraint on (user_id, course_id)

4. **user_activity_logs** - Analytics and engagement tracking
   - Tracks daily user activity by type
   - Unique constraint on (user_id, activity_date, activity_type)

### Recent Major Change: Username Migration
- **Replaced**: "Full Name" field with unique username system
- **Added**: Username validation (3-20 chars, alphanumeric + underscore/hyphen)
- **Features**: Real-time availability checking, reserved word protection
- **Migration**: Existing users auto-migrated from email prefixes

## Development Commands

### Essential Commands
```bash
# Development (runs both frontend and backend)
npm run dev

# Database operations
npx drizzle-kit generate    # Generate migrations
npx drizzle-kit push       # Apply to database
npx drizzle-kit studio     # Database GUI

# Production build
npm run build
npm start

# Testing (if available)
npm test
```

### Environment Setup
Required environment variables:
```bash
DATABASE_URL="postgresql://..."
SESSION_SECRET="your-session-secret"
PORT=3000  # Optional, defaults to 3000
```

## Key Files to Understand

### Database & Validation
- `shared/schema.ts` - **CRITICAL**: Database schema, validation rules, and TypeScript types
- `server/storage/userStorage.ts` - User data access layer
- `server/storage/index.ts` - Storage abstraction layer

### API Layer
- `server/routes.ts` - **CRITICAL**: All API endpoints and business logic
- `server/index.ts` - Server setup, middleware, and database connection

### Frontend Core
- `client/src/components/AuthForms.tsx` - **CRITICAL**: Login/signup with username validation
- `client/src/components/GolfCourseMap.tsx` - Interactive map component
- `client/src/data/golfCourses.ts` - Golf course data (100 courses)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration (requires username)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/username-available/:username` - Check username availability

### Golf Courses
- `GET /api/golf-courses` - Get all courses with optional filtering
- `GET /api/golf-courses/:id` - Get specific course

### User Progress
- `GET /api/user/course-status` - Get user's course progress
- `POST /api/user/course-status` - Update course status
- `DELETE /api/user/course-status/:courseId` - Remove course status

### Analytics
- `GET /api/analytics/daily-activity` - Daily user activity
- `GET /api/analytics/monthly-activity` - Monthly user activity

## Development Patterns

### Database Patterns
```typescript
// Always use Drizzle schema from shared/schema.ts
import { users, golfCourses, userCourseStatus } from '../shared/schema.js';

// Use proper error handling
try {
  const result = await db.select().from(users).where(eq(users.id, userId));
} catch (error) {
  // Handle database errors
}
```

### Validation Patterns
```typescript
// Use Zod schemas from shared/schema.ts
import { insertUserFormSchema } from '../shared/schema.js';

const validation = insertUserFormSchema.safeParse(userData);
if (!validation.success) {
  return res.status(400).json({ error: validation.error.issues });
}
```

### Frontend Form Patterns
```typescript
// Use React Hook Form with Zod validation
const form = useForm<FormData>({
  resolver: zodResolver(validationSchema),
  defaultValues: { /* defaults */ }
});
```

## Common Tasks & Solutions

### Adding New API Endpoint
1. Add route to `server/routes.ts`
2. Add validation schema to `shared/schema.ts` if needed
3. Update storage layer in `server/storage/` if database access needed
4. Test with curl or frontend integration

### Database Schema Changes
1. Modify `shared/schema.ts`
2. Run `npx drizzle-kit generate` to create migration
3. Run `npx drizzle-kit push` to apply to database
4. Update TypeScript types and validation schemas

### Frontend Component Updates
1. Components in `client/src/components/`
2. Use Tailwind CSS for styling
3. Follow existing patterns for form handling and validation
4. Update data fetching hooks in `client/src/hooks/` if needed

## Testing & Debugging

### Manual Testing
```bash
# Test API endpoints
curl http://localhost:3000/api/golf-courses
curl http://localhost:3000/api/auth/username-available/testuser

# Check database
npx drizzle-kit studio  # Opens web UI
```

### Common Issues
1. **Database connection**: Check DATABASE_URL and Railway database status
2. **Username validation**: Ensure 3-20 chars, alphanumeric + underscore/hyphen
3. **CORS issues**: Check if frontend/backend are on correct ports
4. **Session issues**: Verify SESSION_SECRET is set

## Deployment

### Railway Deployment
- **Auto-deploy**: Pushes to `main` branch trigger deployment
- **Environment**: Production environment variables set in Railway dashboard
- **Database**: Railway PostgreSQL with connection pooling

### Branch Strategy
- `main` - Production branch (auto-deploys to Railway)
- `new-features` - Development branch for new features
- Always merge `new-features` → `main` for deployment

## Recent Features & Context

### Username Migration System (2025-09-17)
- **Replaced**: Full name with unique username system
- **Implementation**: Complete with real-time validation, availability checking
- **Migration**: Automated for existing users with conflict resolution
- **Testing**: Fully tested with API endpoints and frontend forms

### Analytics System
- **User Activity Tracking**: Daily/monthly activity logs
- **Engagement Metrics**: Track user interactions and course visits
- **API Endpoints**: `/api/analytics/daily-activity`, `/api/analytics/monthly-activity`

### Interactive Map Features
- **Leaflet Integration**: Interactive golf course map
- **Course Filtering**: By state, rating, access type
- **User Progress**: Visual indicators for visited/planned courses

## Performance Considerations

### Database
- **Indexes**: Proper indexing on frequently queried columns
- **Connection Pooling**: Railway PostgreSQL handles connection management
- **Query Optimization**: Use Drizzle's efficient query building

### Frontend
- **Code Splitting**: Vite handles automatic code splitting
- **Asset Optimization**: Vite optimizes bundles for production
- **Map Performance**: Efficient rendering of 100+ golf course markers

## Security Notes

### Authentication
- **Password Hashing**: bcrypt with proper salt rounds
- **Session Management**: Express-session with secure settings
- **Rate Limiting**: API endpoints protected with express-rate-limit

### Data Validation
- **Input Sanitization**: Zod validation on all inputs
- **Username Security**: Reserved word protection, length limits
- **SQL Injection Prevention**: Drizzle ORM provides protection

## Future Development Areas

### Priority Features (from feature_dev_markdowns/)
1. **Social Features**: User profiles, course reviews, friend connections
2. **Enhanced Analytics**: Advanced user insights, course popularity metrics
3. **Mobile Optimization**: Progressive Web App features
4. **Course Data Enhancement**: More detailed course information, photos

### Technical Improvements
1. **Testing Framework**: Add comprehensive test suite
2. **Monitoring**: Application performance monitoring
3. **Caching**: Redis for session storage and API caching
4. **CI/CD**: Enhanced deployment pipeline with testing

---

## Quick Start for New Developers

1. **Clone and setup**:
   ```bash
   git clone <repo>
   npm install
   ```

2. **Environment**:
   ```bash
   cp .env.example .env  # Add DATABASE_URL and SESSION_SECRET
   ```

3. **Database**:
   ```bash
   npx drizzle-kit push  # Apply schema to database
   ```

4. **Development**:
   ```bash
   npm run dev  # Starts both frontend and backend
   ```

5. **Test**: Visit `http://localhost:3000` and test user registration with username

## Support & Documentation

- **Database Schema**: See `shared/schema.ts` for complete schema
- **API Documentation**: All endpoints documented in `server/routes.ts`
- **Feature Documentation**: See `feature_dev_markdowns/` for detailed feature specs
- **Migration Documentation**: See `username_migration_plan.md` for recent username system details