import { supabase } from "./supabase"
import {
  registerDeviceSubscription,
  updateDeviceLastActive,
  cleanupInactiveSubscriptions,
  detectDeviceScope,
  detectDeviceType,
  generateDeviceName,
} from "./multi-device-subscriptions"

// Declare OneSignal on window to satisfy TypeScript
declare global {
  interface Window {
    OneSignal?: any
  }
}

// Load OneSignal SDK dynamically
let OneSignal: any = null
let isInitialized = false

async function loadOneSignal() {
  if (OneSignal) return OneSignal

  if (!window.OneSignal) {
    // Load OneSignal SDK
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
      script.async = true
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })

    // Wait for OneSignal to be available
    await new Promise(resolve => {
      const checkOneSignal = () => {
        if (window.OneSignal) {
          OneSignal = window.OneSignal
          resolve(void 0)
        } else {
          setTimeout(checkOneSignal, 100)
        }
      }
      checkOneSignal()
    })
  } else {
    OneSignal = window.OneSignal
  }

  return OneSignal
}

// OneSignal App ID - should be set as environment variable
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'your-onesignal-app-id'

export async function initializeOneSignal(userId?: string) {
  try {
    console.log('🔍 DEBUG: Initialize OneSignal')
    console.log('userId:', userId)
    console.log('isInitialized:', isInitialized)
    console.log('ONESIGNAL_APP_ID:', ONESIGNAL_APP_ID)

    // Check if already initialized
    if (isInitialized) {
      // If userId provided and different from current, update it
      if (userId) {
        const oneSignal = await loadOneSignal()
        console.log('🔍 DEBUG: Logging in user to OneSignal')
        await oneSignal.login(userId)
        console.log('🔍 DEBUG: User logged in to OneSignal successfully')
      }
      return true
    }

    // Ensure service worker is registered before initializing OneSignal
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.ready
        console.log('Service worker is ready, initializing OneSignal')
      } catch (error) {
        console.warn('Service worker not ready, proceeding anyway:', error)
      }
    }
    const oneSignal = await loadOneSignal()

    console.log('🔍 DEBUG: Initializing OneSignal with config')
    // Defensive: if init was already called elsewhere, handle gracefully
    try {
      await oneSignal.init({
        appId: ONESIGNAL_APP_ID,
        // OneSignal v16 auto-manages its service worker file, do not specify serviceWorkerPath
        allowLocalhostAsSecureOrigin: true,
        notifyButton: { enable: true },
        safari_web_id: import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID || undefined,
      })
    } catch (initError: any) {
      // OneSignal throws when init is called twice; treat that as non-fatal
      const msg = String(initError || '')
      if (msg.includes('SDK already initialized') || msg.includes('already initialized')) {
        console.info('OneSignal init skipped: SDK already initialized')
      } else {
        throw initError
      }
    }

    // Set external user ID if user is logged in
    if (userId) {
      console.log('🔍 DEBUG: Setting external user ID')
      await oneSignal.login(userId)
    }

    // Listen for subscription changes to save to DB automatically
    oneSignal.on('subscriptionChange', async (isSubscribed: boolean) => {
      console.log('🔍 DEBUG: Subscription change event:', isSubscribed)
      if (isSubscribed) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await saveOneSignalSubscription(user.id)
        }
      }
    })

    isInitialized = true
    console.log('OneSignal initialized successfully')
    return true
  } catch (error) {
    console.error('Failed to initialize OneSignal:', error)
    return false
  }
}

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

export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  try {
    const oneSignal = await loadOneSignal()

    // Request notification permission
    const permissionGranted = await requestNotificationPermission()
    if (!permissionGranted) {
      console.log("Notification permission denied")
      return false
    }

    const platform = getPlatform()
    console.log('🔍 DEBUG: Platform detected:', platform)

    if (platform === 'ios' || platform === 'android') {
      // On mobile, the bell (notify button) handles subscription
      // Permission granted, bell should appear, subscription happens on click
      console.log("Mobile: Permission granted, bell should appear for subscription")
      // Return true since permission is granted; subscription will happen via bell click
      return true
    } else {
      // Desktop: Use Slidedown for subscription
      console.log("Desktop: Using Slidedown for subscription")
      await oneSignal.Slidedown.promptPush()

      // Wait for subscription to be ready
      const isSubscribed = await oneSignal.User.PushSubscription.optedIn
      if (isSubscribed) {
        // Save subscription to database
        await saveOneSignalSubscription(userId)
        return true
      }

      return false
    }
  } catch (error) {
    console.error("Failed to subscribe to push notifications:", error)
    return false
  }
}

