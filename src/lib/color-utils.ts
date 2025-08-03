import { RoleCode } from "@/lib/types";

export const ROLE_DEFINITIONS: Record<RoleCode, { name: string; color: string }> = {
  'CC': { name: 'Crew Chief', color: 'purple' },
  'SH': { name: 'Stage Hand', color: 'blue' },
  'FO': { name: 'Fork Operator', color: 'green' },
  'RFO': { name: 'Reach Fork Operator', color: 'yellow' },
  'RG': { name: 'Rigger', color: 'red' },
  'GL': { name: 'General Labor', color: 'gray' },
} as const;

export const getRoleColor = (roleCode: RoleCode): string => {
  return ROLE_DEFINITIONS[roleCode]?.color || 'gray';
};
