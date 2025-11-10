"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface PushSubscription {
  id: string;
  endpoint: string;
  platform: string;
  user_agent: string;
  created_at: string;
  updated_at: string;
}

export function PushSubscriptionManager() {
  const { user } = useAuth();
  const {
    isSupported,
    isSubscribed,
    subscription,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscriptions();

      // Set up real-time subscription for subscription changes
      const channel = supabase
        .channel("push_subscriptions_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "push_subscriptions",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Push subscription change:", payload);
            loadSubscriptions(); // Reload all subscriptions on any change
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadSubscriptions = async () => {
    if (!user) return;

    setIsLoadingSubs(true);
    try {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading subscriptions:", error);
        return;
      }

      setSubscriptions(data || []);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    } finally {
      setIsLoadingSubs(false);
    }
  };

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      await loadSubscriptions();
    }
  };

  const handleUnsubscribe = async () => {
    const success = await unsubscribe();
    if (success) {
      await loadSubscriptions();
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "android":
        return <Smartphone className="w-4 h-4" />;
      case "ios":
        return <Smartphone className="w-4 h-4" />;
      case "web":
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "android":
        return "Android";
      case "ios":
        return "iOS";
      case "web":
      default:
        return "Web";
    }
  };

  const formatUserAgent = (userAgent: string) => {
    if (!userAgent) return "Unknown device";

    // Extract browser and OS info
    const ua = userAgent.toLowerCase();

    let browser = "Unknown";
    let os = "Unknown";

    if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
    else if (ua.includes("firefox")) browser = "Firefox";
    else if (ua.includes("safari") && !ua.includes("chrome"))
      browser = "Safari";
    else if (ua.includes("edg")) browser = "Edge";

    if (ua.includes("windows")) os = "Windows";
    else if (ua.includes("mac")) os = "macOS";
    else if (ua.includes("linux")) os = "Linux";
    else if (ua.includes("android")) os = "Android";
    else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

    return `${browser} on ${os}`;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-semibold">
                Push notifications not supported
              </h3>
              <p className="text-sm text-gray-600">
                Your browser doesn't support push notifications
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Push Notification Subscriptions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <h4 className="font-medium">
                {isSubscribed ? "Subscribed" : "Not subscribed"}
              </h4>
              <p className="text-sm text-gray-600">
                Push notifications for this device
              </p>
            </div>
          </div>

          <Button
            onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
            disabled={isLoading}
            variant={isSubscribed ? "outline" : "default"}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSubscribed ? "Unsubscribe" : "Subscribe"}
          </Button>
        </div>

        {/* Subscription Details */}
        {subscription && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Current Subscription</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Endpoint:</strong>{" "}
                {subscription.endpoint.substring(0, 50)}...
              </p>
              <p>
                <strong>Platform:</strong>{" "}
                {getPlatformLabel(
                  getPlatformFromUserAgent(navigator.userAgent)
                )}
              </p>
              <p>
                <strong>Browser:</strong> {formatUserAgent(navigator.userAgent)}
              </p>
            </div>
          </div>
        )}

        {/* All Subscriptions */}
        <div>
          <h4 className="font-medium mb-4">
            All Subscriptions ({subscriptions.length})
          </h4>

          {isLoadingSubs ? (
            <div className="animate-pulse space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No push subscriptions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {getPlatformIcon(sub.platform)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {getPlatformLabel(sub.platform)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {formatUserAgent(sub.user_agent)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created{" "}
                          {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getPlatformFromUserAgent(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "ios";
  return "web";
}
