/**
 * The list of daily habits and the chart of the years they add up to.
 */

import { LIMITS } from './config.js';
import { $, escapeHtml } from './utils.js';
import { state } from './state.js';
import { renderWhatIfOptions } from './what-if.js';

/**
 * Rebuilds the habit list after a row is added or removed. Typing in a row does
 * not come through here (see bindEvents), so a field is never replaced while
 * you are using it.
 */
export function renderHabits() {
  const list = $('habitList');
  list.innerHTML = '';
  state.activities.forEach((act) => {
    const row = document.createElement('div');
    row.className = 'habit-row';
    row.innerHTML =
      `<input type="text" class="habit-name" value="${escapeHtml(act.name)}" placeholder="Activity name" maxlength="${LIMITS.nameLength}" data-id="${act.id}" aria-label="Activity name">` +
      `<div class="habit-hours-wrap">` +
      `<input type="number" class="habit-hours" value="${act.hours}" min="0" max="24" step="0.25" inputmode="decimal" data-id="${act.id}" aria-label="Hours per day for ${escapeHtml(act.name || 'this activity')}">` +
      `<span class="habit-unit">h/day</span></div>` +
      `<button class="habit-remove" type="button" data-id="${act.id}" aria-label="Remove ${escapeHtml(act.name || 'activity')}">×</button>`;
    list.appendChild(row);
  });
  renderHabitChart();
  renderWhatIfOptions();
  checkHabitTotal();
}

/**
 * Years of life per activity, largest first, each bar scaled to the largest.
 * Widths are set one frame after the bars are inserted, so they grow from zero.
 */
export function renderHabitChart() {
  const chart = $('habitChart');
  const empty = $('habitChartEmpty');
  chart.innerHTML = '';
  // 1. Years of life per named activity, largest first.
  const le = state.lifeExpectancy;
  const items = state.activities
    .filter((a) => a.name && a.name.trim())
    .map((a) => ({
      name: a.name,
      hours: a.hours,
      years: (a.hours / 24) * le
    }))
    .sort((a, b) => b.years - a.years);

  // 2. Nothing named yet: show the placeholder instead.
  empty.hidden = items.length > 0;
  if (items.length === 0) return;

  // 3. One row per activity; bars are scaled to the largest (at least one year).
  const max = Math.max(1, ...items.map((i) => i.years));

  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'chart-row';
    const pct = Math.min(100, (item.years / max) * 100);
    row.innerHTML =
      `<div class="chart-label">${escapeHtml(item.name)}</div>` +
      `<div class="chart-track">` +
      `<div class="chart-fill"></div></div>` +
      `<div class="chart-value">${item.years.toFixed(1)} yrs</div>`;
    chart.appendChild(row);
    const fill = row.querySelector('.chart-fill');
    requestAnimationFrame(() => {
      fill.style.width = `${pct}%`;
    });
  });
}

/**
 * Sanity-checks that the entered habits don't add up to more than a
 * 24-hour day, and shows a gentle warning if they do. Deliberately just
 * a warning, not a hard block — someone mid-edit (about to delete an
 * old row) shouldn't be fought by the form; the number itself is still
 * saved and the warning simply invites a second look.
 */
export function checkHabitTotal() {
  const total = state.activities.reduce((s, a) => s + (parseFloat(a.hours) || 0), 0);
  const warn = $('habitWarning');
  if (total > 24) {
    warn.hidden = false;
    warn.textContent = `That's ${total.toFixed(1)} hours a day — a bit more than 24. Try adjusting the numbers.`;
  } else {
    warn.hidden = true;
  }
}
