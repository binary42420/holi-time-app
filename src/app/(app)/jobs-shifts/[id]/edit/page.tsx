'use client';

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-states";
import { ArrowLeft, Save, Calendar, Clock, MapPin } from "lucide-react";

interface ShiftEditData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  notes?: string;
  location?: string;
  jobId: string;
}

export default function JobsShiftsEditPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const shiftId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [shift, setShift] = useState<ShiftEditData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchShift = async () => {
      try {
        const response = await fetch(`/api/shifts/${shiftId}`);
        if (!response.ok) throw new Error('Failed to fetch shift');
        const data = await response.json();
        setShift({
          id: data.id,
          date: data.date?.split('T')[0] || '', // Convert to YYYY-MM-DD format
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          description: data.description || '',
          notes: data.notes || '',
          location: data.location || '',
          jobId: data.jobId
        });
      } catch (error) {
        console.error('Error fetching shift:', error);
        toast({
          title: "Error",
          description: "Failed to load shift details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (shiftId) {
      fetchShift();
    }
  }, [shiftId, toast]);

  const handleSave = async () => {
    if (!shift) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          description: shift.description,
          notes: shift.notes,
          location: shift.location,
        }),
      });

      if (!response.ok) throw new Error('Failed to update shift');

      toast({
        title: "Success",
        description: "Shift updated successfully",
      });

      router.push(`/jobs-shifts/${shiftId}`);
    } catch (error) {
      console.error('Error updating shift:', error);
      toast({
        title: "Error",
        description: "Failed to update shift",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/jobs-shifts/${shiftId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Shift Not Found</h2>
          <p className="text-muted-foreground">
            The shift you are trying to edit does not exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shift
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Edit Shift</h1>
              <p className="text-muted-foreground">Modify shift details and schedule</p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <Card className="card-consistent">
          <CardHeader className="card-header-consistent">
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Calendar className="h-5 w-5 text-primary" />
              Shift Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date" className="text-foreground">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={shift.date}
                  onChange={(e) => setShift({ ...shift, date: e.target.value })}
                  className="form-input-consistent"
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-foreground">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={shift.location}
                  onChange={(e) => setShift({ ...shift, location: e.target.value })}
                  placeholder="Enter shift location"
                  className="form-input-consistent"
                />
              </div>

              {/* Start Time */}
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-foreground">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={shift.startTime}
                  onChange={(e) => setShift({ ...shift, startTime: e.target.value })}
                  className="form-input-consistent"
                />
              </div>

              {/* End Time */}
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-foreground">
                  <Clock className="h-4 w-4 inline mr-1" />
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={shift.endTime}
                  onChange={(e) => setShift({ ...shift, endTime: e.target.value })}
                  className="form-input-consistent"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Input
                id="description"
                value={shift.description}
                onChange={(e) => setShift({ ...shift, description: e.target.value })}
                placeholder="Brief description of the shift"
                className="form-input-consistent"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">Notes</Label>
              <Textarea
                id="notes"
                value={shift.notes}
                onChange={(e) => setShift({ ...shift, notes: e.target.value })}
                placeholder="Additional notes or instructions for this shift"
                rows={4}
                className="form-input-consistent"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90"
              >
                {isSaving ? (
                  <>
                    <div className="loading-spinner h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="border-border text-foreground hover:bg-muted"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}