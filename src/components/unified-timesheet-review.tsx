'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  User, 
  MapPin, 
  Calendar, 
  Building, 
  FileText, 
  Download, 
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Signature
} from "lucide-react";
import { format } from 'date-fns';
import SignatureCaptureModal from '@/components/signature-capture-modal';
import { useToast } from "@/hooks/use-toast";
import { formatTimeTo12Hour, calculateTotalRoundedHours, formatDate, getTimeEntryDisplay } from "@/lib/time-utils";
import { TIMESHEET_STATUS, USER_ROLES } from '@/lib/constants';
import { api } from '@/lib/api';

interface TimeEntry {
  id: string;
  entryNumber: number;
  clockIn?: string;
  clockOut?: string;
}

interface AssignedPersonnel {
  id: string;
  user: {
    id: string;
    name: string;
  };
  roleCode: string;
  timeEntries: TimeEntry[];
}

interface TimesheetData {
  id: string;
  status: string;
  submittedAt?: string;
  submittedBy?: string;
  company_signature?: string;
  company_approved_at?: string;
  manager_signature?: string;
  manager_approved_at?: string;
  unsigned_pdf_url?: string;
  signed_pdf_url?: string;
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    job: {
      id: string;
      name: string;
      company: {
        id: string;
        name: string;
      };
    };
    assignedPersonnel: AssignedPersonnel[];
  };
}

interface UnifiedTimesheetReviewProps {
  timesheetId: string;
  userRole: string;
  userId: string;
  companyId?: string;
}

