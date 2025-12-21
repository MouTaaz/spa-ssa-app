-- Migration: Fix Push Subscriptions Constraints for OneSignal
-- Description: Resolves unique constraint conflicts and improves OneSignal compatibility
-- Date: 2024
-- Issue: Multiple UNIQUE constraints causing insert failures with OneSignal

-- Step 1: Drop the endpoint unique constraint
-- Reason: OneSignal doesn't use traditional web push endpoints, and NULL endpoints conflict
ALTER TABLE public.push_subscriptions
DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_key;

-- Step 2: Create a partial unique index on endpoint (only for non-NULL values)
-- This allows multiple NULL endpoints while maintaining uniqueness for actual endpoints
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint_unique
ON public.push_subscriptions(endpoint)
WHERE endpoint IS NOT NULL;

-- Step 3: Ensure the onesignal_player_id unique constraint exists
-- This is critical for OneSignal to work properly
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_onesignal_player_id'
  ) THEN
    ALTER TABLE public.push_subscriptions
    ADD CONSTRAINT unique_onesignal_player_id UNIQUE (onesignal_player_id);
  END IF;
END $$;

-- Step 4: Create a partial unique index on onesignal_player_id (only for non-NULL values)
-- This prevents conflicts when player_id is NULL during initial subscription
DROP INDEX IF EXISTS idx_push_subscriptions_onesignal_player_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_onesignal_player_id_unique
ON public.push_subscriptions(onesignal_player_id)
WHERE onesignal_player_id IS NOT NULL;

-- Step 5: Update the composite unique constraint to be partial
-- Only enforce uniqueness when onesignal_player_id is NOT NULL
ALTER TABLE public.push_subscriptions
DROP CONSTRAINT IF EXISTS push_subscriptions_user_device_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_device_unique
ON public.push_subscriptions(user_id, onesignal_player_id)
WHERE onesignal_player_id IS NOT NULL;

-- Step 6: Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- Step 7: Add helpful comments
COMMENT ON INDEX idx_push_subscriptions_endpoint_unique IS 'Partial unique index: ensures endpoint uniqueness only for non-NULL values';
COMMENT ON INDEX idx_push_subscriptions_onesignal_player_id_unique IS 'Partial unique index: ensures OneSignal player ID uniqueness only for non-NULL values';
COMMENT ON INDEX idx_push_subscriptions_user_device_unique IS 'Partial unique index: ensures one subscription per user-device combination when player_id is available';

-- Step 8: Clean up any duplicate or invalid records (optional, run with caution)
-- This removes subscriptions with NULL player_id that are older than 1 hour
-- Uncomment if you want to clean up stale records
-- DELETE FROM public.push_subscriptions
-- WHERE onesignal_player_id IS NULL 
-- AND created_at < now() - interval '1 hour';

-- Step 9: Verify the changes
DO $$
DECLARE
  constraint_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Count unique constraints
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE conrelid = 'public.push_subscriptions'::regclass
  AND contype = 'u';
  
  -- Count unique indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'push_subscriptions'
  AND indexdef LIKE '%UNIQUE%';
  
  RAISE NOTICE 'Push subscriptions table has % unique constraints and % unique indexes', constraint_count, index_count;
END $$;
