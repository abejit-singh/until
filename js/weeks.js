/**
 * "Your life" (the headline figures) and the grid with one square per week,
 * with its tooltip.
 */

import { WEEKS_PER_ROW } from './config.js';
import { $, addYears, fmtInt } from './utils.js';
import { currentStats, state } from './state.js';
import { animateNumber } from './effects.js';

// ---------- Your life ----------
/** Fills in "Your life" (age, weeks left and the four stat cards) from computeLifeStats. */
export function renderYourLife(stats) {
  $('ageYears').textContent = stats.age.years;
  $('ageMonths').textContent = stats.age.months;
  $('basisLE').textContent = state.lifeExpectancy;

  animateNumber($('weeksRemainingNum'), stats.weeksRemaining, { formatter: fmtInt });
  animateNumber($('weeksLivedNum'), stats.weeksLived, { formatter: fmtInt });
  $('daysLivedNum').textContent = fmtInt(stats.daysLived);
  animateNumber($('yearsRemainingNum'), stats.remainingYears, { decimals: 1 });
  animateNumber($('percentLivedNum'), stats.percentLived, { decimals: 1, suffix: '%' });

  $('surpassedNote').hidden = !stats.surpassed;
}

// ---------- The weeks grid ----------
/**
 * Builds the weeks grid: one square per week of the chosen lifespan, classed
 * past, current or future. The squares go in through a single DocumentFragment
 * and events are delegated to the grid (see setupTooltip), so even 5,000+
 * squares stay cheap.
 * @param {object} stats - from computeLifeStats
 */
export function renderWeeksGrid(stats) {
  const grid = $('weeksGrid');
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  const total = stats.totalWeeks;
  const current = stats.currentWeekIndex;

  for (let i = 0; i < total; i++) {
    const div = document.createElement('div');
    let cls;
    // If the chosen life expectancy has already passed, there is no
    // "current" week to highlight — every square is simply "past".
    if (stats.surpassed) cls = 'past';
    else if (i < current) cls = 'past';
    else if (i === current) cls = 'current';
    else cls = 'future';
    div.className = `week-dot ${cls}`;
    div.dataset.week = i; // read back by the delegated hover/click handler below
    frag.appendChild(div);
  }
  grid.appendChild(frag);
}

/**
 * The date a square stands for, worked out from its index:
 * row = year of age, column = weeks since that birthday.
 * @param {number} weekIndex
 * @returns {string} e.g. "Week 943 · Oct 2015 · age 18"
 */
function weekTooltipText(weekIndex) {
  const year = Math.floor(weekIndex / WEEKS_PER_ROW),
    week = weekIndex % WEEKS_PER_ROW;
  const start = addYears(currentStats.birth, year);
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * 7);
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return `Week ${weekIndex + 1} · ${dateStr} · age ${year}`;
}

/**
 * Tooltip for the weeks grid, with one delegated listener on the grid rather
 * than one per square. Hovering shows it under the mouse; a tap pins it for a
 * couple of seconds, so it works on touch screens too.
 */
export function setupTooltip() {
  const tooltip = $('tooltip');
  const grid = $('weeksGrid');
  let hideTimer = null;

  // Mouse: the tooltip follows the pointer over the squares.
  grid.addEventListener('mousemove', (e) => {
    const target = e.target.closest ? e.target.closest('.week-dot') : null;
    if (!target || !currentStats) {
      tooltip.style.opacity = 0;
      return;
    }
    const weekIndex = parseInt(target.dataset.week, 10);
    tooltip.textContent = weekTooltipText(weekIndex);
    tooltip.style.opacity = 1;
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
  });
  grid.addEventListener('mouseleave', () => {
    tooltip.style.opacity = 0;
  });

  // Tap or click: the tooltip is pinned above the square for a moment.
  grid.addEventListener('click', (e) => {
    const target = e.target.closest ? e.target.closest('.week-dot') : null;
    if (!target || !currentStats) return;
    const rect = target.getBoundingClientRect();
    const weekIndex = parseInt(target.dataset.week, 10);
    tooltip.textContent = weekTooltipText(weekIndex);
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top}px`;
    tooltip.style.opacity = 1;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      tooltip.style.opacity = 0;
    }, 2200);
  });
}
