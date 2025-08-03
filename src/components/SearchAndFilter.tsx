"use client"

import React from 'react';
import { SearchIcon } from './IconComponents';

type JobStatus = 'Pending' | 'Active' | 'Completed' | 'On Hold';

interface SearchAndFilterProps {
  currentFilter?: JobStatus | 'all';
  onFilterChange?: (status: JobStatus | 'all') => void;
  onSearchChange: (term: string) => void;
  isShiftView?: boolean;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  currentFilter,
  onFilterChange,
  onSearchChange,
  isShiftView = false
}) => {
  const filterButtons: { label: string; value: JobStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'Active' },
    { label: 'Completed', value: 'Completed' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-grow">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder={isShiftView ? "Search by job or company..." : "Search by job name, company..."}
          onChange={(e) => onSearchChange(e.target.value)}
          className="sample-input pl-10"
        />
      </div>
      {!isShiftView && onFilterChange && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2">
          {filterButtons.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onFilterChange(value)}
              className={`sample-btn-secondary ${
                currentFilter === value
                  ? 'bg-indigo-600 text-white shadow'
                  : ''
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;
