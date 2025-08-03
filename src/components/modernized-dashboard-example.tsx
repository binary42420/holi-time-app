import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { EnhancedDashboardOverview } from '@/components/enhanced-dashboard-overview';
import { EnhancedJobCard } from '@/components/enhanced-job-card';
import { EnhancedShiftCard } from '@/components/enhanced-shift-card';
import { EnhancedWorkerCard } from '@/components/enhanced-worker-card';
import { EnhancedMobileNav, createNavigationItems } from '@/components/enhanced-mobile-nav';
import { 
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  Users,
  Briefcase,
  AlertCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data types based on your Prisma schema
interface MockData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
    company?: { name: string; };
  };
  metrics: {
    jobs: {
      total: number;
      active: number;
      pending: number;
      completed: number;
      onHold: number;
      cancelled: number;
    };
    shifts: {
      total: number;
      today: number;
      tomorrow: number;
      thisWeek: number;
      active: number;
      pending: number;
      completed: number;
      understaffed: number;
    };
    personnel: {
      totalRequired: number;
      totalAssigned: number;
      currentlyWorking: number;
      onBreak: number;
      completed: number;
      noShows: number;
    };
    timesheets: {
      draft: number;
      pendingCompany: number;
      pendingManager: number;
      completed: number;
      rejected: number;
    };
    companies: {
      total: number;
      active: number;
    };
  };
  recentJobs: any[];
  todaysShifts: any[];
  activeWorkers: any[];
}

interface ModernizedDashboardProps {
  data: MockData;
  onRefresh?: () => void;
  className?: string;
}

