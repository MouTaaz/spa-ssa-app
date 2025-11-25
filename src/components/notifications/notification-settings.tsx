"use client";

import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, CheckCircle, AlertCircle } from "lucide-react";

export function NotificationSettings() {
  const { isSupported, isSubscribed, subscribe, unsubscribe, isLoading } =
    usePushNotifications();
  const [notificationPreferences, setNotificationPreferences] = useState({
    appointmentReminders: true,
    statusChanges: true,
    newAppointments: true,
    cancellations: true,
  });

  const handlePreferenceChange = (key: string) => {
    setNotificationPreferences((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (!isSupported) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold">Notifications not supported</h3>
            <p className="text-sm text-slate-600 mt-1">
              Your browser doesn't support push notifications
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Notification Settings</h3>
      </div>

      {isSubscribed && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-600">Push notifications enabled</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Push Notifications</h4>
            <p className="text-sm text-slate-600">
              Receive notifications about appointments and updates
            </p>
          </div>
          <Button
            onClick={handleToggleNotifications}
            disabled={isLoading}
            variant={isSubscribed ? "outline" : "default"}
            size="sm"
          >
            {isLoading ? "..." : isSubscribed ? "Disable" : "Enable"}
          </Button>
        </div>

        <div className="space-y-3">
          {Object.entries(notificationPreferences).map(([key, value]) => (
            <label
              key={key}
              className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value}
                onChange={() => handlePreferenceChange(key)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Button size="lg" variant="default" className="w-full mt-4">
        Save Preferences
      </Button>
    </Card>
  );
}
