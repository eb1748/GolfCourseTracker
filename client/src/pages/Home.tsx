import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Map, List, BarChart3, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

import HeroSection from '@/components/HeroSection';
import GolfCourseMap from '@/components/GolfCourseMap';
import FilterControls from '@/components/FilterControls';
import CourseListCard from '@/components/CourseListCard';
import ThemeToggle from '@/components/ThemeToggle';

import { api } from '@/lib/api';
import type { GolfCourseWithStatus, CourseStatus, AccessType } from '@shared/schema';

export default function Home() {
  const [activeFilter, setActiveFilter] = useState<CourseStatus | 'all'>('all');
  const [activeAccessFilter, setActiveAccessFilter] = useState<AccessType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('hero');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch courses data
  const { data: courses = [], isLoading: coursesLoading, error: coursesError } = useQuery({
    queryKey: ['/api/courses'],
    queryFn: api.getAllCourses,
  });

  // Fetch user stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/users/stats'],
    queryFn: api.getUserStats,
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: ({ courseId, status }: { courseId: string; status: CourseStatus }) =>
      api.updateCourseStatus(courseId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/stats'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update course status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter and search courses
  const filteredCourses = useMemo(() => {
    let filtered = courses;

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(course => course.status === activeFilter);
    }

    // Apply access type filter
    if (activeAccessFilter !== 'all') {
      filtered = filtered.filter(course => course.accessType === activeAccessFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(course =>
        course.name.toLowerCase().includes(query) ||
        course.location.toLowerCase().includes(query) ||
        course.state.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [courses, activeFilter, activeAccessFilter, searchQuery]);

  // Calculate default stats if API stats not available
  const calculatedStats = useMemo(() => {
    const total = courses.length;
    const played = courses.filter(c => c.status === 'played').length;
    const wantToPlay = courses.filter(c => c.status === 'want-to-play').length;
    const notPlayed = total - played; // Not played = total - played (includes want-to-play courses)
    const publicCourses = courses.filter(c => c.accessType === 'public').length;
    const privateCourses = courses.filter(c => c.accessType === 'private').length;
    const resortCourses = courses.filter(c => c.accessType === 'resort').length;

    return { 
      total, 
      played, 
      wantToPlay, 
      notPlayed, 
      public: publicCourses, 
      private: privateCourses, 
      resort: resortCourses 
    };
  }, [courses]);

  const handleStatusChange = (courseId: string, status: CourseStatus) => {
    statusMutation.mutate({ courseId, status });
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Map className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-poppins font-bold text-lg">Golf Journey Map</h1>
              <p className="text-xs text-muted-foreground">Play America's Best Golf Courses</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {calculatedStats.played}/{calculatedStats.total} played
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-golf-played">{calculatedStats.played}</div>
                  <p className="text-muted-foreground">Courses Played</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-golf-want">{calculatedStats.wantToPlay}</div>
                  <p className="text-muted-foreground">Want to Play</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-golf-not-played">{calculatedStats.notPlayed}</div>
                  <p className="text-muted-foreground">Not Played</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Sidebar with filters */}
              <div className="lg:col-span-1">
                <ScrollArea className="h-[calc(100svh-160px)] md:h-[calc(100dvh-180px)] lg:h-[calc(100vh-200px)]">
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
              
              {/* Map */}
              <div className="lg:col-span-3">
                <Card className="h-[calc(100svh-160px)] md:h-[calc(100dvh-180px)] lg:h-[calc(100vh-200px)]">
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Sidebar with filters */}
              <div className="lg:col-span-1">
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
      </main>
    </div>
  );
}