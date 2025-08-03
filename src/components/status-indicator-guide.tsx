import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  TrendingUp,
  Shield,
  Activity,
  Award,
  Wifi,
  MapPin,
  Flame,
  Battery,
  Crown,
  Construction,
  HardHat,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StatusGroup {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  statuses: Array<{
    status: string;
    description: string;
    usage: string;
  }>;
}

const statusGroups: StatusGroup[] = [
  {
    title: 'Fulfillment Levels',
    description: 'Staffing levels and assignment completion rates',
    icon: Users,
    statuses: [
      {
        status: 'CRITICAL',
        description: 'Less than 60% staffed - requires immediate attention',
        usage: 'Used when shifts are severely understaffed and may need to be cancelled or rescheduled'
      },
      {
        status: 'LOW',
        description: '60-79% staffed - needs additional workers',
        usage: 'Indicates understaffing that should be addressed but shift can still proceed'
      },
      {
        status: 'GOOD',
        description: '80-99% staffed - nearly fully staffed',
        usage: 'Good staffing level with minor gaps that can be filled'
      },
      {
        status: 'FULL',
        description: '100% staffed - completely filled',
        usage: 'Ideal staffing level with all positions filled'
      },
      {
        status: 'OVERSTAFFED',
        description: 'More than 110% staffed - excess workers',
        usage: 'More workers assigned than required, may indicate over-booking'
      }
    ]
  },
  {
    title: 'Worker Status',
    description: 'Current status of individual workers',
    icon: Activity,
    statuses: [
      {
        status: 'Assigned',
        description: 'Worker is assigned but has not started work',
        usage: 'Default status when worker is first assigned to a shift'
      },
      {
        status: 'ClockedIn',
        description: 'Worker is currently working (animated pulse)',
        usage: 'Active status showing worker is on the clock and working'
      },
      {
        status: 'OnBreak',
        description: 'Worker is on break or lunch',
        usage: 'Temporary status during breaks, lunch, or brief pauses'
      },
      {
        status: 'ShiftEnded',
        description: 'Worker has completed their shift',
        usage: 'Final status when worker has finished their assigned work'
      },
      {
        status: 'NoShow',
        description: 'Worker did not show up for assigned shift',
        usage: 'Used when worker fails to report for duty without notice'
      },
      {
        status: 'UpForGrabs',
        description: 'Position is available and seeking workers (animated pulse)',
        usage: 'Open position that needs to be filled, visible to available workers'
      }
    ]
  },
  {
    title: 'Performance Levels',
    description: 'Worker performance and rating indicators',
    icon: TrendingUp,
    statuses: [
      {
        status: 'EXCELLENT',
        description: '4.5+ stars - top performing worker',
        usage: 'Premium workers with exceptional track records'
      },
      {
        status: 'GREAT',
        description: '4.0-4.4 stars - high performing worker',
        usage: 'Reliable workers with consistently good performance'
      },
      {
        status: 'GOOD_PERFORMANCE',
        description: '3.5-3.9 stars - solid performing worker',
        usage: 'Dependable workers meeting expectations'
      },
      {
        status: 'NEEDS_IMPROVEMENT',
        description: '2.5-3.4 stars - requires attention',
        usage: 'Workers who need coaching or additional training'
      },
      {
        status: 'POOR',
        description: 'Under 2.5 stars - performance concerns',
        usage: 'Workers requiring immediate performance intervention'
      }
    ]
  },
  {
    title: 'Role Types',
    description: 'Different worker roles with distinct colors and profession-specific icons',
    icon: Shield,
    statuses: [
      {
        status: 'CREW_CHIEF',
        description: 'Leadership role - manages other workers (Crown icon)',
        usage: 'Supervisory position responsible for crew coordination and decision making'
      },
      {
        status: 'STAGEHAND',
        description: 'Core workforce - general stage work (Spotlight icon)',
        usage: 'Primary workers handling stage setup, lighting, and live event operations'
      },
      {
        status: 'FORK_OPERATOR',
        description: 'Equipment operator - forklift certified (Forklift icon)',
        usage: 'Specialized workers operating forklifts and heavy lifting equipment'
      },
      {
        status: 'RIGGER',
        description: 'Safety-critical role - rigging and heights (Anchor icon)',
        usage: 'Specialized workers handling rigging, climbing, and safety-critical equipment'
      },
      {
        status: 'GENERAL_LABOR',
        description: 'General workforce - basic tasks (Hard Hat icon)',
        usage: 'Entry-level workers for general labor, cleanup, and support tasks'
      }
    ]
  },
  {
    title: 'Job & Shift Status',
    description: 'Overall status of jobs and shifts',
    icon: CheckCircle2,
    statuses: [
      {
        status: 'Pending',
        description: 'Scheduled but not yet started',
        usage: 'Future jobs or shifts awaiting start time'
      },
      {
        status: 'Active',
        description: 'Currently in progress (animated pulse)',
        usage: 'Live jobs or shifts with workers currently on site'
      },
      {
        status: 'InProgress',
        description: 'Work is actively happening',
        usage: 'Alternative to Active for ongoing work'
      },
      {
        status: 'Completed',
        description: 'Successfully finished',
        usage: 'Jobs or shifts that have been completed successfully'
      },
      {
        status: 'OnHold',
        description: 'Temporarily paused',
        usage: 'Jobs or shifts that are temporarily suspended'
      },
      {
        status: 'Cancelled',
        description: 'Job or shift was cancelled',
        usage: 'Work that was cancelled and will not proceed'
      }
    ]
  },
  {
    title: 'Priority & Urgency',
    description: 'Time-based priority indicators',
    icon: Clock,
    statuses: [
      {
        status: 'TODAY',
        description: 'Shift is today (animated pulse)',
        usage: 'Immediate attention required for today\'s work'
      },
      {
        status: 'TOMORROW',
        description: 'Shift is tomorrow',
        usage: 'Next-day work requiring preparation'
      },
      {
        status: 'URGENT',
        description: 'Within 3 days',
        usage: 'Near-term work needing attention'
      },
      {
        status: 'SOON',
        description: 'Within 7 days',
        usage: 'Work approaching but not urgent'
      },
      {
        status: 'HOT',
        description: 'High priority item (animated pulse)',
        usage: 'Critical issues requiring immediate action'
      },
      {
        status: 'WARM',
        description: 'Medium priority item',
        usage: 'Important but not critical issues'
      }
    ]
  },
  {
    title: 'System Status',
    description: 'Network and system connectivity',
    icon: Wifi,
    statuses: [
      {
        status: 'ONLINE',
        description: 'Connected and syncing',
        usage: 'Normal operation with full connectivity'
      },
      {
        status: 'OFFLINE',
        description: 'No connection (animated pulse)',
        usage: 'Working offline, changes will sync when reconnected'
      },
      {
        status: 'SYNCING',
        description: 'Currently synchronizing data (animated pulse)',
        usage: 'Data is being uploaded or downloaded'
      }
    ]
  },
  {
    title: 'Location Status',
    description: 'Worker location and contact status',
    icon: MapPin,
    statuses: [
      {
        status: 'ON_SITE',
        description: 'Worker is at the job location',
        usage: 'Confirmed presence at work site'
      },
      {
        status: 'EN_ROUTE',
        description: 'Worker is traveling to site (animated pulse)',
        usage: 'Worker is on their way to the job location'
      },
      {
        status: 'UNREACHABLE',
        description: 'Unable to contact worker',
        usage: 'Worker is not responding to calls or messages'
      },
      {
        status: 'RESPONDED',
        description: 'Worker has responded to contact',
        usage: 'Confirmation that worker has been reached'
      }
    ]
  },
  {
    title: 'Certifications',
    description: 'Worker qualifications and certifications',
    icon: Award,
    statuses: [
      {
        status: 'CERTIFIED',
        description: 'Valid certification',
        usage: 'Worker has current, valid certifications'
      },
      {
        status: 'EXPIRING_SOON',
        description: 'Certification expires within 30 days (animated pulse)',
        usage: 'Certification needs renewal soon'
      },
      {
        status: 'EXPIRED',
        description: 'Certification has expired',
        usage: 'Worker needs to renew certification before working'
      }
    ]
  }
];

