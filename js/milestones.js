/**
 * The timeline of milestones.
 */

import { $, escapeHtml, parseIsoDate, todayIso } from './utils.js';
import { state } from './state.js';

/**
 * Renders the milestone timeline, sorted chronologically (not by
 * insertion order) so a milestone added out of sequence still lands in
 * the right place in the list. Milestones dated in the past are marked
 * "passed" and shown with a dimmed dot, rather than removed — treating
 * them as achieved history is more useful than deleting them outright.
 */
export function renderMilestones() {
  const list = $('milestoneList');
  list.innerHTML = '';

  if (state.milestones.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'milestone-empty';
    empty.textContent = 'No milestones yet. Add your first one above.';
    list.appendChild(empty);
    return;
  }

  // ISO dates (YYYY-MM-DD) sort correctly as plain strings.
  const sorted = state.milestones.slice().sort((a, b) => a.date.localeCompare(b.date));
  const today = todayIso();

  sorted.forEach((m) => {
    const d = parseIsoDate(m.date);
    const isPast = m.date < today; // a milestone dated today is still "today", not "passed"
    const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const item = document.createElement('div');
    item.className = 'milestone-item';
    item.innerHTML =
      `<span class="milestone-dot ${isPast ? 'past' : ''}"></span>` +
      `<div class="milestone-info">` +
      `<div class="milestone-name">${escapeHtml(m.name)}</div>` +
      `<div class="milestone-date">${dateStr}${isPast ? ' · passed' : ''}</div></div>` +
      `<button class="milestone-remove" type="button" data-id="${m.id}" aria-label="Remove ${escapeHtml(m.name)}">×</button>`;
    list.appendChild(item);
  });
}
