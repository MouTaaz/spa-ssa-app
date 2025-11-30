

serve(async (request) => {
  const requestUrl = new URL(request.url);

  // CORS headers for all responses
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    }});
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
      smtp_configured: new EmailService().isConfigured()
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
      const { data: businessData, error } = await (await import("./utils.ts")).supabaseClient
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
        const { data, error } = await (await import("./utils.ts")).supabaseClient
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
        const { data, error } = await (await import("./utils.ts")).supabaseClient
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
      const { data: userSubscriptions, error: subscriptionsError } = await (await import("./utils.ts")).supabaseClient
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
      const emailService = new EmailService();
      const notificationService = new NotificationService(emailService);
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

      const emailService = new EmailService();
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
        smtp_configured: new EmailService().isConfigured()
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