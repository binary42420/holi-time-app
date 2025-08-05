'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ComponentErrorBoundary } from '@/components/error-boundaries/enhanced-error-boundary';

export interface Column<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: {
    [key: string]: any;
  };
  onFilterChange?: (filters: { [key: string]: any }) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onRefresh?: () => void;
  onExport?: () => void;
  actions?: {
    label: string;
    onClick: (row: T) => void;
    icon?: React.ReactNode;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  }[];
  rowActions?: (row: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function EnhancedDataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  error,
  pagination,
  search,
  filters,
  onFilterChange,
  onSort,
  onRefresh,
  onExport,
  actions,
  rowActions,
  emptyState,
  title,
  description,
  className,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [localFilters, setLocalFilters] = useState<{ [key: string]: string }>({});

  // Handle sorting
  const handleSort = useCallback((column: string) => {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
    onSort?.(column, newDirection);
  }, [sortColumn, sortDirection, onSort]);

  // Handle local filtering
  const handleLocalFilter = useCallback((column: string, value: string) => {
    const newFilters = { ...localFilters, [column]: value };
    if (!value) {
      delete newFilters[column];
    }
    setLocalFilters(newFilters);
    onFilterChange?.(newFilters);
  }, [localFilters, onFilterChange]);

  // Filter and sort data locally if no external handlers
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply local filters
    if (Object.keys(localFilters).length > 0 && !onFilterChange) {
      result = result.filter(row => {
        return Object.entries(localFilters).every(([column, filterValue]) => {
          const cellValue = String(row[column] || '').toLowerCase();
          return cellValue.includes(filterValue.toLowerCase());
        });
      });
    }

    // Apply local sorting
    if (sortColumn && !onSort) {
      result.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, localFilters, sortColumn, sortDirection, onFilterChange, onSort]);

  // Render sort icon
  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Render cell content
  const renderCell = (column: Column<T>, row: T, index: number) => {
    const value = row[column.key as keyof T];
    
    if (column.render) {
      return column.render(value, row, index);
    }
    
    if (value === null || value === undefined) {
      return <span className="text-gray-400">—</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    return String(value);
  };

  // Render empty state
  const renderEmptyState = () => {
    if (emptyState) {
      return emptyState;
    }
    
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">No data available</div>
        {search?.value && (
          <div className="text-sm text-gray-500">
            Try adjusting your search or filters
          </div>
        )}
      </div>
    );
  };

  // Render error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="text-red-500 mb-2">Error loading data</div>
            <div className="text-sm text-gray-500 mb-4">{error}</div>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ComponentErrorBoundary>
      <Card className={className}>
        {(title || description || search || onRefresh || onExport) && (
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                {title && <CardTitle>{title}</CardTitle>}
                {description && (
                  <p className="text-sm text-gray-600 mt-1">{description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {search && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder={search.placeholder || 'Search...'}
                      value={search.value}
                      onChange={(e) => search.onChange(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                )}
                {onRefresh && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                {onExport && (
                  <Button variant="outline" size="sm" onClick={onExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        )}
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={String(column.key)}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        column.className || ''
                      }`}
                      style={{ width: column.width }}
                    >
                      <div className={`flex items-center ${
                        column.align === 'center' ? 'justify-center' :
                        column.align === 'right' ? 'justify-end' : 'justify-start'
                      }`}>
                        <span>{column.title}</span>
                        {column.sortable && (
                          <button
                            onClick={() => handleSort(String(column.key))}
                            className="ml-1 hover:bg-gray-200 rounded p-1"
                          >
                            {renderSortIcon(String(column.key))}
                          </button>
                        )}
                        {column.filterable && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="ml-1 hover:bg-gray-200 rounded p-1">
                                <Filter className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <div className="p-2">
                                <Input
                                  placeholder={`Filter ${column.title}...`}
                                  value={localFilters[String(column.key)] || ''}
                                  onChange={(e) => handleLocalFilter(String(column.key), e.target.value)}
                                  className="w-48"
                                />
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </th>
                  ))}
                  {(actions || rowActions) && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + (actions || rowActions ? 1 : 0)} className="px-6 py-12">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : processedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (actions || rowActions ? 1 : 0)}>
                      {renderEmptyState()}
                    </td>
                  </tr>
                ) : (
                  processedData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {columns.map((column) => (
                        <td
                          key={String(column.key)}
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            column.align === 'center' ? 'text-center' :
                            column.align === 'right' ? 'text-right' : 'text-left'
                          } ${column.className || ''}`}
                        >
                          {renderCell(column, row, rowIndex)}
                        </td>
                      ))}
                      {(actions || rowActions) && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          {rowActions ? (
                            rowActions(row)
                          ) : actions ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {actions.map((action, actionIndex) => (
                                  <DropdownMenuItem
                                    key={actionIndex}
                                    onClick={() => action.onClick(row)}
                                  >
                                    {action.icon && <span className="mr-2">{action.icon}</span>}
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {pagination && (
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={pagination.limit}
                  onChange={(e) => pagination.onLimitChange(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pagination.onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm px-2">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </ComponentErrorBoundary>
  );
}