/**
 * Timezone utility functions
 * Ensures all appointment times are displayed in EST (America/New_York) timezone
 * regardless of the device's local timezone
 */

/**
 * Convert a UTC timestamp to EST and return as a Date object for formatting
 * The returned Date object represents the EST time
 * @param utcTimeString - UTC timestamp string (e.g., "2026-01-03 21:00:00+00")
 * @returns Date object adjusted to EST timezone
 */
export function convertUTCToEST(utcTimeString: string): Date {
  // Parse the UTC time
  const utcDate = new Date(utcTimeString);

  // EST is UTC-5, EDT is UTC-4
  // Get the current offset for the given date to handle DST
  const estOffset = getESTOffset(utcDate);

  // Convert UTC to EST by applying the offset
  return new Date(utcDate.getTime() + estOffset * 60 * 60 * 1000);
}

/**
 * Get the EST/EDT offset in hours for a given date
 * @param date - Date object in UTC
 * @returns Offset in hours (negative for EST/EDT)
 */
function getESTOffset(date: Date): number {
  // Create a formatter for the America/New_York timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const estDateStr = parts
    .reduce((acc, part) => {
      if (part.type !== "literal") {
        return acc + part.value;
      }
      return acc + part.value;
    }, "")
    .replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1-$2-$3 $4:$5:$6");

  const estDate = new Date(estDateStr);
  const utcTime = date.getTime();
  const estTime = estDate.getTime();

  // Calculate offset in hours
  return (estTime - utcTime) / (60 * 60 * 1000);
}

/**
 * Create a fake UTC date string that represents the EST time
 * This is used for date-fns formatting functions
 * @param utcTimeString - UTC timestamp string
 * @returns A Date object that when formatted will show EST times
 */
export function getESTDate(utcTimeString: string): Date {
  const utcDate = new Date(utcTimeString);

  // Get EST offset
  const estOffset = getESTOffset(utcDate);

  // Create a new date that represents the EST time
  return new Date(utcDate.getTime() + estOffset * 60 * 60 * 1000);
}

/**
 * Format a UTC timestamp as EST time string
 * @param utcTimeString - UTC timestamp string
 * @param format - Format string (e.g., "HH:mm", "MMMM dd, yyyy")
 * @returns Formatted EST time string
 */
export function formatUTCAsEST(utcTimeString: string): string {
  const date = new Date(utcTimeString);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return formatter.format(date);
}

/**
 * Get time string in HH:mm format for EST
 * @param utcTimeString - UTC timestamp string
 * @returns Time string in HH:mm format (EST)
 */
export function getESTTimeString(utcTimeString: string): string {
  const date = new Date(utcTimeString);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(date);
}

/**
 * Get date string in MMMM dd, yyyy format for EST
 * @param utcTimeString - UTC timestamp string
 * @returns Date string in MMMM dd, yyyy format (EST)
 */
export function getESTDateString(utcTimeString: string): string {
  const date = new Date(utcTimeString);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

  return formatter.format(date);
}
