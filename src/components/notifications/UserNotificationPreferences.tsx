"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bell, Clock, Save } from "lucide-react";

interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  appointment_reminders: boolean;
  appointment_updates: boolean;
  marketing_emails: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export function UserNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_enabled: true,
    email_enabled: true,
    sms_enabled: false,
    appointment_reminders: true,
    appointment_updates: true,
    marketing_emails: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading preferences:", error);
        return;
      }

      if (data?.notification_preferences) {
        setPreferences(data.notification_preferences);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          notification_preferences: preferences,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      alert("Notification preferences saved successfully");
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = (
    key: keyof NotificationPreferences,
    value: boolean | string
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
          <Bell className="w-5 h-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">
            Notification Channels
          </h3>

          <div className="flex items-center justify-between">
            <Label htmlFor="push_enabled" className="text-sm font-medium">
              Push Notifications
            </Label>
            <Switch
              id="push_enabled"
              checked={preferences.push_enabled}
              onCheckedChange={(checked) =>
                updatePreference("push_enabled", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email_enabled" className="text-sm font-medium">
              Email Notifications
            </Label>
            <Switch
              id="email_enabled"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) =>
                updatePreference("email_enabled", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sms_enabled" className="text-sm font-medium">
              SMS Notifications
            </Label>
            <Switch
              id="sms_enabled"
              checked={preferences.sms_enabled}
              onCheckedChange={(checked) =>
                updatePreference("sms_enabled", checked)
              }
            />
          </div>
        </div>

        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">
            Notification Types
          </h3>

          <div className="flex items-center justify-between">
            <Label
              htmlFor="appointment_reminders"
              className="text-sm font-medium"
            >
              Appointment Reminders
            </Label>
            <Switch
              id="appointment_reminders"
              checked={preferences.appointment_reminders}
              onCheckedChange={(checked) =>
                updatePreference("appointment_reminders", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label
              htmlFor="appointment_updates"
              className="text-sm font-medium"
            >
              Appointment Updates
            </Label>
            <Switch
              id="appointment_updates"
              checked={preferences.appointment_updates}
              onCheckedChange={(checked) =>
                updatePreference("appointment_updates", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="marketing_emails" className="text-sm font-medium">
              Marketing Emails
            </Label>
            <Switch
              id="marketing_emails"
              checked={preferences.marketing_emails}
              onCheckedChange={(checked) =>
                updatePreference("marketing_emails", checked)
              }
            />
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Quiet Hours
          </h3>
          <p className="text-sm text-gray-600">
            Set times when you don't want to receive notifications
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet_start" className="text-sm font-medium">
                Start Time
              </Label>
              <Input
                id="quiet_start"
                type="time"
                value={preferences.quiet_hours_start}
                onChange={(e) =>
                  updatePreference("quiet_hours_start", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quiet_end" className="text-sm font-medium">
                End Time
              </Label>
              <Input
                id="quiet_end"
                type="time"
                value={preferences.quiet_hours_end}
                onChange={(e) =>
                  updatePreference("quiet_hours_end", e.target.value)
                }
              />
            </div>
          </div>
        </div>

        <Button
          onClick={savePreferences}
          disabled={isSaving}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
