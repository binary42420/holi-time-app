import React from 'react';
import { CrewChiefDashboard } from './crew-chief-dashboard';
import { EmployeeDashboard } from './employee-dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserCheck, 
  Shield, 
  Calendar,
  Clock,
  Building2,
  CheckCircle2
} from 'lucide-react';

// Mock data generators for testing the dashboards
export function generateCrewChiefMockData() {
  return {
    user: {
      id: 'cc-1',
      name: 'Mike Johnson',
      email: 'mike.johnson@example.com',
      phone: '+1 (555) 123-4567',
      avatarUrl: '/api/placeholder/64/64',
      crew_chief_eligible: true
    },
    myShifts: [
      {
        id: 'shift-1',
        date: new Date().toISOString(),
        startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
        status: 'Active',
        location: 'Madison Square Garden',
        description: 'Concert setup and sound check',
        requiredCrewChiefs: 2,
        requiredStagehands: 8,
        requiredForkOperators: 2,
        requiredReachForkOperators: 1,
        requiredRiggers: 4,
        requiredGeneralLaborers: 6,
        assignedPersonnel: [
          {
            id: 'ap-1',
            status: 'ClockedIn',
            roleCode: 'SH',
            user: {
              id: 'user-1',
              name: 'John Smith',
              email: 'john@example.com',
              phone: '+1 (555) 234-5678',
              avatarUrl: '/api/placeholder/48/48',
              performance: 4.5
            },
            timeEntries: [
              {
                id: 'te-1',
                clockIn: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                clockOut: null,
                breakStart: null,
                breakEnd: null,
                notes: 'Working on stage left setup',
                isActive: true
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ap-2',
            status: 'OnBreak',
            roleCode: 'FO',
            user: {
              id: 'user-2',
              name: 'Sarah Davis',
              email: 'sarah@example.com',
              phone: '+1 (555) 345-6789',
              avatarUrl: '/api/placeholder/48/48',
              performance: 4.2
            },
            timeEntries: [
              {
                id: 'te-2',
                clockIn: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                clockOut: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                breakStart: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                breakEnd: null,
                notes: 'On lunch break',
                isActive: false
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ap-3',
            status: 'Assigned',
            roleCode: 'RG',
            user: {
              id: 'user-3',
              name: 'Tom Wilson',
              email: 'tom@example.com',
              phone: '+1 (555) 456-7890',
              avatarUrl: '/api/placeholder/48/48',
              performance: 3.8
            },
            timeEntries: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ap-4',
            status: 'ClockedIn',
            roleCode: 'CC',
            user: {
              id: 'user-4',
              name: 'Lisa Brown',
              email: 'lisa@example.com',
              phone: '+1 (555) 567-8901',
              avatarUrl: '/api/placeholder/48/48',
              performance: 4.7
            },
            timeEntries: [
              {
                id: 'te-4',
                clockIn: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                clockOut: null,
                breakStart: null,
                breakEnd: null,
                notes: 'Coordinating rigging crew',
                isActive: true
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ap-5',
            status: 'NoShow',
            roleCode: 'GL',
            user: {
              id: 'user-5',
              name: 'Bob Garcia',
              email: 'bob@example.com',
              phone: '+1 (555) 678-9012',
              avatarUrl: '/api/placeholder/48/48',
              performance: 2.1
            },
            timeEntries: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        job: {
          id: 'job-1',
          name: 'Concert Setup - Taylor Swift',
          company: {
            name: 'Live Nation Entertainment'
          }
        }
      },
      {
        id: 'shift-2',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString(),
        status: 'Pending',
        location: 'Barclays Center',
        description: 'Load-out and breakdown',
        requiredCrewChiefs: 1,
        requiredStagehands: 6,
        requiredForkOperators: 2,
        requiredReachForkOperators: 0,
        requiredRiggers: 2,
        requiredGeneralLaborers: 4,
        assignedPersonnel: [
          {
            id: 'ap-6',
            status: 'Assigned',
            roleCode: 'SH',
            user: {
              id: 'user-6',
              name: 'Alex Chen',
              email: 'alex@example.com',
              phone: '+1 (555) 789-0123',
              avatarUrl: '/api/placeholder/48/48',
              performance: 4.3
            },
            timeEntries: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        job: {
          id: 'job-2',
          name: 'Concert Breakdown - Taylor Swift',
          company: {
            name: 'Live Nation Entertainment'
          }
        }
      }
    ]
  };
}

export function generateEmployeeMockData() {
  return {
    user: {
      id: 'emp-1',
      name: 'David Rodriguez',
      email: 'david.rodriguez@example.com',
      phone: '+1 (555) 987-6543',
      avatarUrl: '/api/placeholder/64/64',
      performance: 4.3,
      certifications: ['Forklift Operator', 'Safety Training', 'Rigging Basics'],
      location: 'New York, NY'
    },
    myAssignments: [
      {
        id: 'assign-1',
        status: 'ClockedIn',
        roleCode: 'SH',
        shift: {
          id: 'shift-today-1',
          date: new Date().toISOString(),
          startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          status: 'Active',
          location: 'Madison Square Garden',
          description: 'Concert setup - Stage Left',
          job: {
            id: 'job-1',
            name: 'Taylor Swift Concert Setup',
            company: {
              name: 'Live Nation Entertainment'
            }
          }
        },
        timeEntries: [
          {
            id: 'te-emp-1',
            clockIn: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            clockOut: null,
            breakStart: null,
            breakEnd: null,
            notes: 'Working on sound equipment setup',
            isActive: true,
            verified: false
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'assign-2',
        status: 'Assigned',
        roleCode: 'SH',
        shift: {
          id: 'shift-today-2',
          date: new Date().toISOString(),
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
          status: 'Pending',
          location: 'Madison Square Garden',
          description: 'Concert breakdown - Stage cleanup',
          job: {
            id: 'job-1',
            name: 'Taylor Swift Concert Breakdown',
            company: {
              name: 'Live Nation Entertainment'
            }
          }
        },
        timeEntries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'assign-3',
        status: 'Assigned',
        roleCode: 'FO',
        shift: {
          id: 'shift-tomorrow-1',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString(),
          status: 'Pending',
          location: 'Barclays Center',
          description: 'Load-in for corporate event',
          job: {
            id: 'job-2',
            name: 'Corporate Event Setup - Apple',
            company: {
              name: 'Freeman Company'
            }
          }
        },
        timeEntries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'assign-4',
        status: 'ShiftEnded',
        roleCode: 'SH',
        shift: {
          id: 'shift-yesterday-1',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString(),
          status: 'Completed',
          location: 'Jacob Javits Center',
          description: 'Trade show setup',
          job: {
            id: 'job-3',
            name: 'CES Trade Show Setup',
            company: {
              name: 'GeoPlex Solutions'
            }
          }
        },
        timeEntries: [
          {
            id: 'te-emp-2',
            clockIn: new Date(Date.now() - 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
            clockOut: new Date(Date.now() - 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString(),
            breakStart: new Date(Date.now() - 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000).toISOString(),
            breakEnd: new Date(Date.now() - 24 * 60 * 60 * 1000 + 12.5 * 60 * 60 * 1000).toISOString(),
            notes: 'Completed booth setup sections A-C',
            isActive: false,
            verified: true
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    crewChiefs: [
      {
        id: 'cc-1',
        name: 'Mike Johnson',
        phone: '+1 (555) 123-4567',
        email: 'mike.johnson@example.com'
      },
      {
        id: 'cc-2',
        name: 'Lisa Brown',
        phone: '+1 (555) 567-8901',
        email: 'lisa.brown@example.com'
      }
    ]
  };
}

// Example component showing both dashboards
export function DashboardExamples() {
  const [activeView, setActiveView] = React.useState<'crew-chief' | 'employee'>('crew-chief');
  
  const crewChiefData = generateCrewChiefMockData();
  const employeeData = generateEmployeeMockData();

  // Mock action handlers
  const handleClockAction = async (workerId: string, action: string) => {
    console.log(`Clock action: ${action} for worker ${workerId}`);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleEndShift = async (workerId: string) => {
    console.log(`End shift for worker ${workerId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleUpdateShiftStatus = async (shiftId: string, status: string) => {
    console.log(`Update shift ${shiftId} to ${status}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleContactWorker = (workerId: string, method: 'call' | 'text') => {
    console.log(`Contact worker ${workerId} via ${method}`);
  };

  const handleContactCrewChief = (crewChiefId: string, method: 'call' | 'text') => {
    console.log(`Contact crew chief ${crewChiefId} via ${method}`);
  };

  const handleReportIssue = (shiftId: string, issue: string) => {
    console.log(`Report issue for shift ${shiftId}: ${issue}`);
  };

  // Employee-specific handlers
  const handleClockIn = async (assignmentId: string) => {
    console.log(`Clock in for assignment ${assignmentId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleClockOut = async (assignmentId: string) => {
    console.log(`Clock out for assignment ${assignmentId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleStartBreak = async (assignmentId: string) => {
    console.log(`Start break for assignment ${assignmentId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleEndBreak = async (assignmentId: string) => {
    console.log(`End break for assignment ${assignmentId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleEmployeeEndShift = async (assignmentId: string) => {
    console.log(`End shift for assignment ${assignmentId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard Selection */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Dashboard Examples</h1>
            <Badge variant="outline" className="text-sm">
              Demo Mode
            </Badge>
          </div>
          
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="crew-chief" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Crew Chief
              </TabsTrigger>
              <TabsTrigger value="employee" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Employee
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Dashboard Content */}
      {activeView === 'crew-chief' ? (
        <CrewChiefDashboard
          user={crewChiefData.user}
          myShifts={crewChiefData.myShifts}
          onClockAction={handleClockAction}
          onEndShift={handleEndShift}
          onUpdateShiftStatus={handleUpdateShiftStatus}
          onContactWorker={handleContactWorker}
          onReportIssue={handleReportIssue}
          isOnline={true}
        />
      ) : (
        <EmployeeDashboard
          user={employeeData.user}
          myAssignments={employeeData.myAssignments}
          crewChiefs={employeeData.crewChiefs}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          onStartBreak={handleStartBreak}
          onEndBreak={handleEndBreak}
          onEndShift={handleEmployeeEndShift}
          onContactCrewChief={handleContactCrewChief}
          onReportIssue={handleReportIssue}
          isOnline={true}
        />
      )}
    </div>
  );
}

// Feature comparison component
export function DashboardFeatureComparison() {
  const features = [
    {
      feature: 'Real-time Worker Status',
      crewChief: true,
      employee: true,
      description: 'Live tracking of work status with visual indicators'
    },
    {
      feature: 'Time Clock Controls',
      crewChief: true,
      employee: true,
      description: 'Clock in/out, break management, shift completion'
    },
    {
      feature: 'Multi-Shift Management',
      crewChief: true,
      employee: false,
      description: 'Manage multiple active shifts simultaneously'
    },
    {
      feature: 'Worker Communication',
      crewChief: true,
      employee: false,
      description: 'Direct contact with assigned crew members'
    },
    {
      feature: 'Crew Chief Contact',
      crewChief: false,
      employee: true,
      description: 'Emergency contact with supervising crew chief'
    },
    {
      feature: 'Staffing Analytics',
      crewChief: true,
      employee: false,
      description: 'Fulfillment tracking, progress monitoring'
    },
    {
      feature: 'Personal Time Tracking',
      crewChief: false,
      employee: true,
      description: 'Individual work hours, break time, performance'
    },
    {
      feature: 'Shift Status Updates',
      crewChief: true,
      employee: false,
      description: 'Start, pause, complete, or cancel shifts'
    },
    {
      feature: 'Issue Reporting',
      crewChief: true,
      employee: true,
      description: 'Report problems or request assistance'
    },
    {
      feature: 'Offline Capability',
      crewChief: true,
      employee: true,
      description: 'Continue working without internet connection'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Dashboard Feature Comparison</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Compare the capabilities of each dashboard role to understand the different user experiences
          and permissions in the Holitime workforce management system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Feature Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4">Feature</th>
                  <th className="text-center py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <Shield className="h-4 w-4" />
                      Crew Chief
                    </div>
                  </th>
                  <th className="text-center py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Employee
                    </div>
                  </th>
                  <th className="text-left py-3 pl-4">Description</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr key={index} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 font-medium">{feature.feature}</td>
                    <td className="text-center py-3 px-4">
                      {feature.crewChief ? (
                        <Badge className="bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                          No
                        </Badge>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {feature.employee ? (
                        <Badge className="bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                          No
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 pl-4 text-sm text-muted-foreground">
                      {feature.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Crew Chief Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">Management Focus</div>
              <p className="text-sm text-blue-800">
                Optimized for supervising multiple workers and shifts
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Multi-shift oversight</span>
                <Badge className="bg-blue-100 text-blue-800">Core Feature</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Worker communication</span>
                <Badge className="bg-blue-100 text-blue-800">Core Feature</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Staffing analytics</span>
                <Badge className="bg-blue-100 text-blue-800">Core Feature</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              Employee Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-emerald-50 rounded-lg">
              <div className="text-3xl font-bold text-emerald-600 mb-2">Personal Focus</div>
              <p className="text-sm text-emerald-800">
                Optimized for individual work tracking and schedule management
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Personal time tracking</span>
                <Badge className="bg-emerald-100 text-emerald-800">Core Feature</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Simple schedule view</span>
                <Badge className="bg-emerald-100 text-emerald-800">Core Feature</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Crew chief contact</span>
                <Badge className="bg-emerald-100 text-emerald-800">Core Feature</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}