export function ModernizedDashboardExample({ data, onRefresh, className }: ModernizedDashboardProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const navigationItems = createNavigationItems({
    activeShifts: data.metrics.shifts.active,
    pendingTimesheets: data.metrics.timesheets.pendingCompany + data.metrics.timesheets.pendingManager,
    urgentShifts: data.metrics.shifts.understaffed,
    activeJobs: data.metrics.jobs.active,
    understaffedShifts: data.metrics.shifts.understaffed
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <EnhancedMobileNav
              user={data.user}
              navigationItems={navigationItems}
              notifications={{
                unread: 5,
                urgent: data.metrics.shifts.understaffed
              }}
              currentPath="/"
              onSignOut={() => console.log('Sign out')}
            />
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            
            {data.metrics.shifts.understaffed > 0 && (
              <StatusBadge 
                status="CRITICAL" 
                count={data.metrics.shifts.understaffed}
                showCount
                pulse
                size="sm"
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Welcome Section */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome back, {data.user.name.split(' ')[0]}
              </h1>
              <p className="text-muted-foreground">
                Here's what's happening with your operations today
              </p>
            </div>
            
            {/* Quick Actions - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-2">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Shift
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs, shifts, workers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Dashboard Overview */}
        <EnhancedDashboardOverview metrics={data.metrics} />

        {/* Today's Critical Items */}
        {(data.metrics.shifts.understaffed > 0 || data.metrics.personnel.noShows > 0) && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h2 className="text-xl font-semibold">Attention Required</h2>
            </div>
            
            <div className="grid gap-4">
              {data.metrics.shifts.understaffed > 0 && (
                <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-red-600" />
                        <div>
                          <h3 className="font-medium text-red-800 dark:text-red-200">
                            {data.metrics.shifts.understaffed} Shifts Understaffed
                          </h3>
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Immediate attention needed for today's shifts
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="destructive">
                        View Shifts
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Shifts */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Shifts ({data.todaysShifts.length})
              </h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            
            <div className="space-y-4">
              {data.todaysShifts.slice(0, 3).map((shift) => (
                <EnhancedShiftCard
                  key={shift.id}
                  shift={shift}
                  onView={(id) => console.log('View shift', id)}
                  onEdit={(id) => console.log('Edit shift', id)}
                />
              ))}
              
              {data.todaysShifts.length === 0 && (
                <Card className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-muted-foreground">No shifts scheduled for today</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enjoy your day off or schedule some shifts for tomorrow
                  </p>
                </Card>
              )}
            </div>
          </section>

          {/* Active Jobs */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Active Jobs ({data.metrics.jobs.active})
              </h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            
            <div className="space-y-4">
              {data.recentJobs.slice(0, 3).map((job) => (
                <EnhancedJobCard
                  key={job.id}
                  job={job}
                  onView={(job) => console.log('View job', job)}
                  onEdit={(job) => console.log('Edit job', job)}
                  onDelete={(job) => console.log('Delete job', job)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Active Workers */}
        {data.activeWorkers.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Currently Working ({data.metrics.personnel.currentlyWorking})
              </h2>
              <div className="flex items-center gap-2">
                <StatusBadge 
                  status="ClockedIn" 
                  count={data.metrics.personnel.currentlyWorking}
                  showCount
                />
                <Button variant="outline" size="sm">
                  Manage All
                </Button>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {data.activeWorkers.slice(0, 4).map((worker) => (
                <EnhancedWorkerCard
                  key={worker.id}
                  worker={worker}
                  onClockAction={(id, action) => console.log('Clock action', id, action)}
                  onEndShift={(id) => console.log('End shift', id)}
                  onViewDetails={(id) => console.log('View worker', id)}
                  compact
                />
              ))}
            </div>
          </section>
        )}

        {/* Performance Insights */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Insights
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Staffing Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {Math.round((data.metrics.personnel.totalAssigned / data.metrics.personnel.totalRequired) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Overall fulfillment rate
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  On-Time Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(((data.metrics.personnel.totalAssigned - data.metrics.personnel.noShows) / data.metrics.personnel.totalAssigned) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Workers showing up on time
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Job Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((data.metrics.jobs.completed / data.metrics.jobs.total) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Jobs completed this month
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Mobile Quick Actions */}
        <section className="lg:hidden">
          <div className="grid grid-cols-2 gap-4">
            <Button className="h-12">
              <Plus className="h-4 w-4 mr-2" />
              New Shift
            </Button>
            <Button variant="outline" className="h-12">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

// Mock data generator for testing
export function generateMockDashboardData(): MockData {
  return {
    user: {
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      role: 'Admin',
      avatarUrl: '/api/placeholder/64/64',
      company: { name: 'Demo Company' }
    },
    metrics: {
      jobs: { total: 15, active: 8, pending: 3, completed: 4, onHold: 0, cancelled: 0 },
      shifts: { total: 45, today: 6, tomorrow: 8, thisWeek: 25, active: 4, pending: 2, completed: 39, understaffed: 2 },
      personnel: { totalRequired: 48, totalAssigned: 42, currentlyWorking: 18, onBreak: 3, completed: 21, noShows: 1 },
      timesheets: { draft: 3, pendingCompany: 7, pendingManager: 2, completed: 28, rejected: 1 },
      companies: { total: 5, active: 5 }
    },
    recentJobs: [
      {
        id: '1',
        name: 'Concert Setup - Madison Square Garden',
        status: 'Active',
        startDate: '2024-12-15',
        endDate: '2024-12-16',
        location: 'New York, NY',
        company: { name: 'Live Nation' },
        shifts: [
          {
            id: '1',
            date: '2024-12-15',
            startTime: '2024-12-15T08:00:00Z',
            endTime: '2024-12-15T18:00:00Z',
            status: 'Active',
            requiredCrewChiefs: 2,
            requiredStagehands: 8,
            requiredForkOperators: 2,
            requiredReachForkOperators: 1,
            requiredRiggers: 4,
            requiredGeneralLaborers: 6,
            assignedPersonnel: Array(20).fill(null).map((_, i) => ({ id: `${i}`, status: 'ClockedIn', user: { name: `Worker ${i}` } }))
          }
        ]
      }
    ],
    todaysShifts: [
      {
        id: '1',
        date: '2024-12-15',
        startTime: '2024-12-15T08:00:00Z',
        endTime: '2024-12-15T18:00:00Z',
        status: 'Active',
        location: 'Madison Square Garden',
        requiredCrewChiefs: 2,
        requiredStagehands: 8,
        requiredForkOperators: 2,
        requiredReachForkOperators: 1,
        requiredRiggers: 4,
        requiredGeneralLaborers: 6,
        assignedPersonnel: Array(18).fill(null).map((_, i) => ({ 
          id: `${i}`, 
          status: i < 12 ? 'ClockedIn' : 'Assigned',
          roleCode: 'SH',
          user: { id: `${i}`, name: `Worker ${i}` }
        })),
        job: {
          id: '1',
          name: 'Concert Setup',
          company: { name: 'Live Nation' }
        }
      }
    ],
    activeWorkers: Array(6).fill(null).map((_, i) => ({
      id: `${i}`,
      status: 'ClockedIn',
      roleCode: 'SH',
      user: {
        id: `${i}`,
        name: `Worker ${i + 1}`,
        email: `worker${i + 1}@example.com`,
        avatarUrl: `/api/placeholder/48/48`,
        performance: 4.2 + (Math.random() * 0.8)
      },
      timeEntries: [
        {
          id: `${i}-1`,
          clockIn: '2024-12-15T08:00:00Z',
          isActive: true
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
  };
}