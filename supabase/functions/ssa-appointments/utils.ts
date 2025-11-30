import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./constants.ts";

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Create a Supabase client instance
 */
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Create a JSON response with proper headers
 * @param responseData - Data to be JSON stringified
 * @param httpStatus - HTTP status code (default: 200)
 * @returns Response object with JSON content type
 */
export function createJsonResponse(responseData: any, httpStatus = 200): Response {
  return new Response(JSON.stringify(responseData), {
    status: httpStatus,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

/**
 * Add CORS headers to a response for cross-origin requests
 * @param response - Original response object
 * @returns Response with CORS headers added
 */
export function addCorsHeaders(response: Response): Response {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
  for (const [headerName, headerValue] of Object.entries(corsHeaders)) {
    response.headers.set(headerName, headerValue);
  }
  return response;
}

/**
 * Map source values to match React component expectations
 * @param sourceValue - Raw source string from webhook or user action
 * @returns Normalized source value
 */
export function mapSourceToCompatibleValue(sourceValue: string): string {
  const sourceValueMapping: Record<string, string> = {
    'webhook': 'webhook',
    'customer': 'customer',
    'webhook_booked': 'webhook',
    'webhook_edited': 'webhook',
    'webhook_canceled': 'webhook',
    'webhook_rescheduled': 'webhook',
    'customer_edited': 'customer',
    'user': 'user'
  };
  return sourceValueMapping[sourceValue] || 'webhook';
}

/**
 * Compare old and new appointment data to identify changed fields
 * @param previousData - Previous appointment data
 * @param currentData - New appointment data
 * @returns Array of field names that changed
 */
export function getChangedFields(previousData: any, currentData: any): string[] {
  const trackedFields = ['customer_name', 'customer_email', 'customer_phone', 'service_name', 'location', 'start_time', 'end_time'];
  const changedFieldNames = [];

  trackedFields.forEach((fieldName) => {
    if (previousData[fieldName] !== currentData[fieldName]) {
      changedFieldNames.push(fieldName.replace('_', ' '));
    }
  });

  return changedFieldNames;
}