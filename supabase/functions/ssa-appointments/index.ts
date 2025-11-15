// deno-lint-ignore-file no-explicit-any
import webPush from "npm:web-push@3.6.6";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Get VAPID keys from environment variables
function getVAPIDKeys() {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables must be set");
  }

  return { publicKey, privateKey };
}

// Configure web-push with VAPID keys
const VAPID_KEYS = getVAPIDKeys();
webPush.setVapidDetails('mailto:notifications@yourapp.com', VAPID_KEYS.publicKey, VAPID_KEYS.privateKey);

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

// CORS headers for all responses
function withCors(response: Response) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

// API endpoint to get public key for frontend
function handleGetPublicKey() {
  return jsonResponse({
    publicKey: VAPID_KEYS.publicKey,
    message: "Using environment VAPID key"
  });
}

async function findBusinessByWebhookSecret(webhookSecret: string) {
  if (!webhookSecret || !webhookSecret.startsWith('bus_')) {
    return null;
  }
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, webhook_secret")
    .eq("webhook_secret", webhookSecret)
    .single();

  if (error || !business) {
    console.error("Business not found for webhook secret:", webhookSecret);
    return null;
  }
  return business;
}

function mapAppointmentData(payload: any, businessId: string) {
  const appointment = payload.appointment ?? payload;
  const customer = appointment.customer_information ?? {};
  const notes = [];

  if (payload.signature?.site_name) notes.push(`Source: ${payload.signature.site_name}`);
  if (appointment.payment_method) notes.push(`Payment: ${appointment.payment_method}`);
  if (appointment.public_edit_url) notes.push(`Edit URL: ${appointment.public_edit_url}`);
  if (payload.team_members?.length) {
    const team = payload.team_members.map((m) => m.display_name ?? m.name).join(", ");
    notes.push(`Team: ${team}`);
  }

  // Prioritize customer_information.Note over other note fields
  let customerNotes = null;
  if (appointment.customer_information?.Note) {
    customerNotes = appointment.customer_information.Note;
  } else if (customer["Help Us Be Prepared To Serve You Better, Fast!"]) {
    customerNotes = customer["Help Us Be Prepared To Serve You Better, Fast!"];
  } else if (notes.length) {
    customerNotes = notes.join(" | ");
  }

  const appointmentData = {
    external_id: appointment.id?.toString(),
    business_id: businessId,
    status: appointment.status?.toUpperCase() ?? "BOOKED",
    customer_name: customer.Name ?? "Unknown",
    customer_email: customer.Email ?? null,
    customer_phone: customer.Phone ?? null,
    vehicle_make_model: customer["Vehicle Make & Model"] ?? null,
    start_time: appointment.start_date,
    end_time: appointment.end_date,
    service_name: appointment.appointment_type_title ?? "Schedule Your Quick Auto Service Today!",
    location: customer.Location ?? appointment.location ?? "TBD",
    customer_notes: customerNotes,
    web_meeting_url: appointment.web_meeting_url ?? null,
    raw_payload: payload,
    source: `webhook`,
    updated_at: new Date().toISOString()
  };

  return appointmentData;
}

// Map sources to match React component pattern
function mapSourceToCompatibleValue(source: string) {
  const sourceMapping: Record<string, string> = {
    'webhook': 'webhook',
    'customer': 'customer',
    'webhook_booked': 'webhook',
    'webhook_edited': 'webhook',
    'webhook_canceled': 'webhook',
    'webhook_rescheduled': 'webhook',
    'customer_edited': 'customer',
    'user': 'user'
  };
  return sourceMapping[source] || 'webhook';
}

async function createHistoryRecord(appointmentExternalId: string, action: string, previousData: any, newData: any, source = "webhook") {
  // Map action to match React component (always use "EDIT" for edits)
  const standardizedAction = action === "edited" ? "EDIT" : action.toUpperCase();
  // Map source values to be consistent with React component
  const compatibleSource = mapSourceToCompatibleValue(source);

  const historyData = {
    appointment_external_id: appointmentExternalId,
    action: standardizedAction,
    previous_data: previousData,
    new_data: newData,
    source: compatibleSource,
    changed_by: null,
    change_reason: `Webhook ${action}`,
    created_at: new Date().toISOString(),
    notes: `Automated ${action} via SSA webhook`
  };

  const { error } = await supabase.from("appointment_history").insert([historyData]);
  if (error) {
    console.error("Failed to create history record:", error);
  } else {
    console.log(`History record created for ${appointmentExternalId}: ${standardizedAction} from ${compatibleSource}`);
  }
}

// Detect if edit was made by customer vs admin
function detectEditSource(payload: any, existingAppointment: any) {
  const appointment = payload.appointment ?? payload;
  // Check if this is a customer edit via public edit URL
  const hasPublicEditUrl = appointment.public_edit_url;
  const isAdminToken = payload.signature?.token?.includes('admin');
  const hasTeamMembers = payload.team_members?.length > 0;

  // If it has a public edit URL and no admin/team involvement, it's likely a customer edit
  if (hasPublicEditUrl && !isAdminToken && !hasTeamMembers) {
    return "customer";
  }

  // Check if specific customer-editable fields were changed
  if (existingAppointment && appointment.customer_information) {
    const customerEditableFields = ['Name', 'Email', 'Phone', 'Vehicle Make & Model', 'Note'];
    const changedFields = customerEditableFields.filter((field) => {
      const existingValue = existingAppointment[field.toLowerCase().replace(' ', '_').replace(' & ', '_')];
      const newValue = appointment.customer_information[field];
      return existingValue !== newValue;
    });
    if (changedFields.length > 0 && !hasTeamMembers) {
      return "customer";
    }
  }

  return "webhook"; // Default to webhook for admin/team edits
}

// Notification Service
class NotificationService {
  async sendAppointmentNotification(businessId: string, notificationData: any) {
    try {
      // Get all users for this business
      const { data: businessMembers, error: membersError } = await supabase
        .from("business_members")
        .select("user_id")
        .eq("business_id", businessId)
        .eq("status", "active");

      if (membersError) {
        console.error("Error fetching business members:", membersError);
        return;
      }

      if (!businessMembers?.length) {
        console.log(`No active business members found for business: ${businessId}`);
        return;
      }

      const userIds = businessMembers.map((member) => member.user_id);

      // Get push subscriptions for these users
      const { data: subscriptions, error: subsError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", userIds);

      if (subsError) {
        console.error("Error fetching push subscriptions:", subsError);
        return;
      }

      if (!subscriptions?.length) {
        console.log(`No push subscriptions found for users: ${userIds.join(', ')}`);
        return;
      }

      console.log(`Sending ${notificationData.type} notifications to ${subscriptions.length} subscriptions`);

      // Send to all subscriptions
      const results = await Promise.allSettled(
        subscriptions.map((sub) => this.sendPushNotification(sub, notificationData))
      );

      // Log notification delivery
      await this.logNotifications(userIds, businessId, notificationData, results);

      const successful = results.filter((result) => result.status === 'fulfilled' && result.value.success).length;
      console.log(`Successfully sent ${successful}/${subscriptions.length} notifications`);

    } catch (error) {
      console.error("Notification service error:", error);
    }
  }

  async sendPushNotification(subscription: any, notificationData: any) {
    try {
      const payload = JSON.stringify({
        title: notificationData.title,
        body: notificationData.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        data: {
          url: notificationData.url,
          appointmentId: notificationData.appointmentId,
          type: notificationData.type
        },
        vibrate: [100, 50, 100]
      });

      await webPush.sendNotification(subscription, payload);

      return { success: true, subscriptionId: subscription.id };
    } catch (error: any) {
      console.error(`Push notification failed for subscription ${subscription.id}:`, error.message);

      // Remove invalid subscriptions (410 = Gone)
      if (error.statusCode === 410) {
        console.log(`Removing invalid subscription: ${subscription.endpoint}`);
        await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
      }

      return { success: false, error: error.message, subscriptionId: subscription.id };
    }
  }

  async logNotifications(userIds: string[], businessId: string, notificationData: any, results: any[]) {
    try {
      const logs = results.map((result, index) => {
        const userIndex = index % userIds.length;
        return {
          user_id: userIds[userIndex],
          business_id: businessId,
          notification_type: notificationData.type,
          title: notificationData.title,
          body: notificationData.body,
          data: {
            url: notificationData.url,
            appointmentId: notificationData.appointmentId
          },
          status: result.status === 'fulfilled' && result.value.success ? 'sent' : 'failed',
          error_message: result.status === 'rejected' ? result.reason : result.value?.error || null,
          sent_at: new Date().toISOString()
        };
      });

      const { error } = await supabase.from("notification_logs").insert(logs);
      if (error) {
        console.error("Failed to log notifications:", error);
      }
    } catch (error) {
      console.error("Error in logNotifications:", error);
    }
  }
}

const notificationService = new NotificationService();

// Helper function to detect changed fields
function getChangedFields(oldData: any, newData: any) {
  const fields = ['customer_name', 'customer_email', 'customer_phone', 'service_name', 'location', 'start_time', 'end_time'];
  const changed = [];
  fields.forEach((field) => {
    if (oldData[field] !== newData[field]) {
      changed.push(field.replace('_', ' '));
    }
  });
  return changed;
}

// Notification Triggers
async function triggerAppointmentNotification(action: string, appointment: any, businessId: string, changes: string[]) {
  const notificationMap: Record<string, any> = {
    booked: {
      title: "📅 New Appointment Booked",
      body: `${appointment.customer_name} - ${appointment.service_name}`,
      type: "appointment_booked"
    },
    edited: {
      title: "✏️ Appointment Updated",
      body: `${appointment.customer_name} - ${changes?.join(', ') || 'Details modified'}`,
      type: "appointment_edited"
    },
    canceled: {
      title: "❌ Appointment Cancelled",
      body: `${appointment.customer_name} - ${appointment.service_name}`,
      type: "appointment_cancelled"
    },
    rescheduled: {
      title: "🔄 Appointment Rescheduled",
      body: `${appointment.customer_name} - ${appointment.service_name}`,
      type: "appointment_edited"
    }
  };

  const notificationData = notificationMap[action];
  if (notificationData) {
    notificationData.url = `/appointments/${appointment.external_id}`;
    notificationData.appointmentId = appointment.external_id;
    console.log(`Triggering ${action} notification for business: ${businessId}`);
    await notificationService.sendAppointmentNotification(businessId, notificationData);
  }
}

// Manual appointment creation endpoint
async function handleManualAppointment(req: Request) {
  try {
    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'No authorization header' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return jsonResponse({ error: 'Invalid authentication' }, 401);
    }

    const appointmentData = await req.json();

    // Validate required fields
    if (!appointmentData.business_id || !appointmentData.customer_name || !appointmentData.service_name ||
        !appointmentData.start_time || !appointmentData.end_time) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    // Check if user is a member of the business
    const { data: membership, error: memberError } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', appointmentData.business_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !membership) {
      return jsonResponse({ error: 'Not authorized to create appointments for this business' }, 403);
    }

