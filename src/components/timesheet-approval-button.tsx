'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import type { TimesheetStatus } from '@prisma/client';

interface TimesheetApprovalButtonProps {
  timesheetId: string;
  status: TimesheetStatus;
  className?: string;
}

interface ApprovalStageInfo {
  label: string;
  href: string;
  icon: React.ReactNode;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  disabled?: boolean;
}

export function TimesheetApprovalButton({ 
  timesheetId, 
  status, 
  className = '' 
}: TimesheetApprovalButtonProps) {
  const { user } = useUser();

  if (!user) return null;

  const getApprovalStageInfo = (): ApprovalStageInfo => {
    switch (status) {
      case 'PENDING_COMPANY_APPROVAL':
        return {
          label: 'Timesheet - Pending Company Approval',
          href: `/timesheets/${timesheetId}/client-approval`,
          icon: <Clock className="h-4 w-4 mr-2" />,
          variant: 'outline'
        };

      case 'PENDING_MANAGER_APPROVAL':
        // Different links based on user role
        if (user.role === 'Admin' || user.role === 'Staff') {
          return {
            label: 'Timesheet - Pending Manager Approval',
            href: `/timesheets/${timesheetId}/manager-approval`,
            icon: <Clock className="h-4 w-4 mr-2" />,
            variant: 'outline'
          };
        } else {
          // For CrewChief and CompanyUser, link to general timesheet view
          return {
            label: 'Timesheet - Pending Manager Approval',
            href: `/timesheets/${timesheetId}`,
            icon: <Clock className="h-4 w-4 mr-2" />,
            variant: 'outline'
          };
        }

      case 'COMPLETED':
        return {
          label: 'Download Approved Timesheet PDF',
          href: `/api/timesheets/${timesheetId}/download-pdf-simple`,
          icon: <CheckCircle className="h-4 w-4 mr-2 text-green-600" />,
          variant: 'default'
        };

      case 'REJECTED':
        return {
          label: 'Timesheet - Rejected',
          href: `/timesheets/${timesheetId}`,
          icon: <AlertCircle className="h-4 w-4 mr-2" />,
          variant: 'destructive'
        };

      case 'DRAFT':
      default:
        return {
          label: 'Timesheet - Draft',
          href: `/timesheets/${timesheetId}`,
          icon: <FileText className="h-4 w-4 mr-2" />,
          variant: 'secondary'
        };
    }
  };

  const stageInfo = getApprovalStageInfo();

  return (
    <Link href={stageInfo.href}>
      <Button 
        variant={stageInfo.variant}
        className={`flex items-center gap-2 text-xs sm:text-sm ${
          status === 'COMPLETED' 
            ? 'bg-green-100 hover:bg-green-200 text-green-800 border-green-200' 
            : ''
        } ${className}`}
        disabled={stageInfo.disabled}
        size="sm"
      >
        {stageInfo.icon}
        <span className="font-medium hidden sm:inline">{stageInfo.label}</span>
        <span className="font-medium sm:hidden">
          {status === 'PENDING_COMPANY_APPROVAL' && 'Company Review'}
          {status === 'PENDING_MANAGER_APPROVAL' && 'Manager Review'}
          {status === 'COMPLETED' && 'Download PDF'}
          {status === 'REJECTED' && 'Rejected'}
          {status === 'DRAFT' && 'Draft'}
        </span>
      </Button>
    </Link>
  );
}