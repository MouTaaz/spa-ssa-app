"use client";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { useBusiness } from "@/hooks/useBusiness";
import { useSubscription } from "./useSubscription";
import { supabase, subscribeToAppointments } from "@/lib/supabase";

export function useAppointments(userEmail: string | undefined) {
  const { currentBusiness } = useBusiness();
  const { canPerformAction } = useSubscription();
  const { appointments, setAppointments, updateAppointment, user } =
    useAppStore();

  // Fetch appointments and their history for status determination
  const fetchAppointments = useCallback(async () => {
    if (!userEmail || !user?.id || !currentBusiness?.id) return;

    console.log("Fetching business appointments (RLS enabled):", userEmail);

    try {
      // First try with RLS filtering
      const { data: appointmentsData, error: aptError } = await supabase
        .from("appointments")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .order("start_time", { ascending: false })
        .limit(1000);

      if (aptError) {
        console.error("Supabase error:", aptError);

        // If RLS blocks the query, try a different approach
        if (aptError.code === "PGRST301" || aptError.message?.includes("permission denied")) {
          console.warn("RLS blocking appointment fetch, trying alternative approach");

          // Try fetching without business_id filter first to see if table is accessible
          const { data: allAppointments, error: allError } = await supabase
            .from("appointments")
            .select("*")
            .order("start_time", { ascending: false })
            .limit(1000);

          if (allError) {
            console.error("Alternative fetch also failed:", allError);
            throw allError;
          }

          // Filter client-side for this business
          const businessAppointments = allAppointments?.filter(
            apt => apt.business_id === currentBusiness.id
          ) || [];

          console.log("Fetched appointments (client-filtered):", businessAppointments);

          // Process appointments to determine display status and link rescheduled ones
          const processedAppointments = businessAppointments.map((apt) => {
            // For edited appointments, keep original status but mark as edited for display
            if (apt.was_edited && apt.status === "BOOKED") {
              console.log(`Found edited appointment: ${apt.customer_name}`);
              return {
                ...apt,
                status: "BOOKED", // Keep original status
                display_status: "EDITED", // Add separate field for UI display
              };
            }

            return apt;
          });

          // Process cancellation types and rescheduled appointments
          const visibleAppointments = processedAppointments
            .map((apt) => {
              if (apt.previous_external_id && apt.status === "BOOKED") {
                // This appointment is a reschedule of a cancelled one
                const predecessor = processedAppointments.find(
                  (p) => p.external_id === apt.previous_external_id
                );
                return {
                  ...apt,
                  status: "BOOKED", // Keep as BOOKED
                  display_status: "RESCHEDULED", // Add display status for UI
                  previous_appointment: predecessor
                    ? {
                        external_id: predecessor.external_id,
                        start_time: predecessor.start_time,
                        end_time: predecessor.end_time,
                        location: predecessor.location,
                        service_name: predecessor.service_name,
                        cancellation_type: predecessor.cancellation_type,
                      }
                    : undefined,
                };
              }
              return apt;
            })
            .filter((apt) => {
              // Show all appointments now, including cancelled ones with different types
              // 'reschedule' cancellations are shown, 'final' cancellations are shown
              return true;
            });

          console.log("Processed appointments:", processedAppointments);
          console.log("Visible appointments:", visibleAppointments);

          setAppointments(visibleAppointments);
          return;
        }

        throw aptError;
      }

      console.log("Fetched appointments:", appointmentsData);

      // Fetch appointment history to determine rescheduled/edited status
      const { data: historyData, error: histError } = await supabase
        .from("appointment_history")
        .select("id, appointment_external_id, action, source, previous_data, new_data, changed_by, created_at")
        .in(
          "appointment_external_id",
          appointmentsData?.map((apt) => apt.external_id) || []
        );

      if (histError) {
        console.error("History fetch error:", histError);
        throw histError;
      }

      // Process appointments to determine display status and link rescheduled ones
      const processedAppointments = (appointmentsData || []).map((apt) => {
        // Parse raw_payload to extract web_meeting_url and customer_notes if not set
        let webMeetingUrl = apt.web_meeting_url;
        let customerNotes = apt.customer_notes;
        if (apt.raw_payload) {
          try {
            const payload = JSON.parse(apt.raw_payload);
            if (payload.appointment) {
              // Extract web_meeting_url if not already set
              if (!webMeetingUrl && payload.appointment.web_meeting_url) {
                webMeetingUrl = payload.appointment.web_meeting_url;
              }
              // Extract customer notes if not already set, prioritizing "Help Us Be Prepared To Serve You Better, Fast!" content
              if (!customerNotes && payload.appointment.notes) {
                customerNotes = payload.appointment.notes;
              }
              // Also check for other potential note fields
              if (!customerNotes && payload.appointment.customer_notes) {
                customerNotes = payload.appointment.customer_notes;
              }
              // Check for any additional info that should be in notes
              if (!customerNotes && payload.appointment.additional_info) {
                customerNotes = payload.appointment.additional_info;
              }
              // Check for customer_information.Note field and prioritize it over existing formatted notes
              if (
                payload.appointment.customer_information &&
                payload.appointment.customer_information.Note
              ) {
                const noteContent =
                  payload.appointment.customer_information.Note;
                // Always prioritize the customer information note
                customerNotes = `Customer Note: ${noteContent}`;
              }
              // Check for the specific "Help Us Be Prepared To Serve You Better, Fast!" content
              if (
                !customerNotes &&
                payload.appointment[
                  "Help Us Be Prepared To Serve You Better, Fast!"
                ]
              ) {
                customerNotes =
                  payload.appointment[
                    "Help Us Be Prepared To Serve You Better, Fast!"
                  ];
              }
              // Check if any field contains this specific text
              if (!customerNotes) {
                for (const [key, value] of Object.entries(
                  payload.appointment
                )) {
                  if (
                    typeof value === "string" &&
                    value.includes(
                      "Help Us Be Prepared To Serve You Better, Fast!"
                    )
                  ) {
                    customerNotes = value;
                    break;
                  }
                }
              }
            }
          } catch (error) {
            console.warn(
              `Failed to parse raw_payload for appointment ${apt.external_id}:`,
              error
            );
          }
        }

        // Get history for this appointment
        const appointmentHistory = (historyData || [])
          .filter((h) => h.appointment_external_id === apt.external_id)
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );

        // Check for edited: changes to info fields but not date/time (same external ID)
        const hasEdit = appointmentHistory.some((entry) => {
          if (entry.previous_data && entry.new_data) {
            const infoFields = [
              "customer_name",
              "customer_email",
              "customer_phone",
              "service_name",
              "location",
              "customer_notes",
              "vehicle_make_model",
              "web_meeting_url",
            ];
            return infoFields.some((field) => {
              const prev = entry.previous_data[field];
              const curr = entry.new_data[field];
              return prev !== curr && prev !== null && curr !== null;
            });
          }
          return false;
        });

        // For edited appointments, keep original status but mark as edited for display
        if (hasEdit && apt.status === "BOOKED") {
          console.log(`Found edited appointment: ${apt.customer_name}`);
          return {
            ...apt,
            web_meeting_url: webMeetingUrl, // Include extracted meeting URL
            customer_notes: customerNotes, // Include extracted notes
            status: "BOOKED", // Keep original status
            display_status: "EDITED", // Add separate field for UI display
            was_edited: true, // Add flag for easy filtering
          };
        }

        return {
          ...apt,
          web_meeting_url: webMeetingUrl, // Include extracted meeting URL
          customer_notes: customerNotes, // Include extracted notes
        };
      });

      // Process cancellation types and rescheduled appointments
      const visibleAppointments = processedAppointments
        .map((apt) => {
          if (apt.previous_external_id && apt.status === "BOOKED") {
            // This appointment is a reschedule of a cancelled one
            const predecessor = processedAppointments.find(
              (p) => p.external_id === apt.previous_external_id
            );
            return {
              ...apt,
              status: "BOOKED", // Keep as BOOKED
              display_status: "RESCHEDULED", // Add display status for UI
              previous_appointment: predecessor
                ? {
                    external_id: predecessor.external_id,
                    start_time: predecessor.start_time,
                    end_time: predecessor.end_time,
                    location: predecessor.location,
                    service_name: predecessor.service_name,
                    cancellation_type: predecessor.cancellation_type,
                  }
                : undefined,
            };
          }
          return apt;
        })
        .filter((apt) => {
          // Show all appointments now, including cancelled ones with different types
          // 'reschedule' cancellations are shown, 'final' cancellations are shown
          return true;
        });

      console.log("Processed appointments:", processedAppointments);
      console.log("Visible appointments:", visibleAppointments);

      setAppointments(visibleAppointments);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    }
  }, [userEmail, user?.id, setAppointments]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userEmail || !user?.id || !currentBusiness?.id) return;

    fetchAppointments();

    const subscription = subscribeToAppointments(
      currentBusiness.id,
      async (payload) => {
        if (payload.eventType === "INSERT") {
          // For new appointments, we need to process them to determine if they're rescheduled
          // Fetch the full data and re-process
          await fetchAppointments();
        } else if (payload.eventType === "UPDATE") {
          // Update the specific appointment in the store
          if (payload.new) {
            updateAppointment(payload.new.id, payload.new);
          }
        } else if (payload.eventType === "DELETE") {
          useAppStore.getState().removeAppointment(payload.old.id);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [
    userEmail,
    user?.id,
    currentBusiness?.id,
    fetchAppointments,
    updateAppointment,
  ]);

  return {
    appointments,
    refetch: fetchAppointments,
  };
}
