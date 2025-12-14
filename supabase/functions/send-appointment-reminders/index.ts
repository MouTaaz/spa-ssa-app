import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { supabaseClient, createJsonResponse } from "../ssa-appointments/utils.ts";
import { NOTIFICATION_TYPES } from "../ssa-appointments/constants.ts";
import { NotificationService } from "../ssa-appointments/notification-service.ts";
import { EmailService } from "../ssa-appointments/email-service.ts";

serve(async (request) => {
  console.log("🔍 DEBUG: Send Appointment Reminders Function Started");

  // Only allow GET requests for scheduled execution
  if (request.method !== "GET") {
    return createJsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const now = new Date();

    // Query pending reminders that are due (scheduled_for <= now)
    const { data: dueReminders, error: remindersError } = await supabaseClient
      .from("appointment_reminders")
      .select(`
        id,
        appointment_id,
        reminder_type,
        scheduled_for,
        appointments (
          id,
          external_id,
          business_id,
          customer_name,
          customer_email,
          customer_phone,
          service_name,
          start_time,
          end_time,
          status
        )
      `)
      .eq("status", "pending")
      .lte("scheduled_for", now.toISOString())
      .eq("reminder_type", "two_hours");

    if (remindersError) {
      console.error("Error fetching due reminders:", remindersError);
      return createJsonResponse({ error: "Failed to fetch reminders" }, 500);
    }

    console.log(`Found ${dueReminders?.length || 0} due 2-hour reminders`);

    if (!dueReminders || dueReminders.length === 0) {
      return createJsonResponse({
        success: true,
        message: "No due reminders found",
        processed: 0
      });
    }

    const emailService = new EmailService();
    const notificationService = new NotificationService(emailService);

    let processedCount = 0;
    let successCount = 0;

    for (const reminder of dueReminders) {
      try {
        const appointment = reminder.appointments;
        if (!appointment) {
          console.warn(`Appointment not found for reminder ${reminder.id}`);
          continue;
        }

        // Skip if appointment is cancelled or completed
        if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
          console.log(`Skipping reminder for ${appointment.status} appointment ${appointment.external_id}`);
          // Mark as sent to avoid reprocessing
          await supabaseClient
            .from("appointment_reminders")
            .update({ status: "sent", sent_at: now.toISOString() })
            .eq("id", reminder.id);
          continue;
        }

        console.log(`Sending 2-hour reminder for appointment ${appointment.external_id}`);

        // Create reminder notification payload
        const reminderPayload = {
          title: "⏰ Appointment Reminder",
          body: `Upcoming appointment in 2 hours: ${appointment.customer_name} - ${appointment.service_name}`,
          type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
          url: `/appointments/${appointment.external_id}`,
          appointmentId: appointment.external_id,
          customerPhone: appointment.customer_phone
        };

        // Send notification to business members
        await notificationService.sendAppointmentNotification(
          appointment.business_id,
          reminderPayload,
          appointment
        );

        // Mark reminder as sent
        const { error: updateError } = await supabaseClient
          .from("appointment_reminders")
          .update({
            status: "sent",
            sent_at: now.toISOString()
          })
          .eq("id", reminder.id);

        if (updateError) {
          console.error(`Failed to update reminder ${reminder.id}:`, updateError);
        } else {
          successCount++;
        }

        processedCount++;

      } catch (error: any) {
        console.error(`Error processing reminder ${reminder.id}:`, error?.message ?? error);
        // Continue processing other reminders
      }
    }

    console.log(`Processed ${processedCount} reminders, ${successCount} sent successfully`);

    return createJsonResponse({
      success: true,
      message: `Processed ${processedCount} reminders`,
      processed: processedCount,
      sent: successCount
    });

  } catch (error: any) {
    console.error("Send appointment reminders error:", error);
    return createJsonResponse({ error: error.message }, 500);
  }
});
