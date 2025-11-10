/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    [key: string]: string | undefined;
  };
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Real-time subscription helpers
export const subscribeToAppointments = (
  businessId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`appointments-${businessId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "appointments",
        filter: `business_id=eq.${businessId}`,
      },
      callback
    )
    .subscribe();
};

export const subscribeToAppointmentHistory = (
  externalId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`history-${externalId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "appointment_history",
        filter: `appointment_external_id=eq.${externalId}`,
      },
      callback
    )
    .subscribe();
};

// Helper function to create appointment history entries
export const createAppointmentHistoryEntry = async (
  appointmentExternalId: string,
  action: string,
  source: string,
  previousData?: any,
  newData?: any,
  changedBy?: string,
  notes?: string
) => {
  const historyEntry = {
    appointment_external_id: appointmentExternalId,
    action,
    source,
    previous_data: previousData,
    new_data: newData,
    changed_by: changedBy,
    notes,
  };

  const { error } = await supabase
    .from("appointment_history")
    .insert([historyEntry]);

  if (error) {
    console.error("Failed to create history entry:", error);
    console.error("Error details:", error.message, error.details, error.hint);
    throw error;
  }
};
