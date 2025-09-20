import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';
import type { CourseStatus, AccessType } from '@shared/schema';

interface FilterControlsProps {
  activeFilter: CourseStatus | 'all';
  onFilterChange: (filter: CourseStatus | 'all') => void;
  activeAccessFilter: AccessType | 'all';
  onAccessFilterChange: (filter: AccessType | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  stats: {
    total: number;
    played: number;
    wantToPlay: number;
    notPlayed: number;
    public: number;
    private: number;
    resort: number;
  };
}

export default function FilterControls({ 
  activeFilter, 
  onFilterChange,
  activeAccessFilter,
  onAccessFilterChange,
  searchQuery, 
  onSearchChange, 
  stats 
}: FilterControlsProps) {
  const filters = [
    { key: 'all' as const, label: 'All Courses', count: stats.total },
    { key: 'played' as const, label: 'Played', count: stats.played },
    { key: 'want-to-play' as const, label: 'Want to Play', count: stats.wantToPlay },
    { key: 'not-played' as const, label: 'Not Played', count: stats.notPlayed },
  ];

  const accessFilters = [
    { key: 'all' as const, label: 'All Courses', count: stats.total },
    { key: 'public' as const, label: 'Public', count: stats.public },
    { key: 'private' as const, label: 'Private', count: stats.private },
    { key: 'resort' as const, label: 'Resort', count: stats.resort },
  ];

  const getFilterVariant = (filterKey: CourseStatus | 'all') => {
    return activeFilter === filterKey ? 'default' : 'outline';
  };

  const getAccessFilterVariant = (filterKey: AccessType | 'all') => {
    return activeAccessFilter === filterKey ? 'default' : 'outline';
  };

  const handleFilterClick = (filter: CourseStatus | 'all') => {
    onFilterChange(filter);
    console.log(`Filter changed to: ${filter}`);
  };

  const handleAccessFilterClick = (filter: AccessType | 'all') => {
    onAccessFilterChange(filter);
    console.log(`Access filter changed to: ${filter}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
    console.log(`Search query: ${e.target.value}`);
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="search"
            placeholder="Search golf courses..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
            data-testid="input-search-courses"
          />
        </div>

        {/* Filter Buttons */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by Status</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filters.map((filter) => (
              <Button
                key={filter.key}
                variant={getFilterVariant(filter.key)}
                size="default"
                onClick={() => handleFilterClick(filter.key)}
                className="justify-between gap-2 min-h-[44px]"
                data-testid={`button-filter-${filter.key}`}
              >
                <span>{filter.label}</span>
                <Badge variant="secondary">
                  {filter.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Access Type Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by Course Type</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {accessFilters.map((filter) => (
              <Button
                key={filter.key}
                variant={getAccessFilterVariant(filter.key)}
                size="default"
                onClick={() => handleAccessFilterClick(filter.key)}
                className="justify-between gap-2 min-h-[44px]"
                data-testid={`button-access-filter-${filter.key}`}
              >
                <span>{filter.label}</span>
                <Badge variant="secondary">
                  {filter.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Progress Stats */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{stats.played}/{stats.total} played</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-golf-played h-2 rounded-full transition-all duration-300"
              style={{ width: `${(stats.played / stats.total) * 100}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground text-center">
            {Math.round((stats.played / stats.total) * 100)}% complete
          </div>
        </div>
      </CardContent>
    </Card>
  );
}