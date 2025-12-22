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
  if (OneSignal && typeof OneSignal.init === 'function') return OneSignal

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

    // Wait for OneSignal to be available (with timeout)
    let attempts = 0
    const maxAttempts = 50 // 5 seconds max
    await new Promise((resolve, reject) => {
      const checkOneSignal = () => {
        if (window.OneSignal && typeof window.OneSignal.init === 'function') {
          OneSignal = window.OneSignal
          console.log('✅ OneSignal SDK loaded successfully')
          resolve(void 0)
        } else if (attempts < maxAttempts) {
          attempts++
          setTimeout(checkOneSignal, 100)
        } else {
          console.error('❌ OneSignal SDK failed to load after timeout')
          reject(new Error('OneSignal SDK failed to load'))
        }
      }
      checkOneSignal()
    })
  } else {
    OneSignal = window.OneSignal
    console.log('✅ OneSignal already available on window')
  }

  if (!OneSignal || typeof OneSignal.init !== 'function') {
    throw new Error('OneSignal SDK loaded but init method not available')
  }

  return OneSignal
}

// OneSignal App ID - should be set as environment variable
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'your-onesignal-app-id'
const ONESIGNAL_SAFARI_WEB_ID = import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID

export async function initializeOneSignal(userId?: string) {
  try {
    console.log('🔍 DEBUG: Initialize OneSignal')
    console.log('userId:', userId)
    console.log('isInitialized:', isInitialized)
    console.log('ONESIGNAL_APP_ID:', ONESIGNAL_APP_ID)
    console.log('Platform:', getPlatform())
    console.log('User Agent:', navigator.userAgent)

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
        console.log('✅ Service worker is ready, initializing OneSignal')
      } catch (error) {
        console.warn('⚠️ Service worker not ready, proceeding anyway:', error)
      }
    }
    
    const oneSignal = await loadOneSignal()
    const platform = getPlatform()

    console.log('🔍 DEBUG: Initializing OneSignal with config')
    
    // Build configuration object
    const config: any = {
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: { enable: false },
    }

    // Add Safari Web ID for iOS support (OPTIONAL - only if using Apple Safari Web Push)
    // For standard Web Push (FCM), this is not required
    if (ONESIGNAL_SAFARI_WEB_ID && (platform === 'ios' || /safari/i.test(navigator.userAgent))) {
      config.safari_web_id = ONESIGNAL_SAFARI_WEB_ID
      console.log('🔍 DEBUG: Safari Web ID configured for iOS/Safari')
    } else if (platform === 'ios') {
      console.log('🔍 DEBUG: Using standard Web Push for iOS (no Safari Web ID required)')
    }

    // iOS-specific configuration for service worker
    if (platform === 'ios') {
      console.log('🔍 DEBUG: Applying iOS-specific OneSignal configuration')
      // iOS requires explicit service worker path
      config.serviceWorkerParam = { scope: '/' }
      config.serviceWorkerPath = 'OneSignalSDKWorker.js'
    }

    // Defensive: if init was already called elsewhere, handle gracefully
    try {
      await oneSignal.init(config)
      console.log('✅ OneSignal initialized with config:', config)
    } catch (initError: any) {
      // OneSignal throws when init is called twice; treat that as non-fatal
      const msg = String(initError || '')
      if (msg.includes('SDK already initialized') || msg.includes('already initialized')) {
        console.info('ℹ️ OneSignal init skipped: SDK already initialized')
      } else {
        throw initError
      }
    }

    // CRITICAL: Set external user ID IMMEDIATELY after init, BEFORE any subscription
    // This ensures that when the user subscribes, OneSignal links the subscription
    // to the external user ID, allowing notifications to be sent correctly
    if (userId) {
      console.log('🔍 DEBUG: Setting external user ID BEFORE subscription')
      try {
        await oneSignal.login(userId)
        console.log('✅ External user ID set successfully:', userId)
      } catch (loginError) {
        console.error('❌ Failed to set external user ID:', loginError)
        // Continue anyway, but log the error
      }
    }

    // Listen for subscription changes to save to DB automatically (if method exists)
    if (oneSignal && typeof oneSignal.on === 'function') {
      oneSignal.on('subscriptionChange', async (isSubscribed: boolean) => {
        console.log('🔍 DEBUG: Subscription change event fired')
        console.log('   isSubscribed:', isSubscribed)
        console.log('   Platform:', getPlatform())
        console.log('   User Agent:', navigator.userAgent)

        if (isSubscribed) {
          try {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            console.log('🔍 DEBUG: Auth check result:', { user: user?.id, error: authError })

            if (user) {
              console.log('🔍 DEBUG: User authenticated, attempting to save subscription')

              // For mobile, wait longer for player ID to be fully available
              const delay = getPlatform() === 'ios' || getPlatform() === 'android' ? 3000 : 1000
              console.log(`🔍 DEBUG: Waiting ${delay}ms for player ID to be available`)

              setTimeout(async () => {
                console.log('🔍 DEBUG: Executing subscription save after delay')
                const saved = await saveOneSignalSubscription(user.id)
                if (saved) {
                  console.log('✅ Subscription saved via event listener')
                } else {
                  console.warn('⚠️ Failed to save subscription via event listener')
                  // Try one more time after additional delay
                  setTimeout(async () => {
                    console.log('🔍 DEBUG: Retrying subscription save')
                    const retrySaved = await saveOneSignalSubscription(user.id)
                    if (retrySaved) {
                      console.log('✅ Subscription saved on retry')
                    } else {
                      console.error('❌ Subscription save failed on retry - manual intervention may be needed')
                    }
                  }, 2000)
                }
              }, delay)
            } else {
              console.warn('⚠️ No authenticated user found during subscription change event')
            }
          } catch (error) {
            console.error('❌ Error handling subscription change event:', error)
          }
        } else {
          console.log('🔍 DEBUG: User unsubscribed from notifications')
        }
      })
    }

    isInitialized = true
    console.log('✅ OneSignal initialized successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to initialize OneSignal:', error)
    return false
  }
}

