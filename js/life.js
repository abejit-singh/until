/**
 * The maths behind every figure on the page: age, weeks lived and weeks left.
 * Pure functions of the date of birth and the chosen life expectancy.
 */

import { WEEKS_PER_ROW } from './config.js';
import { addYears, daysBetween, parseIsoDate } from './utils.js';

/**
 * Exact age in years, months and days, counted on the calendar (borrowing a month
 * when needed) rather than by dividing milliseconds.
 * @param {Date} birth
 * @param {Date} now
 * @returns {{years:number, months:number, days:number}}
 */
export function getAgeBreakdown(birth, now) {
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/**
 * Every figure the page shows about your life, computed in one place so the stat
 * cards, the grid and What If always agree.
 *
 * Two kinds of week, on purpose: the headline numbers are real 7-day weeks
 * between dates, while the grid has exactly 52 squares per row (one row per
 * year of age). This week's square is therefore placed by age, not by
 * days ÷ 7, which would drift by a square every five or six years.
 * @param {string} birthDateStr - YYYY-MM-DD
 * @param {number} lifeExpectancy - in years
 * @returns {object}
 */
export function computeLifeStats(birthDateStr, lifeExpectancy) {
  const now = new Date();
  const birth = parseIsoDate(birthDateStr);
  const end = addYears(birth, lifeExpectancy); // the day you turn your chosen life expectancy
  const age = getAgeBreakdown(birth, now);
  const daysLived = Math.max(0, daysBetween(birth, now));
  const daysRemaining = Math.max(0, daysBetween(now, end));
  const totalDays = Math.max(1, daysBetween(birth, end));
  const surpassed = daysRemaining === 0;

  const lastBirthday = addYears(birth, age.years);
  const weekInYear = Math.min(WEEKS_PER_ROW - 1, Math.floor(daysBetween(lastBirthday, now) / 7));
  return {
    now,
    birth,
    age,
    daysLived,
    weeksLived: Math.floor(daysLived / 7),
    weeksRemaining: Math.floor(daysRemaining / 7),
    remainingYears: daysRemaining / 365.25,
    percentLived: Math.min(100, (daysLived / totalDays) * 100),
    surpassed,
    totalWeeks: lifeExpectancy * WEEKS_PER_ROW, // squares in the grid
    currentWeekIndex: age.years * WEEKS_PER_ROW + weekInYear // the square for this week
  };
}
