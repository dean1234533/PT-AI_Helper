import { describe, it, expect } from 'vitest';
import {
  getLocalDateString,
  addDays,
  daysBetween,
  weekStartOf,
  applyDailyLog,
  applyWeeklyLog,
  getRiskLevel,
  getNextReward,
  getNewlyHitRewards,
} from './streakLogic.js';

const freshDaily = () => ({
  currentStreak: 0,
  longestStreak: 0,
  lastLoggedDate: null,
  freezesUsedThisMonth: 0,
  freezesResetMonth: null,
});

describe('date helpers', () => {
  it('addDays/daysBetween round-trip across a normal month', () => {
    expect(addDays('2026-03-05', 1)).toBe('2026-03-06');
    expect(daysBetween('2026-03-05', '2026-03-06')).toBe(1);
  });

  it('handles the UK spring-forward clock change (29 Mar 2026) without skipping/duplicating a day', () => {
    // BST began at 01:00 on 2026-03-29 — a pure calendar-day increment
    // must still land on the 30th, not the 31st or back on the 29th.
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(daysBetween('2026-03-29', '2026-03-30')).toBe(1);
  });

  it('handles the UK autumn clock change (25 Oct 2026) without skipping/duplicating a day', () => {
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(daysBetween('2026-10-25', '2026-10-26')).toBe(1);
  });

  it('getLocalDateString respects the given timezone, not the host clock', () => {
    // 23:30 UTC on 2026-01-01 is already 2026-01-02 in a UTC+1 zone.
    const utcLateNight = new Date('2026-01-01T23:30:00Z');
    expect(getLocalDateString('Europe/London', utcLateNight)).toBe('2026-01-01');
    expect(getLocalDateString('Pacific/Auckland', utcLateNight)).toBe('2026-01-02');
  });

  it('weekStartOf always returns the Monday of the containing week', () => {
    expect(weekStartOf('2026-03-09')).toBe('2026-03-09'); // a Monday
    expect(weekStartOf('2026-03-15')).toBe('2026-03-09'); // the following Sunday
  });
});

describe('applyDailyLog — daily streak type', () => {
  it('starts a streak at 1 on the first-ever log', () => {
    const result = applyDailyLog(freshDaily(), 1, '2026-06-01');
    expect(result).toMatchObject({ currentStreak: 1, longestStreak: 1, lastLoggedDate: '2026-06-01', usedFreeze: false });
  });

  it('increments on consecutive days', () => {
    let state = applyDailyLog(freshDaily(), 1, '2026-06-01');
    state = applyDailyLog(state, 1, '2026-06-02');
    state = applyDailyLog(state, 1, '2026-06-03');
    expect(state.currentStreak).toBe(3);
    expect(state.longestStreak).toBe(3);
  });

  it('resets to 1 after a missed day with no freeze available', () => {
    let state = applyDailyLog(freshDaily(), 0, '2026-06-01'); // freezesPerMonth = 0
    state = applyDailyLog(state, 0, '2026-06-02');
    // skip 2026-06-03 entirely
    state = applyDailyLog(state, 0, '2026-06-04');
    expect(state.currentStreak).toBe(1);
    expect(state.longestStreak).toBe(2); // the earlier run is still the longest
    expect(state.usedFreeze).toBe(false);
  });

  it('auto-uses a freeze to bridge exactly one missed day when one is available', () => {
    let state = applyDailyLog(freshDaily(), 1, '2026-06-01'); // freezesPerMonth = 1
    state = applyDailyLog(state, 1, '2026-06-02');
    // skip 2026-06-03
    state = applyDailyLog(state, 1, '2026-06-04');
    expect(state.currentStreak).toBe(3); // streak continued through the frozen day
    expect(state.usedFreeze).toBe(true);
    expect(state.freezesUsedThisMonth).toBe(1);
  });

  it('does not use a freeze once the monthly budget is exhausted', () => {
    let state = applyDailyLog(freshDaily(), 1, '2026-06-01');
    state = applyDailyLog(state, 1, '2026-06-02');
    state = applyDailyLog(state, 1, '2026-06-04'); // uses the 1 freeze, streak=3
    // skip 06-05, try to freeze again — budget is used up for June
    state = applyDailyLog(state, 1, '2026-06-06');
    expect(state.usedFreeze).toBe(false);
    expect(state.currentStreak).toBe(1); // reset — no freeze left
  });

  it('resets the freeze budget on a calendar month rollover', () => {
    let state = applyDailyLog(freshDaily(), 1, '2026-06-01');
    state = applyDailyLog(state, 1, '2026-06-02');
    state = applyDailyLog(state, 1, '2026-06-04'); // June freeze used, freezesUsedThisMonth=1
    expect(state.freezesUsedThisMonth).toBe(1);

    // Into July: skip a day and expect a freeze to be available again.
    state = applyDailyLog(state, 1, '2026-07-01');
    state = applyDailyLog(state, 1, '2026-07-03'); // skip 07-02, freeze should be free again in July
    expect(state.usedFreeze).toBe(true);
    expect(state.freezesUsedThisMonth).toBe(1);
  });

  it('re-logging the same day (an edit) does not double-increment the streak', () => {
    let state = applyDailyLog(freshDaily(), 1, '2026-06-01');
    const afterFirst = applyDailyLog(state, 1, '2026-06-02');
    const afterEdit = applyDailyLog(afterFirst, 1, '2026-06-02');
    expect(afterEdit.currentStreak).toBe(afterFirst.currentStreak);
    expect(afterEdit.lastLoggedDate).toBe('2026-06-02');
  });

  it('bridges a missed day across the BST spring-forward boundary using a freeze', () => {
    let state = applyDailyLog(freshDaily(), 1, '2026-03-28');
    // skip 2026-03-29 (the clock-change day itself)
    state = applyDailyLog(state, 1, '2026-03-30');
    expect(state.currentStreak).toBe(2);
    expect(state.usedFreeze).toBe(true);
  });
});

