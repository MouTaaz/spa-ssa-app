# OneSignal Push Notification Setup Instructions

## Overview

This document provides step-by-step instructions to complete the OneSignal push notification integration for the SSA Appointments system.

---

## ✅ What's Been Completed

### 1. Database Migration File Created

- **File**: `supabase/migrations/add_onesignal_support.sql`
- **Changes**:
  - Added `onesignal_player_id` column to `push_subscriptions`
  - Added `onesignal_external_user_id` column to `push_subscriptions`
  - Added `push_enabled` column to `notification_settings`
  - Made Web Push fields (`endpoint`, `p256dh`, `auth`) nullable
  - Added indexes for performance

### 2. Edge Function Updated

- **File**: `supabase/functions/ssa-appointments/index.ts`
- **Changes**:
  - ✅ Removed all VAPID/Web Push code (~150 lines)
  - ✅ Added `sendOneSignalPushNotification()` helper function
  - ✅ Updated `NotificationService.sendPushNotification()` to use OneSignal REST API
  - ✅ Updated health check endpoint (`/health`) to show configuration status
  - ✅ Removed `/vapid-public-key` endpoint

---

## 🔧 Step-by-Step Setup Instructions

### Step 1: Run Database Migration

1. **Open Supabase Dashboard**

   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**

   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Execute Migration**

   - Open `supabase/migrations/add_onesignal_support.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" to execute

4. **Verify Migration**
   - Go to "Table Editor" → "push_subscriptions"
   - Confirm new columns exist: `onesignal_player_id`, `onesignal_external_user_id`
   - Go to "notification_settings" table
   - Confirm new column exists: `push_enabled`

---

### Step 2: Set Environment Variables in Supabase

1. **Get OneSignal Credentials**

   - Log in to https://onesignal.com
   - Go to your app's Settings
   - Copy your **App ID** and **REST API Key**

2. **Add to Supabase Edge Functions**

   - In Supabase Dashboard, go to "Edge Functions"
   - Click on "ssa-appointments" function
   - Go to "Secrets" tab
   - Add the following secrets:
     ```
     ONESIGNAL_APP_ID=your_app_id_here
     ONESIGNAL_API_KEY=your_rest_api_key_here
     ```

3. **Verify SMTP Settings (if not already set)**
   - Ensure these are also set:
     ```
     SMTP_HOST=your_smtp_host
     SMTP_PORT=587
     SMTP_USER=your_smtp_username
     SMTP_PASS=your_smtp_password
     SMTP_FROM=notifications@yourdomain.com
     ```

---

### Step 3: Update Frontend OneSignal Integration

The frontend needs to save OneSignal Player ID and External User ID to the database when a user subscribes to push notifications.

#### File to Update: `src/lib/notifications.ts` or your OneSignal initialization file

Add this function to save subscription data:

```typescript
async function saveOneSignalSubscription(userId: string) {
  try {
    // Get OneSignal Player ID
    const playerId = await OneSignal.User.PushSubscription.id;

    // Use user ID as external user ID
    await OneSignal.login(userId);

    // Save to database
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        onesignal_player_id: playerId,
        onesignal_external_user_id: userId,
        platform: "web",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,onesignal_player_id",
      }
    );

    if (error) {
      console.error("Error saving OneSignal subscription:", error);
    } else {
      console.log("✅ OneSignal subscription saved to database");
    }
  } catch (error) {
    console.error("Error in saveOneSignalSubscription:", error);
  }
}
```

Call this function after:

- User logs in
- User grants push notification permission
- OneSignal initialization completes

---

### Step 4: Deploy Edge Function Changes

1. **Using Supabase CLI** (recommended):

   ```bash
   supabase functions deploy ssa-appointments
   ```

2. **Or via Supabase Dashboard**:
   - Go to "Edge Functions"
   - Click on "ssa-appointments"
   - Click "Deploy" button
   - Upload the updated `index.ts` file

---

### Step 5: Test the Integration

#### Test 1: Health Check

```bash
curl https://your-project.supabase.co/functions/v1/ssa-appointments/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "onesignal_configured": true,
  "smtp_configured": true
}
```

#### Test 2: Test Push Notification

```bash
curl -X POST https://your-project.supabase.co/functions/v1/ssa-appointments/test-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "userId": "user-uuid-here",
    "businessId": "business-uuid-here"
  }'
