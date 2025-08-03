"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleCode } from "@/lib/types";

interface RequirementInputProps {
  roleCode: RoleCode;
  label: string;
  value: number;
  onChange: (roleCode: RoleCode, value: number) => void;
}

export function RequirementInput({ roleCode, label, value, onChange }: RequirementInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const intValue = parseInt(e.target.value, 10);
    onChange(roleCode, isNaN(intValue) ? 0 : intValue);
  };

  return (
    <div className="grid grid-cols-2 items-center gap-4">
      <Label htmlFor={roleCode}>{label}</Label>
      <Input
        id={roleCode}
        type="number"
        min="0"
        value={value}
        onChange={handleChange}
        className="w-full"
      />
    </div>
  );
}