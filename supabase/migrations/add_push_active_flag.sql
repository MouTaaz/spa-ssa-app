-- Add push_active flag to push_subscriptions table to track active subscriptions
ALTER TABLE public.push_subscriptions
ADD COLUMN push_active boolean DEFAULT true;

-- Set existing subscriptions with null player_id as inactive (likely invalid)
UPDATE public.push_subscriptions
SET push_active = false
WHERE onesignal_player_id IS NULL;
