import { supabaseClient, createJsonResponse, addCorsHeaders, mapSourceToCompatibleValue, getChangedFields } from "./utils.ts";
import { APPOINTMENT_ACTIONS, HISTORY_ACTIONS, NOTIFICATION_TYPES } from "./constants.ts";
import { NotificationService } from "./notification-service.ts";
import { EmailService } from "./email-service.ts";
import type { WebhookPayload, AppointmentData, NotificationPayload } from "./types.ts";

// ========================================
// WEBHOOK HANDLERS
// ========================================

/**
 * Find business by webhook secret for secure webhook authentication
 * @param webhookSecret - Secret token from webhook URL
 * @returns Business object or null if not found
 */
export async function findBusinessByWebhookSecret(webhookSecret: string) {
  if (!webhookSecret || !webhookSecret.startsWith('bus_')) {
    return null;
  }

  const { data: businessData, error } = await supabaseClient
    .from("businesses")
    .select("id, name, webhook_secret")
    .eq("webhook_secret", webhookSecret)
    .single();

  if (error || !businessData) {
    console.error("Business not found for webhook secret:", webhookSecret);
    return null;
  }
  return businessData;
}

/**
 * Map webhook payload data to appointment database schema
 * @param webhookPayload - Raw webhook payload from SSA
 * @param businessId - ID of the business this appointment belongs to
 * @returns Mapped appointment data ready for database insertion
 */
export function mapAppointmentData(webhookPayload: WebhookPayload, businessId: string): AppointmentData {
  const appointmentInfo = webhookPayload.appointment ?? webhookPayload;
  const customerInfo = appointmentInfo.customer_information ?? {};
  const additionalNotes = [];

  // Collect additional context notes
  if (webhookPayload.signature?.site_name) additionalNotes.push(`Source: ${webhookPayload.signature.site_name}`);
  if (appointmentInfo.payment_method) additionalNotes.push(`Payment: ${appointmentInfo.payment_method}`);
  if (appointmentInfo.public_edit_url) additionalNotes.push(`Edit URL: ${appointmentInfo.public_edit_url}`);
  if (webhookPayload.team_members?.length) {
    const teamNames = webhookPayload.team_members.map((member) => member.display_name ?? member.name).join(", ");
    additionalNotes.push(`Team: ${teamNames}`);
  }

  // Prioritize customer notes from different possible fields
  let finalCustomerNotes = null;
  if (appointmentInfo.customer_information?.Note) {
    finalCustomerNotes = appointmentInfo.customer_information.Note;
  } else if (customerInfo["Help Us Be Prepared To Serve You Better, Fast!"]) {
    finalCustomerNotes = customerInfo["Help Us Be Prepared To Serve You Better, Fast!"];
  } else if (additionalNotes.length) {
    finalCustomerNotes = additionalNotes.join(" | ");
  }

  // Map to database schema
  const mappedAppointmentData: AppointmentData = {
    external_id: appointmentInfo.id?.toString(),
    business_id: businessId,
    status: appointmentInfo.status?.toUpperCase() ?? "BOOKED",
    customer_name: customerInfo.Name ?? "Unknown",
    customer_email: customerInfo.Email ?? null,
    customer_phone: customerInfo.Phone ?? null,
    vehicle_make_model: customerInfo["Vehicle Make & Model"] ?? null,
    start_time: appointmentInfo.start_date,
    end_time: appointmentInfo.end_date,
    service_name: appointmentInfo.appointment_type_title ?? "Schedule Your Quick Auto Service Today!",
    location: customerInfo.Location ?? appointmentInfo.location ?? "TBD",
    customer_notes: finalCustomerNotes,
    web_meeting_url: appointmentInfo.web_meeting_url ?? null,
    raw_payload: webhookPayload,
    source: `webhook`,
    updated_at: new Date().toISOString()
  };

  return mappedAppointmentData;
}

/**
 * Create a history record for appointment changes
 * @param appointmentExternalId - External ID of the appointment
 * @param actionType - Type of action performed
 * @param previousAppointmentData - Previous appointment state (null for new appointments)
 * @param newAppointmentData - New appointment state
 * @param changeSource - Source of the change (webhook, customer, user)
 */
