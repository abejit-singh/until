// The maths behind every figure on the page.
import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

import { WEEKS_PER_ROW } from '../../js/config.js';
import { computeLifeStats, getAgeBreakdown } from '../../js/life.js';

test('getAgeBreakdown counts on the calendar', () => {
  assert.deepEqual(getAgeBreakdown(new Date(2001, 2, 9), new Date(2026, 5, 15)), {
    years: 25,
    months: 3,
    days: 6
  });
  // The day before a birthday: still the previous age.
  assert.deepEqual(getAgeBreakdown(new Date(2001, 2, 9), new Date(2026, 2, 8)), {
    years: 24,
    months: 11,
    days: 27
  });
  // On the birthday itself.
  assert.deepEqual(getAgeBreakdown(new Date(2001, 2, 9), new Date(2026, 2, 9)), {
    years: 25,
    months: 0,
    days: 0
  });
  // Born today.
  assert.deepEqual(getAgeBreakdown(new Date(2026, 5, 15), new Date(2026, 5, 15)), {
    years: 0,
    months: 0,
    days: 0
  });
});

// computeLifeStats reads today's date, so the clock is fixed: Monday 15 June 2026, noon.
beforeEach(() => mock.timers.enable({ apis: ['Date'], now: new Date(2026, 5, 15, 12) }));
afterEach(() => mock.timers.reset());

test('computeLifeStats: someone aged 25 with a life expectancy of 80', () => {
  const s = computeLifeStats('2001-03-09', 80);
  assert.deepEqual(s.age, { years: 25, months: 3, days: 6 });
  assert.equal(s.daysLived, 9229);
  assert.equal(s.weeksLived, 1318);
  assert.equal(s.weeksRemaining, 2855);
  assert.equal(s.surpassed, false);
  assert.equal(s.totalWeeks, 80 * WEEKS_PER_ROW);
  assert.ok(Math.abs(s.percentLived - 31.585) < 0.01, `percentLived was ${s.percentLived}`);
  assert.ok(Math.abs(s.remainingYears - 54.73) < 0.01, `remainingYears was ${s.remainingYears}`);
});

test("this week's square sits on the row of your age, at the weeks since your last birthday", () => {
  const s = computeLifeStats('2001-03-09', 80);
  // 98 days after the 25th birthday: week 14 of the row for age 25.
  assert.equal(s.currentWeekIndex, 25 * WEEKS_PER_ROW + 14);
});

test('the last days of a year of age stay on its row (a year is 52 weeks and a day or two)', () => {
  // Born 16 June 2001: on 15 June 2026 the 25th birthday is tomorrow, 364 days after the 24th.
  const s = computeLifeStats('2001-06-16', 80);
  assert.equal(s.age.years, 24);
  assert.equal(s.currentWeekIndex, 24 * WEEKS_PER_ROW + (WEEKS_PER_ROW - 1));
});

test('past the chosen life expectancy nothing goes negative', () => {
  const s = computeLifeStats('1930-01-01', 80);
  assert.equal(s.surpassed, true);
  assert.equal(s.weeksRemaining, 0);
  assert.equal(s.remainingYears, 0);
  assert.equal(s.percentLived, 100);
});

test('born today: everything starts at zero', () => {
  const s = computeLifeStats('2026-06-15', 80);
  assert.equal(s.daysLived, 0);
  assert.equal(s.weeksLived, 0);
  assert.equal(s.currentWeekIndex, 0);
  assert.equal(s.percentLived, 0);
});
