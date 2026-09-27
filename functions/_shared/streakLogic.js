/**
 * Pure, dependency-free streak calculation logic — the single source of
 * truth for both the server (Cloudflare Functions, authoritative writes)
 * and the client (src/utils/streakUtils.js re-exports this file for
 * read-only display use, e.g. rendering "days to next reward" without a
 * round trip). No Date object arithmetic for calendar-day math anywhere
 * here — everything works on {year, month, day} tuples derived once via
 * Intl, which sidesteps BST/GMT clock-change bugs entirely (a Date-object
 * "add 1 day" can silently add 23 or 25 hours across a DST boundary; a
 * calendar-day increment on (y, m, d) never can).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" for `date` (default now) in the given IANA timezone. */
export function getLocalDateString(timezone = 'Europe/London', date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** "HH:MM" for `date` (default now) in the given IANA timezone, 24h. */
export function getLocalTimeString(timezone = 'Europe/London', date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('hour')}:${get('minute')}`;
}

function toTuple(dateString) {
  const [y, m, d] = dateString.split('-').map(Number);
  return { y, m, d };
}

// Days since an arbitrary epoch, computed from the calendar tuple directly
// (via Date.UTC, which is fine here — we only ever use it as a monotonic
// day-count, never re-read as a wall-clock time, so DST can't touch it).
function toEpochDay(dateString) {
  const { y, m, d } = toTuple(dateString);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function daysBetween(dateA, dateB) {
  return toEpochDay(dateB) - toEpochDay(dateA);
}

export function addDays(dateString, days) {
  const epochDay = toEpochDay(dateString) + days;
  const d = new Date(epochDay * DAY_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** 0 = Monday .. 6 = Sunday, calendar-only (no Date-object weekday quirks). */
export function isoWeekday(dateString) {
  const { y, m, d } = toTuple(dateString);
  // Date.UTC's getUTCDay is 0=Sun..6=Sat; convert to 0=Mon..6=Sun.
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (jsDay + 6) % 7;
}

/** The Monday that starts the calendar week containing `dateString`. */
export function weekStartOf(dateString) {
  return addDays(dateString, -isoWeekday(dateString));
}

export function monthOf(dateString) {
  return dateString.slice(0, 7); // "YYYY-MM"
}

/**
 * Applies one new/edited daily log to the challenge's denormalised stats.
 * Called server-side on every log write — never trust a client-supplied
 * streak number.
 *
 * @param {object} prev - current stats stored on the challenge doc.
 * @param {number} prev.currentStreak
 * @param {number} prev.longestStreak
 * @param {string|null} prev.lastLoggedDate - "YYYY-MM-DD" or null
 * @param {number} prev.freezesUsedThisMonth
 * @param {string|null} prev.freezesResetMonth - "YYYY-MM" the counter above applies to
 * @param {number} freezesPerMonth
 * @param {string} logDate - the date being logged, "YYYY-MM-DD"
 * @returns {{currentStreak:number, longestStreak:number, lastLoggedDate:string,
 *            freezesUsedThisMonth:number, freezesResetMonth:string, usedFreeze:boolean}}
 */
export function applyDailyLog(prev, freezesPerMonth, logDate) {
  const currentMonth = monthOf(logDate);
  let freezesUsedThisMonth = prev.freezesResetMonth === currentMonth ? prev.freezesUsedThisMonth : 0;

  // Editing today's own entry again, or backfilling a date already covered
  // by the recorded streak — doesn't change the streak count.
  if (prev.lastLoggedDate && logDate <= prev.lastLoggedDate) {
    return {
      currentStreak: prev.currentStreak,
      longestStreak: prev.longestStreak,
      lastLoggedDate: prev.lastLoggedDate,
      freezesUsedThisMonth,
      freezesResetMonth: currentMonth,
      usedFreeze: false,
    };
  }

  const gap = prev.lastLoggedDate ? daysBetween(prev.lastLoggedDate, logDate) : 1;
  let currentStreak;
  let usedFreeze = false;

  if (!prev.lastLoggedDate || gap === 1) {
    // First-ever log, or a genuinely consecutive day.
    currentStreak = prev.currentStreak + 1;
  } else if (gap === 2 && freezesUsedThisMonth < freezesPerMonth) {
    // Exactly one day was skipped and a freeze is available for the month
    // that skipped day fell in — the streak survives, freeze is spent.
    const skippedDay = addDays(logDate, -1);
    const skippedMonth = monthOf(skippedDay);
    if (skippedMonth !== currentMonth) freezesUsedThisMonth = prev.freezesResetMonth === skippedMonth ? prev.freezesUsedThisMonth : 0;
    freezesUsedThisMonth += 1;
    currentStreak = prev.currentStreak + 1;
    usedFreeze = true;
  } else {
    // Two or more days missed with no freeze to cover it — streak resets
    // and this log starts a fresh one.
    currentStreak = 1;
  }

  return {
    currentStreak,
    longestStreak: Math.max(prev.longestStreak, currentStreak),
    lastLoggedDate: logDate,
    freezesUsedThisMonth,
    freezesResetMonth: currentMonth,
    usedFreeze,
  };
}

/**
 * Applies one new/edited log to an x_per_week challenge's stats. The
 * current (in-progress) week never breaks the streak — only a completed
 * week that fell short does, and that's only detected once a log lands in
 * a later week than the one being tracked.
 */
export function applyWeeklyLog(prev, targetPerWeek, logDate) {
  const logWeek = weekStartOf(logDate);
  let { currentWeekStart, currentWeekCount, currentStreak, longestStreak } = prev;

  if (!currentWeekStart) {
    return { currentWeekStart: logWeek, currentWeekCount: 1, currentStreak: 0, longestStreak: 0, lastLoggedDate: logDate };
  }

  if (logWeek === currentWeekStart) {
    currentWeekCount += 1;
  } else if (logWeek > currentWeekStart) {
    // One or more weeks have elapsed since the tracked week. Roll each
    // completed week forward, crediting the streak only for the week that
    // was actually in progress (a wholly-skipped week in between resets it).
    const metTarget = currentWeekCount >= targetPerWeek;
    currentStreak = metTarget ? currentStreak + 1 : 0;
    longestStreak = Math.max(longestStreak, currentStreak);

    const weeksElapsed = daysBetween(currentWeekStart, logWeek) / 7;
    if (weeksElapsed > 1) currentStreak = 0; // a full week with zero logs in between

    currentWeekStart = logWeek;
    currentWeekCount = 1;
  } else {
    // Backfilling into an already-closed week — count it but don't
    // re-litigate a streak decision that's already been made.
    return { currentWeekStart, currentWeekCount, currentStreak, longestStreak, lastLoggedDate: prev.lastLoggedDate };
  }

  return {
    currentWeekStart,
    currentWeekCount,
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastLoggedDate: logDate,
  };
}

/**
 * Read-time-only classification for the PT dashboard widget — does not
 * mutate anything, just interprets already-computed stats against "now".
 * Returns 'red' | 'amber' | 'green'.
 */
export function getRiskLevel({ type, lastLoggedDate, currentStreak, timezone = 'Europe/London', justUsedFreeze = false }, now = new Date()) {
  const today = getLocalDateString(timezone, now);
  if (type === 'x_per_week') {
    // Weekly challenges are only "at risk" if the whole current week has
    // gone by with a low count — approximate with a 4-day-since-last-log
    // threshold, generous enough not to false-positive mid-week.
    if (!lastLoggedDate || daysBetween(lastLoggedDate, today) > 4) return 'red';
    return currentStreak === 0 ? 'amber' : 'green';
  }
  if (!lastLoggedDate) return 'red';
  const gap = daysBetween(lastLoggedDate, today);
  if (gap > 1) return 'red'; // not logged yesterday or today
  if (currentStreak < 3 || justUsedFreeze) return 'amber';
  return 'green';
}

/** The next unclaimed reward and days remaining to it, or null. */
export function getNextReward(rewards, currentStreak) {
  const next = (rewards || [])
    .filter((r) => !r.claimed)
    .sort((a, b) => a.atDay - b.atDay)
    .find((r) => r.atDay > currentStreak) || (rewards || []).filter((r) => !r.claimed).sort((a, b) => a.atDay - b.atDay)[0];
  if (!next) return null;
  return { ...next, daysRemaining: Math.max(0, next.atDay - currentStreak) };
}

/** Rewards whose atDay threshold has just been reached/passed and are unclaimed. */
export function getNewlyHitRewards(rewards, currentStreak) {
  return (rewards || []).filter((r) => !r.claimed && currentStreak >= r.atDay);
}
