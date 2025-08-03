import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User } from '@/lib/types';
import { ChevronDown, Search, X, Filter, UserCheck, UserX, MapPin, Award } from 'lucide-react';
import { Avatar } from './Avatar';

interface EnhancedWorkerSelectorProps {
  users: User[];
  selectedUserId: string | null;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
  showQuestionMark?: boolean;
  requiredRole?: string; // To filter based on shift requirements
}

interface FilterState {
  searchText: string;
  activeOnly: boolean;
  crewChiefEligible: boolean;
  forkOperatorEligible: boolean;
  hasCertifications: boolean;
  location: string;
}

const EnhancedWorkerSelector: React.FC<EnhancedWorkerSelectorProps> = ({
  users,
  selectedUserId,
  onChange,
  disabled,
  showQuestionMark,
  requiredRole
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    activeOnly: true,
    crewChiefEligible: false,
    forkOperatorEligible: false,
    hasCertifications: false,
    location: ''
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedUser = users.find(u => u.id === selectedUserId);

  // Get unique locations for filter dropdown
  const availableLocations = useMemo(() => {
    const locations = users
      .map(user => user.location)
      .filter(Boolean)
      .filter((location, index, arr) => arr.indexOf(location) === index)
      .sort();
    return locations;
  }, [users]);

  // Filter and sort users based on current filters
  const filteredUsers = useMemo(() => {
    let filtered = users.filter((user) => {
      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesName = user.name.toLowerCase().includes(searchLower);
        const matchesEmail = user.email.toLowerCase().includes(searchLower);
        const matchesCertifications = user.certifications?.some(cert => 
          cert.toLowerCase().includes(searchLower)
        );
        
        if (!matchesName && !matchesEmail && !matchesCertifications) {
          return false;
        }
      }

      // Active status filter
      if (filters.activeOnly && !user.isActive) {
        return false;
      }

      // Crew chief eligibility filter
      if (filters.crewChiefEligible && !user.crew_chief_eligible) {
        return false;
      }

      // Fork operator eligibility filter
      if (filters.forkOperatorEligible && !user.fork_operator_eligible) {
        return false;
      }

      // Has certifications filter
      if (filters.hasCertifications && (!user.certifications || user.certifications.length === 0)) {
        return false;
      }

      // Location filter
      if (filters.location && user.location !== filters.location) {
        return false;
      }

      return true;
    });

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    // If there's a required role, prioritize eligible users
    if (requiredRole) {
      filtered.sort((a, b) => {
        if (requiredRole === 'CC') {
          if (a.crew_chief_eligible && !b.crew_chief_eligible) return -1;
          if (!a.crew_chief_eligible && b.crew_chief_eligible) return 1;
        }
        if (requiredRole === 'FO' || requiredRole === 'RFO') {
          if (a.fork_operator_eligible && !b.fork_operator_eligible) return -1;
          if (!a.fork_operator_eligible && b.fork_operator_eligible) return 1;
        }
        return 0;
      });
    }

    return filtered;
  }, [users, filters, requiredRole]);

  // Reset highlighted index when filtered users change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredUsers.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowFilters(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredUsers.length - 1 ? prev + 1 : -1
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev > -1 ? prev - 1 : filteredUsers.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex === -1) {
            handleSelect(null);
          } else if (highlightedIndex >= 0 && highlightedIndex < filteredUsers.length) {
            handleSelect(filteredUsers[highlightedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setShowFilters(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredUsers]);

  const handleSelect = (user: User | null) => {
    onChange(user ? user.id : null);
    setIsOpen(false);
    setShowFilters(false);
    setHighlightedIndex(-1);
    setFilters(prev => ({ ...prev, searchText: '' }));
  };

  const clearFilters = () => {
    setFilters({
      searchText: '',
      activeOnly: true,
      crewChiefEligible: false,
      forkOperatorEligible: false,
      hasCertifications: false,
      location: ''
    });
  };

  const hasActiveFilters = filters.searchText || 
    !filters.activeOnly || 
    filters.crewChiefEligible || 
    filters.forkOperatorEligible || 
    filters.hasCertifications || 
    filters.location;

  const getUserStatusBadges = (user: User) => {
    const badges = [];
    
    if (!user.isActive) {
      badges.push(
        <span key="inactive" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <UserX className="w-3 h-3 mr-1" />
          Inactive
        </span>
      );
    }
    
    if (user.crew_chief_eligible) {
      badges.push(
        <span key="cc" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          CC
        </span>
      );
    }
    
    if (user.fork_operator_eligible) {
      badges.push(
        <span key="fo" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          FO
        </span>
      );
    }

    if (user.certifications && user.certifications.length > 0) {
      badges.push(
        <span key="certs" className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Award className="w-3 h-3 mr-1" />
          {user.certifications.length}
        </span>
      );
    }

    return badges;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full flex items-center justify-between rounded-md border border-gray-600 bg-gray-900/50 px-3 py-2 text-left text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selectedUser ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar src={selectedUser.avatarUrl} name={selectedUser.name} className="w-6 h-6 flex-shrink-0" />
            <span className="truncate">{selectedUser.name}</span>
            {!selectedUser.isActive && (
              <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Inactive
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center">
            {showQuestionMark && <span className="mr-2 text-gray-400">?</span>}
            <span className="text-gray-400">-- Unassigned --</span>
          </div>
        )}
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50"
          style={{ width: '320px' }} // Reduced from default auto width
        >
          {/* Search and Filter Header */}
          <div className="p-3 border-b border-gray-700">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, email, or certification..."
                value={filters.searchText}
                onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                  showFilters || hasActiveFilters 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Filter className="w-3 h-3" />
                Filters {hasActiveFilters && `(${Object.values(filters).filter(v => v && v !== '').length})`}
              </button>
              
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="mt-3 p-3 bg-gray-900 rounded-md space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.activeOnly}
                    onChange={(e) => setFilters(prev => ({ ...prev, activeOnly: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <UserCheck className="w-4 h-4 text-green-400" />
                  Active users only
                </label>
                
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.crewChiefEligible}
                    onChange={(e) => setFilters(prev => ({ ...prev, crewChiefEligible: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-blue-400 font-medium">CC</span>
                  Crew Chief eligible
                </label>
                
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.forkOperatorEligible}
                    onChange={(e) => setFilters(prev => ({ ...prev, forkOperatorEligible: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-green-400 font-medium">FO</span>
                  Fork Operator eligible
                </label>
                
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.hasCertifications}
                    onChange={(e) => setFilters(prev => ({ ...prev, hasCertifications: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <Award className="w-4 h-4 text-purple-400" />
                  Has certifications
                </label>

                {availableLocations.length > 0 && (
                  <div>
                    <label className="flex items-center gap-2 text-sm mb-1">
                      <MapPin className="w-4 h-4 text-orange-400" />
                      Location
                    </label>
                    <select
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full text-sm bg-gray-800 border border-gray-600 rounded-md text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">All locations</option>
                      {availableLocations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-auto">
            <ul className="py-1">
              <li
                onClick={() => handleSelect(null)}
                className={`relative cursor-pointer select-none py-2 px-3 text-gray-300 hover:bg-gray-700 flex items-center gap-2 ${
                  highlightedIndex === -1 ? 'bg-indigo-600' : ''
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </div>
                -- Unassigned --
              </li>
              
              {filteredUsers.length === 0 ? (
                <li className="py-8 px-3 text-center text-gray-400">
                  <div className="space-y-2">
                    <Search className="w-8 h-8 mx-auto opacity-50" />
                    <p>No users found</p>
                    <p className="text-xs">Try adjusting your search or filters</p>
                  </div>
                </li>
              ) : (
                filteredUsers.map((user, index) => (
                  <li
                    key={user.id}
                    onClick={() => handleSelect(user)}
                    className={`relative cursor-pointer select-none py-2 px-3 hover:bg-gray-700 ${
                      selectedUserId === user.id ? 'bg-gray-700' : ''
                    } ${index === highlightedIndex ? 'bg-indigo-600' : ''} ${!user.isActive ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <Avatar 
                        src={user.avatarUrl} 
                        name={user.name} 
                        className="w-6 h-6 flex-shrink-0 mt-0.5" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <span className={`truncate ${user.isActive ? 'text-white' : 'text-gray-400'}`}>
                            {user.name}
                          </span>
                        </div>
                        
                        {user.email && (
                          <p className="text-xs text-gray-400 truncate mb-1">{user.email}</p>
                        )}
                        
                        {user.location && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                            <MapPin className="w-3 h-3" />
                            {user.location}
                          </p>
                        )}

                        {user.certifications && user.certifications.length > 0 && (
                          <p className="text-xs text-purple-400 mb-1">
                            Certs: {user.certifications.slice(0, 2).join(', ')}
                            {user.certifications.length > 2 && ` +${user.certifications.length - 2} more`}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-1">
                          {getUserStatusBadges(user)}
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Footer with count */}
          <div className="p-2 border-t border-gray-700 bg-gray-900 text-xs text-gray-400 text-center">
            {filteredUsers.length} of {users.length} users
            {hasActiveFilters && ' (filtered)'}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedWorkerSelector;