import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Map, List, BarChart3, Loader2, Filter } from 'lucide-react';

import HeroSection from '@/components/HeroSection';
import GolfCourseMap from '@/components/GolfCourseMap';
import FilterControls from '@/components/FilterControls';
import CourseListCard from '@/components/CourseListCard';
import ThemeToggle from '@/components/ThemeToggle';
import { AuthNav } from '@/components/AuthNav';

import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import type { CourseStatus, AccessType } from '@shared/schema';

export default function Home() {
  const [activeFilter, setActiveFilter] = useState<CourseStatus | 'all'>('all');
  const [activeAccessFilter, setActiveAccessFilter] = useState<AccessType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('hero');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Touch/swipe state for mobile navigation
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);

  const { isAuthenticated } = useAuth();

  // Mobile detection useEffect with touch capability detection
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 1024;
      setIsMobile(isTouchDevice && isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Swipe detection constants and functions
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    // Only prevent default for swipe detection, don't block all touch events
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
    console.log('Touch start:', e.targetTouches[0].clientX, 'isMobile:', isMobile);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    // Only track touch movement for swipe detection, don't prevent scrolling
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
    const distance = touchStart ? touchStart.x - e.targetTouches[0].clientX : 0;
    console.log('Touch move:', e.targetTouches[0].clientX, 'distance:', distance);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    // Only handle swipe logic, don't prevent other touch behaviors

    if (!touchStart || !touchEnd) {
      console.log('Touch end: No start or end detected');
      return;
    }

    const horizontalDistance = touchStart.x - touchEnd.x;
    const verticalDistance = Math.abs(touchStart.y - touchEnd.y);

    // Only consider horizontal swipes (not vertical scrolling)
    const isHorizontalSwipe = Math.abs(horizontalDistance) > verticalDistance;
    const isLeftSwipe = horizontalDistance > minSwipeDistance;
    const isRightSwipe = horizontalDistance < -minSwipeDistance;

    console.log('Touch end:', {
      horizontalDistance,
      verticalDistance,
      isHorizontalSwipe,
      isLeftSwipe,
      isRightSwipe,
      activeTab,
      isMobile,
      minSwipeDistance
    });

    // Only handle swipes on mobile and when not on hero tab
    if (isMobile && activeTab !== 'hero' && isHorizontalSwipe) {
      if (isLeftSwipe && activeTab === 'map') {
        console.log('✅ Switching from map to list');
        setActiveTab('list');
        // Only prevent default when we actually handle the swipe
        e.preventDefault();
      } else if (isRightSwipe && activeTab === 'list') {
        console.log('✅ Switching from list to map');
        setActiveTab('map');
        // Only prevent default when we actually handle the swipe
        e.preventDefault();
      } else {
        console.log('❌ No tab switch - conditions not met');
      }
    } else {
      console.log('❌ Touch handling blocked - not mobile, on hero tab, or not horizontal swipe');
    }
  };

  // Use the custom courses hook with filters
  const {
    courses,
    filteredCourses,
    stats: calculatedStats,
    isLoading: coursesLoading,
    error: coursesError,
    updateCourseStatus,
  } = useCourses({
    activeFilter,
    activeAccessFilter,
    searchQuery,
  });

  const handleStatusChange = (courseId: string, status: CourseStatus) => {
    updateCourseStatus(courseId, status);
  };

  const handleLocationClick = (courseId: string) => {
    setActiveTab('map');
    console.log(`Navigate to map for course: ${courseId}`);
  };

  const handleGetStarted = () => {
    setActiveTab('map');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    console.log(`Tab changed to: ${tab}`);
  };

  // Loading state
  if (coursesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading golf courses...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (coursesError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to load golf courses</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2 sm:mr-3">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
              <Map className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-poppins font-bold text-sm sm:text-lg truncate">Golf Journey Map</h1>
              <p className="text-xs text-muted-foreground hidden md:block">Play America's Best Golf Courses</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <span className="text-sm text-muted-foreground hidden md:block">
              {calculatedStats.played}/{calculatedStats.total} played
            </span>
            <AuthNav />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Dedicated swipe area for better touch event handling */}
        <div
          className="relative w-full"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: 'auto' }} // Allow all touch actions
        >
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="hero" data-testid="tab-hero">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="map" data-testid="tab-map">
              <Map className="w-4 h-4 mr-2" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="list" data-testid="tab-list">
              <List className="w-4 h-4 mr-2" />
              List View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hero" className="space-y-6">
            <HeroSection
              totalCourses={calculatedStats.total}
              coursesPlayed={calculatedStats.played}
              onGetStarted={handleGetStarted}
            />
            
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-6 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-golf-played">{calculatedStats.played}</div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Courses Played</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-6 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-golf-want">{calculatedStats.wantToPlay}</div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Want to Play</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-6 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-golf-not-played">{calculatedStats.notPlayed}</div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Not Played</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="map" className="lg:space-y-4">
            {/* Mobile filter toggle button */}
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters {mobileFiltersOpen ? '(Hide)' : '(Show)'}
              </Button>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4">
              {/* Collapsible filters on mobile */}
              <div className={`lg:col-span-1 ${mobileFiltersOpen ? 'block' : 'hidden'} lg:block`}>
                <ScrollArea className="h-auto lg:h-[calc(100vh-200px)]">
                  <div className="pr-4">
                    <FilterControls
                      activeFilter={activeFilter}
                      onFilterChange={setActiveFilter}
                      activeAccessFilter={activeAccessFilter}
                      onAccessFilterChange={setActiveAccessFilter}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      stats={calculatedStats}
                    />
                  </div>
                </ScrollArea>
              </div>

              {/* Map with improved mobile height */}
              <div className="lg:col-span-3">
                <Card className="h-[calc(100vh-120px)] lg:h-[calc(100vh-200px)]">
                  <CardContent className="p-0 h-full">
                    <GolfCourseMap
                      courses={filteredCourses}
                      onStatusChange={handleStatusChange}
                      filterStatus={activeFilter}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {/* Mobile filter toggle button */}
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters {mobileFiltersOpen ? '(Hide)' : '(Show)'}
              </Button>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4">
              {/* Collapsible filters on mobile */}
              <div className={`lg:col-span-1 ${mobileFiltersOpen ? 'block' : 'hidden'} lg:block`}>
                <ScrollArea className="h-auto lg:h-[calc(100vh-200px)]">
                  <div className="pr-4">
                    <FilterControls
                      activeFilter={activeFilter}
                      onFilterChange={setActiveFilter}
                      activeAccessFilter={activeAccessFilter}
                      onAccessFilterChange={setActiveAccessFilter}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      stats={calculatedStats}
                    />
                  </div>
                </ScrollArea>
              </div>
              
              {/* Course List */}
              <div className="lg:col-span-3">
                <ScrollArea className="h-[calc(100vh-250px)]">
                  <div className="space-y-4 pr-4">
                    {filteredCourses.length > 0 ? (
                      filteredCourses.map((course) => (
                        <CourseListCard
                          key={course.id}
                          course={course}
                          onStatusChange={handleStatusChange}
                          onLocationClick={handleLocationClick}
                        />
                      ))
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <p className="text-muted-foreground">No courses found matching your criteria.</p>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setActiveFilter('all');
                              setSearchQuery('');
                            }}
                            className="mt-4"
                            data-testid="button-clear-filters"
                          >
                            Clear Filters
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </main>
    </div>
  );
}