export default function UnifiedTimesheetReview({
  timesheetId,
  userRole,
  userId,
  companyId
}: UnifiedTimesheetReviewProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [timesheet, setTimesheet] = useState<TimesheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [approvalType, setApprovalType] = useState<'company' | 'manager'>('company');

  // Fetch timesheet data
  useEffect(() => {
    fetchTimesheetData();
  }, [timesheetId]);

  const fetchTimesheetData = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/timesheets/${timesheetId}`);
      setTimesheet(data);
    } catch (error) {
      console.error('Error fetching timesheet:', error);
      toast({
        title: 'Error',
        description: 'Failed to load timesheet data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine what actions the current user can take
  const getAvailableActions = () => {
    if (!timesheet) return { canApprove: false, canReject: false, approvalType: 'company' };

    const status = timesheet.status;
    const isAdmin = userRole === USER_ROLES.ADMIN;
    const isCompanyUser = userRole === USER_ROLES.COMPANY_USER;
    const isCrewChief = userRole === USER_ROLES.CREW_CHIEF;
    const isAssignedCrewChief = timesheet.shift.assignedPersonnel.some(
      ap => ap.user.id === userId
    );
    const isSameCompany = companyId === timesheet.shift.job.company.id;

    if (status === TIMESHEET_STATUS.PENDING_COMPANY_APPROVAL) {
      const canApprove = isAdmin || 
                        (isCompanyUser && isSameCompany) || 
                        (isCrewChief && isAssignedCrewChief);
      return { 
        canApprove, 
        canReject: canApprove, 
        approvalType: 'company' as const 
      };
    }

    if (status === TIMESHEET_STATUS.PENDING_MANAGER_APPROVAL) {
      return { 
        canApprove: isAdmin, 
        canReject: isAdmin, 
        approvalType: 'manager' as const 
      };
    }

    return { canApprove: false, canReject: false, approvalType: 'company' as const };
  };

  const { canApprove, canReject, approvalType: currentApprovalType } = getAvailableActions();

  // Handle approval
  const handleApproval = () => {
    setApprovalType(currentApprovalType);
    setShowSignatureModal(true);
  };

  // Handle signature submission
  const handleSignatureSubmit = async (signatureData: string) => {
    try {
      setSubmitting(true);

      const response = await api.post(`/timesheets/${timesheetId}/approve`, {
        signature: signatureData,
        approvalType: currentApprovalType,
        notes: notes.trim() || undefined
      });

      toast({
        title: 'Success',
        description: currentApprovalType === 'company' 
          ? 'Timesheet approved and sent for final approval'
          : 'Timesheet has been fully approved and PDF generated',
      });

      setShowSignatureModal(false);
      await fetchTimesheetData(); // Refresh data

      // If this was final approval, show PDF download option
      if (currentApprovalType === 'manager') {
        setTimeout(() => {
          toast({
            title: 'PDF Ready',
            description: 'Timesheet PDF has been generated and is ready for download',
          });
        }, 2000);
      }

    } catch (error) {
      console.error('Error approving timesheet:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve timesheet. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle rejection
  const handleRejection = async () => {
    if (!notes.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmitting(true);

      await api.post(`/timesheets/${timesheetId}/reject`, {
        reason: notes.trim(),
        notes: notes.trim()
      });

      toast({
        title: 'Success',
        description: 'Timesheet has been rejected',
      });

      router.push('/timesheets/pending');

    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject timesheet. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle PDF download
  const handlePDFDownload = () => {
    if (timesheet?.unsigned_pdf_url || timesheet?.signed_pdf_url) {
      // Prefer signed PDF if available, otherwise use unsigned
      const type = timesheet?.signed_pdf_url ? 'signed' : 'unsigned';
      window.open(`/api/timesheets/${timesheetId}/pdf?type=${type}`, '_blank');
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case TIMESHEET_STATUS.DRAFT:
        return <Badge variant="secondary">Draft</Badge>;
      case TIMESHEET_STATUS.PENDING_COMPANY_APPROVAL:
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending Client Approval</Badge>;
      case TIMESHEET_STATUS.PENDING_MANAGER_APPROVAL:
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Pending Final Approval</Badge>;
      case TIMESHEET_STATUS.COMPLETED:
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case TIMESHEET_STATUS.REJECTED:
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading timesheet...</p>
        </div>
      </div>
    );
  }

  if (!timesheet) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Timesheet not found</h3>
        <p className="text-gray-600">The requested timesheet could not be found.</p>
        <Button 
          variant="outline" 
          onClick={() => router.push('/timesheets')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Timesheets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/timesheets/pending')}
          >
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Timesheet Review
            </h1>
            <p className="text-muted-foreground">
              {currentApprovalType === 'company' ? 'Client Approval' : 'Final Approval'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(timesheet.status)}
          {(timesheet.unsigned_pdf_url || timesheet.signed_pdf_url) && (
            <Button variant="outline" onClick={handlePDFDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}
        </div>
      </div>

      {/* Timesheet Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Timesheet Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Date:</span>
                <span>{timesheet.shift?.date ? formatDate(timesheet.shift.date) : 'No date'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Time:</span>
                <span>{timesheet.shift?.startTime && timesheet.shift?.endTime ? 
                  `${formatTimeTo12Hour(timesheet.shift.startTime)} - ${formatTimeTo12Hour(timesheet.shift.endTime)}` : 
                  'No time'}</span>
              </div>
              {timesheet.shift?.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Location:</span>
                  <span>{timesheet.shift?.location}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Client:</span>
                <span>{timesheet.shift?.job?.company?.name || 'Unknown Company'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Job:</span>
                <span>{timesheet.shift?.job?.name || 'Unknown Job'}</span>
              </div>
              {timesheet.submittedAt && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Submitted:</span>
                  <span>{format(new Date(timesheet.submittedAt), 'M/d/yyyy')} at {format(new Date(timesheet.submittedAt), 'h:mm a')}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Worker Hours Table */}
      <Card>
        <CardHeader>
          <CardTitle>Worker Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Entry 1</TableHead>
                <TableHead className="text-center">Entry 2</TableHead>
                <TableHead className="text-center">Entry 3</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheet.shift.assignedPersonnel.map((worker) => {
                const totalHours = calculateTotalRoundedHours(worker.timeEntries);
                
                return (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.user.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{worker.roleCode}</Badge>
                    </TableCell>
                    {[1, 2, 3].map((entryNum) => {
                      const entry = worker.timeEntries.find(e => e.entryNumber === entryNum);
                      return (
                        <TableCell key={entryNum} className="text-center">
                          {entry ? getTimeEntryDisplay(entry) : '-'}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-medium">
                      {totalHours.toFixed(2)} hrs
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approval Actions */}
      {(canApprove || canReject) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Signature className="h-5 w-5" />
              {currentApprovalType === 'company' ? 'Client Approval' : 'Final Approval'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder={`Add any notes about this ${currentApprovalType === 'company' ? 'client approval' : 'final approval'}...`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2">
              {canApprove && (
                <Button 
                  onClick={handleApproval}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {currentApprovalType === 'company' ? 'Approve for Final Review' : 'Final Approval'}
                </Button>
              )}
              
              {canReject && (
                <Button 
                  variant="destructive"
                  onClick={handleRejection}
                  disabled={submitting || !notes.trim()}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Reject Timesheet
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signature Modal */}
      <SignatureCaptureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSignatureSubmit={handleSignatureSubmit}
        title={`${currentApprovalType === 'company' ? 'Client' : 'Manager'} Approval Signature`}
        description={`Please sign below to ${currentApprovalType === 'company' ? 'approve this timesheet for final review' : 'provide final approval for this timesheet'}`}
        loading={submitting}
      />
    </div>
  );
}
