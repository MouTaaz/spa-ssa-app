# PWA iOS & OneSignal Configuration - Implementation Checklist

## Status: ✅ COMPLETED

### Phase 1: Critical Fixes ✅

- [x] Create proper manifest.json with iOS support
- [x] Fix index.html (remove duplicates, add iOS meta tags)
- [x] Update vite.config.ts for proper PWA generation
- [x] Fix service worker registration in app.tsx
- [x] Update sw.js for OneSignal compatibility
- [x] **FIXED**: Remove OneSignal SDK import from custom service worker to prevent scope conflicts

### Phase 2: OneSignal iOS Enhancement ✅

- [x] Enhance notifications.ts with better iOS support
- [x] Add Safari Web ID configuration
- [x] Improve iOS permission handling

### Phase 3: Testing & Verification

- [ ] Test PWA installation on iOS
- [ ] Test push notifications on iOS
- [ ] Verify service worker registration
- [ ] Test OneSignal player ID registration

---

## Changes Summary:

### 1. Created `public/manifest.json` ✅

- Complete PWA manifest with iOS-compatible configuration
- Proper icons (96x96, 192x192, 512x512, maskable variants)
- Screenshots for app stores
- Shortcuts for quick actions
- Display mode: standalone for native app feel

### 2. Fixed `index.html` ✅

- **REMOVED**: 4 duplicate service worker registrations
- **REMOVED**: Incorrect manifest path
- **REMOVED**: Duplicate OneSignal script tag
- **ADDED**: iOS-specific meta tags (apple-mobile-web-app-\*)
- **ADDED**: Apple touch icons for all iOS devices
- **ADDED**: Proper viewport configuration with viewport-fit=cover
- **ADDED**: Microsoft/Android meta tags

### 3. Updated `vite.config.ts` ✅

- Configured VitePWA plugin with injectManifest strategy
- Added manifest generation with all required fields
- Excluded OneSignalSDKWorker.js from precache
- Added OneSignal CDN to runtime caching
- Proper service worker scope configuration

### 4. Rewrote `public/sw.js` ✅

- Complete rewrite for OneSignal compatibility
- Skips OneSignal requests to avoid conflicts
- Network-first strategy for API calls
- Cache-first strategy for static assets
- Proper push notification handling
- Notification click handling with URL navigation

### 5. Enhanced `src/app.tsx` ✅

- Fixed service worker registration (removed duplicates)
- Increased OneSignal initialization delay for iOS (1000ms)
- Better error handling and logging
- Proper service worker ready check

### 6. Enhanced `src/lib/notifications.ts` ✅

- Added Safari Web ID configuration support
- iOS-specific OneSignal configuration
- Explicit service worker path for iOS
- Better platform detection logging
- Enhanced error messages and debugging

---

## Environment Variables Required:

Add these to your `.env` file:

```env
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id
VITE_ONESIGNAL_SAFARI_WEB_ID=your_safari_web_id  # Required for iOS
```

---

## Next Steps for Testing:

### 1. Build and Deploy

```bash
npm run build
# Deploy to your hosting platform
```

### 2. Test on iOS Safari

- Open the app in iOS Safari
- Check for "Add to Home Screen" option
- Install the PWA
- Test push notification permissions
- Verify OneSignal player ID registration

### 3. Test on Android Chrome

- Open the app in Chrome
- Check for install prompt
- Install the PWA
- Test push notifications

### 4. Verify in OneSignal Dashboard

- Check if devices are registering
- Send test notifications
- Verify delivery status

---

## iOS-Specific Notes:

1. **Safari Web ID**: Required for iOS push notifications. Get this from OneSignal dashboard under Settings > Platforms > Apple Safari.

2. **HTTPS Required**: iOS requires HTTPS for PWA features and push notifications.

3. **Add to Home Screen**: Users must manually add the PWA to home screen on iOS (no automatic prompt).

4. **Service Worker Scope**: iOS is strict about service worker scope. Our configuration uses root scope ("/").

5. **Icons**: iOS uses apple-touch-icon tags. We've added multiple sizes for different devices.

---

## Troubleshooting:

### Issue: PWA not installing on iOS

- Verify HTTPS is enabled
- Check manifest.json is accessible at /manifest.json
- Ensure all icons exist and are accessible

### Issue: Push notifications not working on iOS

- Verify VITE_ONESIGNAL_SAFARI_WEB_ID is set
- Check OneSignal dashboard for Safari Web Push configuration
- Ensure user has granted notification permission

### Issue: Service worker conflicts

- Clear browser cache and service workers
- Check browser console for errors
- Verify OneSignalSDKWorker.js is accessible

---

## Files Modified:

1. ✅ `public/manifest.json` - CREATED
2. ✅ `index.html` - FIXED (removed duplicates, added iOS tags)
3. ✅ `vite.config.ts` - ENHANCED (PWA configuration)
4. ✅ `public/sw.js` - REWRITTEN (OneSignal compatible)
5. ✅ `src/app.tsx` - FIXED (SW registration)
6. ✅ `src/lib/notifications.ts` - ENHANCED (iOS support)