    // Generate external_id if not provided
    if (!appointmentData.external_id) {
      appointmentData.external_id = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    appointmentData.created_by_user = true;
    appointmentData.source = 'user';

    // Create appointment
    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select()
      .single();

    if (createError) {
      console.error('Error creating appointment:', createError);
      return jsonResponse({ error: 'Failed to create appointment' }, 500);
    }

    // Create history record
    await createHistoryRecord(appointment.external_id, 'CREATE', null, appointment, 'user');

    // Trigger notification
    await triggerAppointmentNotification('booked', appointment, appointment.business_id, []);

    return jsonResponse({
      success: true,
      appointment,
      message: 'Appointment created successfully'
    });

  } catch (error: any) {
    console.error('Manual appointment creation error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Appointment update endpoint
async function handleAppointmentUpdate(req: Request, externalId: string) {
  try {
    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'No authorization header' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return jsonResponse({ error: 'Invalid authentication' }, 401);
    }

    const updateData = await req.json();

    // Get existing appointment
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('external_id', externalId)
      .single();

    if (fetchError || !existingAppointment) {
      return jsonResponse({ error: 'Appointment not found' }, 404);
    }

    // Check if user is a member of the business
    const { data: membership, error: memberError } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', existingAppointment.business_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !membership) {
      return jsonResponse({ error: 'Not authorized to update appointments for this business' }, 403);
    }

    // Update appointment
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('external_id', externalId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      return jsonResponse({ error: 'Failed to update appointment' }, 500);
    }

    // Create history record
    await createHistoryRecord(externalId, 'EDIT', existingAppointment, updatedAppointment, 'user');

    // Trigger notification
    const changedFields = getChangedFields(existingAppointment, updatedAppointment);
    await triggerAppointmentNotification('edited', updatedAppointment, existingAppointment.business_id, changedFields);

    return jsonResponse({
      success: true,
      appointment: updatedAppointment,
      message: 'Appointment updated successfully'
    });

  } catch (error: any) {
    console.error('Appointment update error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Main webhook handler
async function handleWebhook(payload: any, businessId: string) {
  const action = payload.action_verb;
  let normalizedAction = action === "cancelled" ? "canceled" : action;

  if (!["booked", "canceled", "edited", "rescheduled"].includes(normalizedAction)) {
    return jsonResponse({ error: `Unsupported action: ${action}` }, 400);
  }

  try {
    let appointmentData = mapAppointmentData(payload, businessId);
    const externalId = appointmentData.external_id;

    if (!externalId) {
      throw new Error("Missing appointment external_id");
    }

    // Get current state for history
    const { data: existingAppointment } = await supabase
      .from("appointments")
      .select("*")
      .eq("external_id", externalId)
      .eq("business_id", businessId)
      .maybeSingle();

    // Detect edit source for proper history tracking
    let editSource = "webhook";
    if (normalizedAction === "edited" && existingAppointment) {
      editSource = detectEditSource(payload, existingAppointment);
    }

    // Handle different actions with proper source tracking
    if (normalizedAction === "canceled") {
      appointmentData.status = "CANCELLED";
      appointmentData.source = `webhook_canceled`;
    } else if (normalizedAction === "edited") {
      appointmentData.source = `webhook_edited`;
      if (editSource === "customer") {
        appointmentData.source = `customer_edited`;
      }
    } else if (normalizedAction === "booked") {
      appointmentData.source = `webhook_booked`;
      // For new bookings, check if this might be a reschedule
      if (!existingAppointment) {
        const { data: recentCancelled } = await supabase
          .from("appointments")
          .select("external_id, start_time, service_name")
          .eq("business_id", businessId)
          .eq("customer_email", appointmentData.customer_email)
          .eq("status", "CANCELLED")
          .order("created_at", { ascending: false })
          .limit(1);

        if (recentCancelled?.[0]) {
          const oldAppointment = recentCancelled[0];
          appointmentData.previous_external_id = oldAppointment.external_id;
          appointmentData.customer_notes = `RESCHEDULED from ${oldAppointment.external_id} | ${appointmentData.customer_notes}`;
          appointmentData.source = `webhook_rescheduled`;
          normalizedAction = "rescheduled";
        }
      }
    } else if (normalizedAction === "rescheduled") {
      appointmentData.source = `webhook_rescheduled`;
    }

    // Upsert the appointment
    const { data: updatedAppointment, error: upsertError } = await supabase
      .from("appointments")
      .upsert([appointmentData], { onConflict: "external_id" })
      .select()
      .single();

    if (upsertError) throw upsertError;

    // Create history record with proper source mapping
    if (existingAppointment) {
      await createHistoryRecord(externalId, normalizedAction, existingAppointment, appointmentData, editSource);
    } else if (normalizedAction === "booked" || normalizedAction === "rescheduled") {
      await createHistoryRecord(externalId, normalizedAction, null, appointmentData, "webhook");
    }

    // Trigger notifications
    const changedFields = existingAppointment ? getChangedFields(existingAppointment, appointmentData) : [];
    await triggerAppointmentNotification(normalizedAction, updatedAppointment, businessId, changedFields);

    return jsonResponse({
      success: true,
      action: normalizedAction,
      appointment_id: updatedAppointment.external_id,
      previous_external_id: updatedAppointment.previous_external_id,
      status: updatedAppointment.status,
      business_id: businessId,
      web_meeting_url: updatedAppointment.web_meeting_url,
      edit_source: editSource,
      history_source: mapSourceToCompatibleValue(editSource),
      notification_sent: true
    });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

serve(async (req) => {
  const url = new URL(req.url);

  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Get public key for frontend
  if (req.method === "GET" && url.pathname.endsWith("/vapid-public-key")) {
    const response = handleGetPublicKey();
    return withCors(response);
  }

  // Manual appointment creation
  if (req.method === "POST" && url.pathname.endsWith("/appointments")) {
    const result = await handleManualAppointment(req);
    return withCors(result);
  }

  // Appointment updates
  if (req.method === "PUT" && url.pathname.includes("/appointments/")) {
    const externalId = url.pathname.split('/appointments/')[1];
    const result = await handleAppointmentUpdate(req, externalId);
    return withCors(result);
  }

  // Secure webhook endpoint: /ssa-webhook/[webhook_secret]
  if (req.method === "POST" && url.pathname.includes("/ssa-webhook/")) {
    try {
      // Extract webhook secret from URL path
      const pathParts = url.pathname.split('/');
      const webhookSecret = pathParts[pathParts.length - 1];

      if (!webhookSecret) {
        const response = jsonResponse({ error: "Missing webhook secret in URL" }, 401);
        return withCors(response);
      }

      // Find business by webhook secret
      const business = await findBusinessByWebhookSecret(webhookSecret);
      if (!business) {
        const response = jsonResponse({ error: "Invalid webhook secret" }, 401);
        return withCors(response);
      }

      console.log(`Processing secure webhook for business: ${business.name} (${business.id})`);
      const payload = await req.json();
      const result = await handleWebhook(payload, business.id);
      return withCors(result);

    } catch (err: any) {
      console.error("Secure webhook error:", err);
      const response = jsonResponse({ error: "Invalid JSON payload" }, 400);
      return withCors(response);
    }
  }

  // Legacy webhook endpoint for backward compatibility
  if (req.method === "POST" && url.pathname.endsWith("/webhook-from-ssa")) {
    try {
      const payload = await req.json();
      // Use site_url from SSA payload to identify business
      const siteUrl = payload.signature?.site_url;
      if (!siteUrl) {
        const response = jsonResponse({ error: "Missing site URL in payload" }, 400);
        return withCors(response);
      }

      // Find business by website URL
      const { data: business, error } = await supabase
        .from("businesses")
        .select("id, name, website")
        .eq("website", siteUrl)
        .single();

      if (error || !business) {
        const response = jsonResponse({ error: "Business not found for this website" }, 404);
        return withCors(response);
      }

      console.log(`Processing legacy webhook for business: ${business.name} (${business.id})`);
      const result = await handleWebhook(payload, business.id);
      return withCors(result);

    } catch (err: any) {
      console.error("Legacy webhook error:", err);
      const response = jsonResponse({ error: "Invalid JSON payload" }, 400);
      return withCors(response);
    }
  }

  // 404 handler with CORS
  const response = jsonResponse({
    error: "Not found",
    message: "SSA webhook endpoints only",
    supported_endpoints: [
      "GET /vapid-public-key",
      "POST /appointments",
      "PUT /appointments/{external_id}",
      "POST /ssa-webhook/[webhook_secret] (secure)",
      "POST /webhook-from-ssa (legacy)"
    ]
  }, 404);
  return withCors(response);
});
