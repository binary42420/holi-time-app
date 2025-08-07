"use client";

import React from 'react';
import { EnhancedJobReport } from '@/components/enhanced-job-report';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Mock data for testing
const mockJob = {
  id: "test-job-1",
  jobNumber: "JOB-2024-001",
  description: "Convention Center Setup - Tech Conference 2024",
  location: "Los Angeles Convention Center, Hall A",
  startDate: "2024-01-15T00:00:00Z",
  endDate: "2024-01-18T00:00:00Z",
  status: "active",
  company: {
    name: "TechCorp Events"
  }
};

const mockShifts = [
  {
    id: "shift-1",
    date: "2024-01-15",
    startTime: "2024-01-15T06:00:00Z",
    endTime: "2024-01-15T14:00:00Z",
    description: "Initial setup and stage construction",
    status: "completed",
    crew_chief_required: 1,
    fork_operators_required: 2,
    stage_hands_required: 4,
    general_labor_required: 6,
    assignments: [
      {
        id: "assign-1",
        workerType: "crew_chief",
        user: { id: "user-1", name: "John Smith" }
      },
      {
        id: "assign-2",
        workerType: "fork_operator",
        user: { id: "user-2", name: "Mike Johnson" }
      },
      {
        id: "assign-3",
        workerType: "fork_operator",
        user: { id: "user-3", name: "Sarah Wilson" }
      },
      {
        id: "assign-4",
        workerType: "stage_hand",
        user: { id: "user-4", name: "David Brown" }
      },
      {
        id: "assign-5",
        workerType: "stage_hand",
        user: { id: "user-5", name: "Lisa Davis" }
      },
      {
        id: "assign-6",
        workerType: "stage_hand",
        user: { id: "user-6", name: "Tom Wilson" }
      },
      {
        id: "assign-7",
        workerType: "general_labor",
        user: { id: "user-7", name: "Alex Garcia" }
      },
      {
        id: "assign-8",
        workerType: "general_labor",
        user: { id: "user-8", name: "Maria Rodriguez" }
      },
      {
        id: "assign-9",
        workerType: "general_labor",
        user: { id: "user-9", name: "James Taylor" }
      },
      {
        id: "assign-10",
        workerType: "general_labor",
        user: { id: "user-10", name: "Emma Anderson" }
      }
    ]
  },
  {
    id: "shift-2",
    date: "2024-01-15",
    startTime: "2024-01-15T14:00:00Z",
    endTime: "2024-01-15T22:00:00Z",
    description: "Equipment installation and testing",
    status: "active",
    crew_chief_required: 1,
    fork_operators_required: 1,
    stage_hands_required: 3,
    general_labor_required: 4,
    assignments: [
      {
        id: "assign-11",
        workerType: "crew_chief",
        user: { id: "user-11", name: "Jane Doe" }
      },
      {
        id: "assign-12",
        workerType: "fork_operator",
        user: { id: "user-12", name: "Robert Lee" }
      },
      {
        id: "assign-13",
        workerType: "stage_hand",
        user: { id: "user-13", name: "Chris Martin" }
      },
      {
        id: "assign-14",
        workerType: "stage_hand",
        user: { id: "user-14", name: "Amy White" }
      },
      {
        id: "assign-15",
        workerType: "general_labor",
        user: { id: "user-15", name: "Kevin Brown" }
      },
      {
        id: "assign-16",
        workerType: "general_labor",
        user: { id: "user-16", name: "Nicole Green" }
      }
    ]
  },
  {
    id: "shift-3",
    date: "2024-01-16",
    startTime: "2024-01-16T08:00:00Z",
    endTime: "2024-01-16T16:00:00Z",
    description: "Final setup and preparation",
    status: "pending",
    crew_chief_required: 1,
    fork_operators_required: 1,
    stage_hands_required: 2,
    general_labor_required: 3,
    assignments: [
      {
        id: "assign-17",
        workerType: "crew_chief",
        user: { id: "user-17", name: "Michael Davis" }
      },
      {
        id: "assign-18",
        workerType: "stage_hand",
        user: { id: "user-18", name: "Jennifer Wilson" }
      }
    ]
  },
  {
    id: "shift-4",
    date: "2024-01-18",
    startTime: "2024-01-18T18:00:00Z",
    endTime: "2024-01-19T02:00:00Z",
    description: "Breakdown and cleanup",
    status: "pending",
    crew_chief_required: 1,
    fork_operators_required: 2,
    stage_hands_required: 5,
    general_labor_required: 8,
    assignments: []
  }
];

export default function TestJobReportPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Report Test</h1>
          <p className="text-muted-foreground">
            Testing the enhanced job report component with mock data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Test Data</Badge>
          <Badge variant="outline">4 Shifts</Badge>
        </div>
      </div>

      {/* Test Info */}
      <Card>
        <CardHeader>
          <CardTitle>Test Scenario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Job Details:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Tech Conference setup at LA Convention Center</li>
                <li>• 4-day event (Jan 15-18, 2024)</li>
                <li>• Multiple shifts with varying requirements</li>
                <li>• Mixed staffing levels (some fully staffed, some partial)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Features Demonstrated:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Job summary with totals and fill rates</li>
                <li>• Shift-by-shift breakdown</li>
                <li>• Worker type requirements and assignments</li>
                <li>• Crew chief assignments with colors</li>
                <li>• Print-ready styling</li>
                <li>• Status indicators and progress tracking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Job Report */}
      <EnhancedJobReport 
        job={mockJob} 
        shifts={mockShifts} 
      />
    </div>
  );
}