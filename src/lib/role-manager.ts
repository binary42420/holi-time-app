/**
 * Role Manager - Handles custom worker roles and integrates with built-in roles
 */

import { ROLE_DEFINITIONS } from './constants';
import type { RoleCode } from './types';

export interface RoleDefinition {
  name: string;
  roleColor?: 'purple' | 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  cardBgColor?: string;
  textColor?: string;
  borderColor?: string;
  badgeClasses: string;
  description?: string;
  isCustom?: boolean;
}

export interface CustomRole extends RoleDefinition {
  code: string;
  isCustom: true;
  createdAt: string;
  updatedAt: string;
}

// Storage key for custom roles
const CUSTOM_ROLES_KEY = 'customWorkerRoles';

/**
 * Get all role definitions (built-in + custom)
 */
export function getAllRoleDefinitions(): Record<string, RoleDefinition> {
  const customRoles = getCustomRoles();
  const customRoleDefinitions: Record<string, RoleDefinition> = {};
  
  customRoles.forEach(role => {
    customRoleDefinitions[role.code] = {
      name: role.name,
      roleColor: role.roleColor,
      cardBgColor: role.cardBgColor,
      textColor: role.textColor,
      borderColor: role.borderColor,
      badgeClasses: role.badgeClasses,
      description: role.description,
      isCustom: true
    };
  });

  return {
    ...ROLE_DEFINITIONS,
    ...customRoleDefinitions
  };
}

/**
 * Get all available role codes (built-in + custom)
 */
export function getAllRoleCodes(): string[] {
  const builtInCodes = Object.keys(ROLE_DEFINITIONS);
  const customCodes = getCustomRoles().map(role => role.code);
  return [...builtInCodes, ...customCodes];
}

/**
 * Get custom roles from localStorage
 */
export function getCustomRoles(): CustomRole[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CUSTOM_ROLES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load custom roles:', error);
    return [];
  }
}

/**
 * Save custom roles to localStorage
 */
export function saveCustomRoles(roles: CustomRole[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CUSTOM_ROLES_KEY, JSON.stringify(roles));
    
    // Dispatch event to notify components of role changes
    window.dispatchEvent(new CustomEvent('customRolesUpdated', {
      detail: { roles }
    }));
  } catch (error) {
    console.error('Failed to save custom roles:', error);
    throw new Error('Failed to save custom roles');
  }
}

/**
 * Add a new custom role
 */
export function addCustomRole(
  code: string, 
  name: string, 
  options: Partial<RoleDefinition> = {}
): CustomRole {
  // Validate code
  if (!code || code.length < 2 || code.length > 4) {
    throw new Error('Role code must be 2-4 characters long');
  }

  const upperCode = code.toUpperCase();
  
  // Check if role already exists
  const allRoles = getAllRoleDefinitions();
  if (allRoles[upperCode]) {
    throw new Error('A role with this code already exists');
  }

  // Create new role with defaults
  const newRole: CustomRole = {
    code: upperCode,
    name: name.trim(),
    roleColor: options.roleColor || 'gray',
    cardBgColor: options.cardBgColor || 'bg-gray-100 dark:bg-gray-800/30',
    textColor: options.textColor || 'text-gray-900 dark:text-gray-100',
    borderColor: options.borderColor || 'border-gray-200 dark:border-gray-700',
    badgeClasses: options.badgeClasses || 'bg-gray-500 text-white shadow-md',
    description: options.description || 'Custom role',
    isCustom: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Save to storage
  const existingRoles = getCustomRoles();
  const updatedRoles = [...existingRoles, newRole];
  saveCustomRoles(updatedRoles);

  return newRole;
}

/**
 * Update an existing custom role
 */
export function updateCustomRole(
  code: string, 
  updates: Partial<Omit<CustomRole, 'code' | 'isCustom' | 'createdAt'>>
): CustomRole {
  const existingRoles = getCustomRoles();
  const roleIndex = existingRoles.findIndex(role => role.code === code);
  
  if (roleIndex === -1) {
    throw new Error('Custom role not found');
  }

  const updatedRole: CustomRole = {
    ...existingRoles[roleIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const updatedRoles = [...existingRoles];
  updatedRoles[roleIndex] = updatedRole;
  saveCustomRoles(updatedRoles);

  return updatedRole;
}

/**
 * Delete a custom role
 */
export function deleteCustomRole(code: string): void {
  const existingRoles = getCustomRoles();
  const filteredRoles = existingRoles.filter(role => role.code !== code);
  
  if (filteredRoles.length === existingRoles.length) {
    throw new Error('Custom role not found');
  }

  saveCustomRoles(filteredRoles);
}

/**
 * Check if a role is custom
 */
export function isCustomRole(code: string): boolean {
  return getCustomRoles().some(role => role.code === code);
}

/**
 * Get role definition by code (built-in or custom)
 */
export function getRoleDefinition(code: string): RoleDefinition | null {
  const allRoles = getAllRoleDefinitions();
  return allRoles[code] || null;
}

/**
 * Validate role code format
 */
export function validateRoleCode(code: string): { valid: boolean; error?: string } {
  if (!code) {
    return { valid: false, error: 'Role code is required' };
  }

  if (code.length < 2 || code.length > 4) {
    return { valid: false, error: 'Role code must be 2-4 characters long' };
  }

  if (!/^[A-Z]+$/.test(code.toUpperCase())) {
    return { valid: false, error: 'Role code must contain only letters' };
  }

  const allRoles = getAllRoleDefinitions();
  if (allRoles[code.toUpperCase()]) {
    return { valid: false, error: 'A role with this code already exists' };
  }

  return { valid: true };
}

/**
 * Generate default badge classes for a color
 */
export function generateBadgeClasses(color: string): string {
  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500 text-white shadow-md',
    blue: 'bg-blue-500 text-white shadow-md',
    green: 'bg-green-500 text-white shadow-md',
    yellow: 'bg-yellow-500 text-black shadow-md',
    red: 'bg-red-500 text-white shadow-md',
    gray: 'bg-gray-500 text-white shadow-md',
    orange: 'bg-orange-500 text-white shadow-md',
    pink: 'bg-pink-500 text-white shadow-md',
    indigo: 'bg-indigo-500 text-white shadow-md',
    teal: 'bg-teal-500 text-white shadow-md'
  };

  return colorMap[color] || colorMap.gray;
}

/**
 * Export custom roles for backup
 */
export function exportCustomRoles(): string {
  const roles = getCustomRoles();
  return JSON.stringify(roles, null, 2);
}

/**
 * Import custom roles from backup
 */
export function importCustomRoles(jsonData: string): void {
  try {
    const roles = JSON.parse(jsonData) as CustomRole[];
    
    // Validate structure
    if (!Array.isArray(roles)) {
      throw new Error('Invalid format: expected array of roles');
    }

    // Validate each role
    roles.forEach((role, index) => {
      if (!role.code || !role.name) {
        throw new Error(`Invalid role at index ${index}: missing code or name`);
      }
    });

    saveCustomRoles(roles);
  } catch (error) {
    throw new Error(`Failed to import roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