export async function saveOneSignalSubscription(userId: string): Promise<boolean> {
  try {
    console.log('🔍 DEBUG: Save OneSignal Subscription')
    console.log('userId:', userId)

    const oneSignal = await loadOneSignal()

    // Get OneSignal Player ID with retry logic. Prefer getUserId(), fall back to PushSubscription.id
    let playerId: string | null | undefined = undefined
    const maxAttempts = 6
    let attempts = 0

    while ((!playerId || playerId === '') && attempts < maxAttempts) {
      try {
        // Preferred modern API
        if (typeof oneSignal.getUserId === 'function') {
          // @ts-ignore
          const id = await oneSignal.getUserId()
          playerId = id
        }
      } catch (e) {
        console.warn('Failed to get OneSignal user ID:', e)
      }

      // Fallback to older property if needed
      if (!playerId && oneSignal.User && oneSignal.User.PushSubscription) {
        try {
          // @ts-ignore
          playerId = await oneSignal.User.PushSubscription.id
        } catch (e) {
          console.warn('Failed to get OneSignal PushSubscription ID:', e)
        }
      }

      console.log('🔍 DEBUG: Player ID attempt', attempts + 1, '->', playerId)

      if (playerId) break
      attempts++
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (!playerId) {
      console.error('❌ OneSignal Player ID not available after retries')
      return false
    }

    console.log('✅ Got OneSignal Player ID:', playerId)

    // Use the new multi-device registration system
    const platform = getPlatform()
    const success = await registerDeviceSubscription(userId, playerId, platform as any)

    if (!success) {
      console.error("❌ Failed to register device subscription")
      return false
    }

    // Update last active timestamp
    await updateDeviceLastActive(playerId)

    // Cleanup any stale subscriptions
    await cleanupInactiveSubscriptions(userId)

    console.log("✅ OneSignal subscription saved with multi-device support")
    return true
  } catch (error) {
    console.error("❌ Error saving OneSignal subscription:", error)
    return false
  }
}

export async function unsubscribeFromPushNotifications(userId: string): Promise<boolean> {
  try {
    const oneSignal = await loadOneSignal()

    // Opt out from push notifications
    await oneSignal.User.PushSubscription.optOut()

    // Remove from database
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('onesignal_external_user_id', userId)

    if (error) {
      console.error("Failed to delete OneSignal subscription:", error)
      return false
    }

    console.log("✅ OneSignal subscription removed from database")
    return true
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error)
    return false
  }
}