describe('applyWeeklyLog — x_per_week streak type', () => {
  const freshWeekly = () => ({ currentWeekStart: null, currentWeekCount: 0, currentStreak: 0, longestStreak: 0, lastLoggedDate: null });
  const target = 3;

  it('does not break the streak mid-week, even below target so far', () => {
    let state = applyWeeklyLog(freshWeekly(), target, '2026-03-09'); // Monday
    state = applyWeeklyLog(state, target, '2026-03-10'); // Tuesday — only 2 logs so far this week
    expect(state.currentStreak).toBe(0); // week isn't over yet, nothing to judge
    expect(state.currentWeekCount).toBe(2);
  });

  it('credits the streak when a week met target, evaluated on the first log of the next week', () => {
    let state = applyWeeklyLog(freshWeekly(), target, '2026-03-09'); // Mon, week 1
    state = applyWeeklyLog(state, target, '2026-03-10'); // Tue
    state = applyWeeklyLog(state, target, '2026-03-11'); // Wed — 3 logs, meets target
    state = applyWeeklyLog(state, target, '2026-03-16'); // next Monday — week 1 is judged now
    expect(state.currentStreak).toBe(1);
    expect(state.currentWeekCount).toBe(1); // this new week's own count
  });

  it('resets the streak when a week fell short of target', () => {
    let state = applyWeeklyLog(freshWeekly(), target, '2026-03-09');
    state = applyWeeklyLog(state, target, '2026-03-10'); // only 2 logs this week — short of target 3
    state = applyWeeklyLog(state, target, '2026-03-16'); // next week begins, prior week judged
    expect(state.currentStreak).toBe(0);
  });

  it('resets the streak when an entire week is skipped between logs', () => {
    let state = applyWeeklyLog(freshWeekly(), target, '2026-03-09');
    state = applyWeeklyLog(state, target, '2026-03-10');
    state = applyWeeklyLog(state, target, '2026-03-11'); // week 1 met target
    // week of 03-16 has zero logs entirely
    state = applyWeeklyLog(state, target, '2026-03-23'); // week 3 begins — week 2 was fully skipped
    expect(state.currentStreak).toBe(0);
  });
});

describe('getRiskLevel', () => {
  const now = new Date('2026-06-10T12:00:00Z');

  it('flags red when nothing was logged yesterday or today', () => {
    expect(getRiskLevel({ type: 'daily', lastLoggedDate: '2026-06-08', currentStreak: 5 }, now)).toBe('red');
  });

  it('flags amber for a short streak even if logged today', () => {
    expect(getRiskLevel({ type: 'daily', lastLoggedDate: '2026-06-10', currentStreak: 2 }, now)).toBe('amber');
  });

  it('flags amber right after a freeze was used', () => {
    expect(getRiskLevel({ type: 'daily', lastLoggedDate: '2026-06-10', currentStreak: 10, justUsedFreeze: true }, now)).toBe('amber');
  });

  it('flags green for an established streak logged today or yesterday', () => {
    expect(getRiskLevel({ type: 'daily', lastLoggedDate: '2026-06-09', currentStreak: 10 }, now)).toBe('green');
  });
});

describe('rewards', () => {
  const rewards = [
    { atDay: 10, title: 'Free shake', claimed: false },
    { atDay: 25, title: 'Free session', claimed: false },
    { atDay: 50, title: 'Free month', claimed: true },
  ];

  it('finds the next unclaimed reward and days remaining', () => {
    expect(getNextReward(rewards, 7)).toMatchObject({ atDay: 10, daysRemaining: 3 });
  });

  it('reports newly-hit unclaimed rewards at or past the streak', () => {
    expect(getNewlyHitRewards(rewards, 25).map((r) => r.atDay)).toEqual([10, 25]);
  });
});
