"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Shift } from "@/lib/types";

interface ShiftInfoCardProps {
  shift: Shift & {
    timesheets?: {
      id: string;
      status: string;
    }[];
  };
}

export function ShiftInfoCard({ shift }: ShiftInfoCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg">Shift Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{shift.status}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Location</span>
            <span className="font-medium">{shift.location || 'Not specified'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}