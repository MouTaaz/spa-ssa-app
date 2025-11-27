hat-- Migration: Fix push_subscriptions upsert constraint
-- Description: Add unique constraint on user_id for proper upsert functionality
-- Date: 2024

-- Add unique constraint on user_id to allow upsert with onConflict: 'user_id'
ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_user_id_unique UNIQUE (user_id);

-- Update the conflict resolution in the frontend code will need to be changed to 'user_id'