export async function createHistoryRecord(
  appointmentExternalId: string,
  actionType: string,
  previousAppointmentData: any,
  newAppointmentData: any,
  changeSource = "webhook"
) {
  // Map action to match database schema constraints
  const actionTypeMapping: Record<string, string> = {
    "edited": HISTORY_ACTIONS.EDIT,
    "canceled": HISTORY_ACTIONS.CANCEL,
    "cancelled": HISTORY_ACTIONS.CANCELLED,
    "rescheduled": HISTORY_ACTIONS.RESCHEDULE,
    "booked": HISTORY_ACTIONS.BOOKED,
    "create": HISTORY_ACTIONS.CREATE,
    "update": HISTORY_ACTIONS.UPDATE,
    // Additional mappings to prevent fallback issues
    "cancel": HISTORY_ACTIONS.CANCEL,
    "reschedule": HISTORY_ACTIONS.RESCHEDULE,
    "cancelled": HISTORY_ACTIONS.CANCELLED,
    "rescheduled": HISTORY_ACTIONS.RESCHEDULE
  };

  const standardizedAction = actionTypeMapping[actionType.toLowerCase()] || HISTORY_ACTIONS.UPDATE;

  // Map source values to be consistent with React component
  const normalizedSource = mapSourceToCompatibleValue(changeSource);

  const historyRecordData = {
    appointment_external_id: appointmentExternalId,
    action: standardizedAction,
    previous_data: previousAppointmentData,
    new_data: newAppointmentData,
    source: normalizedSource,
    changed_by: null,
    change_reason: `Webhook ${actionType}`,
    created_at: new Date().toISOString(),
    notes: `Automated ${actionType} via SSA webhook`
  };

  const { error } = await supabaseClient.from("appointment_history").insert([historyRecordData]);
  if (error) {
    console.error("Failed to create history record:", error);
  } else {
    console.log(`History record created for ${appointmentExternalId}: ${standardizedAction} from ${normalizedSource}`);
  }
}

/**
 * Detect whether an appointment edit was made by a customer or admin/staff
 * @param webhookPayload - The webhook payload containing appointment data
 * @param existingAppointmentData - Current appointment data from database
 * @returns 'customer' if customer edit, 'webhook' if admin/staff edit
 */
export function detectEditSource(webhookPayload: WebhookPayload, existingAppointmentData: any): string {
  const appointmentDetails = webhookPayload.appointment ?? webhookPayload;

  // Check indicators of customer vs admin edit
  const hasPublicEditUrl = appointmentDetails.public_edit_url;
  const isAdminToken = webhookPayload.signature?.token?.includes('admin');
  const hasTeamMembers = webhookPayload.team_members?.length > 0;

  // If it has a public edit URL and no admin/team involvement, it's likely a customer edit
  if (hasPublicEditUrl && !isAdminToken && !hasTeamMembers) {
    return "customer";
  }

  // Check if specific customer-editable fields were changed
  if (existingAppointmentData && appointmentDetails.customer_information) {
    const customerEditableFields = ['Name', 'Email', 'Phone', 'Vehicle Make & Model', 'Note'];
    const modifiedFields = customerEditableFields.filter((field) => {
      const currentValue = existingAppointmentData[field.toLowerCase().replace(' ', '_').replace(' & ', '_')];
      const newValue = appointmentDetails.customer_information[field];
      return currentValue !== newValue;
    });
    if (modifiedFields.length > 0 && !hasTeamMembers) {
      return "customer";
    }
  }

  return "webhook"; // Default to webhook for admin/team edits
}

/**
 * Trigger appointment notifications based on action type
 * @param actionType - Type of appointment action (booked, edited, cancelled, rescheduled)
 * @param appointmentData - Appointment details
 * @param businessId - ID of the business
 * @param changedFields - Array of fields that were modified (for edit notifications)
 */
