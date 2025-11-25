# OneSignal Frontend Migration TODO

## ✅ Completed Tasks

- [x] Backend OneSignal migration (edge function and database)
- [x] OneSignal SDK installed (react-onesignal)
- [x] Update src/lib/notifications.ts - Replace VAPID with OneSignal
- [x] Update src/hooks/usePushNotifications.ts - OneSignal subscription management
- [x] Add OneSignal initialization to src/app.tsx
- [x] Update src/components/notifications/notification-settings.tsx
- [x] Update src/components/onboarding/PushNotificationSetup.tsx
- [x] Database migration executed
- [x] Supabase environment variables set
- [x] Frontend environment variable added (.env.local)
- [x] Create vercel.json to fix 404 errors on page refresh for SPA routing

## 📋 Remaining Setup Steps

- [ ] Configure OneSignal app settings (service worker path, localhost permission)
- [ ] Test complete OneSignal integration
