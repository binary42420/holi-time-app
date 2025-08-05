"use client"

import React from "react"
import { withAuth } from "@/lib/withAuth"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'

import { Badge } from '@/components/ui/badge'

import { 
  ArrowLeft, 
  Settings,
  Users,
  Database,
  Shield,
  Bell,
  Palette,
  Globe,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  FileText
} from "lucide-react"

import { UserRole } from '@prisma/client';

function AdminSettingsPage() {
  const { user } = useUser()
  const router = useRouter()

  // Redirect if not admin
  if (user?.role !== UserRole.Admin) {
    router.push('/dashboard')
    return null
  }

  const settingsSections = [
    {
      title: "User Management",
      description: "Manage user accounts, roles, and permissions",
      icon: Users,
      href: "/employees",
      actions: [
        { label: "View All Users", href: "/employees" },
        { label: "Role Management", href: "/employees" },
        { label: "Permission Settings", href: "/employees" }
      ]
    },
    {
      title: "System Configuration",
      description: "Configure system-wide settings and preferences",
      icon: Settings,
      href: "/settings",
      actions: [
        { label: "General Settings", href: "/settings" },
        { label: "Email Configuration", href: "/settings" },
        { label: "Notification Settings", href: "/settings" }
      ]
    },
    {
      title: "Security Settings",
      description: "Manage security policies and authentication",
      icon: Shield,
      href: "/admin/settings/security",
      actions: [
        { label: "Password Policies", href: "/admin/settings/security/passwords" },
        { label: "Session Management", href: "/admin/settings/security/sessions" },
        { label: "Audit Logs", href: "/admin/settings/security/audit" }
      ]
    },
    {
      title: "PDF Templates",
      description: "Configure and customize PDF timesheet templates",
      icon: FileText,
      href: "/admin/pdf-config",
      actions: [
        { label: "Template Designer", href: "/admin/pdf-config" },
        { label: "Manage Templates", href: "/admin/pdf-config" },
        { label: "Preview Templates", href: "/admin/pdf-config" }
      ]
    },
    {
      title: "Data Import & Export",
      description: "Import/export data from CSV files and external sources",
      icon: HardDrive,
      href: "/import",
      actions: [
        { label: "Import Data", href: "/import" },
        { label: "Export Timesheets", href: "/timesheets" },
        { label: "Export Reports", href: "/admin/reports" }
      ]
    },
    {
      title: "Notifications",
      description: "Configure system notifications and alerts",
      icon: Bell,
      href: "/admin/settings/notifications",
      actions: [
        { label: "Email Notifications", href: "/admin/settings/notifications/email" },
        { label: "SMS Settings", href: "/admin/settings/notifications/sms" },
        { label: "Alert Preferences", href: "/admin/settings/notifications/alerts" }
      ]
    },
    {
      title: "Appearance",
      description: "Customize the application's look and feel",
      icon: Palette,
      href: "/admin/settings/appearance",
      actions: [
        { label: "Theme Settings", href: "/admin/settings/appearance/theme" },
        { label: "Branding", href: "/admin/settings/appearance/branding" },
        { label: "Layout Options", href: "/admin/settings/appearance/layout" }
      ]
    }
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">System Settings</h1>
          <p className="text-muted-foreground">Configure system settings and preferences</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Administrator Access
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.actions.map((action) => (
                  <Button
                    key={action.label}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => router.push(action.href)}
                  >
                    {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Current system health and statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Database Status</span>
              <Badge variant="default">Connected</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Last Backup</span>
              <span className="text-sm text-muted-foreground">2 hours ago</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Active Users</span>
              <span className="text-sm text-muted-foreground">12 online</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">System Version</span>
              <span className="text-sm text-muted-foreground">v1.0.0</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push('/admin/pdf-config')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Configure PDF Templates
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              Download System Backup
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push('/import')}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh System Cache
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Globe className="mr-2 h-4 w-4" />
              Check for Updates
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(AdminSettingsPage, 'Admin');
