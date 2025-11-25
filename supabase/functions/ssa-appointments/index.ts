// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

// Email Service for SMTP integration
class EmailService {
  private smtpHost: string;
  private smtpPort: number;
  private smtpUser: string;
  private smtpPass: string;
  private smtpFrom: string;

  constructor() {
    this.smtpHost = Deno.env.get("SMTP_HOST") ?? "";
    this.smtpPort = parseInt(Deno.env.get("SMTP_PORT") ?? "587");
    this.smtpUser = Deno.env.get("SMTP_USER") ?? "";
    this.smtpPass = Deno.env.get("SMTP_PASS") ?? "";
    this.smtpFrom = Deno.env.get("SMTP_FROM") ?? "notifications@yourapp.com";

    // Validate SMTP configuration
    if (!this.smtpHost || !this.smtpUser || !this.smtpPass) {
      console.warn("⚠️ SMTP configuration incomplete - email notifications disabled");
    } else {
      console.log("✅ Email service configured successfully");
    }
  }

  isConfigured(): boolean {
    return !!(this.smtpHost && this.smtpUser && this.smtpPass);
  }

  async sendAppointmentEmail(
    toEmail: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn("Email service not configured - skipping email notification");
      return false;
    }

    try {
      // Create SMTP connection and send email
      const emailData = {
        to: toEmail,
        from: this.smtpFrom,
        subject: subject,
        html: htmlContent,
        text: textContent,
      };

      // Use fetch to send email via SMTP API (you can replace with actual SMTP library)
      // For now, we'll use a simple SMTP implementation
      const response = await this.sendViaSMTP(emailData);

      if (response) {
        console.log(`✅ Email sent successfully to ${toEmail}`);
        return true;
      } else {
        console.error(`❌ Failed to send email to ${toEmail}`);
        return false;
      }
    } catch (error) {
      console.error(`Email service error for ${toEmail}:`, error);
      return false;
    }
  }

  private async sendViaSMTP(emailData: any): Promise<boolean> {
    try {
      const client = new SmtpClient();

      await client.connect({
        hostname: this.smtpHost,
        port: this.smtpPort,
        tls: this.smtpPort === 465, // Use TLS for port 465, STARTTLS for others
        auth: {
          username: this.smtpUser,
          password: this.smtpPass,
        },
      });

      await client.send({
        from: this.smtpFrom,
        to: emailData.to,
        subject: emailData.subject,
        content: emailData.text,
        html: emailData.html,
      });

      await client.close();

      console.log(`📧 Email sent successfully via SMTP to ${emailData.to}`);
      return true;
    } catch (error) {
      console.error("SMTP send error:", error);
      return false;
    }
  }

  generateAppointmentEmailHtml(appointment: any, action: string): { html: string; text: string } {
    const actionTitles = {
      booked: "New Appointment Booked",
      edited: "Appointment Updated",
      cancelled: "Appointment Cancelled",
      rescheduled: "Appointment Rescheduled"
    };

    const title = actionTitles[action as keyof typeof actionTitles] || "Appointment Update";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
    .appointment-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .detail-row { margin: 8px 0; }
    .label { font-weight: bold; color: #475569; }
    .value { color: #1e293b; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
    .action-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <p>SSA Appointment Management System</p>
    </div>

    <div class="content">
      <div class="appointment-details">
        <div class="detail-row">
          <span class="label">Customer:</span>
          <span class="value">${appointment.customer_name || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Service:</span>
          <span class="value">${appointment.service_name || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Date & Time:</span>
          <span class="value">${appointment.start_time ? new Date(appointment.start_time).toLocaleString() : 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Vehicle:</span>
          <span class="value">${appointment.vehicle_make_model || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Location:</span>
          <span class="value">${appointment.location || 'TBD'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Phone:</span>
          <span class="value">${appointment.customer_phone || 'N/A'}</span>
        </div>
        ${appointment.customer_notes ? `
        <div class="detail-row">
          <span class="label">Notes:</span>
          <span class="value">${appointment.customer_notes}</span>
        </div>
        ` : ''}
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <a href="${appointment.web_meeting_url || '#'}" class="action-button">View Appointment</a>
        ${appointment.customer_phone ? `<a href="tel:${appointment.customer_phone}" class="action-button">Call Customer</a>` : ''}
      </div>
    </div>

    <div class="footer">
      <p>This is an automated notification from your SSA Appointment Management System.</p>
      <p>Please check your dashboard for the latest appointment details.</p>
    </div>
  </div>
</body>
</html>`;

    const text = `
${title}

Customer: ${appointment.customer_name || 'N/A'}
Service: ${appointment.service_name || 'N/A'}
Date & Time: ${appointment.start_time ? new Date(appointment.start_time).toLocaleString() : 'N/A'}
Vehicle: ${appointment.vehicle_make_model || 'N/A'}
Location: ${appointment.location || 'TBD'}
Phone: ${appointment.customer_phone || 'N/A'}
${appointment.customer_notes ? `Notes: ${appointment.customer_notes}` : ''}

View appointment: ${appointment.web_meeting_url || 'Check your dashboard'}
${appointment.customer_phone ? `Call customer: ${appointment.customer_phone}` : ''}

This is an automated notification from your SSA Appointment Management System.
`;

    return { html, text };
  }
}

const emailService = new EmailService();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// OneSignal Push Notification Helper
async function sendOneSignalPushNotification(
  appId: string,
  apiKey: string,
  externalUserIds: string[],
  notificationData: any
): Promise<boolean> {
  try {
    const payload = {
      app_id: appId,
      include_external_user_ids: externalUserIds,
      headings: { en: notificationData.title },
      contents: { en: notificationData.body },
      data: {
        url: notificationData.url,
        appointmentId: notificationData.appointmentId,
        type: notificationData.type,
        customerPhone: notificationData.customerPhone
      },
      url: notificationData.url,
      web_url: notificationData.url
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal API error:', result);
      return false;
    }

    console.log(`✅ OneSignal notification sent successfully. Recipients: ${result.recipients || 0}`);
    return true;

  } catch (error: any) {
    console.error('OneSignal push notification error:', error.message);
    return false;
  }
}



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

// Notification Service - Dual Delivery (Push + Email)
class NotificationService {
  async sendAppointmentNotification(businessId: string, notificationData: any, appointment: any) {
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

      // Get user profiles with email addresses
      const { data: userProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching user profiles:", profilesError);
      }

      // Create user map for easy lookup
      const userMap = new Map();
      userProfiles?.forEach(profile => {
        userMap.set(profile.id, { email: profile.email });
      });

      // Get push subscriptions for these users
      const { data: subscriptions, error: subsError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", userIds);

      if (subsError) {
        console.error("Error fetching push subscriptions:", subsError);
      }

      console.log(`📱 Found ${subscriptions?.length || 0} push subscriptions for ${userIds.length} users`);
      console.log(`📧 Email service configured: ${emailService.isConfigured()}`);

      // Send dual notifications (push first, email fallback)
      const results = await this.sendDualNotifications(
        userIds,
        userMap,
        subscriptions || [],
        notificationData,
        appointment
      );

      // Log notification delivery
      await this.logDualNotifications(userIds, businessId, notificationData, results);

      const pushSuccessful = results.filter((result) => result.pushSuccess).length;
      const emailSuccessful = results.filter((result) => result.emailSuccess).length;

      console.log(`✅ Dual notifications sent: ${pushSuccessful} push, ${emailSuccessful} email`);

    } catch (error) {
      console.error("Notification service error:", error);
    }
  }

  async sendDualNotifications(
    userIds: string[],
    userMap: Map<string, any>,
    subscriptions: any[],
    notificationData: any,
    appointment: any
  ) {
    const results = [];

    for (const userId of userIds) {
      const userProfile = userMap.get(userId);
      const userSubscriptions = subscriptions.filter(sub => sub.user_id === userId);

      let pushSuccess = false;
      let emailSuccess = false;

      // 1. Try push notification first (immediate delivery)
      if (userSubscriptions.length > 0) {
        console.log(`📱 Sending push notification to user ${userId} (${userSubscriptions.length} subscriptions)`);
        const pushResults = await Promise.allSettled(
          userSubscriptions.map((sub) => this.sendPushNotification(sub, notificationData))
        );
        pushSuccess = pushResults.some(result => result.status === 'fulfilled' && result.value.success);
      }

      // 2. Send email notification (reliable fallback)
      if (userProfile?.email && emailService.isConfigured()) {
        console.log(`📧 Sending email notification to ${userProfile.email}`);
        const action = this.getActionFromNotificationType(notificationData.type);
        const { html, text } = emailService.generateAppointmentEmailHtml(appointment, action);
        const subject = this.getEmailSubject(notificationData.type, appointment);

        emailSuccess = await emailService.sendAppointmentEmail(
          userProfile.email,
          subject,
          html,
          text
        );
      } else if (!userProfile?.email) {
        console.log(`⚠️ No email address found for user ${userId}`);
      }

      results.push({
        userId,
        pushSuccess,
        emailSuccess,
        pushSubscriptions: userSubscriptions.length,
        hasEmail: !!userProfile?.email
      });
    }

    return results;
  }

  getActionFromNotificationType(type: string): string {
    const typeMap: Record<string, string> = {
      'appointment_booked': 'booked',
      'appointment_edited': 'edited',
      'appointment_cancelled': 'cancelled',
      'appointment_rescheduled': 'rescheduled'
    };
    return typeMap[type] || 'booked';
  }

  getEmailSubject(type: string, appointment: any): string {
    const baseSubject = `SSA Appointment: ${appointment.customer_name}`;
    const typeSubjects: Record<string, string> = {
      'appointment_booked': `New Appointment: ${appointment.customer_name}`,
      'appointment_edited': `Appointment Updated: ${appointment.customer_name}`,
      'appointment_cancelled': `Appointment Cancelled: ${appointment.customer_name}`,
      'appointment_rescheduled': `Appointment Rescheduled: ${appointment.customer_name}`
    };
    return typeSubjects[type] || baseSubject;
  }

  async sendPushNotification(subscription: any, notificationData: any) {
    try {
      // Send push notification using OneSignal REST API

      const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
      const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY");

      if (!oneSignalAppId || !oneSignalApiKey) {
        console.error("OneSignal APP ID or API Key not configured");
        return { success: false, error: "OneSignal APP ID or API Key not configured" };
      }

      // Assumes subscription contains user external ID for OneSignal
      const userExternalId = subscription.user_external_id;

      if (!userExternalId) {
        console.error("Subscription missing user external ID for OneSignal");
        return { success: false, error: "Missing user external ID for OneSignal" };
      }

      const success = await sendOneSignalPushNotification(oneSignalAppId, oneSignalApiKey, [userExternalId], notificationData);

      if (!success) {
        throw new Error('Failed to send OneSignal push notification');
      }

      return { success: true, subscriptionId: subscription.id };
    } catch (error: any) {
      console.error(`Push notification failed for subscription ${subscription.id}:`, error.message);

      return { success: false, error: error.message, subscriptionId: subscription.id };
    }
  }

  async logDualNotifications(userIds: string[], businessId: string, notificationData: any, results: any[]) {
    try {
      const logs = results.map((result) => ({
        user_id: result.userId,
        business_id: businessId,
        notification_type: notificationData.type,
        title: notificationData.title,
        body: notificationData.body,
        data: {
          url: notificationData.url,
          appointmentId: notificationData.appointmentId
        },
        status: result.pushSuccess || result.emailSuccess ? 'sent' : 'failed',
        error_message: !result.pushSuccess && !result.emailSuccess ? 'Both push and email failed' : null,
        sent_at: new Date().toISOString(),
        delivery_method: result.pushSuccess && result.emailSuccess ? 'both' : result.pushSuccess ? 'push' : result.emailSuccess ? 'email' : 'none'
      }));

      const { error } = await supabase.from("notification_logs").insert(logs);
      if (error) {
        console.error("Failed to log dual notifications:", error);
      }
    } catch (error) {
      console.error("Error in logDualNotifications:", error);
    }
  }
}

const notificationService = new NotificationService();

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
    notificationData.customerPhone = appointment.customer_phone; // Add customer phone for call action
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

  // Health check endpoint for diagnostics
  if (req.method === "GET" && url.pathname.endsWith("/health")) {
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY");
    
    return jsonResponse({
      status: "healthy",
      timestamp: new Date().toISOString(),
      onesignal_configured: !!(oneSignalAppId && oneSignalApiKey),
      smtp_configured: emailService.isConfigured()
    });
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

  // Test notification endpoint for manual testing
  if (req.method === "POST" && url.pathname.endsWith("/test-notification")) {
    try {
      const { userId, businessId } = await req.json();

      if (!userId || !businessId) {
        return jsonResponse({ error: "Missing userId or businessId" }, 400);
      }

      // Get user's push subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", userId);

      if (subsError || !subscriptions?.length) {
        return jsonResponse({ error: "No push subscriptions found for user" }, 404);
      }

      const testNotificationData = {
        title: "🧪 Test Notification",
        body: "This is a test notification from SSA Appointments",
        type: "test_notification",
        url: "/appointments",
        appointmentId: "test"
      };

      // Send test notification
      const results = await Promise.allSettled(
        subscriptions.map((sub) => notificationService.sendPushNotification(sub, testNotificationData))
      );

      const successful = results.filter((result) => result.status === 'fulfilled' && result.value.success).length;

      return jsonResponse({
        success: true,
        message: `Test notification sent to ${successful}/${subscriptions.length} subscriptions`,
        results: results.map((result, index) => ({
          subscriptionId: subscriptions[index].id,
          success: result.status === 'fulfilled' && result.value.success,
          error: result.status === 'rejected' ? result.reason : result.value?.error || null
        }))
      });

    } catch (error: any) {
      console.error("Test notification error:", error);
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // Test SMTP endpoint for email testing
  if (req.method === "POST" && url.pathname.endsWith("/test-smtp")) {
    try {
      const { toEmail } = await req.json();

      if (!toEmail) {
        return jsonResponse({ error: "Missing toEmail parameter" }, 400);
      }

      console.log(`Testing SMTP with email: ${toEmail}`);

      const testEmailData = {
        to: toEmail,
        subject: "SMTP Test - SSA Appointments",
        html: `
        <h1>SMTP Test Email</h1>
        <p>This is a test email to verify SMTP configuration is working correctly.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
        `,
        text: `
        SMTP Test Email

        This is a test email to verify SMTP configuration is working correctly.

        Sent at: ${new Date().toISOString()}
        `
      };

      const success = await emailService.sendAppointmentEmail(
        toEmail,
        testEmailData.subject,
        testEmailData.html,
        testEmailData.text
      );

      if (success) {
        return jsonResponse({
          success: true,
          message: `Test email sent successfully to ${toEmail}`,
          smtp_configured: emailService.isConfigured()
        });
      } else {
        return jsonResponse({
          success: false,
          message: `Failed to send test email to ${toEmail}`,
          smtp_configured: emailService.isConfigured()
        }, 500);
      }

    } catch (error: any) {
      console.error("SMTP test error:", error);
      return jsonResponse({
        success: false,
        error: error.message,
        smtp_configured: emailService.isConfigured()
      }, 500);
    }
  }

  // Main webhook endpoint for direct WordPress SSA calls
if (req.method === "POST" && url.pathname.endsWith("/ssa-appointments")) {
    try {
      const payload = await req.json();

      // Log all request headers for debugging
      console.log("Received webhook headers:");
      for (const [key, value] of req.headers.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      // Check for 'x-business-id' header for business identification
      const headerBusinessId = req.headers.get("x-business-id");

      console.log(`x-business-id header present: ${headerBusinessId ? 'Yes (' + headerBusinessId + ')' : 'No'}`);

      let business;

      if (headerBusinessId) {
        // Verify business exists with this ID
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name, webhook_secret")
          .eq("id", headerBusinessId)
          .single();

        if (error || !data) {
          console.error("Business not found for x-business-id header:", headerBusinessId);
          const response = jsonResponse({
            error: "Invalid business ID in header"
          }, 401);
          return withCors(response);
        }

        business = data;
        console.log(`Processing main webhook for business from header: ${business.name} (${business.id})`);
      } else {
        // Extract webhook token from payload if header absent
        const webhookToken = payload.signature?.token;

        console.log(`Payload signature.token present: ${webhookToken ? 'Yes (' + webhookToken + ')' : 'No'}`);

        if (!webhookToken) {
          const response = jsonResponse({
            error: "Missing webhook token in payload and x-business-id header"
          }, 401);
          return withCors(response);
        }

        // Find business by webhook token (matches your WEBHOOK_TOKEN env var)
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name, webhook_secret")
          .eq("webhook_secret", webhookToken)
          .single();

        if (error || !data) {
          console.error("Business not found for webhook token:", webhookToken);
          const response = jsonResponse({
            error: "Invalid webhook token"
          }, 401);
          return withCors(response);
        }

        business = data;
        console.log(`Processing main webhook for business from token: ${business.name} (${business.id})`);
      }

      // Process the webhook with the found business
      const result = await handleWebhook(payload, business.id);
      return withCors(result);

    } catch (err) {
      console.error("Main webhook error:", err);
      const response = jsonResponse({
        error: "Invalid JSON payload"
      }, 400);
      return withCors(response);
    }
  }

  // 404 handler with CORS
  const response = jsonResponse({
    error: "Not found",
    message: "SSA webhook endpoints only",
    supported_endpoints: [
      "GET /health",
      "POST /test-notification",
      "POST /test-smtp",
      "POST /appointments",
      "PUT /appointments/{external_id}",
      "POST /ssa-webhook/[webhook_secret] (secure)",
      "POST /webhook-from-ssa (legacy)",
      "POST /ssa-appointments (main)"
    ]
  }, 404);
  return withCors(response);
});
