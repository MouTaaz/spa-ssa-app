-- Migration: Remove user_id unique constraint to enable multi-device subscriptions
-- Description: Remove the unique constraint on user_id to allow multiple devices per user
-- Date: 2024

-- Drop the unique constraint on user_id to allow multiple subscriptions per user
ALTER TABLE public.push_subscriptions
DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_unique;

-- Add composite unique constraint on (user_id, onesignal_player_id) to prevent duplicate device registrations
ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_user_device_unique UNIQUE (user_id, onesignal_player_id);
