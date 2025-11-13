import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { generateVAPIDKeys } from "https://esm.sh/web-push@3.6.6";

// ✅ DYNAMIC VAPID KEY GENERATION
function getVAPIDKeys() {
  // Try environment variables first
  const envPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const envPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  if (envPublicKey && envPrivateKey) {
    console.log("✅ Using VAPID keys from environment");
    return {
      publicKey: envPublicKey,
      privateKey: envPrivateKey
    };
  }

  // ✅ Generate new keys dynamically if not in environment
  console.log("🔄 Generating new VAPID keys dynamically...");
  const vapidKeys = generateVAPIDKeys();

  // Log the keys so you can save them later
  console.log("=======================================");
  console.log("🔑 GENERATED VAPID KEYS - SAVE THESE:");
  console.log("Public Key:", vapidKeys.publicKey);
  console.log("Private Key:", vapidKeys.privateKey);
  console.log("=======================================");

  return vapidKeys;
}

const VAPID_KEYS = getVAPIDKeys();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  try {
    // ✅ Return the actual VAPID public key (not placeholder)
    return new Response(JSON.stringify({
      publicKey: VAPID_KEYS.publicKey,
      generated: !Deno.env.get("VAPID_PUBLIC_KEY") // True if auto-generated
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  } catch (error) {
    console.error("❌ Error in get-vapid-key function:", error);
    return new Response(JSON.stringify({
      error: "Internal server error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }
});
