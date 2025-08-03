import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { RoleIcon, RoleBadge, RoleLegend, getAllRoles } from '@/components/ui/role-icons';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Clock, Activity } from 'lucide-react';

// Mock data for demonstration
const mockWorkers = [
  {
    id: '1',
    name: 'Mike Rodriguez',
    roleCode: 'CC',
    status: 'ClockedIn',
    performance: 4.8,
    experience: '8 years'
  },
  {
    id: '2', 
    name: 'Sarah Johnson',
    roleCode: 'SH',
    status: 'OnBreak',
    performance: 4.2,
    experience: '3 years'
  },
  {
    id: '3',
    name: 'Carlos Martinez',
    roleCode: 'FO',
    status: 'ClockedIn', 
    performance: 4.6,
    experience: '5 years'
  },
  {
    id: '4',
    name: 'David Kim',
    roleCode: 'RG',
    status: 'Assigned',
    performance: 4.9,
    experience: '12 years'
  },
  {
    id: '5',
    name: 'Ashley Brown',
    roleCode: 'GL',
    status: 'ClockedIn',
    performance: 3.8,
    experience: '1 year'
  }
];

const mockShift = {
  name: 'Madison Square Garden Concert Setup',
  date: 'December 15, 2024',
  time: '8:00 AM - 4:00 PM',
  roles: {
    CC: { required: 2, assigned: 1 },
    SH: { required: 8, assigned: 6 },
    FO: { required: 3, assigned: 2 },
    RG: { required: 4, assigned: 3 },
    GL: { required: 6, assigned: 4 }
  }
};

export function RoleBadgesDemo() {
  const allRoles = getAllRoles();

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Enhanced Role Badge System</h1>
        <p className="text-muted-foreground text-lg">
          Profession-specific icons for instant role recognition in workforce management
        </p>
      </div>

      {/* Role Icon Showcase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Role Icon System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {allRoles.map(role => (
              <div key={role.code} className="text-center p-4 rounded-lg border bg-muted/20">
                <RoleIcon roleCode={role.code} size="xl" className="mx-auto mb-3" />
                <div className="font-semibold text-sm">{role.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{role.code}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {role.description}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Worker Cards with New Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Worker Status Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockWorkers.map(worker => (
              <div key={worker.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <RoleIcon roleCode={worker.roleCode} size="lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{worker.name}</div>
                    <div className="text-sm text-muted-foreground">{worker.experience}</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={worker.roleCode === 'CC' ? 'CREW_CHIEF' : 
                                       worker.roleCode === 'SH' ? 'STAGEHAND' :
                                       worker.roleCode === 'FO' ? 'FORK_OPERATOR' :
                                       worker.roleCode === 'RG' ? 'RIGGER' : 'GENERAL_LABOR'} 
                               size="sm" />
                  <StatusBadge status={worker.status} size="sm" />
                  <StatusBadge status={worker.performance >= 4.5 ? 'EXCELLENT' :
                                       worker.performance >= 4.0 ? 'GREAT' :
                                       worker.performance >= 3.5 ? 'GOOD_PERFORMANCE' : 'NEEDS_IMPROVEMENT'} 
                               size="sm" />
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Performance</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                    <span className="font-medium">{worker.performance}/5.0</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shift Overview with Role Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shift Overview - Role Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{mockShift.name}</h3>
            <div className="text-muted-foreground">
              {mockShift.date} • {mockShift.time}
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {Object.entries(mockShift.roles).map(([roleCode, counts]) => {
              const role = allRoles.find(r => r.code === roleCode);
              if (!role) return null;
              
              const percentage = (counts.assigned / counts.required) * 100;
              const fulfillmentStatus = percentage >= 100 ? 'FULL' :
                                      percentage >= 80 ? 'GOOD' :
                                      percentage >= 60 ? 'LOW' : 'CRITICAL';
              
              return (
                <div key={roleCode} className="p-4 border rounded-lg text-center space-y-3">
                  <RoleIcon roleCode={roleCode} size="lg" className="mx-auto" />
                  <div>
                    <div className="font-medium">{role.name}</div>
                    <div className="text-sm text-muted-foreground">{roleCode}</div>
                  </div>
                  <StatusBadge 
                    status={fulfillmentStatus}
                    count={counts.assigned}
                    total={counts.required}
                    showCount
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Badge Variants Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Role Badge Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {(['default', 'outline', 'solid'] as const).map(variant => (
            <div key={variant} className="space-y-3">
              <h4 className="font-medium capitalize">{variant} Style</h4>
              <div className="flex flex-wrap gap-2">
                {allRoles.map(role => (
                  <RoleBadge 
                    key={role.code}
                    roleCode={role.code}
                    variant={variant}
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Role Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Role Reference Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <RoleLegend />
        </CardContent>
      </Card>

      {/* Implementation Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Basic Role Icon</h4>
            <code className="text-sm bg-muted p-2 rounded block">
              {`<RoleIcon roleCode="CC" size="md" />`}
            </code>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Role Badge with Label</h4>
            <code className="text-sm bg-muted p-2 rounded block">
              {`<RoleBadge roleCode="FO" variant="solid" />`}
            </code>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Status Badge Integration</h4>
            <code className="text-sm bg-muted p-2 rounded block">
              {`<StatusBadge status="CREW_CHIEF" />
<StatusBadge status="ClockedIn" />
<StatusBadge status="EXCELLENT" />`}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Professional Color Palette */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Color Palette</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { role: 'CC', color: 'Blue', meaning: 'Leadership & Authority' },
              { role: 'SH', color: 'Emerald', meaning: 'Stage & Creative Work' },
              { role: 'FO', color: 'Purple', meaning: 'Specialized Equipment' },
              { role: 'RG', color: 'Red', meaning: 'Safety Critical Work' },
              { role: 'GL', color: 'Slate', meaning: 'General Construction' }
            ].map(item => (
              <div key={item.role} className="text-center p-3 border rounded-lg">
                <RoleIcon roleCode={item.role} size="lg" className="mx-auto mb-2" />
                <div className="font-medium text-sm">{item.color}</div>
                <div className="text-xs text-muted-foreground">{item.meaning}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RoleBadgesDemo;