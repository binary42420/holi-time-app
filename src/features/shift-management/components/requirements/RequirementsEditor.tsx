"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RequirementInput } from "./RequirementInput";
import { ROLE_DEFINITIONS } from "@/lib/constants";
import { RoleCode } from "@/lib/types";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateWorkerRequirements } from "@/lib/services/shifts"; // Assuming this service function exists
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface RequirementsEditorProps {
  shiftId: string;
  initialRequirements: { roleCode: RoleCode; requiredCount: number }[];
}

export function RequirementsEditor({ shiftId, initialRequirements }: RequirementsEditorProps) {
  const [requirements, setRequirements] = useState(initialRequirements);
  const queryClient = useQueryClient();

  useEffect(() => {
    setRequirements(initialRequirements);
  }, [initialRequirements]);

  const mutation = useMutation({
    mutationFn: (newRequirements: { roleCode: RoleCode; requiredCount: number }[]) => updateWorkerRequirements(shiftId, newRequirements),
    onSuccess: () => {
      toast.success("Worker requirements updated successfully.");
      queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
    },
    onError: (error) => {
      toast.error(`Failed to update requirements: ${error.message}`);
    },
  });

  const handleRequirementChange = (roleCode: RoleCode, count: number) => {
    setRequirements(prev => {
      const existing = prev.find(r => r.roleCode === roleCode);
      if (existing) {
        return prev.map(r => r.roleCode === roleCode ? { ...r, requiredCount: count } : r);
      }
      return [...prev, { roleCode, requiredCount: count }];
    });
  };

  const handleSaveChanges = () => {
    mutation.mutate(requirements);
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Worker Requirements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(Object.keys(ROLE_DEFINITIONS) as RoleCode[]).map(roleCode => (
            <div key={roleCode} className="bg-gray-700/50 p-4 rounded-lg text-center">
              <RequirementInput
                roleCode={roleCode}
                label={ROLE_DEFINITIONS[roleCode].name}
                value={requirements.find(r => r.roleCode === roleCode)?.requiredCount || 0}
                onChange={handleRequirementChange}
              />
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveChanges} disabled={mutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
          {mutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </CardFooter>
    </Card>
  );
}