export function StatusIndicatorGuide() {
  const [visibleGuide, setVisibleGuide] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('fulfillment');

  if (!visibleGuide) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setVisibleGuide(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Eye className="h-4 w-4 mr-1" />
        Status Guide
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-auto">
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Activity className="h-6 w-6" />
                  Status Indicator Guide
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Visual reference for all status badges and color-coded indicators used throughout Holitime
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleGuide(false)}
              >
                <EyeOff className="h-4 w-4 mr-1" />
                Hide Guide
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs value={selectedGroup} onValueChange={setSelectedGroup}>
              <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 mb-6">
                {statusGroups.map((group, index) => {
                  const Icon = group.icon;
                  return (
                    <TabsTrigger 
                      key={index} 
                      value={group.title.toLowerCase().replace(/[^a-z]/g, '')}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{group.title.split(' ')[0]}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {statusGroups.map((group, groupIndex) => {
                const Icon = group.icon;
                return (
                  <TabsContent 
                    key={groupIndex} 
                    value={group.title.toLowerCase().replace(/[^a-z]/g, '')}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="text-xl font-semibold">{group.title}</h3>
                        <p className="text-muted-foreground">{group.description}</p>
                      </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {group.statuses.map((statusItem, statusIndex) => (
                        <Card key={statusIndex} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <StatusBadge status={statusItem.status} />
                              <Badge variant="outline" className="text-xs">
                                {statusItem.status}
                              </Badge>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-sm mb-1">
                                {statusItem.description}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {statusItem.usage}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
            
            {/* Color Legend */}
            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-3">Color System Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Critical, Urgent, Errors</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span>Warning, Low levels</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-500 rounded"></div>
                  <span>Caution, Needs attention</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                  <span>Success, Active, Good</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Complete, Information</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span>Available, Special roles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-500 rounded"></div>
                  <span>Neutral, Inactive</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-orange-500 rounded animate-pulse"></div>
                  <span>Animated (urgent items)</span>
                </div>
              </div>
            </div>
            
            {/* Usage Tips */}
            <div className="mt-6 p-4 border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/50">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Pro Tips</h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• <strong>Animated badges</strong> indicate items requiring immediate attention</li>
                <li>• <strong>Count badges</strong> show ratios (e.g., "5/8 workers") for quick assessment</li>
                <li>• <strong>Role badges</strong> use consistent colors across the entire app</li>
                <li>• <strong>Critical status</strong> items are always red and may pulse for urgency</li>
                <li>• <strong>Performance badges</strong> help identify top workers and those needing support</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Mini status guide for quick reference
export function MiniStatusGuide() {
  const [isOpen, setIsOpen] = useState(false);
  
  const quickReference = [
    { status: 'CRITICAL', desc: '<60% staffed' },
    { status: 'LOW', desc: '60-79% staffed' },
    { status: 'GOOD', desc: '80-99% staffed' },
    { status: 'FULL', desc: '100% staffed' },
    { status: 'ClockedIn', desc: 'Currently working' },
    { status: 'OnBreak', desc: 'On break/lunch' },
    { status: 'NoShow', desc: 'Did not show up' }
  ];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs"
      >
        <Activity className="h-3 w-3 mr-1" />
        Status Key
      </Button>
      
      {isOpen && (
        <Card className="absolute top-full right-0 mt-2 w-64 z-50 p-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Quick Reference</h4>
            {quickReference.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <StatusBadge status={item.status} size="sm" />
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </div>
            ))}
            <div className="pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                Animated badges require immediate attention
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}