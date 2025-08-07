"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EnhancedJobReport } from '@/components/enhanced-job-report';
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Share2, 
  RefreshCw,
  AlertCircle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  jobNumber: string;
  title: string;
  description?: string;
  location: string;
  status: string;
  startDate: string;
  endDate: string;
  company?: {
    id: string;
    name: string;
  };
}

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  status: string;
  crew_chief_required: number;
  fork_operators_required: number;
  stage_hands_required: number;
  general_labor_required: number;
  assignments?: Array<{
    id: string;
    workerType: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export default function JobReportPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load job and shifts data
  const loadJobData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load job details
      const jobResponse = await fetch(`/api/jobs/${jobId}`);
      if (!jobResponse.ok) {
        throw new Error('Failed to load job details');
      }
      const jobData = await jobResponse.json();
      setJob(jobData);

      // Load shifts for this job
      const shiftsResponse = await fetch(`/api/jobs/${jobId}/shifts`);
      if (!shiftsResponse.ok) {
        throw new Error('Failed to load shifts');
      }
      const shiftsData = await shiftsResponse.json();
      setShifts(shiftsData);

    } catch (err) {
      console.error('Error loading job data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load job data');
      toast({
        title: "Error",
        description: "Failed to load job report data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  // Export to PDF (placeholder - would need PDF generation library)
  const handleExportPDF = () => {
    toast({
      title: "Export PDF",
      description: "PDF export functionality would be implemented here.",
    });
  };

  // Share report (placeholder)
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Job Report - ${job?.title}`,
        text: `Job report for ${job?.title} (${job?.jobNumber})`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Report link copied to clipboard.",
      });
    }
  };

  useEffect(() => {
    if (jobId) {
      loadJobData();
    }
  }, [jobId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-muted rounded mb-4" />
            <div className="h-64 w-full bg-muted rounded mb-4" />
            <div className="h-96 w-full bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Job Report</h3>
            <p className="text-muted-foreground text-center mb-4">
              {error || 'The requested job could not be found.'}
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={loadJobData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => router.push('/jobs')} variant="default">
                Back to Jobs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex items-center gap-2">
          <Button onClick={loadJobData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleShare} variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Enhanced Job Report Component */}
      <EnhancedJobReport job={job} shifts={shifts} />
    </div>
  );
}