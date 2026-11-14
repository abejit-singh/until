/**
 * From the setup form to the results: validation, the first render of every
 * section and their reveal as they scroll into view.
 */

import { LIMITS } from './config.js';
import { $, isIsoDate, num, parseIsoDate, todayIso } from './utils.js';
import { computeLifeStats, getAgeBreakdown } from './life.js';
import { currentStats, saveState, setCurrentStats, state } from './state.js';
import { renderWeeksGrid, renderYourLife } from './weeks.js';
import { renderHabits } from './habits.js';
import { renderMilestones } from './milestones.js';

/**
 * Fades each result section in the first time it scrolls into view. On a
 * browser without IntersectionObserver, sections are simply shown at once
 * (otherwise they would stay invisible at opacity 0).
 */
const revealObserver =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      )
    : null;

/** Hands a section to the observer above, or shows it immediately if the browser has none. */
function observeReveal(el) {
  if (revealObserver) revealObserver.observe(el);
  else el.classList.add('is-visible');
}

const GATED_IDS = ['yourLife', 'lifeInWeeks', 'timeGoes', 'whatIf', 'yourFuture', 'finale'];

/**
 * Fills every section from one computeLifeStats result and reveals them.
 * @param {boolean} scrollTo - scroll down to the results: yes after the form is
 *   submitted, no when a returning visitor's data is restored
 */
export function revealResults(scrollTo) {
  setCurrentStats(computeLifeStats(state.birthDate, state.lifeExpectancy));

  renderYourLife(currentStats);
  renderWeeksGrid(currentStats);
  renderHabits();
  renderMilestones();

  GATED_IDS.forEach((id) => {
    $(id).hidden = false;
  });

  $('yourLife').classList.add('is-visible');
  ['lifeInWeeks', 'timeGoes', 'whatIf', 'yourFuture', 'finale'].forEach((id) => {
    observeReveal($(id));
  });

  if (scrollTo) {
    $('yourLife').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/** Shows a validation message under the setup form. */
function showError(msg) {
  const el = $('setupError');
  el.textContent = msg;
  el.hidden = false;
}

/**
 * Checks the setup form (both fields filled, a real date, not in the future,
 * an age under 130 to catch typos), saves it and shows the results.
 */
export function handleShowLife() {
  const birthInput = $('birthDate');
  const leInput = $('lifeExpectancy');
  const errorEl = $('setupError');
  const birthVal = birthInput.value;
  const le = Math.round(num(leInput.value, LIMITS.lifeExpectancy[0], LIMITS.lifeExpectancy[1], 80));

  // 1. Check the date: present, real, not in the future, a plausible age.
  if (!birthVal) {
    showError('Please enter your date of birth.');
    return;
  }
  if (!isIsoDate(birthVal)) {
    showError('That date looks invalid.');
    return;
  }
  if (birthVal > todayIso()) {
    showError("That date hasn't happened yet.");
    return;
  }
  if (getAgeBreakdown(parseIsoDate(birthVal), new Date()).years > LIMITS.maxAge) {
    showError('Please double check the date of birth.');
    return;
  }

  // 2. Save and show the results.
  errorEl.hidden = true;
  state.birthDate = birthVal;
  state.lifeExpectancy = le;
  saveState();

  revealResults(true);
}
