"use client"

import { useEffect, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"

export function useOfflineQueue() {
  const { offlineQueue, clearOfflineQueue, isOnline } = useAppStore()

  const processQueue = useCallback(async () => {
    if (!isOnline || offlineQueue.length === 0) return

    for (const action of offlineQueue) {
      try {
        if (action.type === "UPDATE_APPOINTMENT") {
          await supabase.from("appointments").update(action.data).eq("id", action.appointmentId)
        } else if (action.type === "CREATE_APPOINTMENT") {
          await supabase.from("appointments").insert([action.data])
        }
      } catch (error) {
        console.error("Failed to process offline action:", error)
        break
      }
    }

    clearOfflineQueue()
  }, [isOnline, offlineQueue, clearOfflineQueue])

  useEffect(() => {
    if (isOnline) {
      processQueue()
    }
  }, [isOnline, processQueue])

  return { offlineQueue, processQueue }
}
