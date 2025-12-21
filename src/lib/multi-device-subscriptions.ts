import { supabase } from "./supabase"

/**
 * Multi-Device Subscription Manager
 * Handles registration of multiple devices per user with dynamic scope management
 * Supports: web browsers, mobile web, PWA installations
 */

interface DeviceSubscription {
  user_id: string
  onesignal_player_id: string
  onesignal_external_user_id: string
  platform: 'web' | 'ios' | 'android'
  device_type?: 'browser' | 'pwa' | 'native'
  device_name?: string
  scope?: string
  user_agent: string
  push_active: boolean
  installed_at?: string
  last_active_at: string
}

interface SubscriptionScope {
  scope: string
  // '/' for root scope (standard web push)
  // '/app' for app-specific scope
  // '/' + pathname for path-specific scope
}

/**
 * Detect current device scope (where service worker is registered)
 */
export async function detectDeviceScope(): Promise<string> {
  if ('serviceWorker' in navigator) {
    try {
      // Get the service worker registration to access the scope
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        return registration.scope || '/'
      }
    } catch (error) {
      console.warn('Failed to get service worker registration:', error)
    }
  }

  // Fallback: determine by user agent and platform
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    // Mobile typically uses root scope
    return '/'
  }

  // Desktop/PWA uses root scope
  return '/'
}

/**
 * Detect device type (browser, PWA, native mobile web, etc.)
 */
export function detectDeviceType(): 'browser' | 'pwa' | 'native' {
  // Check if running as PWA
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'pwa'
  }

  // Check if installed (iOS)
  if (
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  ) {
    return 'pwa'
  }

  // Check for native bridge (if you have one)
  if ((window as any).ReactNativeWebView || (window as any).android) {
    return 'native'
  }

  return 'browser'
}

/**
 * Generate a unique device identifier based on browser/platform characteristics
 */
export function generateDeviceIdentifier(): string {
  const ua = navigator.userAgent
  const platform = navigator.platform
  const language = navigator.language
  const cores = (navigator as any).hardwareConcurrency || 'unknown'
  const screen = `${window.screen.width}x${window.screen.height}`

  // Create a fingerprint from device characteristics
  const fingerprint = `${platform}-${cores}-${screen}-${language}`
  return btoa(fingerprint).substring(0, 16)
}

/**
 * Generate a human-readable device name
 */
export function generateDeviceName(): string {
  const ua = navigator.userAgent.toLowerCase()
  const deviceType = detectDeviceType()

  let osName = 'Unknown OS'
  if (ua.includes('windows')) osName = 'Windows'
  else if (ua.includes('mac')) osName = 'macOS'
  else if (ua.includes('linux')) osName = 'Linux'
  else if (ua.includes('android')) osName = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad')) osName = 'iOS'

  let browserName = 'Unknown Browser'
  if (ua.includes('chrome') && !ua.includes('edge')) browserName = 'Chrome'
  else if (ua.includes('safari') && !ua.includes('chrome')) browserName = 'Safari'
  else if (ua.includes('firefox')) browserName = 'Firefox'
  else if (ua.includes('edge')) browserName = 'Edge'

  return `${browserName} on ${osName} (${deviceType})`
}

/**
 * Register or update a device subscription with multi-device support
 * Improved version with better error handling and NULL player ID support
 */