export async function checkOneSignalSubscriptionStatus(): Promise<boolean> {
  try {
    const oneSignal = await loadOneSignal()
    const isSubscribed = await oneSignal.User.PushSubscription.optedIn
    return isSubscribed || false
  } catch (error) {
    console.error("Error checking OneSignal subscription status:", error)
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

// New function to trigger appointment notifications
export async function triggerAppointmentNotification(
  businessId: string,
  appointment: any,
  action: 'booked' | 'edited' | 'cancelled' | 'rescheduled',
  changedFields?: string[]
) {
  try {
    // Get all active business members
    const { data: businessMembers, error: membersError } = await supabase
      .from('business_members')
      .select('user_id')
      .eq('business_id', businessId)
      .eq('status', 'active')

    if (membersError || !businessMembers?.length) {
      console.log('No active business members found for notifications')
      return
    }

    const userIds = businessMembers.map(member => member.user_id)

    // Get user notification preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('profiles')
      .select('id, notification_preferences')
      .in('id', userIds)

    if (prefsError) {
      console.error('Error fetching notification preferences:', prefsError)
    }

    // Filter users who have push notifications enabled and respect quiet hours
    const eligibleUsers = (preferences || []).filter(profile => {
      const prefs = profile.notification_preferences || {}
      if (!prefs.push_enabled) return false

      // Check quiet hours
      if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
        const now = new Date()
        const currentTime = now.getHours() * 100 + now.getMinutes()
        const startTime = timeStringToMinutes(prefs.quiet_hours_start)
        const endTime = timeStringToMinutes(prefs.quiet_hours_end)

        if (startTime < endTime) {
          // Same day quiet hours
          if (currentTime >= startTime && currentTime <= endTime) return false
        } else {
          // Overnight quiet hours
          if (currentTime >= startTime || currentTime <= endTime) return false
        }
      }

      return true
    }).map(profile => profile.id)

    if (!eligibleUsers.length) {
      console.log('No users eligible for notifications (disabled or quiet hours)')
      return
    }

    // Get push subscriptions for eligible users
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', eligibleUsers)

    if (subsError || !subscriptions?.length) {
      console.log('No push subscriptions found for eligible users')
      return
    }

    // Prepare notification data
    const notificationData = getNotificationData(action, appointment, changedFields)

    // Send notifications via Edge Function
    await sendNotificationsViaEdgeFunction(subscriptions, notificationData, businessId, eligibleUsers)

  } catch (error) {
    console.error('Error triggering appointment notification:', error)
  }
}

function getNotificationData(action: string, appointment: any, changedFields?: string[]) {
  const baseData = {
    appointmentId: appointment.external_id,
    url: `/appointments/${appointment.external_id}`,
  }

  switch (action) {
    case 'booked':
      return {
        ...baseData,
        title: '📅 New Appointment Booked',
        body: `${appointment.customer_name} - ${appointment.service_name}`,
        type: 'appointment_booked',
      }
    case 'edited':
      return {
        ...baseData,
        title: '✏️ Appointment Updated',
        body: `${appointment.customer_name} - ${changedFields?.join(', ') || 'Details modified'}`,
        type: 'appointment_edited',
      }
    case 'cancelled':
      return {
        ...baseData,
        title: '❌ Appointment Cancelled',
        body: `${appointment.customer_name} - ${appointment.service_name}`,
        type: 'appointment_cancelled',
      }
    case 'rescheduled':
      return {
        ...baseData,
        title: '🔄 Appointment Rescheduled',
        body: `${appointment.customer_name} - ${appointment.service_name}`,
        type: 'appointment_edited',
      }
    default:
      return {
        ...baseData,
        title: '📅 Appointment Update',
        body: `${appointment.customer_name} - ${appointment.service_name}`,
        type: 'appointment_update',
      }
  }
}

async function sendNotificationsViaEdgeFunction(
  subscriptions: any[],
  notificationData: any,
  businessId: string,
  userIds: string[]
) {
  try {
    // Get the current session token for authorization
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    // Call the consolidated ssa-appointments function to send notifications
    const response = await fetch('/send-notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        subscriptions,
        notificationData,
        businessId,
        userIds,
      }),
    })

    if (!response.ok) {
      throw new Error(`Edge Function returned ${response.status}`)
    }

    const result = await response.json()
    console.log('Notifications sent successfully:', result)

    // Log notifications locally
    await logNotifications(userIds, businessId, notificationData, result.results)

  } catch (error) {
    console.error('Failed to send notifications via consolidated Edge Function:', error)
    // Fallback: try to send directly (limited functionality)
    await sendNotificationsDirectly(subscriptions, notificationData, businessId, userIds)
  }
}

async function sendNotificationsDirectly(
  subscriptions: any[],
  notificationData: any,
  businessId: string,
  userIds: string[]
) {
  console.log('Attempting direct notification sending via consolidated Edge Function')

  const results = []

  for (const subscription of subscriptions) {
    try {
      // Use the consolidated ssa-appointments function for sending notifications
      const response = await supabase.functions.invoke('send-push-notification', {
        body: {
          subscription,
          notificationData,
        },
      })

      results.push({
        success: !response.error,
        subscriptionId: subscription.id,
        error: response.error ? response.error.message : null,
      })
    } catch (error: any) {
      results.push({
        success: false,
        subscriptionId: subscription.id,
        error: error.message,
      })
    }
  }

  await logNotifications(userIds, businessId, notificationData, results)
}

async function logNotifications(
  userIds: string[],
  businessId: string,
  notificationData: any,
  results: any[]
) {
  try {
    const logs = results.map((result, index) => {
      const userIndex = index % userIds.length
      return {
        user_id: userIds[userIndex],
        business_id: businessId,
        notification_type: notificationData.type,
        title: notificationData.title,
        body: notificationData.body,
        data: {
          url: notificationData.url,
          appointmentId: notificationData.appointmentId,
        },
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
        sent_at: new Date().toISOString(),
      }
    })

    const { error } = await supabase
      .from('notification_logs')
      .insert(logs)

    if (error) {
      console.error('Failed to log notifications:', error)
    }
  } catch (error) {
    console.error('Error logging notifications:', error)
  }
}

function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray as Uint8Array
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
