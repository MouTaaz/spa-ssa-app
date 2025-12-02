-- Migration: Add multi-device subscription fields
-- Description: Add fields to support multiple devices per user with dynamic scope management
-- Date: 2024

-- Add new columns to push_subscriptions for multi-device support
ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS device_type text CHECK (device_type IN ('browser', 'pwa', 'native')),
ADD COLUMN IF NOT EXISTS device_name text,
ADD COLUMN IF NOT EXISTS scope text DEFAULT '/',
ADD COLUMN IF NOT EXISTS installed_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- Create index on user_id for faster device listing queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
ON public.push_subscriptions(user_id);

-- Create index on scope for scope-aware queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_scope
ON public.push_subscriptions(scope);

-- Create composite index for active subscriptions per user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
ON public.push_subscriptions(user_id, push_active)
WHERE push_active = true;

-- Create index on last_active_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_active
ON public.push_subscriptions(last_active_at);

-- Add comment documenting the multi-device structure
COMMENT ON COLUMN public.push_subscriptions.device_type IS 'Type of device: browser, pwa (installed), or native';
COMMENT ON COLUMN public.push_subscriptions.device_name IS 'Human-readable device name (e.g., "Chrome on macOS (browser)")';
COMMENT ON COLUMN public.push_subscriptions.scope IS 'Service worker scope (e.g., "/" for root)';
COMMENT ON COLUMN public.push_subscriptions.installed_at IS 'When the device was first registered';
COMMENT ON COLUMN public.push_subscriptions.last_active_at IS 'Last time this device was active';
