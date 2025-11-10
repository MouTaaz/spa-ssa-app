import { useOnline } from "@/hooks/useOnline";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const isOnline = useOnline();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-40">
      <div className="flex items-start gap-3">
        <WifiOff className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">You're offline</h3>
          <p className="text-sm text-red-700 mt-1">
            Changes will be synced when you're back online. Your data is saved
            locally.
          </p>
        </div>
      </div>
    </div>
  );
}