export async function triggerAppointmentNotification(
  actionType: string,
  appointmentData: AppointmentData,
  businessId: string,
  changedFields: string[]
) {
  console.log("🔍 DEBUG: Trigger Appointment Notification");
  console.log("actionType:", actionType);
  console.log("appointmentData:", JSON.stringify(appointmentData, null, 2));
  console.log("businessId:", businessId);
  console.log("changedFields:", changedFields);

  // Map action types to notification templates
  const notificationTemplates: Record<string, NotificationPayload> = {
    booked: {
      title: "📅 New Appointment Booked",
      body: `${appointmentData.customer_name} - ${appointmentData.service_name}`,
      type: NOTIFICATION_TYPES.APPOINTMENT_BOOKED
    },
    edited: {
      title: "✏️ Appointment Updated",
      body: `${appointmentData.customer_name} - ${changedFields?.join(', ') || 'Details modified'}`,
      type: NOTIFICATION_TYPES.APPOINTMENT_EDITED
    },
    canceled: {
      title: "❌ Appointment Cancelled",
      body: `${appointmentData.customer_name} - ${appointmentData.service_name}`,
      type: NOTIFICATION_TYPES.APPOINTMENT_CANCELLED
    },
    rescheduled: {
      title: "🔄 Appointment Rescheduled",
      body: `${appointmentData.customer_name} - ${appointmentData.service_name}`,
      type: NOTIFICATION_TYPES.APPOINTMENT_EDITED
    }
  };

  const notificationTemplate = notificationTemplates[actionType];
  if (notificationTemplate) {
    notificationTemplate.url = `/appointments/${appointmentData.external_id}`;
    notificationTemplate.appointmentId = appointmentData.external_id;
    notificationTemplate.customerPhone = appointmentData.customer_phone; // Add customer phone for call action

    console.log("🔍 DEBUG: Final Notification Template");
    console.log(JSON.stringify(notificationTemplate, null, 2));

    console.log(`Triggering ${actionType} notification for business: ${businessId}`);

    const emailService = new EmailService();
    const notificationService = new NotificationService(emailService);
    await notificationService.sendAppointmentNotification(businessId, notificationTemplate, appointmentData);
  } else {
    console.log("🔍 DEBUG: No notification template found for actionType:", actionType);
  }
}

/**
 * Main webhook handler for processing SSA appointment webhooks
 * @param webhookPayload - Raw webhook payload from SSA
 * @param businessId - ID of the business this webhook is for
 * @returns JSON response with processing results
 */
