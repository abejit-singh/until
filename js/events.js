/**
 * Event wiring: every listener of the page is attached here.
 */

import { LIMITS, QUOTES, STORAGE_KEY } from './config.js';
import { $, isIsoDate, num, uid } from './utils.js';
import { saveState, state } from './state.js';
import { leave, paintRange } from './effects.js';
import { setupTooltip } from './weeks.js';
import { checkHabitTotal, renderHabitChart, renderHabits } from './habits.js';
import { renderWhatIfOptions, updateWhatIf } from './what-if.js';
import { renderMilestones } from './milestones.js';
import { handleShowLife } from './flow.js';

/**
 * All event wiring, called once from init. The habit and milestone lists each
 * have one delegated listener; a row's data-id says which item it belongs to.
 */
export function bindEvents() {
  // Hero and setup form.
  $('ctaStart').addEventListener('click', () => {
    $('setup').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('ctaShow').addEventListener('click', handleShowLife);

  $('lifeExpectancy').addEventListener('input', (e) => {
    $('lifeExpectancyValue').textContent = e.target.value;
    paintRange(e.target);
  });

  // Weeks grid.
  setupTooltip();

  // Habits: typing in a row updates the chart without rebuilding the list.
  $('habitList').addEventListener('input', (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    const act = state.activities.find((a) => a.id === id);
    if (!act) return;
    if (e.target.classList.contains('habit-name')) act.name = e.target.value.slice(0, LIMITS.nameLength);
    if (e.target.classList.contains('habit-hours'))
      act.hours = num(e.target.value, LIMITS.hours[0], LIMITS.hours[1], 0);
    saveState();
    renderHabitChart();
    renderWhatIfOptions();
    checkHabitTotal();
  });

  // When the user leaves an hours field, show the cleaned value (e.g. "-3" becomes 0, "30" becomes 24).
  $('habitList').addEventListener('change', (e) => {
    if (!e.target.classList.contains('habit-hours')) return;
    const act = state.activities.find((a) => a.id === e.target.dataset.id);
    if (act) e.target.value = act.hours;
  });

  // Habits: removing a row (it slides out first) and adding one.
  $('habitList').addEventListener('click', (e) => {
    if (e.target.classList.contains('habit-remove')) {
      const id = e.target.dataset.id;
      leave(e.target.closest('.habit-row'), () => {
        state.activities = state.activities.filter((a) => a.id !== id);
        saveState();
        renderHabits();
      });
    }
  });

  $('addHabit').addEventListener('click', () => {
    if (state.activities.length >= LIMITS.activities) return;
    state.activities.push({ id: uid('a'), name: '', hours: 1 });
    saveState();
    renderHabits();
    const rows = document.querySelectorAll('.habit-row');
    if (rows.length) rows[rows.length - 1].classList.add('enter');
    const inputs = document.querySelectorAll('.habit-name');
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  });

  // What if.
  $('whatIfSelect').addEventListener('change', updateWhatIf);
  $('whatIfTarget').addEventListener('input', updateWhatIf);

  // Milestones: adding one (name and a valid date) and removing one.
  $('milestoneForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = $('milestoneName');
    const dateInput = $('milestoneDate');
    const name = nameInput.value.trim().slice(0, LIMITS.milestoneLength);
    const date = dateInput.value;
    if (!name) {
      nameInput.focus();
      return;
    }
    if (!isIsoDate(date)) {
      dateInput.focus();
      return;
    }
    if (state.milestones.length >= LIMITS.milestones) return;
    const newId = uid('m');
    state.milestones.push({ id: newId, name, date });
    saveState();
    renderMilestones();
    const added = $('milestoneList').querySelector(`[data-id="${newId}"]`);
    if (added) added.closest('.milestone-item').classList.add('enter');
    nameInput.value = '';
    dateInput.value = '';
    nameInput.focus();
  });

  $('milestoneList').addEventListener('click', (e) => {
    if (e.target.classList.contains('milestone-remove')) {
      const id = e.target.dataset.id;
      leave(e.target.closest('.milestone-item'), () => {
        state.milestones = state.milestones.filter((m) => m.id !== id);
        saveState();
        renderMilestones();
      });
    }
  });

  // Finale: a random prompt, replayed from the start each time.
  $('ctaFinale').addEventListener('click', () => {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const el = $('finaleQuote');
    el.classList.remove('show');
    void el.offsetWidth;
    el.textContent = q;
    el.classList.add('show');
  });

  // Reset: erase everything after a confirmation.
  $('resetBtn').addEventListener('click', () => {
    if (!confirm('Erase all your UNTIL data? This can\u2019t be undone.')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      /* storage unavailable: nothing to erase */
    }
    location.reload();
  });
}
