/**
 * Small helpers used everywhere: numbers, ids, dates, escaping, element lookup.
 * None of them reads or changes the app's data.
 */

import { DAY_MS } from './config.js';

/** Deep copy of plain JSON data (which is all DEFAULT_STATE holds). */
export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Reads a value as a number clamped to [min, max]; anything unreadable becomes
 * `fallback`. Every number typed by the user or read from storage goes through here.
 * @param {*} value
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
export function num(value, min, max, fallback) {
  const n = parseFloat(value);
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * A short id that stays unique even if two items are created in the same
 * millisecond (timestamp plus a random suffix).
 * @param {string} prefix
 * @returns {string}
 */
export function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** True for a real calendar date written as YYYY-MM-DD (rejects things like 2023-02-31). */
export function isIsoDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = parseIsoDate(str);
  return (
    d.getFullYear() === +str.slice(0, 4) &&
    d.getMonth() === +str.slice(5, 7) - 1 &&
    d.getDate() === +str.slice(8, 10)
  );
}

/**
 * Escapes text for HTML, attribute values included: activity names are written
 * into value="…", so quotes have to be escaped too.
 * @param {*} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Shorthand for document.getElementById. */
export function $(id) {
  return document.getElementById(id);
}

/**
 * Turns 'YYYY-MM-DD' into a Date at local midnight. Done by hand because
 * `new Date('YYYY-MM-DD')` is parsed as UTC midnight, which in time zones
 * west of Greenwich is still the previous day locally.
 * @param {string} iso
 * @returns {Date}
 */
export function parseIsoDate(iso) {
  return new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
}

/** Today's date as 'YYYY-MM-DD' in the user's own time zone. */
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Whole calendar days from a to b. Both dates are taken as UTC midnights, so a
 * daylight-saving change can't make the count off by one.
 * @param {Date} a
 * @param {Date} b
 * @returns {number}
 */
export function daysBetween(a, b) {
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      DAY_MS
  );
}

/**
 * The same calendar date `years` later — a birthday. 29 February falls
 * back to 28 February in non-leap years instead of rolling into March.
 * @param {Date} date
 * @param {number} years
 * @returns {Date}
 */
export function addYears(date, years) {
  const y = date.getFullYear() + years,
    m = date.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(date.getDate(), lastDay));
}

/** Rounds and formats a number with thousands separators, e.g. 3200 → "3,200". */
export function fmtInt(v) {
  return Math.round(v).toLocaleString('en-US');
}

/** True when the user has asked their system for reduced motion. */
export function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
