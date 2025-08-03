/**
 * Utility functions for creating simple, ID-based URLs.
 */

/**
 * Generate a complete shift URL using the shift's unique ID.
 */
export function generateShiftUrl(shiftId: string): string {
  return `/shifts/${shiftId}`
}

/**
 * Generate an edit URL for a shift using its unique ID.
 */
export function generateShiftEditUrl(shiftId: string): string {
  return `/shifts/${shiftId}/edit`
}

/**
 * Generate a client URL using the client's unique ID.
 */
export function generateClientUrl(clientId: string): string {
  return `/clients/${clientId}`
}

/**
 * Generate an edit URL for a client using its unique ID.
 */
export function generateClientEditUrl(clientId: string): string {
  return `/clients/${clientId}/edit`
}
