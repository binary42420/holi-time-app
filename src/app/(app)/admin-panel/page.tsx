"use client"

import React from "react"
import { withAuth } from "@/lib/withAuth"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Enhanced3DStatusBadge } from '@/components/enhanced-date-status-indicators'

import {
  Building2,
  Users,
  Briefcase,
  Calendar,
  Settings,
  BarChart3,
  FileText,
  Clock,
  UserCog,
  Merge,
  Shield,
  Zap,
  Crown,
  Sparkles,
  Target
} from "lucide-react"
import { UserRole } from '@prisma/client';
import { DashboardPage } from "@/components/DashboardPage";
import { cn } from "@/lib/utils";

function AdminPage() {
  const { user } = useUser()
  const router = useRouter()

  // Redirect if not admin
  if (user?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  const adminSections = [
    {
      title: "Admin Dashboard",
      description: "View system overview and analytics",
      icon: BarChart3,
      href: "/admin",
      actions: [
        { label: "View Dashboard", href: "/admin" },
        { label: "System Analytics", href: "/admin" },
        { label: "Performance Metrics", href: "/admin" }
      ]
    },
    {
      title: "Client Management",
      description: "Manage client companies and contacts",
      icon: Building2,
      href: "/companies",
      actions: [
        { label: "View All Clients", href: "/companies" },
        { label: "Add New Client", href: "/companies/new" },
        { label: "Import Clients", href: "/companies/import" }
      ]
    },
    {
      title: "Employee Management",
      description: "Manage workforce and employee records",
      icon: Users,
      href: "/employees",
      actions: [
        { label: "View All Employees", href: "/employees" },
        { label: "Add New Employee", href: "/employees/new" },
        { label: "Employee Reports", href: "/employees/reports" }
      ]
    },
    {
      title: "User Management",
      description: "Manage user accounts and reset passwords",
      icon: UserCog,
      href: "/employees",
      actions: [
        { label: "View All Users", href: "/employees" },
        { label: "Reset Passwords", href: "/employees" },
        { label: "User Roles", href: "/employees" }
      ]
    },
    {
      title: "Merge Duplicates",
      description: "Combine duplicate employees, clients, or jobs",
      icon: Merge,
      href: "/dashboard",
      actions: [
        { label: "Merge Employees", href: "/employees" },
        { label: "Merge Clients", href: "/companies" },
        { label: "Merge Jobs", href: "/admin/jobs" }
      ]
    },
    {
      title: "Jobs & Shifts Management",
      description: "Create and manage jobs, projects, and work shifts",
      icon: Calendar,
      href: "/jobs-shifts",
      actions: [
        { label: "View All Jobs & Shifts", href: "/jobs-shifts" },
        { label: "Create New Job", href: "/admin/jobs/new" },
        { label: "Schedule New Shift", href: "/admin/shifts/new" }
      ]
    },
    {
      title: "Timesheet Management",
      description: "Review and approve timesheets",
      icon: Clock,
      href: "/timesheets",
      actions: [
        { label: "Pending Approvals", href: "/timesheets" },
        { label: "All Timesheets", href: "/timesheets" },
        { label: "Timesheet Reports", href: "/timesheets" }
      ]
    },
    {
      title: "Crew Chief Permissions",
      description: "Manage crew chief permissions and access control",
      icon: Shield,
      href: "/employees",
      actions: [
        { label: "View All Permissions", href: "/employees" },
        { label: "Grant New Permission", href: "/employees" },
        { label: "User Overview", href: "/employees" }
      ]
    },
    {
      title: "System Settings",
      description: "Configure system settings and preferences",
      icon: Settings,
      href: "/settings",
      actions: [
        { label: "User Management", href: "/employees" },
        { label: "System Config", href: "/settings" },
        { label: "Backup & Export", href: "/settings" }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <DashboardPage
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-bold">
              Admin Settings
            </span>
          </div>
        }
        description="Manage all aspects of the Holitime workforce system with enhanced controls"
        buttonText="Dashboard"
        buttonAction={() => router.push('/dashboard')}
      >
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section, index) => {
            const Icon = section.icon
            const gradients = [
              'from-blue-500 to-cyan-500',
              'from-emerald-500 to-teal-500', 
              'from-purple-500 to-indigo-500',
              'from-amber-500 to-orange-500',
              'from-pink-500 to-rose-500',
              'from-indigo-500 to-purple-500',
              'from-red-500 to-pink-500',
              'from-cyan-500 to-blue-500'
            ]
            const gradient = gradients[index % gradients.length]
            
            return (
              <Card 
                key={section.title} 
                className={cn(
                  "relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border-2",
                  "bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900",
                  "border-gray-200 dark:border-gray-700 shadow-lg"
                )}
              >
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                <div className={cn("absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr opacity-10 rounded-full translate-y-12 -translate-x-12", `bg-gradient-to-tr ${gradient}`)}></div>
                
                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className={cn("p-2 bg-gradient-to-br rounded-lg shadow-lg", gradient)}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold">{section.title}</span>
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 relative z-10">
                  {section.actions.map((action, actionIndex) => (
                    <Button
                      key={action.label}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start transition-all duration-200 hover:scale-105",
                        "hover:bg-white/50 dark:hover:bg-gray-800/50 backdrop-blur-sm",
                        "border border-transparent hover:border-gray-200 dark:hover:border-gray-700",
                        "shadow-sm hover:shadow-md"
                      )}
                      onClick={() => router.push(action.href)}
                    >
                      <div className={cn("w-2 h-2 rounded-full mr-3 bg-gradient-to-r", gradient)}></div>
                      {action.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid gap-8 md:grid-cols-2 mt-8">
          <Card className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">
                  System Overview
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl shadow-lg border-2 border-emerald-300 dark:border-emerald-700">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">12</div>
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active Shifts</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-xl shadow-lg border-2 border-red-300 dark:border-red-700 animate-pulse">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">5</div>
                  <div className="text-xs font-medium text-red-600 dark:text-red-400">Pending Reviews</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl shadow-lg border-2 border-blue-300 dark:border-blue-700">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">48</div>
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Workers</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl shadow-lg border-2 border-purple-300 dark:border-purple-700">
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">8</div>
                  <div className="text-xs font-medium text-purple-600 dark:text-purple-400">Active Jobs</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
                  <span className="text-sm font-medium">System Health</span>
                  <Enhanced3DStatusBadge status="FULL" size="sm" />
                </div>
                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
                  <span className="text-sm font-medium">Database Status</span>
                  <Enhanced3DStatusBadge status="Active" size="sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-400/20 to-orange-600/20 rounded-full -translate-y-10 translate-x-10"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent font-bold">
                  Recent Activity
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="p-2 bg-emerald-500 rounded-full">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">New timesheet submitted</div>
                    <div className="text-xs text-muted-foreground">Madison Square Garden - 2 hours ago</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="p-2 bg-blue-500 rounded-full">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Employee added</div>
                    <div className="text-xs text-muted-foreground">John Smith - 4 hours ago</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="p-2 bg-purple-500 rounded-full">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Shift completed</div>
                    <div className="text-xs text-muted-foreground">Broadway Show Load-in - 6 hours ago</div>
                  </div>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-2 hover:shadow-lg transition-all duration-200"
              >
                <Zap className="h-4 w-4 mr-2" />
                View All Activity
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardPage>
    </div>
  )
}

export default withAuth(AdminPage, 'Admin');
