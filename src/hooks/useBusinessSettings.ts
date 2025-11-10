import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  useAppStore,
  BusinessSettings,
  BusinessService,
  BlockedSlot,
  BusinessHoursNew,
  NotificationSettings,
} from "@/lib/store";
import { useSubscription } from "./useSubscription";

export function useBusinessSettings() {
  const {
    currentBusiness,
    businessSettings,
    setBusinessSettings,
    businessServices,
    setBusinessServices,
    blockedSlots,
    setBlockedSlots,
    businessHoursNew,
    setBusinessHoursNew,
    notificationSettings,
    setNotificationSettings,
  } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { canPerformAction } = useSubscription();

  // Load business settings on mount or when business changes
  useEffect(() => {
    if (currentBusiness?.id) {
      loadBusinessSettings();
      loadBusinessServices();
      loadBlockedSlots();
      loadBusinessHours();
      loadNotificationSettings();
    }
  }, [currentBusiness?.id]);

  const loadBusinessSettings = async () => {
    if (!currentBusiness?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setBusinessSettings(data);
      } else {
        // Create default settings if none exist
        const defaultSettings: BusinessSettings = {
          business_name: currentBusiness.name,
          business_email: currentBusiness.email || "",
          business_phone: currentBusiness.phone || "",
          business_address: currentBusiness.address || "",
          website: currentBusiness.website || "",
          appointment_interval_minutes: 30,
          buffer_time_minutes: 15,
          default_appointment_duration_minutes: 60,
          max_appointments_per_day: 10,
        };
        setBusinessSettings(defaultSettings);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load business settings"
      );
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessSettings = async (settings: BusinessSettings) => {
    if (!currentBusiness?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("business_settings")
        .upsert({
          ...settings,
          business_id: currentBusiness.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setBusinessSettings(data);
      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save business settings"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessServices = async () => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from("business_services")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      setBusinessServices(data || []);
    } catch (err) {
      console.error("Failed to load business services:", err);
    }
  };

  const saveBusinessService = async (service: BusinessService) => {
    if (!currentBusiness?.id) return;

    // Check subscription limits before saving
    if (!canPerformAction("add_service")) {
      throw new Error(
        "Service limit reached for your current plan. Please upgrade to add more services."
      );
    }

    try {
      const { data, error } = await supabase
        .from("business_services")
        .upsert({
          ...service,
          business_id: currentBusiness.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      if (service.id) {
        useAppStore.getState().updateBusinessService(service.id, data);
      } else {
        useAppStore.getState().addBusinessService(data);
      }

      return data;
    } catch (err) {
      throw err;
    }
  };

  const deleteBusinessService = async (id: string) => {
    if (!currentBusiness?.id) return;

    try {
      const { error } = await supabase
        .from("business_services")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("business_id", currentBusiness.id);

      if (error) throw error;

      useAppStore.getState().removeBusinessService(id);
    } catch (err) {
      throw err;
    }
  };

  const loadBlockedSlots = async () => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from("blocked_slots")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .gte("end_time", new Date().toISOString())
        .order("start_time");

      if (error) throw error;

      setBlockedSlots(data || []);
    } catch (err) {
      console.error("Failed to load blocked slots:", err);
    }
  };

  const saveBlockedSlot = async (slot: BlockedSlot) => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from("blocked_slots")
        .insert({
          ...slot,
          business_id: currentBusiness.id,
        })
        .select()
        .single();

      if (error) throw error;

      useAppStore.getState().addBlockedSlot(data);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const deleteBlockedSlot = async (id: string) => {
    if (!currentBusiness?.id) return;

    try {
      const { error } = await supabase
        .from("blocked_slots")
        .delete()
        .eq("id", id)
        .eq("business_id", currentBusiness.id);

      if (error) throw error;

      useAppStore.getState().removeBlockedSlot(id);
    } catch (err) {
      throw err;
    }
  };

  const loadBusinessHours = async () => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from("business_hours")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .order("day_of_week");

      if (error) throw error;

      setBusinessHoursNew(data || []);
    } catch (err) {
      console.error("Failed to load business hours:", err);
    }
  };

  const saveBusinessHour = async (hour: BusinessHoursNew) => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from("business_hours")
        .upsert({
          ...hour,
          business_id: currentBusiness.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      if (hour.id) {
        useAppStore.getState().updateBusinessHour(hour.id, data);
      } else {
        useAppStore.getState().addBusinessHour(data);
      }

      return data;
    } catch (err) {
      throw err;
    }
  };

  const deleteBusinessHour = async (id: string) => {
    if (!currentBusiness?.id) return;

    try {
      const { error } = await supabase
        .from("business_hours")
        .delete()
        .eq("id", id)
        .eq("business_id", currentBusiness.id);

      if (error) throw error;

      useAppStore.getState().removeBusinessHour(id);
    } catch (err) {
      throw err;
    }
  };

  const loadNotificationSettings = async () => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setNotificationSettings(data);
      } else {
        // Create default settings if none exist
        const defaultSettings: NotificationSettings = {
          email_enabled: true,
          sms_enabled: false,
          email_reminders: true,
          sms_reminders: false,
          email_confirmations: true,
          sms_confirmations: false,
          reminder_hours_before: 24,
        };
        setNotificationSettings(defaultSettings);
      }
    } catch (err) {
      console.error("Failed to load notification settings:", err);
    }
  };

  const saveNotificationSettings = async (settings: NotificationSettings) => {
    if (!currentBusiness?.id) return;

    try {
      const { data, error } = await supabase
        .from("notification_settings")
        .upsert({
          ...settings,
          business_id: currentBusiness.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setNotificationSettings(data);
      return data;
    } catch (err) {
      throw err;
    }
  };

  return {
    businessSettings,
    businessServices,
    blockedSlots,
    businessHoursNew,
    notificationSettings,
    loading,
    error,
    loadBusinessSettings,
    saveBusinessSettings,
    loadBusinessServices,
    saveBusinessService,
    deleteBusinessService,
    loadBlockedSlots,
    saveBlockedSlot,
    deleteBlockedSlot,
    loadBusinessHours,
    saveBusinessHour,
    deleteBusinessHour,
    loadNotificationSettings,
    saveNotificationSettings,
  };
}
