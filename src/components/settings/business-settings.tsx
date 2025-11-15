"use client";

import { useState, useEffect } from "react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useSubscription } from "@/hooks/useSubscription";
import { PushNotificationSetup } from "@/components/onboarding/PushNotificationSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  Plus,
  Trash2,
  Save,
  Clock,
  Settings,
  Briefcase,
  Calendar,
  Bell,
  CreditCard,
  Smartphone,
} from "lucide-react";
import type {
  BusinessSettings,
  BusinessService,
  BlockedSlot,
  BusinessHoursNew,
  NotificationSettings,
} from "@/lib/store";

export function BusinessSettings() {
  const {
    businessSettings,
    businessServices,
    blockedSlots,
    businessHoursNew,
    notificationSettings,
    loading,
    error,
    saveBusinessSettings,
    saveBusinessService,
    deleteBusinessService,
    saveBlockedSlot,
    deleteBlockedSlot,
    saveBusinessHour,
    deleteBusinessHour,
    saveNotificationSettings,
  } = useBusinessSettings();

  const [settingsForm, setSettingsForm] = useState<BusinessSettings>({
    business_name: "",
    business_email: "",
    business_phone: "",
    business_address: "",
    appointment_interval_minutes: 30,
    buffer_time_minutes: 15,
    default_appointment_duration_minutes: 60,
    max_appointments_per_day: 10,
  });

  const [newService, setNewService] = useState<BusinessService>({
    name: "",
    description: "",
    duration_minutes: 60,
    price: null,
    is_active: true,
  });

  const [newBlockedSlot, setNewBlockedSlot] = useState<BlockedSlot>({
    start_time: "",
    end_time: "",
    reason: "",
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (businessSettings) {
      setSettingsForm(businessSettings);
    }
  }, [businessSettings]);

  const handleSettingsChange = (field: string, value: string | number) => {
    setSettingsForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await saveBusinessSettings(settingsForm);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddService = async () => {
    if (!newService.name.trim()) return;

    try {
      await saveBusinessService(newService);
      setNewService({
        name: "",
        description: "",
        duration_minutes: 60,
        price: null,
        is_active: true,
      });
    } catch (err) {
      console.error("Failed to add service:", err);
    }
  };

  const handleAddBlockedSlot = async () => {
    if (!newBlockedSlot.start_time || !newBlockedSlot.end_time) return;

    try {
      await saveBlockedSlot(newBlockedSlot);
      setNewBlockedSlot({
        start_time: "",
        end_time: "",
        reason: "",
      });
    } catch (err) {
      console.error("Failed to add blocked slot:", err);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Business Settings</h2>
        <p className="text-gray-600">
          Configure your business information, services, and availability
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto md:grid md:grid-cols-7">
          <TabsTrigger
            value="general"
            className="flex items-center gap-2 flex-shrink-0"
          >
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="flex items-center gap-2 flex-shrink-0"
          >
            <Briefcase className="w-4 h-4" />
            Services
          </TabsTrigger>
          <TabsTrigger
            value="hours"
            className="flex items-center gap-2 flex-shrink-0"
          >
            <Clock className="w-4 h-4" />
            Hours
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2 flex-shrink-0"
          >
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="push"
            className="flex items-center gap-2 flex-shrink-0"
          >
            <Smartphone className="w-4 h-4" />
            Push
          </TabsTrigger>
          <TabsTrigger
            value="blocked"
            className="flex items-center gap-2 flex-shrink-0"
          >
            <Calendar className="w-4 h-4" />
            Blocked
          </TabsTrigger>
          <TabsTrigger
            value="subscription"
            className="flex items-center gap-2 flex-shrink-0"
          >
            <CreditCard className="w-4 h-4" />
            Subscription
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business_name" className="text-sm font-medium">
                Business Name
              </Label>
              <Input
                id="business_name"
                type="text"
                className="mt-1"
                value={settingsForm.business_name}
                onChange={(e) =>
                  handleSettingsChange("business_name", e.target.value)
                }
                placeholder="Your Business Name"
              />
            </div>

            <div>
              <Label htmlFor="business_email" className="text-sm font-medium">
                Business Email
              </Label>
              <Input
                id="business_email"
                type="email"
                className="mt-1"
                value={settingsForm.business_email}
                onChange={(e) =>
                  handleSettingsChange("business_email", e.target.value)
                }
                placeholder="business@example.com"
              />
            </div>

            <div>
              <Label htmlFor="business_phone" className="text-sm font-medium">
                Business Phone
              </Label>
              <Input
                id="business_phone"
                type="tel"
                className="mt-1"
                value={settingsForm.business_phone}
                onChange={(e) =>
                  handleSettingsChange("business_phone", e.target.value)
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="business_address" className="text-sm font-medium">
                Business Address
              </Label>
              <Input
                id="business_address"
                type="text"
                className="mt-1"
                value={settingsForm.business_address}
                onChange={(e) =>
                  handleSettingsChange("business_address", e.target.value)
                }
                placeholder="123 Business St, City, State"
              />
            </div>

            <div>
              <Label htmlFor="business_website" className="text-sm font-medium">
                Website URL
              </Label>
              <Input
                id="business_website"
                type="url"
                className="mt-1"
                value={settingsForm.website || ""}
                onChange={(e) =>
                  handleSettingsChange("website", e.target.value)
                }
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div>
              <Label
                htmlFor="appointment_interval_minutes"
                className="text-sm font-medium"
              >
                Appointment Interval (minutes)
              </Label>
              <Input
                id="appointment_interval_minutes"
                type="number"
                min="15"
                max="240"
                className="mt-1"
                value={settingsForm.appointment_interval_minutes}
                onChange={(e) =>
                  handleSettingsChange(
                    "appointment_interval_minutes",
                    parseInt(e.target.value)
                  )
                }
              />
            </div>

            <div>
              <Label
                htmlFor="buffer_time_minutes"
                className="text-sm font-medium"
              >
                Buffer Time Between Appointments (minutes)
              </Label>
              <Input
                id="buffer_time_minutes"
                type="number"
                min="0"
                max="120"
                className="mt-1"
                value={settingsForm.buffer_time_minutes}
                onChange={(e) =>
                  handleSettingsChange(
                    "buffer_time_minutes",
                    parseInt(e.target.value)
                  )
                }
              />
            </div>

            <div>
              <Label
                htmlFor="default_appointment_duration_minutes"
                className="text-sm font-medium"
              >
                Default Appointment Duration (minutes)
              </Label>
              <Input
                id="default_appointment_duration_minutes"
                type="number"
                min="15"
                max="480"
                className="mt-1"
                value={settingsForm.default_appointment_duration_minutes}
                onChange={(e) =>
                  handleSettingsChange(
                    "default_appointment_duration_minutes",
                    parseInt(e.target.value)
                  )
                }
              />
            </div>

            <div>
              <Label
                htmlFor="max_appointments_per_day"
                className="text-sm font-medium"
              >
                Max Appointments Per Day
              </Label>
              <Input
                id="max_appointments_per_day"
                type="number"
                min="1"
                max="50"
                className="mt-1"
                value={settingsForm.max_appointments_per_day}
                onChange={(e) =>
                  handleSettingsChange(
                    "max_appointments_per_day",
                    parseInt(e.target.value)
                  )
                }
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <Button
                variant="outline"
                size="default"
                onClick={() => (window.location.href = "/onboarding-success")}
              >
                Connect WordPress Appointments
              </Button>
              <p className="text-sm text-gray-600 mt-1">
                Sync your Simply Schedule Appointments plugin
              </p>
            </div>
            <Button
              className=""
              variant="default"
              size="default"
              onClick={handleSaveSettings}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Add New Service</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="service_name" className="text-sm font-medium">
                  Service Name *
                </Label>
                <Input
                  id="service_name"
                  type="text"
                  className="mt-1"
                  value={newService.name}
                  onChange={(e) =>
                    setNewService((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Oil Change"
                />
              </div>

              <div>
                <Label
                  htmlFor="service_duration"
                  className="text-sm font-medium"
                >
                  Duration (minutes)
                </Label>
                <Input
                  id="service_duration"
                  type="number"
                  min="15"
                  className="mt-1"
                  value={newService.duration_minutes}
                  onChange={(e) =>
                    setNewService((prev) => ({
                      ...prev,
                      duration_minutes: parseInt(e.target.value),
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="service_price" className="text-sm font-medium">
                  Price (optional)
                </Label>
                <Input
                  id="service_price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1"
                  value={newService.price ?? 0}
                  onChange={(e) =>
                    setNewService((prev) => ({
                      ...prev,
                      price: parseFloat(e.target.value) || null,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="mb-4">
              <Label
                htmlFor="service_description"
                className="text-sm font-medium"
              >
                Description
              </Label>
              <Textarea
                id="service_description"
                className="mt-1"
                value={newService.description}
                onChange={(e) =>
                  setNewService((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe the service..."
                rows={2}
              />
            </div>

            <Button
              onClick={handleAddService}
              disabled={!newService.name.trim()}
              className="w-full"
              variant="default"
              size="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Current Services</h3>
            <div className="space-y-2">
              {businessServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{service.name}</h4>
                    <p className="text-sm text-gray-600">
                      {service.description}
                    </p>
                    <p className="text-sm text-gray-500">
                      Duration: {service.duration_minutes} min
                      {service.price && ` • $${service.price}`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      service.id && deleteBusinessService(service.id)
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {businessServices.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No services configured yet
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Business Hours</h3>
            <p className="text-sm text-gray-600 mb-6">
              Configure your operating hours for each day of the week
            </p>

            <div className="space-y-4">
              {[
                { day: 1, name: "Monday" },
                { day: 2, name: "Tuesday" },
                { day: 3, name: "Wednesday" },
                { day: 4, name: "Thursday" },
                { day: 5, name: "Friday" },
                { day: 6, name: "Saturday" },
                { day: 0, name: "Sunday" },
              ].map(({ day, name }) => {
                const existingHour = businessHoursNew.find(
                  (h) => h.day_of_week === day
                );

                return (
                  <div
                    key={day}
                    className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-20">
                        <p className="font-medium">{name}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`enabled-${day}`}
                          checked={existingHour?.is_enabled ?? true}
                          onCheckedChange={async (checked) => {
                            if (existingHour) {
                              await saveBusinessHour({
                                ...existingHour,
                                is_enabled: checked,
                              });
                            } else {
                              await saveBusinessHour({
                                day_of_week: day,
                                is_enabled: checked,
                                open_time: "09:00",
                                close_time: "17:00",
                              });
                            }
                          }}
                        />
                        <Label
                          htmlFor={`enabled-${day}`}
                          className="text-sm font-medium"
                        >
                          {existingHour?.is_enabled ?? true ? "Open" : "Closed"}
                        </Label>
                      </div>
                    </div>

                    {(existingHour?.is_enabled ?? true) && (
                      <div className="flex items-center space-x-2">
                        <div>
                          <Label htmlFor={`open-${day}`} className="text-xs">
                            Open
                          </Label>
                          <Input
                            id={`open-${day}`}
                            type="time"
                            value={existingHour?.open_time || "09:00"}
                            onChange={async (e) => {
                              if (existingHour) {
                                await saveBusinessHour({
                                  ...existingHour,
                                  open_time: e.target.value,
                                });
                              } else {
                                await saveBusinessHour({
                                  day_of_week: day,
                                  is_enabled: true,
                                  open_time: e.target.value,
                                  close_time: "17:00",
                                });
                              }
                            }}
                            className="w-24 h-8 text-xs"
                          />
                        </div>

                        <span className="text-gray-400">to</span>

                        <div>
                          <Label htmlFor={`close-${day}`} className="text-xs">
                            Close
                          </Label>
                          <Input
                            id={`close-${day}`}
                            type="time"
                            value={existingHour?.close_time || "17:00"}
                            onChange={async (e) => {
                              if (existingHour) {
                                await saveBusinessHour({
                                  ...existingHour,
                                  close_time: e.target.value,
                                });
                              } else {
                                await saveBusinessHour({
                                  day_of_week: day,
                                  is_enabled: true,
                                  open_time: "09:00",
                                  close_time: e.target.value,
                                });
                              }
                            }}
                            className="w-24 h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">
              Notification Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="email_enabled"
                    className="text-sm font-medium"
                  >
                    Email Notifications
                  </Label>
                  <p className="text-sm text-gray-600">
                    Send email notifications for appointments
                  </p>
                </div>
                <Switch
                  id="email_enabled"
                  checked={notificationSettings?.email_enabled ?? false}
                  onCheckedChange={(checked) =>
                    saveNotificationSettings({
                      id: notificationSettings?.id,
                      business_id: notificationSettings?.business_id,
                      email_enabled: checked,
                      sms_enabled: notificationSettings?.sms_enabled ?? false,
                      email_reminders:
                        notificationSettings?.email_reminders ?? false,
                      sms_reminders:
                        notificationSettings?.sms_reminders ?? false,
                      email_confirmations:
                        notificationSettings?.email_confirmations ?? false,
                      sms_confirmations:
                        notificationSettings?.sms_confirmations ?? false,
                      reminder_hours_before:
                        notificationSettings?.reminder_hours_before ?? 24,
                      created_at: notificationSettings?.created_at,
                      updated_at: notificationSettings?.updated_at,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms_enabled" className="text-sm font-medium">
                    SMS Notifications
                  </Label>
                  <p className="text-sm text-gray-600">
                    Send SMS notifications for appointments
                  </p>
                </div>
                <Switch
                  id="sms_enabled"
                  checked={notificationSettings?.sms_enabled ?? false}
                  onCheckedChange={(checked) =>
                    saveNotificationSettings({
                      id: notificationSettings?.id,
                      business_id: notificationSettings?.business_id,
                      email_enabled:
                        notificationSettings?.email_enabled ?? false,
                      sms_enabled: checked,
                      email_reminders:
                        notificationSettings?.email_reminders ?? false,
                      sms_reminders:
                        notificationSettings?.sms_reminders ?? false,
                      email_confirmations:
                        notificationSettings?.email_confirmations ?? false,
                      sms_confirmations:
                        notificationSettings?.sms_confirmations ?? false,
                      reminder_hours_before:
                        notificationSettings?.reminder_hours_before ?? 24,
                      created_at: notificationSettings?.created_at,
                      updated_at: notificationSettings?.updated_at,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="email_reminders"
                    className="text-sm font-medium"
                  >
                    Email Reminders
                  </Label>
                  <p className="text-sm text-gray-600">
                    Send email reminders before appointments
                  </p>
                </div>
                <Switch
                  id="email_reminders"
                  checked={notificationSettings?.email_reminders ?? false}
                  onCheckedChange={(checked) =>
                    saveNotificationSettings({
                      id: notificationSettings?.id,
                      business_id: notificationSettings?.business_id,
                      email_enabled:
                        notificationSettings?.email_enabled ?? false,
                      sms_enabled: notificationSettings?.sms_enabled ?? false,
                      email_reminders: checked,
                      sms_reminders:
                        notificationSettings?.sms_reminders ?? false,
                      email_confirmations:
                        notificationSettings?.email_confirmations ?? false,
                      sms_confirmations:
                        notificationSettings?.sms_confirmations ?? false,
                      reminder_hours_before:
                        notificationSettings?.reminder_hours_before ?? 24,
                      created_at: notificationSettings?.created_at,
                      updated_at: notificationSettings?.updated_at,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="sms_reminders"
                    className="text-sm font-medium"
                  >
                    SMS Reminders
                  </Label>
                  <p className="text-sm text-gray-600">
                    Send SMS reminders before appointments
                  </p>
                </div>
                <Switch
                  id="sms_reminders"
                  checked={notificationSettings?.sms_reminders ?? false}
                  onCheckedChange={(checked) =>
                    saveNotificationSettings({
                      id: notificationSettings?.id,
                      business_id: notificationSettings?.business_id,
                      email_enabled:
                        notificationSettings?.email_enabled ?? false,
                      sms_enabled: notificationSettings?.sms_enabled ?? false,
                      email_reminders:
                        notificationSettings?.email_reminders ?? false,
                      sms_reminders: checked,
                      email_confirmations:
                        notificationSettings?.email_confirmations ?? false,
                      sms_confirmations:
                        notificationSettings?.sms_confirmations ?? false,
                      reminder_hours_before:
                        notificationSettings?.reminder_hours_before ?? 24,
                      created_at: notificationSettings?.created_at,
                      updated_at: notificationSettings?.updated_at,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="email_confirmations"
                    className="text-sm font-medium"
                  >
                    Email Confirmations
                  </Label>
                  <p className="text-sm text-gray-600">
                    Send email confirmations after booking
                  </p>
                </div>
                <Switch
                  id="email_confirmations"
                  checked={notificationSettings?.email_confirmations ?? false}
                  onCheckedChange={(checked) =>
                    saveNotificationSettings({
                      id: notificationSettings?.id,
                      business_id: notificationSettings?.business_id,
                      email_enabled:
                        notificationSettings?.email_enabled ?? false,
                      sms_enabled: notificationSettings?.sms_enabled ?? false,
                      email_reminders:
                        notificationSettings?.email_reminders ?? false,
                      sms_reminders:
                        notificationSettings?.sms_reminders ?? false,
                      email_confirmations: checked,
                      sms_confirmations:
                        notificationSettings?.sms_confirmations ?? false,
                      reminder_hours_before:
                        notificationSettings?.reminder_hours_before ?? 24,
                      created_at: notificationSettings?.created_at,
                      updated_at: notificationSettings?.updated_at,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="sms_confirmations"
                    className="text-sm font-medium"
                  >
                    SMS Confirmations
                  </Label>
                  <p className="text-sm text-gray-600">
                    Send SMS confirmations after booking
                  </p>
                </div>
                <Switch
                  id="sms_confirmations"
                  checked={notificationSettings?.sms_confirmations ?? false}
                  onCheckedChange={(checked) =>
                    saveNotificationSettings({
                      id: notificationSettings?.id,
                      business_id: notificationSettings?.business_id,
                      email_enabled:
                        notificationSettings?.email_enabled ?? false,
                      sms_enabled: notificationSettings?.sms_enabled ?? false,
                      email_reminders:
                        notificationSettings?.email_reminders ?? false,
                      sms_reminders:
                        notificationSettings?.sms_reminders ?? false,
                      email_confirmations:
                        notificationSettings?.email_confirmations ?? false,
                      sms_confirmations: checked,
                      reminder_hours_before:
                        notificationSettings?.reminder_hours_before ?? 24,
                      created_at: notificationSettings?.created_at,
                      updated_at: notificationSettings?.updated_at,
                    })
                  }
                />
              </div>

              <div>
                <Label
                  htmlFor="reminder_hours_before"
                  className="text-sm font-medium"
                >
                  Reminder Hours Before Appointment
                </Label>
                <Input
                  id="reminder_hours_before"
                  type="number"
                  min="1"
                  max="72"
                  className="mt-1"
                  value={notificationSettings?.reminder_hours_before ?? 24}
                  onChange={(e) =>
                    saveNotificationSettings({
                      id: notificationSettings?.id,
                      business_id: notificationSettings?.business_id,
                      email_enabled:
                        notificationSettings?.email_enabled ?? false,
                      sms_enabled: notificationSettings?.sms_enabled ?? false,
                      email_reminders:
                        notificationSettings?.email_reminders ?? false,
                      sms_reminders:
                        notificationSettings?.sms_reminders ?? false,
                      email_confirmations:
                        notificationSettings?.email_confirmations ?? false,
                      sms_confirmations:
                        notificationSettings?.sms_confirmations ?? false,
                      reminder_hours_before: parseInt(e.target.value),
                      created_at: notificationSettings?.created_at,
                      updated_at: notificationSettings?.updated_at,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="push" className="space-y-6">
          <PushNotificationSetup onNext={() => {}} />
        </TabsContent>

        <TabsContent value="blocked" className="space-y-6">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">
              Add Blocked Time Slot
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="block_start" className="text-sm font-medium">
                  Start Time
                </Label>
                <Input
                  id="block_start"
                  type="datetime-local"
                  className="mt-1"
                  value={newBlockedSlot.start_time}
                  onChange={(e) =>
                    setNewBlockedSlot((prev) => ({
                      ...prev,
                      start_time: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="block_end" className="text-sm font-medium">
                  End Time
                </Label>
                <Input
                  id="block_end"
                  type="datetime-local"
                  className="mt-1"
                  value={newBlockedSlot.end_time}
                  onChange={(e) =>
                    setNewBlockedSlot((prev) => ({
                      ...prev,
                      end_time: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor="block_reason" className="text-sm font-medium">
                Reason
              </Label>
              <Input
                id="block_reason"
                type="text"
                className="mt-1"
                value={newBlockedSlot.reason}
                onChange={(e) =>
                  setNewBlockedSlot((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder="e.g., Holiday, Maintenance"
              />
            </div>

            <Button
              className=""
              variant="default"
              size="default"
              onClick={handleAddBlockedSlot}
              disabled={!newBlockedSlot.start_time || !newBlockedSlot.end_time}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Blocked Slot
            </Button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Blocked Time Slots</h3>
            <div className="space-y-2">
              {blockedSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{slot.reason}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(slot.start_time).toLocaleString()} -{" "}
                      {new Date(slot.end_time).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => slot.id && deleteBlockedSlot(slot.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {blockedSlots.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No blocked slots configured
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionTab />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function SubscriptionTab() {
  const {
    currentPlan,
    limits,
    usageStats,
    subscriptionPlans,
    isNearLimit,
    getUpgradeRecommendation,
  } = useSubscription();

  // Hardcoded plans for display (matching user's specification)
  const displayPlans = [
    {
      id: "free",
      name: "Free",
      price_monthly: 0,
      max_appointments_per_month: 10,
      max_team_members: 1,
      max_services: 3,
      max_customers: 50,
    },
    // Add other plans as needed
  ];

  const recommendedPlan = getUpgradeRecommendation();

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xl font-bold">{currentPlan?.name || "Free"}</h4>
            <p className="text-gray-600">{currentPlan?.description}</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              ${currentPlan?.price_monthly || 0}
              <span className="text-sm font-normal text-gray-500">/month</span>
            </p>
          </div>
          <Button variant="outline">Manage Subscription</Button>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Usage This Month</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {usageStats.appointments.used}
            </div>
            <div className="text-sm text-gray-600">Appointments</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  usageStats.appointments.percentage > 80
                    ? "bg-red-500"
                    : usageStats.appointments.percentage > 60
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${usageStats.appointments.percentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {usageStats.appointments.used} / {usageStats.appointments.limit}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold">
              {usageStats.teamMembers.used}
            </div>
            <div className="text-sm text-gray-600">Team Members</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  usageStats.teamMembers.percentage > 80
                    ? "bg-red-500"
                    : usageStats.teamMembers.percentage > 60
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${usageStats.teamMembers.percentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {usageStats.teamMembers.used} / {usageStats.teamMembers.limit}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold">{usageStats.services.used}</div>
            <div className="text-sm text-gray-600">Services</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  usageStats.services.percentage > 80
                    ? "bg-red-500"
                    : usageStats.services.percentage > 60
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${usageStats.services.percentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {usageStats.services.used} / {usageStats.services.limit}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold">
              {usageStats.customers.used}
            </div>
            <div className="text-sm text-gray-600">Customers</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  usageStats.customers.percentage > 80
                    ? "bg-red-500"
                    : usageStats.customers.percentage > 60
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${usageStats.customers.percentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {usageStats.customers.used} / {usageStats.customers.limit}
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Recommendation */}
      {recommendedPlan && (
        <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">
            Recommended Upgrade
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold text-blue-900">
                {recommendedPlan.name}
              </h4>
              <p className="text-blue-700">{recommendedPlan.description}</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                ${recommendedPlan.price_monthly}
                <span className="text-sm font-normal text-blue-500">
                  /month
                </span>
              </p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Upgrade Now
            </Button>
          </div>
        </div>
      )}

      {/* Plan Comparison */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Available Plans</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {subscriptionPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-4 ${
                currentPlan?.id === plan.id
                  ? "ring-2 ring-blue-500 border-blue-500"
                  : ""
              }`}
            >
              <div className="text-center mb-4">
                <h4 className="font-bold">{plan.name}</h4>
                <p className="text-2xl font-bold text-blue-600">
                  ${plan.price_monthly}
                  <span className="text-sm font-normal text-gray-500">
                    /month
                  </span>
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Appointments:</span>
                  <span>
                    {plan.max_appointments_per_month === -1
                      ? "Unlimited"
                      : plan.max_appointments_per_month}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Team Members:</span>
                  <span>
                    {plan.max_team_members === -1
                      ? "Unlimited"
                      : plan.max_team_members}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Services:</span>
                  <span>
                    {plan.max_services === -1 ? "Unlimited" : plan.max_services}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Customers:</span>
                  <span>
                    {plan.max_customers === -1
                      ? "Unlimited"
                      : plan.max_customers}
                  </span>
                </div>
              </div>

              <Button
                className="w-full mt-4"
                variant={currentPlan?.id === plan.id ? "outline" : "default"}
                disabled={currentPlan?.id === plan.id}
              >
                {currentPlan?.id === plan.id ? "Current Plan" : "Select Plan"}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
