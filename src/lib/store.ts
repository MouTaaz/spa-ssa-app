import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  business_name?: string;
  phone?: string;
}

export interface Business {
  id: string;
  name: string;
  owner_id: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logo_url?: string;
  description?: string;
  industry: string;
  timezone: string;
  subscription_tier: string;
  subscription_status: string;
  max_team_members: number;
  max_appointments_per_month: number;
  stripe_customer_id?: string;
  billing_cycle_start?: string;
  billing_cycle_end?: string;
  trial_ends_at?: string;
  canceled_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  created_at: string;
  updated_at: string;
  webhook_secret?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  price_monthly: number;
  price_yearly?: number;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  max_team_members: number;
  max_appointments_per_month: number;
  max_services: number;
  max_customers: number;
  features: Record<string, any>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsage {
  id: string;
  business_id: string;
  period_start: string;
  period_end: string;
  appointments_count: number;
  team_members_count: number;
  services_count: number;
  customers_count: number;
  storage_used_mb: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: "owner" | "manager" | "mechanic" | "receptionist";
  status: "active" | "inactive" | "pending";
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  permissions: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: User;
}

export interface BusinessHours {
  monday: { open: string; close: string; enabled: boolean };
  tuesday: { open: string; close: string; enabled: boolean };
  wednesday: { open: string; close: string; enabled: boolean };
  thursday: { open: string; close: string; enabled: boolean };
  friday: { open: string; close: string; enabled: boolean };
  saturday: { open: string; close: string; enabled: boolean };
  sunday: { open: string; close: string; enabled: boolean };
  appointment_interval_minutes: number;
}

export interface BusinessSettings {
  id?: string;
  business_id?: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  business_address: string;
  website?: string;
  appointment_interval_minutes: number;
  buffer_time_minutes: number;
  default_appointment_duration_minutes: number;
  max_appointments_per_day: number;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessService {
  id?: string;
  business_id?: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BlockedSlot {
  id?: string;
  business_id?: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_at?: string;
}

export interface BusinessHoursNew {
  id?: string;
  business_id?: string;
  day_of_week: number; // 0=Sunday, 1=Monday, etc.
  is_enabled: boolean;
  open_time: string;
  close_time: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationSettings {
  id?: string;
  business_id?: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  email_reminders: boolean;
  sms_reminders: boolean;
  email_confirmations: boolean;
  sms_confirmations: boolean;
  reminder_hours_before: number;
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  external_id: string;
  business_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  service_name: string;
  start_time: string;
  end_time: string;
  status:
    | "BOOKED"
    | "CANCELLED"
    | "RESCHEDULED"
    | "COMPLETED"
    | "CONFIRMED";
  display_status?: "RESCHEDULED" | "EDITED";
  cancellation_type?: "reschedule" | "final";
  vehicle_make_model?: string;
  location?: string;
  customer_notes?: string;
  source?: string;
  web_meeting_url?: string;
  raw_payload?: any;
  created_at: string;
  updated_at: string;
  created_by_user?: boolean;
  was_edited?: boolean;
  if_edited?: boolean;
  edited_by?: string;
  previous_external_id?: string;
  previous_appointment?: any;
}

interface AppStore {
  user: User | null;
  setUser: (user: User | null) => void;
  currentBusiness: Business | null;
  setCurrentBusiness: (business: Business | null) => void;
  userBusinesses: Business[];
  setUserBusinesses: (businesses: Business[]) => void;
  businessMembers: BusinessMember[];
  setBusinessMembers: (members: BusinessMember[]) => void;
  currentUserRole: BusinessMember | null;
  setCurrentUserRole: (role: BusinessMember | null) => void;
  businessHours: BusinessHours;
  setBusinessHours: (hours: BusinessHours) => void;
  businessSettings: BusinessSettings | null;
  setBusinessSettings: (settings: BusinessSettings | null) => void;
  businessServices: BusinessService[];
  setBusinessServices: (services: BusinessService[]) => void;
  addBusinessService: (service: BusinessService) => void;
  updateBusinessService: (
    id: string,
    service: Partial<BusinessService>
  ) => void;
  removeBusinessService: (id: string) => void;
  blockedSlots: BlockedSlot[];
  setBlockedSlots: (slots: BlockedSlot[]) => void;
  addBlockedSlot: (slot: BlockedSlot) => void;
  removeBlockedSlot: (id: string) => void;
  businessHoursNew: BusinessHoursNew[];
  setBusinessHoursNew: (hours: BusinessHoursNew[]) => void;
  addBusinessHour: (hour: BusinessHoursNew) => void;
  updateBusinessHour: (id: string, hour: Partial<BusinessHoursNew>) => void;
  removeBusinessHour: (id: string) => void;
  notificationSettings: NotificationSettings | null;
  setNotificationSettings: (settings: NotificationSettings | null) => void;
  subscriptionPlans: SubscriptionPlan[];
  setSubscriptionPlans: (plans: SubscriptionPlan[]) => void;
  currentUsage: SubscriptionUsage | null;
  setCurrentUsage: (usage: SubscriptionUsage | null) => void;
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => void;
  removeAppointment: (id: string) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  offlineQueue: any[];
  addToOfflineQueue: (action: any) => void;
  clearOfflineQueue: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      currentBusiness: null,
      setCurrentBusiness: (currentBusiness) => set({ currentBusiness }),
      userBusinesses: [],
      setUserBusinesses: (userBusinesses) => set({ userBusinesses }),
      businessMembers: [],
      setBusinessMembers: (businessMembers) => set({ businessMembers }),
      currentUserRole: null,
      setCurrentUserRole: (currentUserRole) => set({ currentUserRole }),
      businessHours: {
        monday: { open: "06:00", close: "18:00", enabled: true },
        tuesday: { open: "06:00", close: "18:00", enabled: true },
        wednesday: { open: "06:00", close: "18:00", enabled: true },
        thursday: { open: "06:00", close: "18:00", enabled: true },
        friday: { open: "06:00", close: "18:00", enabled: true },
        saturday: { open: "08:00", close: "18:00", enabled: true },
        sunday: { open: "00:00", close: "00:00", enabled: false },
        appointment_interval_minutes: 30,
      },
      setBusinessHours: (businessHours) => set({ businessHours }),
      businessSettings: null,
      setBusinessSettings: (businessSettings) => set({ businessSettings }),
      businessServices: [],
      setBusinessServices: (businessServices) => set({ businessServices }),
      addBusinessService: (service) =>
        set((state) => ({
          businessServices: [...state.businessServices, service],
        })),
      updateBusinessService: (id, updates) =>
        set((state) => ({
          businessServices: state.businessServices.map((svc) =>
            svc.id === id ? { ...svc, ...updates } : svc
          ),
        })),
      removeBusinessService: (id) =>
        set((state) => ({
          businessServices: state.businessServices.filter(
            (svc) => svc.id !== id
          ),
        })),
      blockedSlots: [],
      setBlockedSlots: (blockedSlots) => set({ blockedSlots }),
      addBlockedSlot: (slot) =>
        set((state) => ({
          blockedSlots: [...state.blockedSlots, slot],
        })),
      removeBlockedSlot: (id) =>
        set((state) => ({
          blockedSlots: state.blockedSlots.filter((slot) => slot.id !== id),
        })),
      businessHoursNew: [],
      setBusinessHoursNew: (businessHoursNew) => set({ businessHoursNew }),
      addBusinessHour: (hour) =>
        set((state) => ({
          businessHoursNew: [...state.businessHoursNew, hour],
        })),
      updateBusinessHour: (id, updates) =>
        set((state) => ({
          businessHoursNew: state.businessHoursNew.map((hour) =>
            hour.id === id ? { ...hour, ...updates } : hour
          ),
        })),
      removeBusinessHour: (id) =>
        set((state) => ({
          businessHoursNew: state.businessHoursNew.filter(
            (hour) => hour.id !== id
          ),
        })),
      notificationSettings: null,
      setNotificationSettings: (notificationSettings) =>
        set({ notificationSettings }),
      subscriptionPlans: [],
      setSubscriptionPlans: (subscriptionPlans) => set({ subscriptionPlans }),
      currentUsage: null,
      setCurrentUsage: (currentUsage) => set({ currentUsage }),
      appointments: [],
      setAppointments: (appointments) => set({ appointments }),
      addAppointment: (appointment) =>
        set((state) => ({
          appointments: [appointment, ...state.appointments],
        })),
      updateAppointment: (id, updates) =>
        set((state) => ({
          appointments: state.appointments.map((apt) =>
            apt.id === id ? { ...apt, ...updates } : apt
          ),
        })),
      removeAppointment: (id) =>
        set((state) => ({
          appointments: state.appointments.filter((apt) => apt.id !== id),
        })),
      isOnline: navigator.onLine,
      setIsOnline: (online) => set({ isOnline: online }),
      offlineQueue: [],
      addToOfflineQueue: (action) =>
        set((state) => ({
          offlineQueue: [...state.offlineQueue, action],
        })),
      clearOfflineQueue: () => set({ offlineQueue: [] }),
    }),
    {
      name: "ssa-app-store",
      partialize: (state) => ({
        user: state.user,
        currentBusiness: state.currentBusiness,
        userBusinesses: state.userBusinesses,
        businessMembers: state.businessMembers,
        currentUserRole: state.currentUserRole,
        businessHours: state.businessHours,
        businessSettings: state.businessSettings,
        businessServices: state.businessServices,
        blockedSlots: state.blockedSlots,
        businessHoursNew: state.businessHoursNew,
        notificationSettings: state.notificationSettings,
        subscriptionPlans: state.subscriptionPlans,
        currentUsage: state.currentUsage,
        appointments: state.appointments,
        offlineQueue: state.offlineQueue,
      }),
    }
  )
);
