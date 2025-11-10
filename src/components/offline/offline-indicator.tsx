import { useOnline } from "@/hooks/useOnline"
import { useOfflineQueue } from "@/hooks/useOfflineQueue"
import { AlertCircle, CheckCircle } from "lucide-react"

export function OfflineIndicator() {
  const isOnline = useOnline()
  const { offlineQueue } = useOfflineQueue()

  if (isOnline && offlineQueue.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
      {isOnline ? (
        <>
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-600">Syncing {offlineQueue.length} changes...</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">{offlineQueue.length} pending changes</span>
        </>
      )}
    </div>
  )
}
