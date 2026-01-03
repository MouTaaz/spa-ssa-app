# Timezone Fix Documentation

## Problem

The application was displaying appointment times in the device's local timezone instead of the default USA EST timezone. This caused appointments to display different times on different devices:

- **Database**: Stores times in UTC (e.g., `2026-01-03 21:00:00+00` = 4:00 PM EST)
- **WordPress Website**: Correctly showed 4:00 PM - 6:00 PM EST
- **Android PWA in Egypt**: Incorrectly showed 23:00 (11:00 PM) - converted to Egypt time (UTC+2)

## Root Cause

JavaScript's `new Date()` constructor automatically converts UTC timestamps to the browser's local timezone. On the Android device in Egypt, this resulted in appointments being displayed in Egypt Standard Time (UTC+2) instead of EST (UTC-5).

## Solution

Created a new timezone utility module (`src/lib/timezone.ts`) that:

1. Parses UTC timestamps
2. Converts them to EST timezone using `Intl.DateTimeFormat` with `timeZone: "America/New_York"`
3. Provides utility functions for consistent time formatting

## Files Modified

### New File

- **src/lib/timezone.ts** - Core timezone conversion utilities
  - `getESTDate()` - Converts UTC timestamp to EST Date object
  - `getESTTimeString()` - Returns time in HH:mm format (EST)
  - `getESTDateString()` - Returns date in MMMM dd, yyyy format (EST)
  - `formatUTCAsEST()` - Returns full formatted date/time string

### Updated Files

#### 1. **src/components/appointments/appointment-detail.tsx**

- Imported `getESTDate` from timezone utility
- Changed: `new Date(appointment.start_time)` → `getESTDate(appointment.start_time)`
- Changed: `new Date(appointment.end_time)` → `getESTDate(appointment.end_time)`
- All appointment times now display in EST

#### 2. **src/components/appointments/appointment-card.tsx**

- Imported `getESTDate` from timezone utility
- Changed date/time parsing to use EST conversion
- Appointment lists now show correct EST times regardless of device timezone

#### 3. **src/components/appointments/appointment-form.tsx**

- Imported `getESTDate` from timezone utility
- Updated date comparison logic to use EST dates:
  - `getAppointmentCountForDate()` now uses EST dates
  - Appointment overlap detection uses EST times
  - Slot availability calculation respects EST timezone
- Prevents scheduling conflicts based on correct EST times

#### 4. **src/components/appointments/appointment-timeline.tsx**

- Imported `getESTDate` from timezone utility
- Sorted appointments using EST dates
- Timeline displays appointments with correct EST times

#### 5. **src/pages/dashboard.tsx**

- Imported `getESTDate` from timezone utility
- Updated recent appointments filter to use EST dates
- Updated today's appointments filter to use EST dates
- Dashboard now shows correct times in EST

## How the Fix Works

### Example Scenario

**Database Record:**

```
start_time: "2026-01-03 21:00:00+00"  (UTC)
```

**Before Fix (Device in Egypt):**

```
new Date("2026-01-03 21:00:00+00")
→ JavaScript converts to local timezone (UTC+2)
→ Displays as 23:00 (11:00 PM) ❌
```

**After Fix (Device in Egypt):**

```
getESTDate("2026-01-03 21:00:00+00")
→ Internally converts to EST timezone (UTC-5)
→ Displays as 16:00 (4:00 PM) ✅
```

### The Technology

The fix uses the `Intl.DateTimeFormat` API with the `America/New_York` timezone identifier:

```typescript
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  // ... format options
});
```

This ensures:

1. **Browser-agnostic**: Works consistently across all browsers and devices
2. **Daylight Saving Time**: Automatically handles EST/EDT transitions
3. **No external dependencies**: Uses native JavaScript APIs
4. **Performant**: Minimal overhead compared to date libraries

## Testing

### Test Case 1: Appointment Display

- **Setup**: Create appointment at 4:00 PM EST
- **Device**: Any timezone
- **Expected**: All components show 4:00 PM EST
- **Status**: ✅ Pass

### Test Case 2: Appointment Scheduling

- **Setup**: Create appointment via form
- **Expected**: Correctly detects overlaps using EST times
- **Status**: ✅ Pass

### Test Case 3: Timeline Display

- **Setup**: Multiple appointments in different timezones
- **Expected**: Timeline displays all in EST
- **Status**: ✅ Pass

## Rollback Information

If needed to rollback, revert changes to the five modified component files and delete `src/lib/timezone.ts`.

## Future Enhancements

1. Consider adding user timezone preference setting
2. Option to display times in both EST and user's local timezone
3. Timezone selector in business settings for multi-location businesses
