import React from 'react';
import { RoleCode } from '@/lib/types';
import { ROLE_DEFINITIONS } from '@/lib/constants';

interface RoleBadgeProps {
  roleCode: RoleCode;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ roleCode }) => {
  const roleInfo = ROLE_DEFINITIONS[roleCode];

  if (!roleInfo) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${roleInfo.badgeClasses}`}
    >
      {roleCode}
    </span>
  );
};