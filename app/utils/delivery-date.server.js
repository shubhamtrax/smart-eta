// Server-only helper — computes an estimated delivery date given a shop's
// DeliverySettings, a pincode's transit days, and any holidays on record.
// Kept framework-agnostic (plain Date math) so it can be unit tested easily.

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSunday(date) {
  return date.getDay() === 0;
}

// Returns a Date object whose getFullYear/getMonth/getDate/getHours/getMinutes
// reflect the *wall-clock* time in `timeZone`, not the server's local time.
// This is what lets a shop on IST get correct cutoff behavior even if the
// app server itself is running in UTC or another region.
function nowInTimeZone(timeZone, referenceDate = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(referenceDate);

    const get = (type) => parts.find((p) => p.type === type)?.value;

    // hour12: false can still emit "24" for midnight in some engines — normalize.
    const hour = get("hour") === "24" ? "0" : get("hour");

    return new Date(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(hour),
      Number(get("minute")),
      Number(get("second")),
    );
  } catch {
    // Unknown/invalid IANA timezone string — fall back to server local time
    // rather than throwing, so a bad settings value never breaks the widget.
    return new Date(referenceDate);
  }
}

/**
 * @param {object} params
 * @param {number} params.processingDays - order handling days before dispatch
 * @param {number} params.transitDays - shipping transit days for this pincode
 * @param {string} params.cutoffTime - "HH:MM", 24hr, evaluated in `timezone`.
 * @param {boolean} params.weekendDelivery - if false, Sundays don't count as
 *   a deliverable day and get skipped.
 * @param {string[]} params.holidayDates - "YYYY-MM-DD" strings to skip.
 * @param {string} [params.timezone] - IANA zone, e.g. "Asia/Kolkata". Defaults
 *   to server local time if omitted or invalid.
 * @param {Date} [params.now] - injectable for testing, defaults to current time.
 * @returns {Date} the estimated delivery date
 */
export function calculateEstimatedDelivery({
  processingDays = 1,
  transitDays = 2,
  cutoffTime = "14:00",
  weekendDelivery = false,
  holidayDates = [],
  timezone,
  now = new Date(),
}) {
  const holidaySet = new Set(holidayDates);

  const [cutoffHour, cutoffMinute] = (cutoffTime || "14:00")
    .split(":")
    .map((n) => parseInt(n, 10) || 0);

  const localNow = timezone ? nowInTimeZone(timezone, now) : new Date(now);

  const cutoff = new Date(localNow);
  cutoff.setHours(cutoffHour, cutoffMinute, 0, 0);

  const cursor = new Date(localNow);

  // Missed today's cutoff -> processing effectively starts tomorrow.
  if (localNow > cutoff) {
    cursor.setDate(cursor.getDate() + 1);
  }

  const totalDays = Math.max(0, processingDays) + Math.max(0, transitDays);
  let remaining = totalDays;

  const isBlocked = (date) =>
    holidaySet.has(toDateKey(date)) || (!weekendDelivery && isSunday(date));

  while (remaining > 0) {
    cursor.setDate(cursor.getDate() + 1);
    if (isBlocked(cursor)) continue;
    remaining--;
  }

  // Land on a deliverable day even if the loop above ended on a blocked one.
  while (isBlocked(cursor)) {
    cursor.setDate(cursor.getDate() + 1);
  }

  return cursor;
}

const DATE_FORMAT_OPTIONS = {
  long: { weekday: "long", day: "numeric", month: "long" }, // Tuesday, 14 July
  short: { weekday: "short", day: "numeric", month: "short" }, // Tue, 14 Jul
  numeric: { day: "2-digit", month: "2-digit", year: "numeric" }, // 14/07/2026
};

export function formatDeliveryDate(date, dateFormat = "long") {
  const options = DATE_FORMAT_OPTIONS[dateFormat] || DATE_FORMAT_OPTIONS.long;
  return date.toLocaleDateString("en-IN", options);
}

export { toDateKey, nowInTimeZone };
