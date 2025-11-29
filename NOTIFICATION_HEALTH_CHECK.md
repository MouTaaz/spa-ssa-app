# Deep Notification System Health Check & Fixes

## Issues Identified & Fixed

### 🔴 Critical Issue #1: Missing Appointment Parameter

**Location**: Line 705 in `supabase/functions/ssa-appointments/index.ts`

**Problem**:

```typescript
// WRONG - Only 2 arguments passed
await notificationService.sendAppointmentNotification(
  businessId,
  notificationData
);
```

The function signature expects 3 parameters:

```typescript
async sendAppointmentNotification(businessId: string, notificationData: any, appointment: any)
```

**Impact**:

- The `appointment` object is `undefined` inside the function
- Email generation uses `appointment` object and would fail silently
- No fallback email notifications would be sent

**Fix Applied**:

```typescript
// CORRECT - All 3 arguments passed
await notificationService.sendAppointmentNotification(
  businessId,
  notificationData,
  appointment
);
```

---

### 🔴 Critical Issue #2: Provider Response Not Captured

**Location**: Lines 540-560 in `supabase/functions/ssa-appointments/index.ts` (sendDualNotifications)

**Problem**:
The function was creating push notification requests but NOT capturing the OneSignal provider response:

```typescript
// WRONG - Response not captured from sendPushNotification
const pushResults = await Promise.allSettled(
  userSubscriptions.map((sub) =>
    this.sendPushNotification(sub, notificationData)
  )
);
pushSuccess = pushResults.some(
  (result) => result.status === "fulfilled" && result.value.success
);

// Results object missing providerResponse
results.push({
  userId,
  pushSuccess,
  emailSuccess,
  pushSubscriptions: userSubscriptions.length,
  hasEmail: !!userProfile?.email,
  // ❌ Missing: providerResponse, error
});
```

**Impact**:

- `notification_logs` table would have `provider_response: null` for all entries
- No way to debug OneSignal delivery failures
- Can't see recipient count from OneSignal API response

**Fix Applied**:

```typescript
let providerResponse: any = null;
let pushError: string | null = null;

// Check push results and capture provider response
for (const result of pushResults) {
  if (result.status === "fulfilled" && result.value.success) {
    pushSuccess = true;
    providerResponse = result.value.providerResponse; // ✅ Capture response
    break;
  } else if (result.status === "fulfilled" && result.value.providerResponse) {
    // Capture provider response even if failed
    providerResponse = result.value.providerResponse;
    pushError = result.value.error || "Push notification failed";
  }
}

results.push({
  userId,
  pushSuccess,
  emailSuccess,
  pushSubscriptions: userSubscriptions.length,
  hasEmail: !!userProfile?.email,
  providerResponse: providerResponse, // ✅ Now included
  error:
    pushError ||
    emailError ||
    (pushSuccess || emailSuccess ? null : "No notification sent"), // ✅ Now included
});
```

---

### 🔴 Critical Issue #3: Error Field Missing from Results

**Location**: sendDualNotifications function

**Problem**:
The `logDualNotifications` function references `result.error`:

```typescript
error_message: !result.pushSuccess && !result.emailSuccess ? (result.error || 'Both push and email failed') : null,
```

But the `results` object built by `sendDualNotifications` never included an `error` field, so this would always be `null`.

**Impact**:

- `notification_logs.error_message` always null, even when notifications failed
- No way to see why a notification failed to log

**Fix Applied**: Added `error` field to results object as shown above.

---

## Data Flow Analysis

### Healthy Path (After Fixes)

```
1. Webhook received → handleWebhook()
2. Appointment upserted to DB
3. triggerAppointmentNotification(action, appointment, businessId) called
4. → sendAppointmentNotification(businessId, notificationData, appointment)  ✅ appointment passed
5. → Fetches business members & push subscriptions
6. → sendDualNotifications() called
   a. For each user, calls sendPushNotification() → gets providerResponse ✅
   b. Captures providerResponse in results ✅
   c. Adds error field to results ✅
7. → logDualNotifications() called with complete results
8. → Builds log entries with:
   - provider_response: actual OneSignal response ✅
   - error_message: actual error if failed ✅
9. → INSERT into notification_logs
```

---

## Database Schema Verification

### notification_logs Table Structure

```sql
CREATE TABLE public.notification_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  notification_type TEXT,
  title TEXT,
  body TEXT,
  data JSONB,
  status TEXT,  -- 'sent' or 'failed'
  error_message TEXT,  -- Now properly populated
  provider_response JSONB,  -- Now properly populated
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_method TEXT,  -- 'push', 'email', 'both', 'none'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## Testing Checklist

After deployment, verify:

- [ ] Send test appointment via webhook
- [ ] Check `notification_logs` table for new entry
- [ ] Verify `provider_response` contains OneSignal response JSON
  ```json
  {
    "id": "...",
    "recipients": 1,
    "body": {...}
  }
  ```
- [ ] Verify `error_message` is null for successful sends
- [ ] Verify `status` = 'sent' when push succeeded
- [ ] Verify `delivery_method` = 'push' or 'email' or 'both'

---

## OneSignal Response Structure

When OneSignal API is called, it returns:

```json
{
  "id": "notification_id",
  "recipients": 1,  // Number of devices that will receive
  "body": {...}
}
```

This is now properly captured in `provider_response` field.

---

## RLS Policy Check

Ensure `notification_logs` table RLS allows writes from Edge Function service role:

```sql
-- Service role has access to all tables
-- Check: supabase/functions can write to notification_logs
SELECT * FROM pg_policies
WHERE tablename = 'notification_logs';
```

---

## Files Modified

1. `supabase/functions/ssa-appointments/index.ts`
   - Line 705: Added `appointment` parameter
   - Lines 540-560: Refactored sendDualNotifications to capture provider_response and error

---

## Summary of Root Causes

| Issue                | Root Cause                                                    | Impact                               |
| -------------------- | ------------------------------------------------------------- | ------------------------------------ |
| Missing appointment  | Function signature mismatch - called with 2 args instead of 3 | Email notifications silently skipped |
| No provider_response | Results object not extracting OneSignal API response          | Can't see delivery details or debug  |
| No error field       | Results object incomplete for logDualNotifications            | Error messages not logged            |

All issues have been **FIXED** and code builds successfully ✅
