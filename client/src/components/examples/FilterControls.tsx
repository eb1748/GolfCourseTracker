import FilterControls from '../FilterControls';
import { useState } from 'react';
import type { CourseStatus } from '@shared/schema';

export default function FilterControlsExample() {
  const [activeFilter, setActiveFilter] = useState<CourseStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const mockStats = {
    total: 100,
    played: 23,
    wantToPlay: 31,
    notPlayed: 46,
    public: 60,
    private: 25,
    resort: 15
  };

  return (
    <div className="w-80">
      <FilterControls
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        stats={mockStats}
      />
    </div>
  );
}