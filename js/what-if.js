/**
 * What If: the years a change of habit would give back.
 */

import { $, fmtInt } from './utils.js';
import { currentStats, state } from './state.js';
import { animateNumber, paintRange } from './effects.js';

/** Refreshes the What If dropdown from the activity list, keeping the current choice. */
export function renderWhatIfOptions() {
  const select = $('whatIfSelect');
  const prevValue = select.value;
  select.innerHTML = '';
  const named = state.activities.filter((a) => a.name && a.name.trim());

  named.forEach((a) => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.name;
    select.appendChild(opt);
  });

  if (named.some((a) => a.id === prevValue)) {
    select.value = prevValue;
  }
  updateWhatIf();
}

// Below this many hours, the What-If slider refuses to suggest cutting
// sleep further — see updateWhatIf(). 7h is the commonly cited lower
// bound of a healthy adult sleep range; the point isn't clinical
// precision, it's that a tool about "getting time back" should never
// frame losing sleep as a way to gain it.
const SLEEP_FLOOR_HOURS = 7;

/**
 * True if an activity looks like sleep. Names are free text, so the match is
 * loose ("Sleep", "sleeping in"…): better to protect one activity too many.
 * @param {string} name
 * @returns {boolean}
 */
function isSleepActivity(name) {
  return /sleep/i.test(name || '');
}

/**
 * Recomputes What If when the activity or the target changes. For sleep, the
 * slider's minimum is raised to the 7-hour floor, so it can't even be dragged
 * lower. Choosing another activity puts the slider back in the middle.
 */
export function updateWhatIf() {
  const select = $('whatIfSelect');
  const act = state.activities.find((a) => a.id === select.value);
  const targetSlider = $('whatIfTarget');
  const currentLabel = $('whatIfCurrent');
  const yearsEl = $('whatIfYears');
  const hoursEl = $('whatIfHours');
  const sleepNote = $('whatIfSleepNote');

  // 1. No activity to change yet: reset the section.
  if (!act) {
    currentLabel.textContent = '—';
    targetSlider.value = 0;
    $('whatIfTargetValue').textContent = '0';
    yearsEl.textContent = '0.0';
    hoursEl.textContent = 'Add an activity above to get started.';
    if (sleepNote) sleepNote.hidden = true;
    paintRange(targetSlider);
    return;
  }

  // 2. The slider runs from the sleep floor (or 0) up to today's hours.
  currentLabel.textContent = Number(act.hours).toFixed(2);

  const sleepFloor = isSleepActivity(act.name) ? Math.min(SLEEP_FLOOR_HOURS, act.hours) : 0;
  targetSlider.min = sleepFloor;
  targetSlider.max = act.hours;
  if (sleepNote) sleepNote.hidden = !isSleepActivity(act.name);

  // 3. A different activity, or a value now out of range: back to the middle.
  const needsReset =
    targetSlider.dataset.actId !== act.id ||
    parseFloat(targetSlider.value) > act.hours ||
    parseFloat(targetSlider.value) < sleepFloor;
  if (needsReset) {
    targetSlider.value = Math.max(sleepFloor, act.hours / 2);
    targetSlider.dataset.actId = act.id;
  }

  // 4. The new daily target.
  let target = parseFloat(targetSlider.value) || 0;
  if (target < sleepFloor) target = sleepFloor; // belt-and-suspenders in case `min` was bypassed programmatically
  $('whatIfTargetValue').textContent = target.toFixed(2);

  // 5. Hours saved each day, over the years you may have left.
  const savedPerDay = Math.max(0, act.hours - target);
  const remainingYears = currentStats ? currentStats.remainingYears : 0;
  const yearsGained = (savedPerDay / 24) * remainingYears;
  const hoursGained = savedPerDay * 365.25 * remainingYears;

  animateNumber(yearsEl, yearsGained, { decimals: 1, duration: 700 });
  hoursEl.textContent = `That\u2019s approximately ${fmtInt(hoursGained)} hours recovered.`;
  paintRange(targetSlider);
}
