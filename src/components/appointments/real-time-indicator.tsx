"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Activity } from "lucide-react"

export function RealTimeIndicator() {
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    const channel = supabase.channel("realtime-status")

    const subscription = channel
      .on("system", { event: "online" }, () => {
        setIsConnected(true)
      })
      .on("system", { event: "offline" }, () => {
        setIsConnected(false)
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
      <Activity className={`w-4 h-4 ${isConnected ? "text-green-600 animate-pulse" : "text-red-600"}`} />
      <span className="text-sm font-medium">{isConnected ? "Live" : "Connecting..."}</span>
    </div>
  )
}