export async function handleWebhook(webhookPayload: WebhookPayload, businessId: string) {
  const actionVerb = webhookPayload.action_verb;
  let normalizedActionType = actionVerb === "cancelled" ? APPOINTMENT_ACTIONS.CANCELLED : actionVerb;

  // Validate supported action types
  if (!Object.values(APPOINTMENT_ACTIONS).includes(normalizedActionType)) {
    return createJsonResponse({ error: `Unsupported action: ${actionVerb}` }, 400);
  }

  try {
    let mappedAppointmentData = mapAppointmentData(webhookPayload, businessId);
    const appointmentExternalId = mappedAppointmentData.external_id;

    if (!appointmentExternalId) {
      throw new Error("Missing appointment external_id");
    }

    // Get current appointment state for history tracking
    const { data: existingAppointmentData } = await supabaseClient
      .from("appointments")
      .select("*")
      .eq("external_id", appointmentExternalId)
      .eq("business_id", businessId)
      .maybeSingle();

    // Detect edit source for proper history tracking
    let changeSource = "webhook";
    if (normalizedActionType === APPOINTMENT_ACTIONS.EDITED && existingAppointmentData) {
      changeSource = detectEditSource(webhookPayload, existingAppointmentData);
    }

    // Handle different action types with proper source tracking
    if (normalizedActionType === APPOINTMENT_ACTIONS.CANCELLED) {
      mappedAppointmentData.status = "CANCELLED";
      mappedAppointmentData.source = `webhook_canceled`;
    } else if (normalizedActionType === APPOINTMENT_ACTIONS.EDITED) {
      mappedAppointmentData.source = `webhook_edited`;
      if (changeSource === "customer") {
        mappedAppointmentData.source = `customer_edited`;
      }
    } else if (normalizedActionType === APPOINTMENT_ACTIONS.BOOKED) {
      mappedAppointmentData.source = `webhook_booked`;
      // For new bookings, check if this might be a reschedule from a recent cancellation
      if (!existingAppointmentData) {
        const { data: recentCancelledAppointments } = await supabaseClient
          .from("appointments")
          .select("external_id, start_time, service_name")
          .eq("business_id", businessId)
          .eq("customer_email", mappedAppointmentData.customer_email)
          .eq("status", "CANCELLED")
          .order("created_at", { ascending: false })
          .limit(1);

        if (recentCancelledAppointments?.[0]) {
          const previousAppointment = recentCancelledAppointments[0];
          mappedAppointmentData.previous_external_id = previousAppointment.external_id;
          mappedAppointmentData.customer_notes = `RESCHEDULED from ${previousAppointment.external_id} | ${mappedAppointmentData.customer_notes}`;
          mappedAppointmentData.source = `webhook_rescheduled`;
          normalizedActionType = APPOINTMENT_ACTIONS.RESCHEDULED;
        }
      }
    } else if (normalizedActionType === APPOINTMENT_ACTIONS.RESCHEDULED) {
      mappedAppointmentData.source = `webhook_rescheduled`;
    }

    // Upsert the appointment (insert or update based on external_id)
    const { data: updatedAppointmentData, error: upsertError } = await supabaseClient
      .from("appointments")
      .upsert([mappedAppointmentData], { onConflict: "external_id" })
      .select()
      .single();

    if (upsertError) throw upsertError;

    // Insert reminder for 2 hours before appointment if it's a new booking or rescheduled
    if (normalizedActionType === APPOINTMENT_ACTIONS.BOOKED || normalizedActionType === APPOINTMENT_ACTIONS.RESCHEDULED) {
      const reminderScheduledFor = new Date(updatedAppointmentData.start_time);
      reminderScheduledFor.setHours(reminderScheduledFor.getHours() - 2);

      const { error: reminderError } = await supabaseClient
        .from("appointment_reminders")
        .insert([{
          appointment_id: updatedAppointmentData.id,
          reminder_type: 'two_hours',
          scheduled_for: reminderScheduledFor.toISOString(),
          status: 'pending'
        }]);

      if (reminderError) {
        console.error("Failed to insert appointment reminder:", reminderError);
      } else {
        console.log(`Inserted 2-hour reminder for appointment ${updatedAppointmentData.external_id}`);
      }
    }

    // Create history record with proper source mapping
    if (existingAppointmentData) {
      await createHistoryRecord(appointmentExternalId, normalizedActionType, existingAppointmentData, mappedAppointmentData, changeSource);
    } else if (normalizedActionType === APPOINTMENT_ACTIONS.BOOKED || normalizedActionType === APPOINTMENT_ACTIONS.RESCHEDULED) {
      await createHistoryRecord(appointmentExternalId, normalizedActionType, null, mappedAppointmentData, "webhook");
    }

    // Trigger notifications to business members
    const changedFieldList = existingAppointmentData ? getChangedFields(existingAppointmentData, mappedAppointmentData) : [];
    await triggerAppointmentNotification(normalizedActionType, updatedAppointmentData, businessId, changedFieldList);

    return createJsonResponse({
      success: true,
      action: normalizedActionType,
      appointment_id: updatedAppointmentData.external_id,
      previous_external_id: updatedAppointmentData.previous_external_id,
      status: updatedAppointmentData.status,
      business_id: businessId,
      web_meeting_url: updatedAppointmentData.web_meeting_url,
      edit_source: changeSource,
      history_source: mapSourceToCompatibleValue(changeSource),
      notification_sent: true
    });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return createJsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * Manual appointment creation endpoint
 */
export async function handleManualAppointment(request: Request) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return createJsonResponse({ error: 'No authorization header' }, 401);
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return createJsonResponse({ error: 'Invalid authentication' }, 401);
    }

    const appointmentData = await request.json();

    // Validate required fields
    if (!appointmentData.business_id || !appointmentData.customer_name || !appointmentData.service_name ||
        !appointmentData.start_time || !appointmentData.end_time) {
      return createJsonResponse({ error: 'Missing required fields' }, 400);
    }

    // Check if user is a member of the business
    const { data: membership, error: memberError } = await supabaseClient
      .from('business_members')
      .select('role')
      .eq('business_id', appointmentData.business_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !membership) {
      return createJsonResponse({ error: 'Not authorized to create appointments for this business' }, 403);
    }

    // Generate external_id if not provided
    if (!appointmentData.external_id) {
      appointmentData.external_id = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    appointmentData.created_by_user = true;
    appointmentData.source = 'user';

    // Create appointment
    const { data: appointment, error: createError } = await supabaseClient
      .from('appointments')
      .insert([appointmentData])
      .select()
      .single();

    if (createError) {
      console.error('Error creating appointment:', createError);
      return createJsonResponse({ error: 'Failed to create appointment' }, 500);
    }

    // Create history record
    await createHistoryRecord(appointment.external_id, 'CREATE', null, appointment, 'user');

    // Trigger notification
    await triggerAppointmentNotification('booked', appointment, appointment.business_id, []);

    return createJsonResponse({
      success: true,
      appointment,
      message: 'Appointment created successfully'
    });

  } catch (error: any) {
    console.error('Manual appointment creation error:', error);
    return createJsonResponse({ error: error.message }, 500);
  }
}

