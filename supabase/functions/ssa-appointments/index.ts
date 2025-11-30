// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

/**
 * Constants for appointment actions and notification types
 */
const APPOINTMENT_ACTIONS = {
  BOOKED: 'booked',
  EDITED: 'edited',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled'
} as const;

const NOTIFICATION_TYPES = {
  APPOINTMENT_BOOKED: 'appointment_booked',
  APPOINTMENT_EDITED: 'appointment_edited',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  TEST_NOTIFICATION: 'test_notification'
} as const;

const HISTORY_ACTIONS = {
  CREATE: 'CREATE',
  EDIT: 'EDIT',
  CANCEL: 'CANCEL',
  CANCELLED: 'CANCELLED',
  RESCHEDULE: 'RESCHEDULE',
  BOOKED: 'BOOKED',
  UPDATE: 'UPDATE'
} as const;

/**
 * Email Service for SMTP integration
 * Handles sending appointment-related emails with HTML templates
 */
/**
 * Service class for handling SMTP email notifications
 */
class EmailService {
  private smtpHost: string;
  private smtpPort: number;
  private smtpUsername: string;
  private smtpPassword: string;
  private smtpFromAddress: string;

  constructor() {
    this.smtpHost = Deno.env.get("SMTP_HOST") ?? "";
    this.smtpPort = parseInt(Deno.env.get("SMTP_PORT") ?? "587");
    this.smtpUsername = Deno.env.get("SMTP_USER") ?? "";
    this.smtpPassword = Deno.env.get("SMTP_PASS") ?? "";
    this.smtpFromAddress = Deno.env.get("SMTP_FROM") ?? "notifications@yourapp.com";

    // Validate SMTP configuration
    if (!this.smtpHost || !this.smtpUsername || !this.smtpPassword) {
      console.warn("⚠️ SMTP configuration incomplete - email notifications disabled");
    } else {
      console.log("✅ Email service configured successfully");
    }
  }

  /**
   * Check if SMTP is properly configured
   */
  isConfigured(): boolean {
    return !!(this.smtpHost && this.smtpUsername && this.smtpPassword);
  }

  /**
   * Send an appointment notification email
   * @param recipientEmail - Email address of the recipient
   * @param emailSubject - Subject line of the email
   * @param htmlBody - HTML content of the email
   * @param textBody - Plain text fallback content
   * @returns Promise<boolean> - True if email was sent successfully
   */
  async sendAppointmentEmail(
    recipientEmail: string,
    emailSubject: string,
    htmlBody: string,
    textBody: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn("Email service not configured - skipping email notification");
      return false;
    }

