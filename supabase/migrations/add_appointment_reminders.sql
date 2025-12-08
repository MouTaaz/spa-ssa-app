-- Migration: Add appointment reminders table
-- Description: Creates table to track sent appointment reminders and prevent duplicates

CREATE TABLE public.appointment_reminders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  appointment_id uuid NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('morning_prep', 'two_hours', 'one_hour')),
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamptz DEFAULT now(),

  PRIMARY KEY (id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX idx_appointment_reminders_appointment_id ON appointment_reminders(appointment_id);
CREATE INDEX idx_appointment_reminders_status ON appointment_reminders(status);
CREATE INDEX idx_appointment_reminders_scheduled_for ON appointment_reminders(scheduled_for);

-- RLS policies
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;

-- Allow business members to view reminders for their business appointments
CREATE POLICY "Business members can view appointment reminders" ON appointment_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN business_members bm ON bm.business_id = a.business_id
      WHERE a.id = appointment_reminders.appointment_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
    )
  );
