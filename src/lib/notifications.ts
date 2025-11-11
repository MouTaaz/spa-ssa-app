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
    const response = await fetch('/vapid-public-key', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch VAPID public key: ${response.status}`)
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

    // Call the Edge Function to send notifications
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
    console.error('Failed to send notifications via Edge Function:', error)
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
  console.log('Attempting direct notification sending (fallback)')

  const results = []

  for (const subscription of subscriptions) {
    try {
      const response = await fetch('/send-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          notificationData,
        }),
      })

      results.push({
        success: response.ok,
        subscriptionId: subscription.id,
        error: response.ok ? null : `HTTP ${response.status}`,
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
