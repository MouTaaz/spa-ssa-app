import { supabase } from "./supabase"

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications")
    return false
  }

  if (Notification.permission === "granted") {
    return true
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  }

  return false
}

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const response = await fetch('/vapid-public-key')
    if (!response.ok) {
      throw new Error('Failed to fetch VAPID public key')
    }
    const data = await response.json()
    return data.publicKey
  } catch (error) {
    console.error("Failed to fetch VAPID public key:", error)
    return null
  }
}

export async function subscribeToPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Push notifications not supported")
    return null
  }

  try {
    // Get VAPID key from Edge Function
    const vapidKey = await getVapidPublicKey()
    if (!vapidKey) {
      console.error("No VAPID public key available")
      return null
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    })
    return subscription
  } catch (error) {
    console.error("Failed to subscribe to push notifications:", error)
    return null
  }
}

export async function savePushSubscription(subscription: PushSubscription, userId: string): Promise<boolean> {
  try {
    const p256dh = arrayBufferToBase64(subscription.getKey('p256dh')!)
    const auth = arrayBufferToBase64(subscription.getKey('auth')!)

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        platform: getPlatform(),
        user_agent: navigator.userAgent,
      }, {
        onConflict: 'endpoint'
      })

    if (error) {
      console.error("Failed to save push subscription:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error saving push subscription:", error)
    return false
  }
}

export async function deletePushSubscription(subscription: PushSubscription, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)

    if (error) {
      console.error("Failed to delete push subscription:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error deleting push subscription:", error)
    return false
  }
}

export async function sendLocalNotification(title: string, options?: NotificationOptions) {
  if (!("serviceWorker" in navigator)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, {
      icon: "/icon-192.png",
      badge: "/icon-96.png",
      ...options,
    })
  } catch (error) {
    console.error("Failed to send notification:", error)
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function getPlatform(): string {
  const userAgent = navigator.userAgent.toLowerCase()

  if (/android/.test(userAgent)) {
    return 'android'
  } else if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios'
  } else {
    return 'web'
  }
}
