'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  ArrowRight, 
  Users, 
  AlertTriangle,
  Info
} from 'lucide-react';
import WRMigrationTool from '@/components/admin/wr-migration-tool';

export default function MigrationPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Migration Tools</h1>
          <p className="text-gray-600 mt-2">
            Administrative tools for data migration and cleanup
          </p>
        </div>
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Admin Only
        </Badge>
      </div>

      {/* Migration Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            WR Role Migration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Info className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium">Purpose</h3>
                <p className="text-sm text-gray-600">
                  Convert all assigned personnel with the non-existent 'WR' role to 'SH' (Stage Hand) 
                  and update the required stagehands count for affected shifts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">What this migration does:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Finds all assigned personnel with role 'WR'</li>
                  <li>• Changes their role to 'SH' (Stage Hand)</li>
                  <li>• Updates shift requirements to reflect new SH count</li>
                  <li>• Maintains data integrity with transaction safety</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Migration process:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">WR</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="default">SH</Badge>
                    <span className="text-gray-600">Role conversion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span className="text-gray-600">Update shift requirements</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Migration Tool */}
      <WRMigrationTool />

      {/* Safety Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Safety Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <strong>⚠️ Important:</strong> This migration will permanently modify database records. 
              Make sure you have a recent backup before proceeding.
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-600 mb-2">✅ Safe Operations:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Uses database transactions for consistency</li>
                  <li>• Only affects WR role assignments</li>
                  <li>• Automatically calculates new requirements</li>
                  <li>• Provides detailed preview before execution</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-red-600 mb-2">⚠️ Considerations:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Changes are permanent once executed</li>
                  <li>• Affects shift worker requirements</li>
                  <li>• May impact existing schedules</li>
                  <li>• Requires admin privileges</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
