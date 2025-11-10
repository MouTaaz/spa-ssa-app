import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  useAppStore,
  SubscriptionPlan,
  SubscriptionUsage,
  Business,
} from "@/lib/store";

export interface SubscriptionLimits {
  maxTeamMembers: number;
  maxAppointmentsPerMonth: number;
  maxServices: number;
  maxCustomers: number;
  features: Record<string, boolean>;
}

export interface UsageStats {
  appointments: { used: number; limit: number; percentage: number };
  teamMembers: { used: number; limit: number; percentage: number };
  services: { used: number; limit: number; percentage: number };
  customers: { used: number; limit: number; percentage: number };
}

export function useSubscription() {
  const {
    currentBusiness,
    subscriptionPlans,
    setSubscriptionPlans,
    currentUsage,
    setCurrentUsage,
    businessMembers,
    businessServices,
    appointments,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load subscription data on mount or business change
  useEffect(() => {
    if (currentBusiness?.id) {
      loadSubscriptionPlans();
    }
  }, [currentBusiness?.id]);

  // Load usage data after subscription plans are loaded
  useEffect(() => {
    if (currentBusiness?.id && subscriptionPlans.length > 0) {
      // Check if the business has unlimited limits directly from business data
      // or if the plan is unlimited
      const isUnlimitedFromBusiness =
        currentBusiness.max_appointments_per_month === -1 ||
        currentBusiness.max_appointments_per_month === null;

      const plan = subscriptionPlans.find(
        (plan) => plan.name === currentBusiness.subscription_tier
      );
      const isUnlimitedFromPlan = plan?.max_appointments_per_month === -1;

      // For unlimited plans (like enterprise), don't load usage data at all
      if (isUnlimitedFromBusiness || isUnlimitedFromPlan) {
        setCurrentUsage(null);
        return;
      }

      // Only load usage for limited plans
      loadCurrentUsage();
    }
  }, [
    currentBusiness?.id,
    subscriptionPlans,
    currentBusiness?.subscription_tier,
    currentBusiness?.max_appointments_per_month,
  ]);

  const loadSubscriptionPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;

      setSubscriptionPlans(data || []);
    } catch (err) {
      console.error("Failed to load subscription plans:", err);
    }
  };

  const loadCurrentUsage = async () => {
    if (!currentBusiness?.id) return;

    // Get the current plan directly from subscriptionPlans
    const plan = subscriptionPlans.find(
      (plan) => plan.name === currentBusiness.subscription_tier
    );

    // For unlimited plans, don't load usage data
    if (plan?.max_appointments_per_month === -1) {
      setCurrentUsage(null);
      return;
    }

    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("subscription_usage")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .gte("period_start", `${currentMonth}-01`)
        .lte("period_start", `${currentMonth}-31`);

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data && data.length > 0) {
        setCurrentUsage(data[0]);
      } else {
        // For unlimited plans, don't try to create usage records
        if (plan?.max_appointments_per_month === -1) {
          setCurrentUsage(null);
          return;
        }
        // Create usage record if it doesn't exist (only for limited plans)
        await createCurrentUsageRecord();
      }
    } catch (err) {
      console.error("Failed to load current usage:", err);
      // For unlimited plans, silently ignore errors
      if (plan?.max_appointments_per_month === -1) {
        setCurrentUsage(null);
      }
    }
  };

  const createCurrentUsageRecord = async () => {
    if (!currentBusiness?.id) return;

    // First check if business exists in the businesses table
    try {
      const { data: businessExists, error: businessCheckError } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", currentBusiness.id)
        .single();

      if (businessCheckError || !businessExists) {
        console.warn("Business not found in database, skipping usage record creation");
        return;
      }
    } catch (err) {
      console.warn("Error checking business existence:", err);
      return;
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    try {
      const { data, error } = await supabase
        .from("subscription_usage")
        .insert({
          business_id: currentBusiness.id,
          period_start: periodStart.toISOString().split("T")[0],
          period_end: periodEnd.toISOString().split("T")[0],
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentUsage(data);
    } catch (err) {
      console.error("Failed to create usage record:", err);
    }
  };

  const updateUsage = async (updates: Partial<SubscriptionUsage>) => {
    if (!currentUsage?.id) return;

    try {
      const { data, error } = await supabase
        .from("subscription_usage")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUsage.id)
        .select()
        .single();

      if (error) throw error;

      setCurrentUsage(data);
    } catch (err) {
      console.error("Failed to update usage:", err);
    }
  };

  const getCurrentPlan = (): SubscriptionPlan | null => {
    if (!currentBusiness || !subscriptionPlans.length) return null;

    return (
      subscriptionPlans.find(
        (plan) => plan.name === currentBusiness.subscription_tier
      ) || null
    );
  };

  const getSubscriptionLimits = (): SubscriptionLimits => {
    const plan = getCurrentPlan();

    if (!plan) {
      // Free tier defaults
      return {
        maxTeamMembers: 1,
        maxAppointmentsPerMonth: 50,
        maxServices: 5,
        maxCustomers: 100,
        features: {
          basic_scheduling: true,
          customer_management: true,
          email_notifications: true,
          mobile_app: true,
          basic_reporting: true,
        },
      };
    }

    return {
      maxTeamMembers: plan.max_team_members,
      maxAppointmentsPerMonth: plan.max_appointments_per_month,
      maxServices: plan.max_services,
      maxCustomers: plan.max_customers,
      features: plan.features,
    };
  };

  const getUsageStats = (): UsageStats => {
    const limits = getSubscriptionLimits();

    // For unlimited plans, show total counts instead of monthly
    const isUnlimited = limits.maxAppointmentsPerMonth === -1;
    const appointmentsCount = isUnlimited
      ? appointments.length // Total count for unlimited
      : appointments.filter((apt) =>
          apt.created_at.startsWith(
            new Date().toISOString().split("T")[0].slice(0, 7)
          )
        ).length; // Monthly count for limited

    const teamMembersCount = businessMembers.filter(
      (member) => member.status === "active"
    ).length;

    const servicesCount = businessServices.length;

    // For customers, we'll use a simple count based on unique customer emails in appointments
    const customerEmails = new Set(
      appointments.map((apt) => apt.customer_email).filter((email) => email)
    );
    const customersCount = customerEmails.size;

    return {
      appointments: {
        used: appointmentsCount,
        limit: limits.maxAppointmentsPerMonth,
        percentage:
          limits.maxAppointmentsPerMonth > 0
            ? Math.min(
                (appointmentsCount / limits.maxAppointmentsPerMonth) * 100,
                100
              )
            : 0,
      },
      teamMembers: {
        used: teamMembersCount,
        limit: limits.maxTeamMembers,
        percentage:
          limits.maxTeamMembers > 0
            ? Math.min((teamMembersCount / limits.maxTeamMembers) * 100, 100)
            : 0,
      },
      services: {
        used: servicesCount,
        limit: limits.maxServices,
        percentage:
          limits.maxServices > 0
            ? Math.min((servicesCount / limits.maxServices) * 100, 100)
            : 0,
      },
      customers: {
        used: customersCount,
        limit: limits.maxCustomers,
        percentage:
          limits.maxCustomers > 0
            ? Math.min((customersCount / limits.maxCustomers) * 100, 100)
            : 0,
      },
    };
  };

  const canPerformAction = (action: string): boolean => {
    const limits = getSubscriptionLimits();

    switch (action) {
      case "add_team_member":
        return (
          limits.maxTeamMembers === -1 ||
          businessMembers.filter((m) => m.status === "active").length <
            limits.maxTeamMembers
        );
      case "create_appointment":
        return (
          limits.maxAppointmentsPerMonth === -1 ||
          appointments.length < limits.maxAppointmentsPerMonth
        );
      case "add_service":
        return (
          limits.maxServices === -1 ||
          businessServices.length < limits.maxServices
        );
      default:
        return true;
    }
  };

  const hasFeature = (feature: string): boolean => {
    const limits = getSubscriptionLimits();
    return limits.features[feature] === true;
  };

  const isNearLimit = (action: string): boolean => {
    const stats = getUsageStats();

    switch (action) {
      case "appointments":
        return stats.appointments.percentage >= 80;
      case "team_members":
        return stats.teamMembers.percentage >= 80;
      case "services":
        return stats.services.percentage >= 80;
      case "customers":
        return stats.customers.percentage >= 80;
      default:
        return false;
    }
  };

  const getUpgradeRecommendation = (): SubscriptionPlan | null => {
    const currentPlan = getCurrentPlan();
    const stats = getUsageStats();

    // Find the next plan that would solve the most pressing limit
    const nextPlans = subscriptionPlans
      .filter((plan) => plan.sort_order > (currentPlan?.sort_order || 0))
      .sort((a, b) => a.sort_order - b.sort_order);

    for (const plan of nextPlans) {
      if (
        (stats.appointments.percentage >= 80 &&
          plan.max_appointments_per_month > stats.appointments.limit) ||
        (stats.teamMembers.percentage >= 80 &&
          plan.max_team_members > stats.teamMembers.limit) ||
        (stats.services.percentage >= 80 &&
          plan.max_services > stats.services.limit) ||
        (stats.customers.percentage >= 80 &&
          plan.max_customers > stats.customers.limit)
      ) {
        return plan;
      }
    }

    return nextPlans[0] || null;
  };

  return {
    subscriptionPlans,
    currentUsage,
    currentPlan: getCurrentPlan(),
    limits: getSubscriptionLimits(),
    usageStats: getUsageStats(),
    loading,
    error,
    canPerformAction,
    hasFeature,
    isNearLimit,
    getUpgradeRecommendation,
    loadSubscriptionPlans,
    loadCurrentUsage,
    updateUsage,
  };
}