/**
 * Appointment update endpoint
 */
export async function handleAppointmentUpdate(request: Request, externalId: string) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return createJsonResponse({ error: 'No authorization header' }, 401);
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return createJsonResponse({ error: 'Invalid authentication' }, 401);
    }

    const updateData = await request.json();

    // Get existing appointment
    const { data: existingAppointment, error: fetchError } = await supabaseClient
      .from('appointments')
      .select('*')
      .eq('external_id', externalId)
      .single();

    if (fetchError || !existingAppointment) {
      return createJsonResponse({ error: 'Appointment not found' }, 404);
    }

    // Check if user is a member of the business
    const { data: membership, error: memberError } = await supabaseClient
      .from('business_members')
      .select('role')
      .eq('business_id', existingAppointment.business_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !membership) {
      return createJsonResponse({ error: 'Not authorized to update appointments for this business' }, 403);
    }

    // Update appointment
    const { data: updatedAppointment, error: updateError } = await supabaseClient
      .from('appointments')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('external_id', externalId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      return createJsonResponse({ error: 'Failed to update appointment' }, 500);
    }

    // Create history record
    await createHistoryRecord(externalId, 'EDIT', existingAppointment, updatedAppointment, 'user');

    // Trigger notification
    const changedFields = getChangedFields(existingAppointment, updatedAppointment);
    await triggerAppointmentNotification('edited', updatedAppointment, existingAppointment.business_id, changedFields);

    return createJsonResponse({
      success: true,
      appointment: updatedAppointment,
      message: 'Appointment updated successfully'
    });

  } catch (error: any) {
    console.error('Appointment update error:', error);
    return createJsonResponse({ error: error.message }, 500);
  }
}

/**
 * Push registration endpoint -- upsert OneSignal ids for a user when client registers
 */
export async function handlePushRegister(request: Request) {
  try {
    const body = await request.json();
    const userId = body.userId || body.user_id;
    const playerId = body.onesignal_player_id || body.playerId || body.player_id;
    const externalId = body.onesignal_external_user_id || body.externalUserId || body.external_id;
    const platform = body.platform || body.device || null;
    const userAgent = body.userAgent || request.headers.get('user-agent') || null;

    if (!userId || !playerId) {
      return createJsonResponse({ error: 'Missing userId or onesignal_player_id' }, 400);
    }

    // Upsert the push subscription by user_id. If a row exists, update the player id and timestamps.
    const payload: any = {
      user_id: userId,
      onesignal_player_id: playerId,
      onesignal_external_user_id: externalId || userId,
      platform: platform,
      user_agent: userAgent,
      updated_at: new Date().toISOString()
    };

    // Upsert by the device-level onesignal_player_id so a single user may have multiple subscriptions/devices.
    const { data, error } = await supabaseClient
      .from('push_subscriptions')
      .upsert([payload], { onConflict: 'onesignal_player_id' })
      .select()
      .single();

    if (error) {
      console.error('Failed to upsert push subscription:', error);
      return createJsonResponse({ success: false, error: 'Failed to register push subscription' }, 500);
    }

    console.log(`Registered push subscription for user ${userId}: player=${playerId}`);
    return createJsonResponse({ success: true, subscription: data });
  } catch (err: any) {
    console.error('Push register error:', err);
    return createJsonResponse({ success: false, error: err?.message || String(err) }, 500);
  }
}