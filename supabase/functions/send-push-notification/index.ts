import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createRequire } from "https://deno.land/std@0.177.0/node/module.ts";

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Get VAPID keys from environment
function getVAPIDKeys() {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables must be set");
  }

  return { publicKey, privateKey };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subscription, notificationData } = await req.json();

    if (!subscription || !notificationData) {
      return new Response(JSON.stringify({ error: 'Missing subscription or notificationData' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get VAPID keys
    const vapidKeys = getVAPIDKeys();

    // Import web-push dynamically
    const webPush = await import("https://esm.sh/web-push@3.6.6");

    // Set VAPID details
    webPush.setVapidDetails(
      'mailto:your-email@example.com', // Replace with your email
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );

    // Prepare the push payload
    const payload = JSON.stringify({
      title: notificationData.title || "Notification",
      body: notificationData.body || "",
      icon: notificationData.icon || "/icon-192.png",
      badge: notificationData.badge || "/icon-96.png",
      data: notificationData.data || {},
      actions: notificationData.actions || [],
      timestamp: notificationData.timestamp || Date.now(),
      tag: notificationData.tag || "ssa-notification",
      requireInteraction: notificationData.requireInteraction || false,
      silent: notificationData.silent || false,
    });

    console.log('Sending push notification:', {
      endpoint: subscription.endpoint,
      title: notificationData.title,
      body: notificationData.body
    });

    // Send the notification
    const result = await webPush.sendNotification(subscription, payload);

    console.log('Push notification sent successfully:', result);

    return new Response(JSON.stringify({
      success: true,
      message: 'Push notification sent successfully'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Error sending push notification:", error);

    return new Response(JSON.stringify({
      error: "Failed to send push notification",
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
