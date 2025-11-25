-- Migration: Add OneSignal Support to Push Notifications
-- Description: Adds OneSignal-specific columns and updates notification settings
-- Date: 2024

-- Step 1: Add OneSignal columns to push_subscriptions table
ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT,
ADD COLUMN IF NOT EXISTS onesignal_external_user_id TEXT;

-- Step 2: Make Web Push fields nullable (since we're using OneSignal now)
ALTER TABLE public.push_subscriptions
ALTER COLUMN endpoint DROP NOT NULL,
ALTER COLUMN p256dh DROP NOT NULL,
ALTER COLUMN auth DROP NOT NULL;

-- Step 3: Add index on OneSignal player ID for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_onesignal_player_id 
ON public.push_subscriptions(onesignal_player_id);

-- Step 4: Add index on OneSignal external user ID for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_onesignal_external_user_id 
ON public.push_subscriptions(onesignal_external_user_id);

-- Step 5: Add push_enabled column to notification_settings table
ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true;

-- Step 6: Add comment to document the changes
COMMENT ON COLUMN public.push_subscriptions.onesignal_player_id IS 'OneSignal Player ID for push notification targeting';
COMMENT ON COLUMN public.push_subscriptions.onesignal_external_user_id IS 'OneSignal External User ID (typically matches user_id)';
COMMENT ON COLUMN public.notification_settings.push_enabled IS 'Enable/disable push notifications for the business';

-- Step 7: Update existing notification_settings records to enable push by default
UPDATE public.notification_settings
SET push_enabled = true
WHERE push_enabled IS NULL;
