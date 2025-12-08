import { supabaseClient } from "./utils.ts";
import { NOTIFICATION_TYPES, HISTORY_ACTIONS } from "./constants.ts";
import { EmailService } from "./email-service.ts";
import type { NotificationPayload, AppointmentData } from "./types.ts";

// ========================================
// NOTIFICATION SERVICE
// ========================================

/**
 * Send push notification via OneSignal REST API
 * @param oneSignalAppId - OneSignal application ID
 * @param oneSignalApiKey - OneSignal REST API key
 * @param targetIds - Array of player IDs or external user IDs
 * @param notificationPayload - Notification content and metadata
 * @param config - Optional configuration for ID type
 * @returns Promise with API response details
 */
export async function sendOneSignalPushNotification(
  oneSignalAppId: string,
  oneSignalApiKey: string,
  targetIds: string[],
  notificationPayload: NotificationPayload,
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

    console.log("🔍 DEBUG: OneSignal API Call");
    console.log("URL: https://onesignal.com/api/v1/notifications");
    console.log("Method: POST");
    console.log("Authorization: Basic", oneSignalApiKey ? "***SET***" : "***NOT SET***");
    console.log("Payload:", JSON.stringify(finalPayload, null, 2));
console.log("Target IDs:", targetIds);

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

    console.log("🔍 DEBUG: OneSignal API Response");
    console.log("Status:", apiResponse.status);
    console.log("OK:", apiResponse.ok);
    console.log("Response Body:", JSON.stringify(responseBody, null, 2));

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
 * Service for sending dual notifications (push + email) to business members
 */
export class NotificationService {
  private emailService: EmailService;

  constructor(emailService: EmailService) {
    this.emailService = emailService;
  }

  /**
   * Send appointment notifications to all active business members
   * @param businessId - ID of the business
   * @param notificationPayload - Notification content and metadata
   * @param appointmentData - Appointment details for email templates
   */
  async sendAppointmentNotification(businessId: string, notificationPayload: NotificationPayload, appointmentData: AppointmentData) {
    try {
      console.log("🔍 DEBUG: Send Appointment Notification");
      console.log("businessId:", businessId);
      console.log("notificationPayload:", JSON.stringify(notificationPayload, null, 2));
      console.log("appointmentData:", JSON.stringify(appointmentData, null, 2));

      // Get all active users for this business
      const { data: businessMembersData, error: membersError } = await supabaseClient
        .from("business_members")
        .select("user_id")
        .eq("business_id", businessId)
        .eq("status", "active");

      console.log("🔍 DEBUG: Business Members Query");
      console.log("membersError:", membersError);
      console.log("businessMembersData:", JSON.stringify(businessMembersData, null, 2));

      if (membersError) {
        console.error("Error fetching business members:", membersError);
        return;
      }

      if (!businessMembersData?.length) {
        console.log(`No active business members found for business: ${businessId}`);
        return;
      }

      const memberUserIds = businessMembersData.map((member) => member.user_id);
      console.log("🔍 DEBUG: Member User IDs");
      console.log("memberUserIds:", memberUserIds);

      // Get user profiles with email addresses
      const { data: userProfilesData, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, email")
        .in("id", memberUserIds);

      console.log("🔍 DEBUG: User Profiles Query");
      console.log("profilesError:", profilesError);
      console.log("userProfilesData:", JSON.stringify(userProfilesData, null, 2));

      if (profilesError) {
        console.error("Error fetching user profiles:", profilesError);
      }

      // Create user map for easy lookup
      const userProfileMap = new Map();
      userProfilesData?.forEach(profile => {
        userProfileMap.set(profile.id, { email: profile.email });
      });

      console.log("🔍 DEBUG: User Profile Map");
      console.log("userProfileMap:", Object.fromEntries(userProfileMap));

      console.log(memberUserIds);
      // Get active push subscriptions for these users
      const { data: activeSubscriptions, error: subscriptionsError } = await supabaseClient
        .from("push_subscriptions")
        .select("*")
        .in("user_id", memberUserIds)
        .eq("push_active", true);

      console.log("🔍 DEBUG: Push Subscriptions Query");
      console.log("subscriptionsError:", subscriptionsError);
      console.log("activeSubscriptions:", JSON.stringify(activeSubscriptions, null, 2));

      if (subscriptionsError) {
        console.error("Error fetching push subscriptions:", subscriptionsError);
      }

      console.log(`📱 Found ${activeSubscriptions?.length || 0} push subscriptions for ${memberUserIds.length} users`);
      console.log(`📧 Email service configured: ${this.emailService.isConfigured()}`);

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
    notificationPayload: NotificationPayload,
    appointmentData: AppointmentData
  ) {
    const notificationResults = [];

    for (const userId of memberUserIds) {
      const userProfile = userProfileMap.get(userId);
      const userPushSubscriptions = activeSubscriptions.filter(sub => sub.user_id === userId);

      let pushNotificationSuccess = false;
      let emailNotificationSuccess = false;
      let pushProviderResponse: any = null;
      let subscriptionIdsForLogging: string[] = [];
      let pushNotificationError: string | null = null;

      // 1. Try push notification first (send to external user ID once, not per subscription)
      if (userPushSubscriptions.length > 0) {
        console.log(`📱 Sending push notification to user ${userId} (${userPushSubscriptions.length} subscriptions)`);

        // Get unique external user ID (should be the same for all subscriptions of a user)
        const externalUserId = userPushSubscriptions[0]?.onesignal_external_user_id;
        if (externalUserId) {
          console.log(`📱 Sending to external user ID: ${externalUserId}`);
          const pushResult = await this.sendPushNotificationToExternalUserId(externalUserId, notificationPayload, userPushSubscriptions);

          pushNotificationSuccess = pushResult.success;
          pushProviderResponse = pushResult.providerResponse;
          subscriptionIdsForLogging = userPushSubscriptions.map(sub => sub.id);
          pushNotificationError = pushResult.error;
        } else {
          console.warn(`⚠️ No external user ID found for user ${userId}`);
          pushNotificationError = 'No external user ID available';
        }
      }

      // 2. Send email notification (reliable fallback)
      let emailNotificationError: string | null = null;
      if (userProfile?.email && this.emailService.isConfigured()) {
        console.log(`📧 Sending email notification to ${userProfile.email}`);
        const appointmentAction = this.getActionFromNotificationType(notificationPayload.type);
        const { html: emailHtml, text: emailText } = this.emailService.generateAppointmentEmailHtml(appointmentData, appointmentAction);
        const emailSubjectLine = this.getEmailSubject(notificationPayload.type, appointmentData);

        emailNotificationSuccess = await this.emailService.sendAppointmentEmail(
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
        subscriptionIds: subscriptionIdsForLogging,
        error: pushNotificationError || emailNotificationError || (pushNotificationSuccess || emailNotificationSuccess ? null : 'No notification sent')
      });
    }

    return notificationResults;
  }

  getActionFromNotificationType(type: string): string {
    const typeMap: Record<string, string> = {
      [NOTIFICATION_TYPES.APPOINTMENT_BOOKED]: 'booked',
      [NOTIFICATION_TYPES.APPOINTMENT_EDITED]: 'edited',
      [NOTIFICATION_TYPES.APPOINTMENT_CANCELLED]: 'cancelled',
      [NOTIFICATION_TYPES.TEST_NOTIFICATION]: 'booked'
    };
    return typeMap[type] || 'booked';
  }

  getEmailSubject(type: string, appointment: AppointmentData): string {
    const baseSubject = `SSA Appointment: ${appointment.customer_name}`;
    const typeSubjects: Record<string, string> = {
      [NOTIFICATION_TYPES.APPOINTMENT_BOOKED]: `New Appointment: ${appointment.customer_name}`,
      [NOTIFICATION_TYPES.APPOINTMENT_EDITED]: `Appointment Updated: ${appointment.customer_name}`,
      [NOTIFICATION_TYPES.APPOINTMENT_CANCELLED]: `Appointment Cancelled: ${appointment.customer_name}`,
      [NOTIFICATION_TYPES.TEST_NOTIFICATION]: `Test Notification: ${appointment.customer_name}`
    };
    return typeSubjects[type] || baseSubject;
  }

  /**
   * Send push notification to a specific external user ID (sends to ALL devices for that user)
   */
  async sendPushNotificationToExternalUserId(externalUserId: string, notificationData: NotificationPayload, subscriptions: any[]) {
    try {
      console.log(`📱 Sending push notification to external user ID: ${externalUserId}`);

      const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
      const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY") || Deno.env.get("ONESIGNAL_REST_API_KEY");

      console.log("🔍 DEBUG: OneSignal Environment Variables");
      console.log("ONESIGNAL_APP_ID:", oneSignalAppId || "***NOT SET***");
      console.log("ONESIGNAL_API_KEY:", oneSignalApiKey || "***NOT SET***");

      if (!oneSignalAppId || !oneSignalApiKey) {
        console.error("OneSignal APP ID or API Key not configured");
        return { success: false, error: "OneSignal APP ID or API Key not configured", providerResponse: null };
      }

      const sendResult = await sendOneSignalPushNotification(oneSignalAppId, oneSignalApiKey, [externalUserId], notificationData, { usePlayerIds: false });

      if (!sendResult.ok) {
        console.error(`OneSignal send failed for external user ID ${externalUserId}:`, sendResult.body);

        // Handle invalid external user IDs (unsubscribed users)
        if (sendResult.body?.warnings?.invalid_external_user_ids) {
          console.warn(`⚠️ OneSignal warning for external user ID ${externalUserId}: ${sendResult.body.warnings.invalid_external_user_ids}`);

          // Extract the invalid external user IDs from the warning message
          const warningMessage = sendResult.body.warnings.invalid_external_user_ids;
          const invalidIdsMatch = warningMessage.match(/\[([^\]]+)\]/);
          if (invalidIdsMatch) {
            const invalidIds = invalidIdsMatch[1].split(',').map((id: string) => id.trim().replace(/"/g, ''));
            if (invalidIds.includes(externalUserId)) {
              console.log(`Marking subscriptions for external user ID ${externalUserId} as inactive due to unsubscribed user`);
              try {
                const subscriptionIds = subscriptions.map(sub => sub.id);
                const { error: clearError } = await supabaseClient
                  .from('push_subscriptions')
                  .update({ push_active: false })
                  .in('id', subscriptionIds);
                if (clearError) {
                  console.error(`Failed to deactivate subscriptions for external user ID ${externalUserId}:`, clearError);
                } else {
                  console.log(`Deactivated ${subscriptionIds.length} subscriptions due to unsubscribed external user ID`);
                }
              } catch (e) {
                console.error('Error while handling invalid_external_user_ids cleanup:', e);
              }
            }
          }
        }

        return { success: false, error: 'Failed to send OneSignal push notification', providerResponse: sendResult.body };
      }

      // Log provider response for diagnostics
      try {
        console.log(`OneSignal send result for external user ID ${externalUserId}:`, JSON.stringify(sendResult.body));
      } catch (e) {
        console.log(`OneSignal send result for external user ID ${externalUserId}: (non-JSON response)`);
      }

      return { success: true, providerResponse: sendResult.body };
    } catch (error: any) {
      console.error(`Push notification failed for external user ID ${externalUserId}:`, error?.message ?? error);
      return { success: false, error: error?.message ?? String(error), providerResponse: null };
    }
  }

  async sendPushNotification(subscription: any, notificationData: NotificationPayload) {
    try {
      // Send push notification using OneSignal REST API

      const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
      // Accept either ONESIGNAL_API_KEY or ONESIGNAL_REST_API_KEY (existing secret name)
      const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY") || Deno.env.get("ONESIGNAL_REST_API_KEY");

      console.log("🔍 DEBUG: OneSignal Environment Variables");
      console.log("ONESIGNAL_APP_ID:", oneSignalAppId || "***NOT SET***");
      console.log("ONESIGNAL_API_KEY:", oneSignalApiKey || "***NOT SET***");
      console.log("ONESIGNAL_REST_API_KEY:", Deno.env.get("ONESIGNAL_REST_API_KEY") || "***NOT SET***");

      if (!oneSignalAppId || !oneSignalApiKey) {
        console.error("OneSignal APP ID or API Key not configured");
        return { success: false, error: "OneSignal APP ID or API Key not configured", providerResponse: null };
      }

      // Accept multiple possible field names that might hold the OneSignal player/external id
      // let userExternalId: string | null = null;
      // let isPlayerId = false;

      // if (subscription.onesignal_player_id) {
      //   userExternalId = subscription.onesignal_player_id;
      //   isPlayerId = true;
      // } else if (subscription.one_signal_player_id) {
      //   userExternalId = subscription.one_signal_player_id;
      //   isPlayerId = true;
      // } else if (subscription.user_external_id) {
      //   userExternalId = subscription.user_external_id;
      // } else if (subscription.onesignal_external_user_id) {
      //   userExternalId = subscription.onesignal_external_user_id;
      // } else if (subscription.onesignal_external_id) {
      //   userExternalId = subscription.onesignal_external_id;
      // }

      // if (!userExternalId) {
      //   console.error("Subscription missing OneSignal identifier (user_external_id / onesignal_player_id / onesignal_external_user_id)");
      //   return { success: false, error: "Missing OneSignal id", providerResponse: null, subscriptionId: subscription.id };
      // }

      const sendResult = await sendOneSignalPushNotification(oneSignalAppId, oneSignalApiKey, [subscription.onesignal_external_user_id], notificationData, { usePlayerIds: false });

      if (!sendResult.ok) {
        console.error(`OneSignal send failed for subscription ${subscription.id}:`, sendResult.body);

        // If OneSignal reports invalid player ids, mark subscription as inactive to avoid repeated failures
        try {
          const invalidIds = sendResult.body?.errors?.invalid_player_ids;
          if (Array.isArray(invalidIds) && invalidIds.length) {
            console.log(`OneSignal reported invalid_player_ids for subscription ${subscription.id}:`, invalidIds);
            const { error: clearError } = await supabaseClient
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

  async logDualNotifications(userIds: string[], businessId: string, notificationData: NotificationPayload, results: any[]) {
    try {
      console.log("🔍 DEBUG: Log Dual Notifications");
      console.log("userIds:", userIds);
      console.log("businessId:", businessId);
      console.log("notificationData:", JSON.stringify(notificationData, null, 2));
      console.log("results:", JSON.stringify(results, null, 2));

      const logs = results.flatMap((result) => {
        const baseLogEntry = {
          user_id: result.userId,
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
        };

        // If there are subscription IDs (push notifications), create one log entry per subscription
        if (result.subscriptionIds && result.subscriptionIds.length > 0) {
          return result.subscriptionIds.map((subscriptionId: string) => ({
            ...baseLogEntry,
            subscription_id: subscriptionId
          }));
        }

        // If no subscription IDs (email-only or failed push), create one log entry with null subscription_id
        return [{
          ...baseLogEntry,
          subscription_id: null
        }];
      });

      console.log("🔍 DEBUG: Notification Logs to Insert");
      console.log(JSON.stringify(logs, null, 2));

      // Diagnostic: log the payload we're about to insert
      try {
        console.log('Inserting notification_logs entries:', JSON.stringify(logs));
      } catch (e) {
        console.log('Inserting notification_logs entries: (unable to stringify logs)');
      }

      const insertResult = await supabaseClient.from("notification_logs").insert(logs).select();
      console.log("🔍 DEBUG: Insert Result");
      console.log("insertResult:", JSON.stringify(insertResult, null, 2));

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