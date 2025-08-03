"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";
import { useShiftPageData } from "../hooks/useShiftPageData";
import { toast } from "sonner";

interface ShiftNotesProps {
  shiftId: string;
  initialNotes: string | null;
}

export function ShiftNotes({ shiftId, initialNotes }: ShiftNotesProps) {
  const [notes, setNotes] = useState(initialNotes || "");
  const { updateNotes } = useShiftPageData(shiftId);

  const handleNotesSubmit = () => {
    updateNotes.mutate(notes, {
      onSuccess: () => toast.success("Notes updated successfully."),
      onError: (error) => toast.error(`Failed to update notes: ${error.message}`),
    });
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="notes">
        <AccordionTrigger>
          <h3 className="text-lg font-semibold">Notes</h3>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter shift notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full"
            />
            <Button
              onClick={handleNotesSubmit}
              disabled={updateNotes.isPending}
            >
              {updateNotes.isPending ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}