"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { ShiftWithDetails } from "@/lib/types"; // Use ShiftWithDetails to access timesheets
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ShiftStatus } from "@prisma/client";
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { useUser } from "@/hooks/use-user";

interface ShiftHeaderProps {
  shift: ShiftWithDetails;
}

const statusStyles: Record<ShiftStatus, string> = {
  [ShiftStatus.Pending]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [ShiftStatus.InProgress]: "bg-green-100 text-green-800 border-green-200",
  [ShiftStatus.Completed]: "bg-gray-100 text-gray-800 border-gray-200",
  [ShiftStatus.Cancelled]: "bg-red-100 text-red-800 border-red-200",
  [ShiftStatus.Active]: "bg-blue-100 text-blue-800 border-blue-200",
};

export function ShiftHeader({ shift }: ShiftHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const handleDownloadPdf = async () => {
    if (!shift.timesheets?.id) {
      toast({
        title: "Error",
        description: "No timesheet associated with this shift for PDF download.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/timesheets/${shift.timesheets.id}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheet-${shift.job?.company?.name}-${format(new Date(shift.date), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "PDF download started.",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => {
          // Navigate to admin/shifts for admins, otherwise to regular shifts page
          const shiftsPath = user?.role === 'Admin' ? '/admin/shifts' : '/shifts';
          router.push(shiftsPath);
        }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{shift.job?.name}</h1>
          <div className="flex items-center text-muted-foreground gap-2">
            <CompanyAvatar
              src={shift.job?.company?.company_logo_url}
              name={shift.job?.company?.name || ''}
              className="w-6 h-6"
            />
            <span>{shift.job?.company?.name}</span>
            <span className="mx-2">•</span>
            <span>{format(new Date(shift.date), 'PPP')}</span>
            <span className="mx-2">•</span>
            <span>{format(new Date(shift.startTime), 'p')}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Badge variant="outline" className={cn("text-sm", statusStyles[shift.status])}>
          {shift.status}
        </Badge>
        <Button
          variant="outline"
          onClick={handleDownloadPdf}
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/shifts/${shift.id}/edit`)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit Shift
        </Button>
      </div>
    </div>
  );
}