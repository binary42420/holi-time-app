"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CrewChiefPermissionManager } from "@/components/crew-chief-permission-manager";
import { Shift } from "@/lib/types";
import { format } from "date-fns";

interface ShiftPermissionsManagerProps {
  shift: Shift;
}

export function ShiftPermissionsManager({ shift }: ShiftPermissionsManagerProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="permissions">
        <AccordionTrigger>
          <h3 className="text-lg font-semibold">Crew Chief Permissions</h3>
        </AccordionTrigger>
        <AccordionContent>
          <CrewChiefPermissionManager
            targetId={shift.id}
            targetType="shift"
            targetName={`${shift.job?.name} - ${format(new Date(shift.date), 'PPP')} ${format(new Date(shift.startTime), 'p')}`}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}