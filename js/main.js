/**
 * UNTIL — a dependency-free time visualization.
 *
 * Entry point. The code is split into small ES modules that the browser loads
 * as they are: no build step, no framework, no backend.
 *
 *   config.js      constants, limits, the state a first visit starts from
 *   utils.js       small helpers: numbers, ids, dates, escaping
 *   life.js        the maths: age, weeks lived, weeks left
 *   state.js       the saved data: load, check, save
 *   effects.js     motion and light: counters, sliders, pointer effects
 *   weeks.js       "Your life" and the weeks grid
 *   habits.js      the habit list and its chart
 *   what-if.js     the What If slider
 *   milestones.js  the timeline of goals
 *   flow.js        the setup form and the reveal of the results
 *   events.js      every event listener
 *   main.js        this file: start-up
 *
 * How it fits together
 * - All user data (birth date, life expectancy, habits, milestones) lives in
 *   one `state` object, saved to localStorage after every change.
 * - Rendering is one-directional: render functions read from `state` and
 *   rebuild their part of the page; nothing keeps its own copy of the data,
 *   so the screen and what is saved can never drift apart.
 * - Every figure comes from computeLifeStats (life.js), so the stat cards,
 *   the grid and What If always agree.
 */

import { LIMITS } from './config.js';
import { $, todayIso } from './utils.js';
import { state } from './state.js';
import { paintRange, setupPointerEffects, setupScrollProgress } from './effects.js';
import { revealResults } from './flow.js';
import { bindEvents } from './events.js';

/**
 * Entry point: refills the form from saved data, limits the date picker to the
 * last 130 years, wires the events and shows a returning visitor's results
 * straight away.
 */
function init() {
  // Local dates (not toISOString(), which is UTC and can be "yesterday" just after midnight in Italy).
  const todayStr = todayIso();
  $('birthDate').max = todayStr;
  $('birthDate').min = +todayStr.slice(0, 4) - LIMITS.maxAge + todayStr.slice(4);

  $('lifeExpectancy').value = state.lifeExpectancy;
  $('lifeExpectancyValue').textContent = state.lifeExpectancy;
  if (state.birthDate) $('birthDate').value = state.birthDate;
  paintRange($('lifeExpectancy'));

  bindEvents();
  setupScrollProgress();
  setupPointerEffects();

  if (state.birthDate) {
    revealResults(false);
  }
}

// A module script runs once the document has been parsed, so the page is ready.
init();

// Service worker: makes the app installable and lets it open offline once visited.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      /* offline mode unavailable; the app still works online */
    });
  });
}
