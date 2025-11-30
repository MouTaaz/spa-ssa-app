// ========================================
// CONSTANTS
// ========================================

/**
 * Constants for appointment actions and notification types
 */
export const APPOINTMENT_ACTIONS = {
  BOOKED: 'booked',
  EDITED: 'edited',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled'
} as const;

export const NOTIFICATION_TYPES = {
  APPOINTMENT_BOOKED: 'appointment_booked',
  APPOINTMENT_EDITED: 'appointment_edited',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  TEST_NOTIFICATION: 'test_notification'
} as const;

export const HISTORY_ACTIONS = {
  CREATE: 'CREATE',
  EDIT: 'EDIT',
  CANCEL: 'CANCEL',
  CANCELLED: 'CANCELLED',
  RESCHEDULE: 'RESCHEDULE',
  BOOKED: 'BOOKED',
  UPDATE: 'UPDATE'
} as const;

// Supabase client configuration
export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";