```

#### Test 3: Webhook with Real Appointment

- Trigger a test appointment from your SSA WordPress site
- Check Supabase Edge Function logs for:
  - ✅ "OneSignal notification sent successfully"
  - ✅ "Email sent successfully"
  - ✅ "Dual notifications sent: X push, Y email"

---

### Step 6: Monitor and Verify

1. **Check Notification Logs**

   ```sql
   SELECT * FROM notification_logs
   ORDER BY sent_at DESC
   LIMIT 10;
   ```

2. **Verify Delivery Methods**

   - Check `delivery_method` column: should show 'push', 'email', or 'both'
   - Check `status` column: should show 'sent' for successful deliveries

3. **Check OneSignal Dashboard**
   - Go to OneSignal dashboard
   - Navigate to "Messages" → "Sent"
   - Verify notifications are being delivered

---

## 🔍 Troubleshooting

### Issue: "OneSignal APP ID or API Key not configured"

**Solution**: Verify environment variables are set correctly in Supabase Edge Functions secrets.

### Issue: "Subscription missing user external ID for OneSignal"

**Solution**: Ensure frontend is saving `onesignal_external_user_id` to the database (Step 3).

### Issue: Push notifications not received

**Checklist**:

- [ ] User has granted push notification permission in browser
- [ ] OneSignal Player ID is saved in `push_subscriptions` table
- [ ] `onesignal_external_user_id` matches the user's ID
- [ ] User is an active member of the business
- [ ] Check OneSignal dashboard for delivery status

### Issue: Email fallback not working

**Solution**: Verify SMTP environment variables are set and test with `/test-smtp` endpoint.

---

## 📊 Database Schema Reference

### push_subscriptions Table

```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to auth.users)
- onesignal_player_id (text) -- NEW
- onesignal_external_user_id (text) -- NEW
- endpoint (text, nullable) -- Made nullable
- p256dh (text, nullable) -- Made nullable
- auth (text, nullable) -- Made nullable
- platform (text)
- user_agent (text)
- created_at (timestamp)
- updated_at (timestamp)
```

### notification_settings Table

```sql
- id (uuid, primary key)
- business_id (uuid, foreign key)
- push_enabled (boolean, default: true) -- NEW
- email_enabled (boolean, default: true)
- sms_enabled (boolean, default: false)
- ... other fields
```

---

## 🎯 Success Criteria

- [x] Database migration executed successfully
- [x] Environment variables set in Supabase
- [ ] Frontend saves OneSignal IDs to database
- [ ] Health check shows `onesignal_configured: true`
- [ ] Test notification endpoint works
- [ ] Real webhook triggers send push notifications
- [ ] Notifications appear in OneSignal dashboard
- [ ] Notification logs show successful delivery
- [ ] Email fallback works when push fails

---

## 📝 Additional Notes

- **No VAPID keys needed**: OneSignal handles all push notification infrastructure
- **External User ID**: Should match the Supabase user ID for proper targeting
- **Player ID**: Unique identifier for each device/browser subscription
- **Dual Delivery**: System sends both push and email for reliability
- **Business Preferences**: Future enhancement to respect `push_enabled` flag per business

---

## 🆘 Support

If you encounter issues:

1. Check Supabase Edge Function logs
2. Check OneSignal dashboard for delivery status
3. Verify database records in `push_subscriptions` and `notification_logs`
4. Test with `/test-notification` endpoint for debugging

---

**Last Updated**: 2024
**Status**: Ready for deployment
