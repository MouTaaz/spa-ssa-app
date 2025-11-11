"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle, XCircle, Loader2, Smartphone } from "lucide-react";

interface PushNotificationSetupProps {
  onNext: () => void;
}

export function PushNotificationSetup({ onNext }: PushNotificationSetupProps) {
  const { user } = useAuth();
  const { isSupported, isSubscribed, subscribe, isLoading } =
    usePushNotifications();
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermission | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);

  const handleEnableNotifications = async () => {
    if (!isSupported) return;

    // Check current permission status
    if (Notification.permission === "default") {
      setPermissionStatus("default");
    } else {
      setPermissionStatus(Notification.permission);
    }

    const success = await subscribe();
    if (success) {
      setSetupComplete(true);
    }
  };

  const handleSkip = () => {
    setSetupComplete(true);
  };

  if (setupComplete) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <CardTitle className="text-2xl">Setup Complete!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Push notifications have been configured for your account. You can
            always change these settings later in your profile.
          </p>
          <Button onClick={onNext} className="w-full">
            Continue to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <CardTitle className="text-2xl">
            Notifications Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Your browser doesn't support push notifications. You can still use
            the app, but you won't receive mobile notifications.
          </p>
          <Button onClick={onNext} className="w-full">
            Continue Anyway
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <Smartphone className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <CardTitle className="text-2xl">Enable Push Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Get notified about new appointments, updates, and important
            reminders directly on your mobile device.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">
              Why enable notifications?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 text-left">
              <li>• Instant alerts for new appointments</li>
              <li>• Reminders before scheduled services</li>
              <li>• Updates when appointments change</li>
              <li>• Important business notifications</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up notifications...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Enable Push Notifications
              </>
            )}
          </Button>

          <Button onClick={handleSkip} variant="outline" className="w-full">
            Skip for Now
          </Button>
        </div>

        {permissionStatus === "denied" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>Permission denied:</strong> To enable notifications,
              please allow them in your browser settings and try again.
            </p>
          </div>
        )}

        {isSubscribed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Push notifications are now enabled for this device!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