    try {
      // Prepare email data structure
      const emailPayload = {
        to: recipientEmail,
        from: this.smtpFromAddress,
        subject: emailSubject,
        html: htmlBody,
        text: textBody,
      };

      // Send email via SMTP
      const sendResult = await this.sendViaSMTP(emailPayload);

      if (sendResult) {
        console.log(`✅ Email sent successfully to ${recipientEmail}`);
        return true;
      } else {
        console.error(`❌ Failed to send email to ${recipientEmail}`);
        return false;
      }
    } catch (error) {
      console.error(`Email service error for ${recipientEmail}:`, error);
      return false;
    }
  }

  /**
   * Send email via SMTP protocol
   * @param emailPayload - Email data containing to, from, subject, html, and text
   * @returns Promise<boolean> - True if SMTP send was successful
   */
  private async sendViaSMTP(emailPayload: any): Promise<boolean> {
    try {
      const smtpClient = new SmtpClient();

      // Establish SMTP connection with authentication
      await smtpClient.connect({
        hostname: this.smtpHost,
        port: this.smtpPort,
        tls: this.smtpPort === 465, // Use TLS for port 465, STARTTLS for others
        auth: {
          username: this.smtpUsername,
          password: this.smtpPassword,
        },
      });

      // Send the email with both HTML and text content
      await smtpClient.send({
        from: this.smtpFromAddress,
        to: emailPayload.to,
        subject: emailPayload.subject,
        content: emailPayload.text,
        html: emailPayload.html,
      });

      await smtpClient.close();

      console.log(`📧 Email sent successfully via SMTP to ${emailPayload.to}`);
      return true;
    } catch (error) {
      console.error("SMTP send error:", error);
      return false;
    }
  }

  /**
   * Generate HTML and text email templates for appointment notifications
   * @param appointmentData - Appointment object with customer and service details
   * @param actionType - Type of appointment action (booked, edited, cancelled, rescheduled)
   * @returns Object containing HTML and text versions of the email
   */
  generateAppointmentEmailHtml(appointmentData: any, actionType: string): { html: string; text: string } {
    // Map action types to user-friendly titles
    const actionTitleMap = {
      booked: "New Appointment Booked",
      edited: "Appointment Updated",
      cancelled: "Appointment Cancelled",
      rescheduled: "Appointment Rescheduled"
    };

    const emailTitle = actionTitleMap[actionType as keyof typeof actionTitleMap] || "Appointment Update";

    // Generate HTML email template
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${emailTitle}</title>
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
      <h1>${emailTitle}</h1>
      <p>SSA Appointment Management System</p>
    </div>

    <div class="content">
      <div class="appointment-details">
        <div class="detail-row">
          <span class="label">Customer:</span>
          <span class="value">${appointmentData.customer_name || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Service:</span>
          <span class="value">${appointmentData.service_name || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Date & Time:</span>
          <span class="value">${appointmentData.start_time ? new Date(appointmentData.start_time).toLocaleString() : 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Vehicle:</span>
          <span class="value">${appointmentData.vehicle_make_model || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Location:</span>
          <span class="value">${appointmentData.location || 'TBD'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Phone:</span>
          <span class="value">${appointmentData.customer_phone || 'N/A'}</span>
        </div>
        ${appointmentData.customer_notes ? `
        <div class="detail-row">
          <span class="label">Notes:</span>
          <span class="value">${appointmentData.customer_notes}</span>
        </div>
        ` : ''}
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <a href="${appointmentData.web_meeting_url || '#'}" class="action-button">View Appointment</a>
        ${appointmentData.customer_phone ? `<a href="tel:${appointmentData.customer_phone}" class="action-button">Call Customer</a>` : ''}
      </div>
    </div>

    <div class="footer">
      <p>This is an automated notification from your SSA Appointment Management System.</p>
      <p>Please check your dashboard for the latest appointment details.</p>
    </div>
  </div>
</body>
</html>`;

    // Generate plain text email template (fallback for HTML clients)
    const textTemplate = `
${emailTitle}

Customer: ${appointmentData.customer_name || 'N/A'}
Service: ${appointmentData.service_name || 'N/A'}
Date & Time: ${appointmentData.start_time ? new Date(appointmentData.start_time).toLocaleString() : 'N/A'}
Vehicle: ${appointmentData.vehicle_make_model || 'N/A'}
Location: ${appointmentData.location || 'TBD'}
Phone: ${appointmentData.customer_phone || 'N/A'}
${appointmentData.customer_notes ? `Notes: ${appointmentData.customer_notes}` : ''}

View appointment: ${appointmentData.web_meeting_url || 'Check your dashboard'}
${appointmentData.customer_phone ? `Call customer: ${appointmentData.customer_phone}` : ''}

This is an automated notification from your SSA Appointment Management System.
`;

    return { html: htmlTemplate, text: textTemplate };
  }
}

const emailService = new EmailService();

// Supabase client configuration
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Send push notification via OneSignal REST API
 * @param oneSignalAppId - OneSignal application ID
 * @param oneSignalApiKey - OneSignal REST API key
 * @param targetIds - Array of player IDs or external user IDs
 * @param notificationPayload - Notification content and metadata
 * @param config - Optional configuration for ID type
 * @returns Promise with API response details
 */
async function sendOneSignalPushNotification(
  oneSignalAppId: string,
  oneSignalApiKey: string,
  targetIds: string[],
  notificationPayload: any,
  config?: { usePlayerIds?: boolean }
): Promise<{ ok: boolean; status: number; body: any }> {
  try {
    // Build base payload without root-level `url`/`web_url` to avoid OneSignal validation errors.
    // Keep URL inside `data` with a different key name to avoid conflicts with OneSignal's root-level fields.
    const basePayload: any = {
      app_id: oneSignalAppId,
      headings: { en: notificationPayload.title },
      contents: { en: notificationPayload.body },
      data: {
        appointmentUrl: notificationPayload.url, // Rename to avoid conflict with OneSignal's 'url' field
        appointmentId: notificationPayload.appointmentId,
        type: notificationPayload.type,
        customerPhone: notificationPayload.customerPhone
      }
    };

    // Add web_url only when notificationPayload.url is an absolute http(s) URL
    if (notificationPayload.url && /^https?:\/\//i.test(String(notificationPayload.url))) {
      basePayload.web_url = notificationPayload.url;
    }

    // Use player ids (OneSignal's device/player ids) or external_user_ids depending on configuration
    const finalPayload = config?.usePlayerIds
      ? { ...basePayload, include_player_ids: targetIds }
      : { ...basePayload, include_external_user_ids: targetIds };

    // Send notification to OneSignal API
    const apiResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalApiKey}`
      },
      body: JSON.stringify(finalPayload)
    });

    let responseBody: any = null;
    try {
      responseBody = await apiResponse.json();
    } catch (parseError) {
      // Handle non-JSON responses
      responseBody = await apiResponse.text();
    }

    if (!apiResponse.ok) {
      console.error('OneSignal API error:', responseBody);
      return { ok: false, status: apiResponse.status, body: responseBody };
    }

    console.log(`✅ OneSignal notification API accepted. Recipients: ${responseBody.recipients || 0}`);
    return { ok: true, status: apiResponse.status, body: responseBody };

  } catch (error: any) {
    console.error('OneSignal push notification error:', error?.message ?? error);
    return { ok: false, status: 0, body: { message: error?.message ?? String(error) } };
  }
}



/**
 * Create a JSON response with proper headers
 * @param responseData - Data to be JSON stringified
 * @param httpStatus - HTTP status code (default: 200)
 * @returns Response object with JSON content type
 */
function createJsonResponse(responseData: any, httpStatus = 200): Response {
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
function addCorsHeaders(response: Response): Response {
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
 * Find business by webhook secret for secure webhook authentication
 * @param webhookSecret - Secret token from webhook URL
 * @returns Business object or null if not found
 */
async function findBusinessByWebhookSecret(webhookSecret: string) {
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
function mapAppointmentData(webhookPayload: any, businessId: string) {
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
  const mappedAppointmentData = {
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
 * Map source values to match React component expectations
 * @param sourceValue - Raw source string from webhook or user action
 * @returns Normalized source value
 */
function mapSourceToCompatibleValue(sourceValue: string): string {
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
 * Create a history record for appointment changes
 * @param appointmentExternalId - External ID of the appointment
 * @param actionType - Type of action performed
 * @param previousAppointmentData - Previous appointment state (null for new appointments)
 * @param newAppointmentData - New appointment state
 * @param changeSource - Source of the change (webhook, customer, user)
 */
async function createHistoryRecord(
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
function detectEditSource(webhookPayload: any, existingAppointmentData: any): string {
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
 * Compare old and new appointment data to identify changed fields
 * @param previousData - Previous appointment data
 * @param currentData - New appointment data
 * @returns Array of field names that changed
 */
function getChangedFields(previousData: any, currentData: any): string[] {
  const trackedFields = ['customer_name', 'customer_email', 'customer_phone', 'service_name', 'location', 'start_time', 'end_time'];
  const changedFieldNames = [];

  trackedFields.forEach((fieldName) => {
    if (previousData[fieldName] !== currentData[fieldName]) {
      changedFieldNames.push(fieldName.replace('_', ' '));
    }
  });

  return changedFieldNames;
}

/**
 * Service for sending dual notifications (push + email) to business members
 */
class NotificationService {
  /**
   * Send appointment notifications to all active business members
   * @param businessId - ID of the business
   * @param notificationPayload - Notification content and metadata
   * @param appointmentData - Appointment details for email templates
   */
  async sendAppointmentNotification(businessId: string, notificationPayload: any, appointmentData: any) {
    try {
      // Get all active users for this business
      const { data: businessMembersData, error: membersError } = await supabaseClient
        .from("business_members")
        .select("user_id")
        .eq("business_id", businessId)
        .eq("status", "active");

      if (membersError) {
        console.error("Error fetching business members:", membersError);
        return;
      }

      if (!businessMembersData?.length) {
        console.log(`No active business members found for business: ${businessId}`);
        return;
      }

      const memberUserIds = businessMembersData.map((member) => member.user_id);

      // Get user profiles with email addresses
      const { data: userProfilesData, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, email")
        .in("id", memberUserIds);

      if (profilesError) {
        console.error("Error fetching user profiles:", profilesError);
      }

      // Create user map for easy lookup
      const userProfileMap = new Map();
      userProfilesData?.forEach(profile => {
        userProfileMap.set(profile.id, { email: profile.email });
      });

      // Get active push subscriptions for these users
      const { data: activeSubscriptions, error: subscriptionsError } = await supabaseClient
        .from("push_subscriptions")
        .select("*")
        .in("user_id", memberUserIds)
        .eq("push_active", true);

      if (subscriptionsError) {
        console.error("Error fetching push subscriptions:", subscriptionsError);
      }

      console.log(`📱 Found ${activeSubscriptions?.length || 0} push subscriptions for ${memberUserIds.length} users`);
      console.log(`📧 Email service configured: ${emailService.isConfigured()}`);

      // Send dual notifications (push first, email fallback)
      const notificationResults = await this.sendDualNotifications(
        memberUserIds,
        userProfileMap,
        activeSubscriptions || [],
        notificationPayload,
        appointmentData
      );

      // Log notification delivery results
      await this.logDualNotifications(memberUserIds, businessId, notificationPayload, notificationResults);

      const successfulPushCount = notificationResults.filter((result) => result.pushSuccess).length;
      const successfulEmailCount = notificationResults.filter((result) => result.emailSuccess).length;

      console.log(`✅ Dual notifications sent: ${successfulPushCount} push, ${successfulEmailCount} email`);

    } catch (error) {
      console.error("Notification service error:", error);
    }
  }

  /**
   * Send both push and email notifications to each user
   * @param memberUserIds - Array of user IDs to notify
   * @param userProfileMap - Map of user profiles with email addresses
   * @param activeSubscriptions - Array of active push subscriptions
   * @param notificationPayload - Notification content
   * @param appointmentData - Appointment details for email
   * @returns Array of notification results per user
   */
  async sendDualNotifications(
    memberUserIds: string[],
    userProfileMap: Map<string, any>,
    activeSubscriptions: any[],
    notificationPayload: any,
    appointmentData: any
  ) {
    const notificationResults = [];

    for (const userId of memberUserIds) {
      const userProfile = userProfileMap.get(userId);
      const userPushSubscriptions = activeSubscriptions.filter(sub => sub.user_id === userId);

      let pushNotificationSuccess = false;
      let emailNotificationSuccess = false;
      let pushProviderResponse: any = null;
      let subscriptionIdForLogging: string | null = null;
      let pushNotificationError: string | null = null;

      // 1. Try push notification first (immediate delivery)
      if (userPushSubscriptions.length > 0) {
        console.log(`📱 Sending push notification to user ${userId} (${userPushSubscriptions.length} subscriptions)`);
        const pushNotificationResults = await Promise.allSettled(
          userPushSubscriptions.map((subscription) => this.sendPushNotification(subscription, notificationPayload))
        );

        // Check push results and capture provider response
        for (const result of pushNotificationResults) {
          if (result.status === 'fulfilled') {
            if (result.value && result.value.subscriptionId) subscriptionIdForLogging = result.value.subscriptionId;
          }

          if (result.status === 'fulfilled' && result.value.success) {
            pushNotificationSuccess = true;
            pushProviderResponse = result.value.providerResponse;
            if (result.value.subscriptionId) subscriptionIdForLogging = result.value.subscriptionId;
            break;
          } else if (result.status === 'fulfilled' && result.value && result.value.providerResponse) {
            // Capture provider response even if failed
            pushProviderResponse = result.value.providerResponse;
            pushNotificationError = result.value.error || 'Push notification failed';
          }
        }
      }

      // 2. Send email notification (reliable fallback)
      let emailNotificationError: string | null = null;
      if (userProfile?.email && emailService.isConfigured()) {
        console.log(`📧 Sending email notification to ${userProfile.email}`);
        const appointmentAction = this.getActionFromNotificationType(notificationPayload.type);
        const { html: emailHtml, text: emailText } = emailService.generateAppointmentEmailHtml(appointmentData, appointmentAction);
        const emailSubjectLine = this.getEmailSubject(notificationPayload.type, appointmentData);

        emailNotificationSuccess = await emailService.sendAppointmentEmail(
          userProfile.email,
          emailSubjectLine,
          emailHtml,
          emailText
        );
      } else if (!userProfile?.email) {
        console.log(`⚠️ No email address found for user ${userId}`);
        emailNotificationError = 'No email address configured';
      }

      notificationResults.push({
        userId,
        pushSuccess: pushNotificationSuccess,
        emailSuccess: emailNotificationSuccess,
        pushSubscriptions: userPushSubscriptions.length,
        hasEmail: !!userProfile?.email,
        providerResponse: pushProviderResponse,
        subscriptionId: subscriptionIdForLogging,
        error: pushNotificationError || emailNotificationError || (pushNotificationSuccess || emailNotificationSuccess ? null : 'No notification sent')
      });
    }

    return notificationResults;
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
      // Accept either ONESIGNAL_API_KEY or ONESIGNAL_REST_API_KEY (existing secret name)
      const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY") || Deno.env.get("ONESIGNAL_REST_API_KEY");

      if (!oneSignalAppId || !oneSignalApiKey) {
        console.error("OneSignal APP ID or API Key not configured");
        return { success: false, error: "OneSignal APP ID or API Key not configured", providerResponse: null };
      }

      // Accept multiple possible field names that might hold the OneSignal player/external id
      let userExternalId: string | null = null;
      let isPlayerId = false;

      if (subscription.onesignal_player_id) {
        userExternalId = subscription.onesignal_player_id;
        isPlayerId = true;
      } else if (subscription.one_signal_player_id) {
        userExternalId = subscription.one_signal_player_id;
        isPlayerId = true;
      } else if (subscription.user_external_id) {
        userExternalId = subscription.user_external_id;
      } else if (subscription.onesignal_external_user_id) {
        userExternalId = subscription.onesignal_external_user_id;
      } else if (subscription.onesignal_external_id) {
        userExternalId = subscription.onesignal_external_id;
      }

      if (!userExternalId) {
        console.error("Subscription missing OneSignal identifier (user_external_id / onesignal_player_id / onesignal_external_user_id)");
        return { success: false, error: "Missing OneSignal id", providerResponse: null, subscriptionId: subscription.id };
      }

      const sendResult = await sendOneSignalPushNotification(oneSignalAppId, oneSignalApiKey, [userExternalId], notificationData, { usePlayerIds: isPlayerId });

      if (!sendResult.ok) {
        console.error(`OneSignal send failed for subscription ${subscription.id}:`, sendResult.body);

        // If OneSignal reports invalid player ids, mark subscription as inactive to avoid repeated failures
        try {
          const invalidIds = sendResult.body?.errors?.invalid_player_ids;
          if (Array.isArray(invalidIds) && invalidIds.length) {
            console.log(`OneSignal reported invalid_player_ids for subscription ${subscription.id}:`, invalidIds);
            const { error: clearError } = await supabase
              .from('push_subscriptions')
              .update({ push_active: false })
              .eq('id', subscription.id);
            if (clearError) {
              console.error(`Failed to deactivate subscription ${subscription.id}:`, clearError);
            } else {
              console.log(`Deactivated subscription ${subscription.id} due to invalid player id`);
            }
          }
        } catch (e) {
          console.error('Error while handling invalid_player_ids cleanup:', e);
        }

        return { success: false, error: 'Failed to send OneSignal push notification', providerResponse: sendResult.body, subscriptionId: subscription.id };
      }

      // Log provider response for diagnostics
      try {
        console.log(`OneSignal send result for subscription ${subscription.id}:`, JSON.stringify(sendResult.body));
      } catch (e) {
        console.log(`OneSignal send result for subscription ${subscription.id}: (non-JSON response)`);
      }

      return { success: true, subscriptionId: subscription.id, providerResponse: sendResult.body };
    } catch (error: any) {
      console.error(`Push notification failed for subscription ${subscription.id}:`, error?.message ?? error);
      return { success: false, error: error?.message ?? String(error), providerResponse: null, subscriptionId: subscription.id };
    }
  }

  async logDualNotifications(userIds: string[], businessId: string, notificationData: any, results: any[]) {
    try {
      const logs = results.map((result) => ({
        user_id: result.userId,
        subscription_id: result.subscriptionId || null,
        business_id: businessId,
        notification_type: notificationData.type,
        title: notificationData.title,
        body: notificationData.body,
        data: {
          appointmentUrl: notificationData.url,
          appointmentId: notificationData.appointmentId,
          providerResponse: result.providerResponse // Store in data field instead
        },
        status: result.pushSuccess || result.emailSuccess ? 'sent' : 'failed',
        error_message: !result.pushSuccess && !result.emailSuccess ? (result.error || 'Both push and email failed') : null,
        sent_at: new Date().toISOString(),
        delivery_method: result.pushSuccess && result.emailSuccess ? 'both' : result.pushSuccess ? 'push' : result.emailSuccess ? 'email' : 'none'
      }));
      // Diagnostic: log the payload we're about to insert
      try {
        console.log('Inserting notification_logs entries:', JSON.stringify(logs));
      } catch (e) {
        console.log('Inserting notification_logs entries: (unable to stringify logs)');
      }

      const insertResult = await supabase.from("notification_logs").insert(logs).select();
      if ((insertResult as any).error) {
        console.error("Failed to log dual notifications:", (insertResult as any).error);
      } else {
        console.log('Logged notification entries:', (insertResult as any).data || insertResult);
      }
    } catch (error) {
      console.error("Error in logDualNotifications:", error);
    }
  }
}

const notificationService = new NotificationService();

/**
 * Trigger appointment notifications based on action type
 * @param actionType - Type of appointment action (booked, edited, cancelled, rescheduled)
 * @param appointmentData - Appointment details
 * @param businessId - ID of the business
 * @param changedFields - Array of fields that were modified (for edit notifications)
 */
async function triggerAppointmentNotification(
  actionType: string,
  appointmentData: any,
  businessId: string,
  changedFields: string[]
) {
  // Map action types to notification templates
  const notificationTemplates: Record<string, any> = {
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
    console.log(`Triggering ${actionType} notification for business: ${businessId}`);
    await notificationService.sendAppointmentNotification(businessId, notificationTemplate, appointmentData);
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

/**
 * Main webhook handler for processing SSA appointment webhooks
 * @param webhookPayload - Raw webhook payload from SSA
 * @param businessId - ID of the business this webhook is for
 * @returns JSON response with processing results
 */
async function handleWebhook(webhookPayload: any, businessId: string) {
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

// Push registration endpoint -- upsert OneSignal ids for a user when client registers
async function handlePushRegister(req: Request) {
  try {
    const body = await req.json();
    const userId = body.userId || body.user_id;
    const playerId = body.onesignal_player_id || body.playerId || body.player_id;
    const externalId = body.onesignal_external_user_id || body.externalUserId || body.external_id;
    const platform = body.platform || body.device || null;
    const userAgent = body.userAgent || req.headers.get('user-agent') || null;

    if (!userId || !playerId) {
      return jsonResponse({ error: 'Missing userId or onesignal_player_id' }, 400);
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

    // Use upsert on user_id to create or update the subscription row.
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert([payload], { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Failed to upsert push subscription:', error);
      return jsonResponse({ success: false, error: 'Failed to register push subscription' }, 500);
    }

    console.log(`Registered push subscription for user ${userId}: player=${playerId}`);
    return jsonResponse({ success: true, subscription: data });
  } catch (err: any) {
    console.error('Push register error:', err);
    return jsonResponse({ success: false, error: err?.message || String(err) }, 500);
  }
}

// ========================================
// MAIN REQUEST HANDLER
// ========================================

serve(async (request) => {
  const requestUrl = new URL(request.url);

  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ========================================
  // HEALTH CHECK ENDPOINT
  // ========================================
  if (request.method === "GET" && requestUrl.pathname.endsWith("/health")) {
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY");

    return createJsonResponse({
      status: "healthy",
      timestamp: new Date().toISOString(),
      onesignal_configured: !!(oneSignalAppId && oneSignalApiKey),
      smtp_configured: emailService.isConfigured()
    });
  }

  // ========================================
  // MANUAL APPOINTMENT ENDPOINTS
  // ========================================

  // Manual appointment creation
  if (request.method === "POST" && requestUrl.pathname.endsWith("/appointments")) {
    const response = await handleManualAppointment(request);
    return addCorsHeaders(response);
  }

  // Appointment updates
  if (request.method === "PUT" && requestUrl.pathname.includes("/appointments/")) {
    const appointmentExternalId = requestUrl.pathname.split('/appointments/')[1];
    const response = await handleAppointmentUpdate(request, appointmentExternalId);
    return addCorsHeaders(response);
  }

  // ========================================
  // WEBHOOK ENDPOINTS
  // ========================================

  // Secure webhook endpoint: /ssa-webhook/[webhook_secret]
  if (request.method === "POST" && requestUrl.pathname.includes("/ssa-webhook/")) {
    try {
      // Extract webhook secret from URL path
      const urlPathParts = requestUrl.pathname.split('/');
      const webhookSecret = urlPathParts[urlPathParts.length - 1];

      if (!webhookSecret) {
        const errorResponse = createJsonResponse({ error: "Missing webhook secret in URL" }, 401);
        return addCorsHeaders(errorResponse);
      }

      // Find business by webhook secret
      const businessData = await findBusinessByWebhookSecret(webhookSecret);
      if (!businessData) {
        const errorResponse = createJsonResponse({ error: "Invalid webhook secret" }, 401);
        return addCorsHeaders(errorResponse);
      }

      console.log(`Processing secure webhook for business: ${businessData.name} (${businessData.id})`);
      const webhookPayload = await request.json();
      const response = await handleWebhook(webhookPayload, businessData.id);
      return addCorsHeaders(response);

    } catch (error: any) {
      console.error("Secure webhook error:", error);
      const errorResponse = createJsonResponse({ error: "Invalid JSON payload" }, 400);
      return addCorsHeaders(errorResponse);
    }
  }

  // Legacy webhook endpoint for backward compatibility
  if (request.method === "POST" && requestUrl.pathname.endsWith("/webhook-from-ssa")) {
    try {
      const webhookPayload = await request.json();
      // Use site_url from SSA payload to identify business
      const siteUrl = webhookPayload.signature?.site_url;
      if (!siteUrl) {
        const errorResponse = createJsonResponse({ error: "Missing site URL in payload" }, 400);
        return addCorsHeaders(errorResponse);
      }

      // Find business by website URL
      const { data: businessData, error } = await supabaseClient
        .from("businesses")
        .select("id, name, website")
        .eq("website", siteUrl)
        .single();

      if (error || !businessData) {
        const errorResponse = createJsonResponse({ error: "Business not found for this website" }, 404);
        return addCorsHeaders(errorResponse);
      }

      console.log(`Processing legacy webhook for business: ${businessData.name} (${businessData.id})`);
      const response = await handleWebhook(webhookPayload, businessData.id);
      return addCorsHeaders(response);

    } catch (error: any) {
      console.error("Legacy webhook error:", error);
      const errorResponse = createJsonResponse({ error: "Invalid JSON payload" }, 400);
      return addCorsHeaders(errorResponse);
    }
  }

  // ========================================
  // TESTING ENDPOINTS
  // ========================================

  // Test notification endpoint for manual testing
  if (request.method === "POST" && requestUrl.pathname.endsWith("/test-notification")) {
    try {
      const { userId, businessId } = await request.json();

      if (!userId || !businessId) {
        return createJsonResponse({ error: "Missing userId or businessId" }, 400);
      }

      // Get user's push subscriptions
      const { data: userSubscriptions, error: subscriptionsError } = await supabaseClient
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", userId);

      if (subscriptionsError || !userSubscriptions?.length) {
        return createJsonResponse({ error: "No push subscriptions found for user" }, 404);
      }

      const testNotificationPayload = {
        title: "🧪 Test Notification",
        body: "This is a test notification from SSA Appointments",
        type: NOTIFICATION_TYPES.TEST_NOTIFICATION,
        url: "/appointments",
        appointmentId: "test"
      };

      // Send test notification
      const notificationResults = await Promise.allSettled(
        userSubscriptions.map((subscription) => notificationService.sendPushNotification(subscription, testNotificationPayload))
      );

      const successfulNotifications = notificationResults.filter((result) => result.status === 'fulfilled' && result.value.success).length;

      return createJsonResponse({
        success: true,
        message: `Test notification sent to ${successfulNotifications}/${userSubscriptions.length} subscriptions`,
        results: notificationResults.map((result, index) => ({
          subscriptionId: userSubscriptions[index].id,
          success: result.status === 'fulfilled' && result.value.success,
          error: result.status === 'rejected' ? result.reason : result.value?.error || null
        }))
      });

    } catch (error: any) {
      console.error("Test notification error:", error);
      return createJsonResponse({ error: error.message }, 500);
    }
  }

  // Test SMTP endpoint for email testing
  if (request.method === "POST" && requestUrl.pathname.endsWith("/test-smtp")) {
    try {
      const { toEmail } = await request.json();

      if (!toEmail) {
        return createJsonResponse({ error: "Missing toEmail parameter" }, 400);
      }

      console.log(`Testing SMTP with email: ${toEmail}`);

      const testEmailPayload = {
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

      const emailSent = await emailService.sendAppointmentEmail(
        toEmail,
        testEmailPayload.subject,
        testEmailPayload.html,
        testEmailPayload.text
      );

      if (emailSent) {
        return createJsonResponse({
          success: true,
          message: `Test email sent successfully to ${toEmail}`,
          smtp_configured: emailService.isConfigured()
        });
      } else {
        return createJsonResponse({
          success: false,
          message: `Failed to send test email to ${toEmail}`,
          smtp_configured: emailService.isConfigured()
        }, 500);
      }

    } catch (error: any) {
      console.error("SMTP test error:", error);
      return createJsonResponse({
        success: false,
        error: error.message,
        smtp_configured: emailService.isConfigured()
      }, 500);
    }
  }

  // Push registration endpoint for client to (re)register OneSignal ids
  if (request.method === "POST" && requestUrl.pathname.endsWith("/push-register")) {
    const response = await handlePushRegister(request);
    return addCorsHeaders(response);
  }

  // ========================================
  // 404 HANDLER
  // ========================================
  const notFoundResponse = createJsonResponse({
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
  return addCorsHeaders(notFoundResponse);
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

  // Push registration endpoint for client to (re)register OneSignal ids
  if (req.method === "POST" && url.pathname.endsWith("/push-register")) {
    const result = await handlePushRegister(req);
    return withCors(result);
  }

  // Main webhook endpoint for direct WordPress SSA calls
  if (request.method === "POST" && requestUrl.pathname.endsWith("/ssa-appointments")) {
    try {
      const webhookPayload = await request.json();

      // Log all request headers for debugging
      console.log("Received webhook headers:");
      for (const [headerName, headerValue] of request.headers.entries()) {
        console.log(`  ${headerName}: ${headerValue}`);
      }

      // Check for 'x-business-id' header for business identification
      const businessIdFromHeader = request.headers.get("x-business-id");

      console.log(`x-business-id header present: ${businessIdFromHeader ? 'Yes (' + businessIdFromHeader + ')' : 'No'}`);

      let businessData;

      if (businessIdFromHeader) {
        // Verify business exists with this ID
        const { data, error } = await supabaseClient
          .from("businesses")
          .select("id, name, webhook_secret")
          .eq("id", businessIdFromHeader)
          .single();

        if (error || !data) {
          console.error("Business not found for x-business-id header:", businessIdFromHeader);
          const errorResponse = createJsonResponse({
            error: "Invalid business ID in header"
          }, 401);
          return addCorsHeaders(errorResponse);
        }

        businessData = data;
        console.log(`Processing main webhook for business from header: ${businessData.name} (${businessData.id})`);
      } else {
        // Extract webhook token from payload if header absent
        const webhookToken = webhookPayload.signature?.token;

        console.log(`Payload signature.token present: ${webhookToken ? 'Yes (' + webhookToken + ')' : 'No'}`);

        if (!webhookToken) {
          const errorResponse = createJsonResponse({
            error: "Missing webhook token in payload and x-business-id header"
          }, 401);
          return addCorsHeaders(errorResponse);
        }

        // Find business by webhook token (matches your WEBHOOK_TOKEN env var)
        const { data, error } = await supabaseClient
          .from("businesses")
          .select("id, name, webhook_secret")
          .eq("webhook_secret", webhookToken)
          .single();

        if (error || !data) {
          console.error("Business not found for webhook token:", webhookToken);
          const errorResponse = createJsonResponse({
            error: "Invalid webhook token"
          }, 401);
          return addCorsHeaders(errorResponse);
        }

        businessData = data;
        console.log(`Processing main webhook for business from token: ${businessData.name} (${businessData.id})`);
      }

      // Process the webhook with the found business
      const response = await handleWebhook(webhookPayload, businessData.id);
      return addCorsHeaders(response);

    } catch (error: any) {
      console.error("Main webhook error:", error);
      const errorResponse = createJsonResponse({
        error: "Invalid JSON payload"
      }, 400);
      return addCorsHeaders(errorResponse);
    }
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