export async function registerDeviceSubscription(
  userId: string,
  playerId: string | null,
  platform: 'web' | 'ios' | 'android',
  externalUserId?: string
): Promise<boolean> {
  try {
    console.log('📱 [REGISTER] Starting device subscription registration')
    console.log('  User ID:', userId)
    console.log('  Player ID:', playerId || 'NULL (will retry)')
    console.log('  Platform:', platform)
    console.log('  External User ID:', externalUserId || userId)

    // Validate required fields
    if (!userId) {
      console.error('❌ [REGISTER] User ID is required')
      return false
    }

    // Detect device characteristics
    const scope = await detectDeviceScope()
    const deviceType = detectDeviceType()
    const deviceName = generateDeviceName()
    const now = new Date().toISOString()

    console.log('📱 [REGISTER] Device characteristics:')
    console.log('  Scope:', scope)
    console.log('  Device Type:', deviceType)
    console.log('  Device Name:', deviceName)

    // Prepare subscription data
    const subscriptionData: any = {
      user_id: userId,
      onesignal_player_id: playerId, // Can be NULL initially
      onesignal_external_user_id: externalUserId || userId,
      platform,
      device_type: deviceType,
      device_name: deviceName,
      scope,
      user_agent: navigator.userAgent,
      push_active: true,
      last_active_at: now,
      installed_at: now,
      endpoint: null, // OneSignal doesn't use traditional endpoints
      p256dh: null,
      auth: null,
    }

    console.log('📱 [REGISTER] Subscription data prepared:', {
      ...subscriptionData,
      user_agent: subscriptionData.user_agent.substring(0, 50) + '...'
    })

    // Strategy 1: If player_id exists, try upsert by player_id
    if (playerId) {
      console.log('📱 [REGISTER] Attempting upsert by player_id...')
      const { error, data } = await supabase
        .from('push_subscriptions')
        .upsert([subscriptionData], {
          onConflict: 'onesignal_player_id',
          ignoreDuplicates: false,
        })
        .select()

      if (!error) {
        console.log('✅ [REGISTER] Successfully registered via player_id upsert')
        console.log('   Record ID:', data?.[0]?.id)
        return true
      }

      console.warn('⚠️ [REGISTER] Upsert by player_id failed:', error.message)
      console.warn('   Error details:', error)
    }

    // Strategy 2: Try to find existing subscription by user_id and device_name
    console.log('📱 [REGISTER] Checking for existing subscription by user_id and device_name...')
    const { data: existingSubscription, error: findError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('device_name', deviceName)
      .maybeSingle()

    if (findError) {
      console.warn('⚠️ [REGISTER] Error finding existing subscription:', findError.message)
    }

    if (existingSubscription) {
      console.log('📱 [REGISTER] Found existing subscription, updating...')
      console.log('   Existing ID:', existingSubscription.id)
      
      // Update existing subscription
      const { error: updateError, data: updateData } = await supabase
        .from('push_subscriptions')
        .update({
          onesignal_player_id: playerId,
          onesignal_external_user_id: externalUserId || userId,
          platform,
          device_type: deviceType,
          scope,
          user_agent: navigator.userAgent,
          push_active: true,
          last_active_at: now,
        })
        .eq('id', existingSubscription.id)
        .select()

      if (updateError) {
        console.error('❌ [REGISTER] Failed to update existing subscription:', updateError.message)
        console.error('   Error details:', updateError)
        return false
      }

      console.log('✅ [REGISTER] Successfully updated existing subscription')
      console.log('   Updated record:', updateData?.[0])
      return true
    }

    // Strategy 3: Insert new subscription
    console.log('📱 [REGISTER] No existing subscription found, inserting new...')
    const { error: insertError, data: insertData } = await supabase
      .from('push_subscriptions')
      .insert([subscriptionData])
      .select()

    if (insertError) {
      console.error('❌ [REGISTER] Failed to insert new subscription:', insertError.message)
      console.error('   Error code:', insertError.code)
      console.error('   Error details:', insertError.details)
      console.error('   Error hint:', insertError.hint)
      
      // Check if it's a unique constraint violation
      if (insertError.code === '23505') {
        console.error('   Unique constraint violation detected')
        console.error('   This might be due to a race condition or duplicate player_id')
        
        // Try one more time with a slight delay
        await new Promise(resolve => setTimeout(resolve, 500))
        return registerDeviceSubscription(userId, playerId, platform, externalUserId)
      }
      
      return false
    }

    console.log('✅ [REGISTER] Successfully inserted new subscription')
    console.log('   New record ID:', insertData?.[0]?.id)
    console.log('   New record:', insertData?.[0])

    return true
  } catch (error: any) {
    console.error('❌ [REGISTER] Unexpected error during registration:', error)
    console.error('   Error name:', error?.name)
    console.error('   Error message:', error?.message)
    console.error('   Error stack:', error?.stack)
    return false
  }
}

/**
 * List all subscriptions for a user (all their devices)
 */
export async function listUserSubscriptions(userId: string) {
  try {
    console.log('📱 Fetching subscriptions for user:', userId)

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('installed_at', { ascending: false })

    if (error) {
      console.error('❌ Failed to fetch subscriptions:', error)
      return null
    }

    console.log(`✅ Found ${data?.length || 0} devices for user`)
    return data
  } catch (error) {
    console.error('❌ Error fetching subscriptions:', error)
    return null
  }
}

/**
 * Get current device subscription (if exists)
 */
export async function getCurrentDeviceSubscription(userId: string) {
  try {
    const scope = detectDeviceScope()
    const deviceName = generateDeviceName()

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('device_name', deviceName)
      .maybeSingle() // Return null if no match, not error

    if (error) {
      console.error('❌ Failed to fetch current device subscription:', error)
      return null
    }

    console.log('📱 Current device subscription:', data)
    return data
  } catch (error) {
    console.error('❌ Error fetching current device subscription:', error)
    return null
  }
}

/**
 * Deactivate a specific device subscription
 */
export async function deactivateDeviceSubscription(subscriptionId: string) {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ push_active: false })
      .eq('id', subscriptionId)

    if (error) {
      console.error('❌ Failed to deactivate subscription:', error)
      return false
    }

    console.log('✅ Subscription deactivated:', subscriptionId)
    return true
  } catch (error) {
    console.error('❌ Error deactivating subscription:', error)
    return false
  }
}

/**
 * Remove a device subscription entirely
 */
export async function removeDeviceSubscription(subscriptionId: string) {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('id', subscriptionId)

    if (error) {
      console.error('❌ Failed to remove subscription:', error)
      return false
    }

    console.log('✅ Subscription removed:', subscriptionId)
    return true
  } catch (error) {
    console.error('❌ Error removing subscription:', error)
    return false
  }
}

/**
 * Update last active timestamp for a device
 */
export async function updateDeviceLastActive(playerId: string) {
  try {
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('push_subscriptions')
      .update({ last_active_at: now })
      .eq('onesignal_player_id', playerId)

    if (error) {
      console.warn('⚠️ Failed to update last active timestamp:', error)
      return false
    }

    return true
  } catch (error) {
    console.warn('⚠️ Error updating last active timestamp:', error)
    return false
  }
}

/**
 * Cleanup inactive or invalid subscriptions
 * Marks subscriptions as inactive if they have invalid OneSignal IDs or are stale
 */
export async function cleanupInactiveSubscriptions(userId: string, maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
  try {
    const cutoffDate = new Date(Date.now() - maxAgeMs).toISOString()

    const { error } = await supabase
      .from('push_subscriptions')
      .update({ push_active: false })
      .eq('user_id', userId)
      .lt('last_active_at', cutoffDate)

    if (error) {
      console.warn('⚠️ Failed to cleanup inactive subscriptions:', error)
      return false
    }

    console.log('✅ Cleaned up inactive subscriptions for user:', userId)
    return true
  } catch (error) {
    console.warn('⚠️ Error cleaning up inactive subscriptions:', error)
    return false
  }
}
