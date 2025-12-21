# Push Notification Issue Diagnosis

## Problem Summary

Push notifications are being sent by the webhook but not received by devices. The issue is that OneSignal is creating separate users instead of linking devices to the same external user ID.

## Evidence from Logs

### Desktop Subscription (Working)

```
Player ID: 0bef6510-2c17-40da-b592-be61feb75376
External User ID: 0457e5c9-efc8-4d18-9e11-52e4a2a1e6db
Database Record: ✅ Created successfully
```

### OneSignal Dashboard Shows

```
OneSignal User ID: 085e8be4-3547-49c7-9c52-f187ac1690b6
External ID: 0457e5c9-efc8-4d18-9e11-52e4a2a1e6db
Subscription ID: 0bef6510-2c17-40da-b592-be61feb75376
Status: Subscribed
```

### Webhook Notification Attempt

```
✅ OneSignal API Call: Success (200)
❌ Recipients: 0 (No devices received notification)
Target: External User ID 0457e5c9-efc8-4d18-9e11-52e4a2a1e6db
```

## Root Cause

**OneSignal is not properly linking the subscription to the external user ID.**

When the user subscribes:

1. OneSignal creates a player ID: `0bef6510-2c17-40da-b592-be61feb75376`
2. OneSignal creates a user ID: `085e8be4-3547-49c7-9c52-f187ac1690b6`
3. The external user ID is set: `0457e5c9-efc8-4d18-9e11-52e4a2a1e6db`

BUT when sending notifications:

1. Webhook targets external user ID: `0457e5c9-efc8-4d18-9e11-52e4a2a1e6db`
2. OneSignal can't find any subscribed devices for this external ID
3. Result: 0 recipients

## The Issue

The problem is in the **timing of when we call `oneSignal.login(userId)`**:

1. We call `oneSignal.init()` first
2. User grants permission and subscribes
3. OneSignal creates a player ID
4. THEN we call `oneSignal.login(userId)` to set external user ID

This creates a race condition where the subscription happens BEFORE the external user ID is set.

## Solution

We need to call `oneSignal.login(userId)` **BEFORE** the user subscribes, not after.

### Current Flow (WRONG):

```
1. oneSignal.init({ appId: ... })
2. User clicks "Enable Notifications"
3. oneSignal.Slidedown.promptPush() → Creates subscription
4. oneSignal.login(userId) → Sets external ID (TOO LATE!)
```

### Correct Flow:

```
1. oneSignal.init({ appId: ... })
2. oneSignal.login(userId) → Set external ID FIRST
3. User clicks "Enable Notifications"
4. oneSignal.Slidedown.promptPush() → Creates subscription with external ID
```

## Files to Fix

1. **src/lib/notifications.ts**

   - Move `oneSignal.login(userId)` to happen BEFORE subscription
   - Call it immediately after `oneSignal.init()`

2. **Testing Steps**
   - Delete existing OneSignal user from dashboard
   - Delete push_subscriptions record from database
   - Clear browser data
   - Re-subscribe with the fix
   - Verify external user ID is set BEFORE subscription
   - Test webhook notification

## Expected Result After Fix

1. User subscribes → OneSignal links subscription to external user ID immediately
2. Webhook sends notification → OneSignal finds the device using external user ID
3. Notification is delivered → User receives push notification