/**
 * Wait for OneSignal Player ID to be available with exponential backoff
 * iOS-optimized with longer wait times and more attempts
 */
async function waitForPlayerId(maxAttempts?: number, initialDelay?: number): Promise<string | null> {
  const oneSignal = await loadOneSignal()
  const platform = getPlatform()
  
  // iOS-specific configuration: longer waits and more attempts
  const attempts = maxAttempts || (platform === 'ios' ? 30 : 15)
  const delay = initialDelay || (platform === 'ios' ? 1500 : 800)
  
  console.log(`🔍 [WAIT_PLAYER_ID] Starting wait for Player ID on ${platform}`)
  console.log(`   Max attempts: ${attempts}, Initial delay: ${delay}ms`)

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      // Try to get player ID using multiple methods
      let playerId: string | null | undefined = undefined

      // Method 1: Modern getUserId API
      if (typeof oneSignal.getUserId === 'function') {
        try {
          playerId = await oneSignal.getUserId()
        } catch (e) {
          console.warn(`Attempt ${attempt}: getUserId() failed:`, e)
        }
      }

      // Method 2: User.PushSubscription.id
      if (!playerId && oneSignal.User && oneSignal.User.PushSubscription) {
        try {
          playerId = await oneSignal.User.PushSubscription.id
        } catch (e) {
          console.warn(`Attempt ${attempt}: User.PushSubscription.id failed:`, e)
        }
      }

      // Method 3: Check if user is subscribed first
      if (!playerId && oneSignal.User && oneSignal.User.PushSubscription) {
        try {
          const isSubscribed = await oneSignal.User.PushSubscription.optedIn
          if (isSubscribed) {
            playerId = await oneSignal.User.PushSubscription.id
          }
        } catch (e) {
          console.warn(`Attempt ${attempt}: Subscription check failed:`, e)
        }
      }

      if (playerId && playerId.trim() !== '') {
        console.log(`✅ [WAIT_PLAYER_ID] Player ID retrieved after ${attempt} attempt(s):`, playerId)
        return playerId
      }

      console.log(`⏳ [WAIT_PLAYER_ID] Player ID not available yet (attempt ${attempt}/${attempts})`)

      // Exponential backoff: wait longer each time
      if (attempt < attempts) {
        const waitTime = Math.min(delay * Math.pow(1.5, attempt - 1), 8000) // Cap at 8 seconds for iOS
        console.log(`   Waiting ${Math.round(waitTime)}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    } catch (error) {
      console.warn(`⚠️ [WAIT_PLAYER_ID] Error checking player ID on attempt ${attempt}:`, error)
      if (attempt < attempts) {
        const waitTime = Math.min(delay * Math.pow(1.5, attempt - 1), 8000)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  console.error(`❌ [WAIT_PLAYER_ID] Player ID not available after ${attempts} attempts`)
  return null
}

/**
 * Background retry mechanism for updating NULL player IDs
 * Runs periodically to check if Player ID becomes available
 */
async function startBackgroundPlayerIdRetry(userId: string, maxRetries: number = 24): Promise<void> {
  const platform = getPlatform()
  
  if (platform !== 'ios') {
    console.log('🔍 [BACKGROUND_RETRY] Skipping background retry (not iOS)')
    return
  }

  console.log(`🔍 [BACKGROUND_RETRY] Starting background retry for user ${userId}`)
  console.log(`   Will retry every 5 seconds for up to ${maxRetries} attempts (2 minutes)`)

  let retryCount = 0
  const retryInterval = setInterval(async () => {
    retryCount++
    console.log(`🔍 [BACKGROUND_RETRY] Attempt ${retryCount}/${maxRetries}`)

    try {
      const oneSignal = await loadOneSignal()
      
      // Try to get player ID
      let playerId: string | null = null
      
      if (typeof oneSignal.getUserId === 'function') {
        playerId = await oneSignal.getUserId()
      } else if (oneSignal.User && oneSignal.User.PushSubscription) {
        playerId = await oneSignal.User.PushSubscription.id
      }

      if (playerId && playerId.trim() !== '') {
        console.log(`✅ [BACKGROUND_RETRY] Player ID found: ${playerId}`)
        
        // Update the database record
        const success = await saveOneSignalSubscription(userId)
        
        if (success) {
          console.log('✅ [BACKGROUND_RETRY] Successfully updated subscription with Player ID')
          clearInterval(retryInterval)
          return
        }
      }

      // Stop after max retries
      if (retryCount >= maxRetries) {
        console.warn(`⚠️ [BACKGROUND_RETRY] Max retries reached without finding Player ID`)
        clearInterval(retryInterval)
      }
    } catch (error) {
      console.error(`❌ [BACKGROUND_RETRY] Error during retry ${retryCount}:`, error)
      
      if (retryCount >= maxRetries) {
        clearInterval(retryInterval)
      }
    }
  }, 5000) // Retry every 5 seconds
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

    // CRITICAL: Ensure external user ID is set BEFORE subscription
    console.log('🔍 [SUBSCRIBE] Ensuring external user ID is set before subscription')
    try {
      await oneSignal.login(userId)
      console.log('✅ [SUBSCRIBE] External user ID confirmed:', userId)
    } catch (loginError) {
      console.warn('⚠️ [SUBSCRIBE] Failed to set external user ID:', loginError)
      // Continue anyway, but this may cause notification delivery issues
    }

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

      // Wait for player ID to be available with improved retry logic
      const playerId = await waitForPlayerId() // Use platform-specific defaults

      if (playerId) {
        // Try to save subscription now that player ID is available
        const saved = await saveOneSignalSubscription(userId)
        if (saved) {
          console.log("Mobile: Subscription saved successfully")
          return true
        }
      } else {
        // Player ID not available yet - start background retry for iOS
        if (platform === 'ios') {
          console.log("iOS: Starting background retry mechanism")
          startBackgroundPlayerIdRetry(userId)
        }
      }

      // If not saved immediately, it will be saved when subscription change event fires
      // or via background retry mechanism
      console.log("Mobile: Subscription may be saved via event listener or background retry")
      return true
    } else {
      // Desktop: Use Slidedown for subscription
      console.log("Desktop: Using Slidedown for subscription")
      
      try {
        await oneSignal.Slidedown.promptPush()
      } catch (slidedownError) {
        console.warn("Slidedown prompt failed, trying alternative method:", slidedownError)
        // Fallback to native prompt
        await oneSignal.showNativePrompt()
      }

      // Wait for player ID with improved retry logic
      const playerId = await waitForPlayerId(15, 800)
      
      if (playerId) {
        // Save subscription to database
        const saved = await saveOneSignalSubscription(userId)
        return saved
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
    console.log('🔍 [SAVE] Starting OneSignal subscription save process')
    console.log('  User ID:', userId)
    console.log('  Platform:', getPlatform())
    console.log('  Timestamp:', new Date().toISOString())

    const oneSignal = await loadOneSignal()

    // Use improved waitForPlayerId function with extended retries
    console.log('🔍 [SAVE] Waiting for OneSignal Player ID...')
    const playerId = await waitForPlayerId(20, 1000) // Increased attempts and delay

    if (!playerId) {
      console.error('❌ [SAVE] OneSignal Player ID not available after retries')
      console.error('   This may indicate OneSignal SDK issues')
      console.error('   Possible causes:')
      console.error('   - OneSignal not fully initialized')
      console.error('   - User not subscribed to push notifications')
      console.error('   - Service worker not registered properly')
      console.error('   - Network issues preventing OneSignal communication')
      
      // Try to register with NULL player ID (will be updated later)
      console.log('🔍 [SAVE] Attempting to register with NULL player ID for later update...')
      const platform = getPlatform()
      const success = await registerDeviceSubscription(userId, null, platform as any, userId)
      
      if (success) {
        console.log('✅ [SAVE] Registered subscription with NULL player ID - will retry later')
        return true
      }
      
      return false
    }

    console.log('✅ [SAVE] Got OneSignal Player ID:', playerId)

    // Get the actual external user ID from OneSignal instead of assuming it's the userId
    let externalUserId: string | null = null
    try {
      console.log('🔍 [SAVE] Attempting to get external user ID from OneSignal...')
      
      if (typeof oneSignal.getExternalUserId === 'function') {
        externalUserId = await oneSignal.getExternalUserId()
        console.log('🔍 [SAVE] Got external user ID from getExternalUserId():', externalUserId)
      } else if (oneSignal.User && typeof oneSignal.User.getExternalUserId === 'function') {
        externalUserId = await oneSignal.User.getExternalUserId()
        console.log('🔍 [SAVE] Got external user ID from User.getExternalUserId():', externalUserId)
      } else {
        console.log('🔍 [SAVE] No getExternalUserId method available')
      }
    } catch (e) {
      console.warn('⚠️ [SAVE] Failed to get external user ID from OneSignal:', e)
    }

    // Fallback to userId if we can't get it from OneSignal
    if (!externalUserId) {
      externalUserId = userId
      console.log('🔍 [SAVE] Using userId as external user ID fallback:', externalUserId)
    }

    // Use the new multi-device registration system
    const platform = getPlatform()
    console.log('🔍 [SAVE] Calling registerDeviceSubscription...')
    console.log('  User ID:', userId)
    console.log('  Player ID:', playerId)
    console.log('  Platform:', platform)
    console.log('  External User ID:', externalUserId)
    
    const success = await registerDeviceSubscription(userId, playerId, platform as any, externalUserId)

    if (!success) {
      console.error("❌ [SAVE] Failed to register device subscription")
      console.error("   Check database constraints and RLS policies")
      console.error("   Check browser console for detailed error messages")
      return false
    }

    console.log('✅ [SAVE] Device subscription registered successfully')

    // Update last active timestamp
    console.log('🔍 [SAVE] Updating last active timestamp...')
    await updateDeviceLastActive(playerId)

    // Cleanup any stale subscriptions
    console.log('🔍 [SAVE] Cleaning up inactive subscriptions...')
    await cleanupInactiveSubscriptions(userId)

    console.log("✅ [SAVE] OneSignal subscription saved with multi-device support")
    console.log("   Player ID:", playerId)
    console.log("   Platform:", platform)
    console.log("   Timestamp:", new Date().toISOString())
    
    return true
  } catch (error: any) {
    console.error("❌ [SAVE] Error saving OneSignal subscription:", error)
    console.error("   Error name:", error?.name)
    console.error("   Error message:", error?.message)
    console.error("   Error stack:", error?.stack)
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
