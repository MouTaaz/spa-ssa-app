# Push Notifications Implementation Plan

## Current Status

- Push notification system exists with hooks, components, and service worker
- VAPID key fetching calls `/vapid-public-key` (likely non-existent endpoint)
- Permission request and subscription functions exist but not integrated into onboarding
- PushSubscriptionManager component exists but not in main settings flow
- Service worker handles push events correctly

## Tasks to Complete

### 1. Fix VAPID Key Fetching

- [x] Update `src/lib/notifications.ts` to call Supabase Edge Function endpoint `/functions/v1/vapid-public-key`
- [x] Add proper error handling for Edge Function unavailability

### 2. Add Permission Flow to Onboarding

- [ ] Create new onboarding step for push notifications in `src/components/onboarding/OnboardingManager.tsx`
- [ ] Add permission request UI with user-friendly explanations
- [ ] Handle all permission states (granted, denied, default)

### 3. Integrate Push Settings into Main Settings

- [ ] Add push notification toggle to `src/components/settings/business-settings.tsx`
- [ ] Integrate PushSubscriptionManager component into settings tabs
- [ ] Add platform detection and analytics

### 4. Improve Subscription Triggers

- [ ] Update `src/hooks/usePushNotifications.ts` to trigger subscription checks at login
- [ ] Ensure subscription process waits for service worker readiness
- [ ] Add subscription triggers for appointment actions

### 5. Add Error Handling and User Feedback

- [ ] Add user-friendly error messages throughout the flow
- [ ] Handle Edge Function failures gracefully
- [ ] Provide clear feedback for permission states

## Followup Steps

- [ ] Test notification flow on mobile devices
- [ ] Verify Edge Function responses
- [ ] Debug service worker registration
- [ ] Check subscription persistence
