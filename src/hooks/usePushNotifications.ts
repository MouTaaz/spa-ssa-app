"use client"

import { useEffect, useState } from "react"
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, checkOneSignalSubscriptionStatus } from "@/lib/notifications"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"


export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const checkSupport = async () => {
      // OneSignal handles support checks internally
      const supported = "Notification" in window
      setIsSupported(supported)

      if (supported && user) {
        await checkSubscriptionStatus()
      }
    }

    checkSupport()
  }, [user])

  const checkSubscriptionStatus = async () => {
    if (!user) return

    try {
      const subscribed = await checkOneSignalSubscriptionStatus()
      setIsSubscribed(subscribed)
    } catch (error) {
      console.error("Error checking OneSignal subscription status:", error)
    }
  }

  const subscribe = async () => {
    if (!isSupported || !user) return false

    setIsLoading(true)
    try {
      const success = await subscribeToPushNotifications(user.id)
      if (success) {
        setIsSubscribed(true)
        return true
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error)
    } finally {
      setIsLoading(false)
    }
    return false
  }

  const unsubscribe = async () => {
    if (!user) return false

    setIsLoading(true)
    try {
      const success = await unsubscribeFromPushNotifications(user.id)
      if (success) {
        setIsSubscribed(false)
        return true
      }
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error)
    } finally {
      setIsLoading(false)
    }
    return false
  }

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  }
}
