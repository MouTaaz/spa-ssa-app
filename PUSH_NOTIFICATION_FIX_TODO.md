# Push Notification Fix - Implementation Checklist

## Issue Summary

Push notifications not working on deployed app (https://spa-ssa-app.vercel.app/). No data being stored in `push_subscriptions` table even after enabling notifications.

## Root Causes Identified

1. ✅ Multiple conflicting UNIQUE constraints on `push_subscriptions` table
2. ✅ Endpoint UNIQUE constraint conflicts with OneSignal (which uses NULL endpoints)
3. ✅ Upsert logic fails when player_id is not immediately available
4. ✅ Missing proper error handling and logging
5. ✅ Timing issues with OneSignal player ID generation

## Implementation Steps

### Phase 1: Database Migration ✅

- [x] Create migration file: `fix_push_subscriptions_constraints.sql`
- [x] Drop `push_subscriptions_endpoint_key` constraint
- [x] Create partial unique index on endpoint (only for non-NULL values)
- [x] Create partial unique index on onesignal_player_id (only for non-NULL values)
- [x] Update composite unique constraint to be partial
- [x] Add updated_at trigger

### Phase 2: Code Updates ✅

- [x] Update `multi-device-subscriptions.ts`:

  - [x] Accept NULL player_id parameter
  - [x] Implement 3-strategy registration approach
  - [x] Add comprehensive error logging with [REGISTER] prefix
  - [x] Handle unique constraint violations gracefully
  - [x] Add retry logic for race conditions

- [x] Update `notifications.ts`:
  - [x] Improve `saveOneSignalSubscription` function
  - [x] Add comprehensive logging with [SAVE] prefix
  - [x] Support NULL player_id registration
  - [x] Increase retry attempts and delays
  - [x] Add detailed error messages

### Phase 3: Deployment & Testing ⏳

- [ ] **CRITICAL: Run the database migration**

  ```sql
  -- Connect to your Supabase project and run:
  -- supabase/migrations/fix_push_subscriptions_constraints.sql
  ```

- [ ] Deploy updated code to Vercel

  ```bash
  git add .
  git commit -m "fix: resolve push notification subscription issues"
  git push origin main
  ```

- [ ] Test on deployed app:
  - [ ] Clear browser cache and cookies
  - [ ] Delete existing push_subscriptions records for test user
  - [ ] Delete user from OneSignal dashboard
  - [ ] Test push notification enable flow
  - [ ] Verify data appears in push_subscriptions table
  - [ ] Check browser console for detailed logs

### Phase 4: Verification Checklist 📋

#### Database Verification

- [ ] Confirm migration ran successfully
- [ ] Verify constraints are updated:
  ```sql
  SELECT conname, contype
  FROM pg_constraint
  WHERE conrelid = 'public.push_subscriptions'::regclass;
  ```
- [ ] Verify indexes are created:
  ```sql
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'push_subscriptions';
  ```

#### Functional Testing

- [ ] **Desktop Browser (Chrome/Edge)**:

  - [ ] Enable push notifications
  - [ ] Verify player_id is retrieved
  - [ ] Verify record inserted in database
  - [ ] Check all fields are populated correctly

- [ ] **Mobile Browser (iOS Safari)**:

  - [ ] Enable push notifications
  - [ ] Verify player_id is retrieved (may take longer)
  - [ ] Verify record inserted in database
  - [ ] Test with PWA installed

- [ ] **Mobile Browser (Android Chrome)**:
  - [ ] Enable push notifications
  - [ ] Verify player_id is retrieved
  - [ ] Verify record inserted in database
  - [ ] Test with PWA installed

#### Console Log Verification

Look for these log patterns in browser console:

**Successful Flow:**

```
🔍 [REGISTER] Starting device subscription registration
  User ID: <uuid>
  Player ID: <player_id> or NULL (will retry)
  Platform: web/ios/android
📱 [REGISTER] Device characteristics:
  Scope: /
  Device Type: browser/pwa/native
  Device Name: Chrome on Windows (browser)
📱 [REGISTER] Subscription data prepared
✅ [REGISTER] Successfully registered via player_id upsert
   Record ID: <uuid>
```

**Error Patterns to Watch:**

```
❌ [REGISTER] Failed to insert new subscription
   Error code: 23505 (unique constraint violation)
❌ [SAVE] OneSignal Player ID not available after retries
```

### Phase 5: Monitoring & Rollback Plan 🔍

#### Success Metrics

- [ ] Push subscriptions successfully saved to database
- [ ] Player IDs populated correctly
- [ ] No unique constraint violations in logs
- [ ] Notifications can be sent successfully

#### If Issues Persist

1. Check Supabase logs for RLS policy violations
2. Verify OneSignal App ID is correct in environment variables
3. Check OneSignal dashboard for subscription status
4. Review browser console for detailed error messages
5. Check Network tab for failed API calls

#### Rollback Plan

If critical issues occur:

```sql
-- Rollback migration (restore original constraints)
ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);

DROP INDEX IF EXISTS idx_push_subscriptions_endpoint_unique;
DROP INDEX IF EXISTS idx_push_subscriptions_onesignal_player_id_unique;
DROP INDEX IF EXISTS idx_push_subscriptions_user_device_unique;
```

## Expected Behavior After Fix

### User Flow

1. User clicks "Enable Push Notifications"
2. Browser requests notification permission
3. User grants permission
4. OneSignal SDK initializes and generates player_id
5. App waits for player_id (with retries)
6. App registers device subscription in database
7. Success message shown to user
8. Record visible in push_subscriptions table

### Database Record Example

```json
{
  "id": "uuid",
  "user_id": "user-uuid",
  "onesignal_player_id": "player-id-from-onesignal",
  "onesignal_external_user_id": "user-uuid",
  "platform": "web",
  "device_type": "browser",
  "device_name": "Chrome on Windows (browser)",
  "scope": "/",
  "user_agent": "Mozilla/5.0...",
  "push_active": true,
  "endpoint": null,
  "p256dh": null,
  "auth": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "installed_at": "2024-01-01T00:00:00Z",
  "last_active_at": "2024-01-01T00:00:00Z"
}
```

## Additional Notes

### Key Improvements

1. **NULL player_id support**: App can now register subscriptions even if player_id isn't immediately available
2. **Better error handling**: Comprehensive logging helps identify issues quickly
3. **Retry logic**: Automatic retries for race conditions and timing issues
4. **Partial unique indexes**: Prevents constraint violations while maintaining data integrity

### Testing Tips

- Use browser DevTools console to see detailed logs
- Use Supabase dashboard to verify database records
- Use OneSignal dashboard to verify player registrations
- Test on multiple devices and browsers
- Clear cache between tests for accurate results

## Support & Troubleshooting

### Common Issues

**Issue: Player ID never retrieved**

- Check OneSignal SDK loaded correctly (Network tab)
- Verify service worker registered (Application tab)
- Check OneSignal App ID is correct
- Try increasing retry attempts in `waitForPlayerId`

**Issue: Database insert fails**

- Check RLS policies allow insert for authenticated users
- Verify user is authenticated
- Check for constraint violations in error logs
- Verify migration ran successfully

**Issue: Notifications not received**

- Verify subscription saved in database
- Check OneSignal dashboard for player status
- Verify notification preferences enabled
- Check browser notification permissions

### Contact

For issues or questions, check:

- Browser console logs (look for [REGISTER] and [SAVE] prefixes)
- Supabase logs
- OneSignal dashboard
- Network tab for failed requests
