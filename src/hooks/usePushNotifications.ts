"use client"

import { useEffect, useState } from "react"
import { requestNotificationPermission, subscribeToPushNotifications, savePushSubscription, deletePushSubscription } from "@/lib/notifications"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"


export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const checkSupport = async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window

      setIsSupported(supported)

      if (supported && user) {
        await checkExistingSubscription()
      }
    }

    checkSupport()
  }, [user])

  const checkExistingSubscription = async () => {
    if (!user) return

    try {
      const registration = await navigator.serviceWorker.ready
      const existingSub = await registration.pushManager.getSubscription()

      if (existingSub) {
        setSubscription(existingSub)
        setIsSubscribed(true)
      }
    } catch (error) {
      console.error("Error checking existing subscription:", error)
    }
  }

  const subscribe = async () => {
    if (!isSupported || !user) return false

    setIsLoading(true)
    try {
      const permission = await requestNotificationPermission()
      if (!permission) return false

      const sub = await subscribeToPushNotifications()
      if (!sub) return false

      // Save to Supabase
      const success = await savePushSubscription(sub, user.id)
      if (success) {
        setSubscription(sub)
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
    if (!subscription || !user) return false

    setIsLoading(true)
    try {
      const success = await deletePushSubscription(subscription, user.id)
      if (success) {
        await subscription.unsubscribe()
        setSubscription(null)
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
    subscription,
    isLoading,
    subscribe,
    unsubscribe
  }
}
