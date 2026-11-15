/**
 * The app's data: loaded from localStorage and checked field by field,
 * saved after every change.
 */

import { DEFAULT_STATE, LIMITS, STORAGE_KEY } from './config.js';
import { clone, isIsoDate, num, todayIso, uid } from './utils.js';

/**
 * Loads the saved state, rebuilt field by field on top of DEFAULT_STATE.
 * Nothing stored is trusted as it is: a missing field gets its default, broken
 * JSON falls back to the defaults, and only clean text and ids are kept, since
 * they end up in the page's HTML.
 * @returns {object} the working state
 */
function loadState() {
  const s = clone(DEFAULT_STATE);
  try {
    // 1. Read what was saved; a first visit keeps the defaults.
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return s;
    const p = JSON.parse(raw) || {};
    // 2. Birth date and life expectancy: kept only if valid.
    if (isIsoDate(p.birthDate) && p.birthDate <= todayIso()) s.birthDate = p.birthDate;
    s.lifeExpectancy = Math.round(
      num(p.lifeExpectancy, LIMITS.lifeExpectancy[0], LIMITS.lifeExpectancy[1], 80)
    );
    // 3. Activities and milestones, rebuilt one by one: safe ids, trimmed names, clamped hours.
    const safeId = (id, prefix) => (typeof id === 'string' && /^[\w-]{1,40}$/.test(id) ? id : uid(prefix));
    if (Array.isArray(p.activities)) {
      s.activities = p.activities
        .filter((a) => a && typeof a === 'object')
        .slice(0, LIMITS.activities)
        .map((a) => ({
          id: safeId(a.id, 'a'),
          name: String(a.name == null ? '' : a.name).slice(0, LIMITS.nameLength),
          hours: num(a.hours, LIMITS.hours[0], LIMITS.hours[1], 0)
        }));
    }
    if (Array.isArray(p.milestones)) {
      s.milestones = p.milestones
        .filter((m) => m && typeof m.name === 'string' && m.name.trim() && isIsoDate(m.date))
        .slice(0, LIMITS.milestones)
        .map((m) => ({
          id: safeId(m.id, 'm'),
          name: m.name.slice(0, LIMITS.milestoneLength),
          date: m.date
        }));
    }
  } catch {
    /* unreadable data: start from defaults rather than crash */
  }
  return s;
}

/**
 * Saves the state to localStorage. setItem can throw (Safari private mode, a full
 * quota); the app then simply carries on for this session without saving.
 */
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — fail silently, app still works this session */
  }
}

export const state = loadState();

export let currentStats = null;

/** Sets currentStats (imported bindings are read-only in other modules). */
export function setCurrentStats(value) {
  currentStats = value;
}
