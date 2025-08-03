"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DangerZone } from "@/components/danger-zone";
import { Shift } from "@/lib/types";
import { format } from "date-fns";

interface ShiftDangerZoneProps {
  shift: Shift;
  onEndShift: () => void;
  onFinalizeTimesheet: () => void;
}

export function ShiftDangerZone({ shift, onEndShift, onFinalizeTimesheet }: ShiftDangerZoneProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="danger-zone" className="border-destructive/50 border-2 rounded-lg">
        <AccordionTrigger className="hover:no-underline text-destructive px-4">
          <h3 className="text-lg font-semibold">Danger Zone</h3>
        </AccordionTrigger>
        <AccordionContent className="p-4">
          <DangerZone
            entityType="shift"
            entityId={shift.id}
            entityName={`${shift.job?.name} - ${format(new Date(shift.date), 'PPP')} ${format(new Date(shift.startTime), 'p')}`}
            redirectTo="/shifts"
            onEndShift={onEndShift}
            onFinalizeTimesheet={onFinalizeTimesheet}
            shift={shift}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}