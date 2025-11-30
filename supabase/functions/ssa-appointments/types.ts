// ========================================
// TYPE DEFINITIONS
// ========================================

export interface AppointmentData {
  external_id: string;
  business_id: string;
  status: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  vehicle_make_model: string | null;
  start_time: string | null;
  end_time: string | null;
  service_name: string;
  location: string;
  customer_notes: string | null;
  web_meeting_url: string | null;
  raw_payload: any;
  source: string;
  updated_at: string;
  previous_external_id?: string;
}

export interface WebhookPayload {
  action_verb: string;
  appointment?: any;
  signature?: {
    site_name?: string;
    token?: string;
    site_url?: string;
  };
  team_members?: any[];
}

export interface NotificationPayload {
  title: string;
  body: string;
  type: string;
  url?: string;
  appointmentId?: string;
  customerPhone?: string;
}

export interface UserProfile {
  email: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  onesignal_player_id?: string;
  onesignal_external_user_id?: string;
  push_active: boolean;
}