/**
 * UNTIL — a dependency-free time visualization.
 *
 * Architecture
 * ------------
 * - Three plain files: index.html (markup), style.css and this script.
 *   No build step, no framework, no backend.
 * - All user data (birth date, life expectancy, habits, milestones) lives in
 *   one `state` object, persisted to localStorage after every change.
 * - Rendering is one-directional: render functions read from `state` and
 *   rebuild the relevant DOM; nothing keeps its own separate copy of data.
 *   That keeps the UI and the saved data from ever drifting apart.
 * - Code below is grouped by responsibility, in this order: constants/state,
 *   pure helper functions, one render function per UI section, event
 *   wiring, then init.
 * - Modern JavaScript that every current browser runs natively (const/let,
 *   arrow functions, template literals), so there is nothing to transpile.
 */
(() => {
  'use strict';

  /* ============================= CONSTANTS ============================= */
  const STORAGE_KEY = 'until_state_v1';
  const DAY_MS = 24 * 60 * 60 * 1000;
  const WEEKS_PER_ROW = 52; // one row of the grid = one year of life

  /** Limits applied to everything the user can type, so no field can break the maths or the layout. */
  const LIMITS = {
    lifeExpectancy: [50, 110],
    hours: [0, 24],
    nameLength: 60,
    milestoneLength: 80,
    activities: 30,
    milestones: 100,
    maxAge: 130
  };

  const QUOTES = [
    'You will never get this exact day back. Use it on purpose.',
    'Do one thing today that your future self will thank you for.',
    'The average week is just a square. Today, make yours count.',
    "You can't add days to your life. But you can add life to your day.",
    "Time isn't found. It's chosen.",
    'Small. Deliberate. Today.'
  ];

  const DEFAULT_STATE = {
    birthDate: null,
    lifeExpectancy: 80,
    activities: [
      { id: 'a1', name: 'Sleep', hours: 8 },
      { id: 'a2', name: 'Work / School', hours: 8 },
      { id: 'a3', name: 'Social Media', hours: 2 }
    ],
    milestones: []
  };

  /* ============================= STATE ============================= */

  /**
   * Deep-clones a plain data object via a JSON round-trip. Only safe for
   * data that survives JSON (no functions, Dates, undefined, etc.) — which
   * is exactly what DEFAULT_STATE is, so this is a deliberate, cheap
   * alternative to structuredClone() (used instead of it for wider browser
   * support, since this app ships with no polyfills at all).
   * @param {object} obj
   * @returns {object} a fully independent copy of obj
   */
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Parses a value as a finite number and clamps it to [min, max]; anything
   * unreadable becomes `fallback`. Used on every number typed by the user or
   * read from storage, so negative hours or "NaN" never reach the maths.
   * @param {*} value
   * @param {number} min
   * @param {number} max
   * @param {number} fallback
   * @returns {number}
   */
  function num(value, min, max, fallback) {
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
  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /** True for a real calendar date written as YYYY-MM-DD (rejects things like 2023-02-31). */
  function isIsoDate(str) {
    if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const d = parseIsoDate(str);
    return (
      d.getFullYear() === +str.slice(0, 4) &&
      d.getMonth() === +str.slice(5, 7) - 1 &&
      d.getDate() === +str.slice(8, 10)
    );
  }

  /**
   * Reads saved state from localStorage and rebuilds it field by field on
   * top of DEFAULT_STATE, validating every value instead of trusting the
   * stored object wholesale. That matters for three reasons:
   * (1) if a future version adds a new state field, a visitor with old saved
   *     data still gets a sane default for it instead of `undefined`;
   * (2) if localStorage holds malformed JSON (corrupted, or edited by hand),
   *     JSON.parse throws, we land in the catch block, and the app boots
   *     with defaults instead of crashing;
   * (3) stored text and ids end up inside HTML, so only clean values are
   *     kept — a tampered entry can't inject markup or break the layout.
   * @returns {object} the app's working state
   */
  function loadState() {
    const s = clone(DEFAULT_STATE);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return s;
      const p = JSON.parse(raw) || {};
      if (isIsoDate(p.birthDate) && p.birthDate <= todayIso()) s.birthDate = p.birthDate;
      s.lifeExpectancy = Math.round(
        num(p.lifeExpectancy, LIMITS.lifeExpectancy[0], LIMITS.lifeExpectancy[1], 80)
      );
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
    } catch (e) {
      /* unreadable data: start from defaults rather than crash */
    }
    return s;
  }

  /**
   * Persists the current in-memory `state` to localStorage. Wrapped in
   * try/catch because localStorage.setItem can throw — most commonly in
   * Safari private browsing (where localStorage exists but is read-only
   * with a 0-byte quota) or when a user has genuinely filled their quota.
   * Either way, failing to save shouldn't crash the app; the user just
   * keeps working for the rest of this session without persistence.
   */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable — fail silently, app still works this session */
    }
  }

  const state = loadState();
  let currentStats = null;

  /* ============================= HELPERS ============================= */

  /**
   * Escapes text for safe insertion into HTML — both element content AND
   * attribute values. All five significant characters are replaced, quotes
   * included: activity names are written into `value="…"` attributes, and
   * an unescaped `"` there would let a name like `" onfocus="…` close the
   * attribute and add its own code. (The common shortcut of setting
   * textContent and reading innerHTML back does NOT escape quotes, which is
   * exactly why it isn't used here.)
   * @param {*} value - value to escape (non-strings are coerced first).
   * @returns {string} HTML-safe text.
   */
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Shorthand for document.getElementById — used dozens of times below. */
  function $(id) {
    return document.getElementById(id);
  }

  /**
   * Turns 'YYYY-MM-DD' into a Date at local midnight. Done by hand because
   * `new Date('YYYY-MM-DD')` is parsed as UTC midnight, which in time zones
   * west of Greenwich is still the previous day locally.
   * @param {string} iso
   * @returns {Date}
   */
  function parseIsoDate(iso) {
    return new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  }

  /** Today's date as 'YYYY-MM-DD' in the user's own time zone. */
  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Whole calendar days between two dates. Each date is converted to UTC
   * from its local year/month/day first, so a daylight-saving change (a
   * "day" of 23 or 25 hours) can never make the count off by one.
   * @param {Date} a
   * @param {Date} b
   * @returns {number} b − a, in days
   */
  function daysBetween(a, b) {
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
  function addYears(date, years) {
    const y = date.getFullYear() + years,
      m = date.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(date.getDate(), lastDay));
  }

  /**
   * Calendar-accurate age breakdown (years/months/days) between two dates.
   * Deliberately not a division of the millisecond difference by an average
   * month length — that drifts. This walks the actual calendar fields, the
   * same way you'd count on your fingers: subtract years, then months, then
   * borrow a month's worth of days if `now`'s day-of-month comes before
   * `birth`'s.
   * @param {Date} birth
   * @param {Date} now
   * @returns {{years:number, months:number, days:number}}
   */
  function getAgeBreakdown(birth, now) {
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
   * The single source of truth for every number the site shows: age, weeks
   * lived/remaining, and percentage of the chosen lifespan elapsed.
   * Every other render function consumes this object rather than
   * recomputing dates itself, so the grid, the stat cards, and the What-If
   * section can never disagree with each other.
   *
   * Two different notions of "week" are used on purpose:
   *  - The headline numbers (weeks lived, weeks remaining) are real
   *    7-day weeks between real dates: birth → today → the day you turn
   *    your chosen life expectancy.
   *  - The grid is laid out as exactly 52 squares per row, one row per
   *    year of age, so a row always means "a year". The current square is
   *    therefore placed by age: row = completed years, column = weeks
   *    since your last birthday (capped at 51, because a year is 52 weeks
   *    and one or two days). Placing it by "total days ÷ 7" instead would
   *    drift about one square every 5–6 years, since a real year is
   *    slightly longer than 52 weeks.
   *
   * @param {string} birthDateStr - ISO date string (YYYY-MM-DD) from the input.
   * @param {number} lifeExpectancy - chosen life expectancy, in years.
   * @returns {object} stats — see individual fields inline below.
   */
  function computeLifeStats(birthDateStr, lifeExpectancy) {
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

  /**
   * Animates a number inside `el` from the value it currently shows to
   * `target`, using requestAnimationFrame rather than setInterval so it
   * stays in sync with the browser's repaint cycle (no jank, pauses on a
   * backgrounded tab). Eased with cubic ease-out so it settles rather than
   * stopping abruptly. The last value is remembered on the element, so
   * dragging the What-If slider moves the number smoothly from where it is
   * instead of restarting from zero on every movement.
   * @param {HTMLElement} el - element whose textContent gets updated each frame.
   * @param {number} target - final value to land on.
   * @param {{duration?:number, decimals?:number, suffix?:string, formatter?:function}} [opts]
   */
  function animateNumber(el, target, opts) {
    opts = opts || {};
    if (!isFinite(target)) target = 0;
    const duration = opts.duration || 1100;
    const decimals = opts.decimals != null ? opts.decimals : 0;
    const suffix = opts.suffix || '';
    const render = opts.formatter || ((v) => v.toFixed(decimals) + suffix);
    const from = typeof el._value === 'number' ? el._value : 0;
    el._value = target;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (from === target || reduced) {
      el.textContent = render(target);
      return;
    }
    let startTime = null;
    function tick(now) {
      if (startTime === null) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = render(from + (target - from) * eased);
      // Stop if a newer call has taken over this element.
      if (progress < 1 && el._value === target) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /** Rounds and formats a number with thousands separators, e.g. 3200 → "3,200". */
  function fmtInt(v) {
    return Math.round(v).toLocaleString('en-US');
  }

  /**
   * Lights the part of a range slider left of its thumb: CSS draws the track
   * as a gradient that stops at --fill, and this keeps --fill in step with
   * the slider's value, min and max.
   * @param {HTMLInputElement} el
   */
  function paintRange(el) {
    const min = parseFloat(el.min) || 0;
    let max = parseFloat(el.max);
    const v = parseFloat(el.value) || 0;
    if (!isFinite(max)) max = 100;
    const pct = max > min ? ((v - min) / (max - min)) * 100 : 100;
    el.style.setProperty('--fill', `${Math.max(0, Math.min(100, pct))}%`);
  }

  /** True when the user has asked their system for reduced motion. */
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /**
   * Plays the leaving animation on a list item (.leaving), then calls `done`
   * (which removes it from the state and re-renders). Straight away with
   * reduced motion; a timer makes sure `done` runs even if no animation does.
   * @param {Element|null} el
   * @param {function} done
   */
  function leave(el, done) {
    let finished = false;
    function finish() {
      if (!finished) {
        finished = true;
        done();
      }
    }
    if (!el || prefersReducedMotion()) {
      finish();
      return;
    }
    el.classList.add('leaving');
    el.addEventListener('animationend', finish);
    setTimeout(finish, 450);
  }

  /* ============================= RENDER: YOUR LIFE ============================= */
  /**
   * Fills in the "Your Life" section (age, weeks remaining, and the four
   * stat cards) from a single `stats` object produced by computeLifeStats.
   * Note this function never computes anything itself — it's a pure
   * read-and-display step, which is what keeps this section guaranteed
   * consistent with the weeks grid below it (both read the same `stats`).
   * @param {object} stats - result of computeLifeStats().
   */
  function renderYourLife(stats) {
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

  /* ============================= RENDER: WEEKS GRID ============================= */
  /**
   * Builds the "life in weeks" grid: one <div class="week-dot"> per week of
   * the chosen life expectancy, classed past/current/future so CSS alone
   * handles the three colors (see .week-dot.past/.current/.future).
   *
   * Two performance choices worth calling out for a grid that can exceed
   * 5,000 elements (a 100-year lifespan × 52):
   *  - Every dot is built in memory and appended once via a
   *    DocumentFragment, instead of calling grid.appendChild() in the loop.
   *    That's a single reflow instead of thousands.
   *  - No per-dot event listeners are attached here — hover/click handling
   *    is delegated once on the grid container in setupTooltip(), not
   *    attached to each individual dot.
   *
   * @param {object} stats - result of computeLifeStats(); uses totalWeeks,
   *   currentWeekIndex, and surpassed.
   */
  function renderWeeksGrid(stats) {
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
   * Reconstructs the real calendar date a given grid square represents,
   * purely from its index — the grid itself stores no dates, only a
   * 0-based week number in `dataset.week`. Row = year of age, column =
   * week within that year, so square #942 (row 18, column 6) is
   * "your 18th birthday + 6 weeks". Using the birthday of each row as the
   * anchor keeps the dates exact, with no drift over a long life.
   * @param {number} weekIndex - 0-based index of the square in the grid.
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
   * Wires up hover/click on the weeks grid using event delegation: a
   * *single* pair of listeners on the grid container, rather than one pair
   * per square. With a grid that can hold 5,000+ squares, attaching a
   * listener to each one would be needlessly expensive to set up and to
   * garbage-collect on every re-render; delegation relies on mouse events
   * bubbling from the square up to the container, where `e.target` still
   * tells us exactly which square was under the cursor.
   *
   * Click is handled separately from hover so the tooltip also works on
   * touch devices (which don't fire mousemove) — tapping a square shows the
   * tooltip pinned near it for a couple of seconds, then auto-hides.
   */
  function setupTooltip() {
    const tooltip = $('tooltip');
    const grid = $('weeksGrid');
    let hideTimer = null;

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

  /* ============================= RENDER: HABITS ============================= */
  /**
   * Rebuilds the entire habit list from `state.activities`. Called after
   * any structural change (add/remove a row) — full re-render is
   * deliberate and simple here since the list is short (a handful of rows)
   * and rebuilding it is cheap; there's no need for more surgical DOM
   * patching. Editing a row's *value* in place (typing in a name or an
   * hours field) is instead handled by a lighter-weight input listener in
   * bindEvents(), which updates state and the chart without tearing down
   * and rebuilding every row on every keystroke.
   *
   * `act.id` is written into `data-id` on each field so the delegated
   * input/click handlers in bindEvents() can look up which activity in
   * `state.activities` a given row belongs to.
   */
  function renderHabits() {
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
   * Turns each named activity into "years of a lifetime spent on this",
   * sorted largest-first so the biggest time sinks surface at the top —
   * the whole point of this section is the surprise of seeing which
   * habits actually add up. Bars scale relative to the *largest* item
   * (not to lifeExpectancy itself), so the chart stays legible whether
   * someone's biggest habit is 2 years or 30.
   *
   * The bar's width is set one frame after the element is inserted
   * (via requestAnimationFrame) rather than inline, purely so the CSS
   * transition on .chart-fill's width has a "from 0" starting point to
   * animate from — setting the final width immediately would skip the
   * animation, since the browser would never paint the 0% state.
   */
  function renderHabitChart() {
    const chart = $('habitChart');
    const empty = $('habitChartEmpty');
    chart.innerHTML = '';
    const le = state.lifeExpectancy;
    const items = state.activities
      .filter((a) => a.name && a.name.trim())
      .map((a) => ({
        name: a.name,
        hours: a.hours,
        years: (a.hours / 24) * le
      }))
      .sort((a, b) => b.years - a.years);

    empty.hidden = items.length > 0;
    if (items.length === 0) return;

    const max = Math.max.apply(null, items.map((i) => i.years).concat([1]));

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
  function checkHabitTotal() {
    const total = state.activities.reduce((s, a) => s + (parseFloat(a.hours) || 0), 0);
    const warn = $('habitWarning');
    if (total > 24) {
      warn.hidden = false;
      warn.textContent = `That's ${total.toFixed(1)} hours a day — a bit more than 24. Try adjusting the numbers.`;
    } else {
      warn.hidden = true;
    }
  }

  /* ============================= WHAT IF ============================= */
  /**
   * Keeps the What-If dropdown's list of activities in sync with
   * `state.activities` (an activity might have just been renamed, added,
   * or removed). Rebuilding <option> elements would normally reset the
   * dropdown to its first option — the `prevValue` / re-select dance below
   * exists purely so the user's current selection survives a rebuild
   * triggered by, say, editing a *different* row's name.
   */
  function renderWhatIfOptions() {
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
   * Heuristic match for "is this activity sleep", by name substring rather
   * than a fixed activity id — activities are free-text and user-renamable,
   * so there's no stable id to key off. Deliberately case-insensitive and
   * permissive (matches "Sleep", "sleep schedule", "Sleeping in"): a false
   * positive just applies a floor that doesn't hurt anything else, while a
   * false negative would silently let the harmful suggestion through, so
   * this errs on the side of catching more.
   * @param {string} name
   * @returns {boolean}
   */
  function isSleepActivity(name) {
    return /sleep/i.test(name || '');
  }

  /**
   * Recomputes the What-If result (years/hours "recovered") whenever the
   * selected activity or the target slider changes. Also enforces the
   * sleep floor described above: if the selected activity looks like
   * sleep, the slider's own `min` attribute is raised to
   * min(SLEEP_FLOOR_HOURS, currentHours) — making it physically impossible
   * to drag the slider into an unhealthy range, rather than allowing the
   * drag and then clamping the displayed result after the fact.
   *
   * `needsReset` re-centers the slider (at half the current hours, or the
   * sleep floor if that's higher) whenever the selection changes to a
   * *different* activity, or whenever the previous value would now be
   * out of the new activity's valid range — without this, switching from
   * "Gaming: 3h" to "Sleep: 8h" could leave the slider sitting at a
   * leftover value that makes no sense for the new selection.
   */
  function updateWhatIf() {
    const select = $('whatIfSelect');
    const act = state.activities.find((a) => a.id === select.value);
    const targetSlider = $('whatIfTarget');
    const currentLabel = $('whatIfCurrent');
    const yearsEl = $('whatIfYears');
    const hoursEl = $('whatIfHours');
    const sleepNote = $('whatIfSleepNote');

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

    currentLabel.textContent = Number(act.hours).toFixed(2);

    const sleepFloor = isSleepActivity(act.name) ? Math.min(SLEEP_FLOOR_HOURS, act.hours) : 0;
    targetSlider.min = sleepFloor;
    targetSlider.max = act.hours;
    if (sleepNote) sleepNote.hidden = !isSleepActivity(act.name);

    const needsReset =
      targetSlider.dataset.actId !== act.id ||
      parseFloat(targetSlider.value) > act.hours ||
      parseFloat(targetSlider.value) < sleepFloor;
    if (needsReset) {
      targetSlider.value = Math.max(sleepFloor, act.hours / 2);
      targetSlider.dataset.actId = act.id;
    }

    let target = parseFloat(targetSlider.value) || 0;
    if (target < sleepFloor) target = sleepFloor; // belt-and-suspenders in case `min` was bypassed programmatically
    $('whatIfTargetValue').textContent = target.toFixed(2);

    const savedPerDay = Math.max(0, act.hours - target);
    const remainingYears = currentStats ? currentStats.remainingYears : 0;
    const yearsGained = (savedPerDay / 24) * remainingYears;
    const hoursGained = savedPerDay * 365.25 * remainingYears;

    animateNumber(yearsEl, yearsGained, { decimals: 1, duration: 700 });
    hoursEl.textContent = `That\u2019s approximately ${fmtInt(hoursGained)} hours recovered.`;
    paintRange(targetSlider);
  }

  /* ============================= MILESTONES ============================= */
  /**
   * Renders the milestone timeline, sorted chronologically (not by
   * insertion order) so a milestone added out of sequence still lands in
   * the right place in the list. Milestones dated in the past are marked
   * "passed" and shown with a dimmed dot, rather than removed — treating
   * them as achieved history is more useful than deleting them outright.
   */
  function renderMilestones() {
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

  /* ============================= REVEAL / FLOW ============================= */
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
   * Runs once the user submits their birth date/life expectancy (or on
   * page load, for a returning visitor with saved data). Computes stats
   * once, feeds every section from that single result, then un-hides the
   * result sections and hands them to the IntersectionObserver so each
   * fades in the first time it scrolls into view.
   * @param {boolean} scrollTo - whether to auto-scroll to the results (true
   *   on manual submit; false on silent restore from localStorage, so a
   *   returning visitor lands where they left off instead of being yanked
   *   down the page).
   */
  function revealResults(scrollTo) {
    currentStats = computeLifeStats(state.birthDate, state.lifeExpectancy);

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
   * Validates and commits the setup form (birth date + life expectancy),
   * then triggers the reveal sequence. Three checks guard against three
   * different real mistakes, in order of how likely they are to happen by
   * accident: an empty field, a date that doesn't exist on the calendar
   * (isIsoDate), a date in the future (a typo, e.g.
   * 2124 instead of 1994), and finally an implausible age (>130) as a
   * last sanity net — not a hard biological limit, just a threshold well
   * past any plausible human age, to catch stray typos the earlier checks
   * wouldn't (like a birth year of 1800).
   */
  function handleShowLife() {
    const birthInput = $('birthDate');
    const leInput = $('lifeExpectancy');
    const errorEl = $('setupError');
    const birthVal = birthInput.value;
    const le = Math.round(num(leInput.value, LIMITS.lifeExpectancy[0], LIMITS.lifeExpectancy[1], 80));

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

    errorEl.hidden = true;
    state.birthDate = birthVal;
    state.lifeExpectancy = le;
    saveState();

    revealResults(true);
  }

  /* ============================= EVENTS ============================= */
  /**
   * All event wiring lives in this one function, called once from init().
   * Two delegation patterns recur throughout: list containers (habitList,
   * milestoneList) get one 'input'/'click' listener each rather than
   * per-row listeners, using each row's `data-id` to identify which item
   * in `state` it corresponds to — the same reasoning as the weeks-grid
   * tooltip above, just applied to a shorter, editable list instead of a
   * read-only grid.
   */
  function bindEvents() {
    $('ctaStart').addEventListener('click', () => {
      $('setup').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $('ctaShow').addEventListener('click', handleShowLife);

    $('lifeExpectancy').addEventListener('input', (e) => {
      $('lifeExpectancyValue').textContent = e.target.value;
      paintRange(e.target);
    });

    setupTooltip();

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

    $('whatIfSelect').addEventListener('change', updateWhatIf);
    $('whatIfTarget').addEventListener('input', updateWhatIf);

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

    $('ctaFinale').addEventListener('click', () => {
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      const el = $('finaleQuote');
      el.classList.remove('show');
      void el.offsetWidth;
      el.textContent = q;
      el.classList.add('show');
    });

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

  /**
   * Drives the thin progress bar fixed to the top of the page. Marked
   * `{ passive:true }` because this listener never calls
   * preventDefault() — telling the browser that up front lets it start
   * scrolling immediately rather than waiting to see if the listener will
   * block it, which matters for scroll smoothness on a page this long.
   */
  function setupScrollProgress() {
    const bar = $('progressBar');
    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        // At most one layout read per frame, however many scroll events fire.
        requestAnimationFrame(() => {
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          bar.style.width = `${docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0}%`;
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  /* ============================= POINTER EFFECTS ============================= */

  /** Cards that a light follows across (see "Surfaces and light" in the stylesheet). */
  const LIGHT_SELECTOR = '.stat-card, .habit-row, .weeks-grid, .whatif-result';
  /** Cards that also lean towards the mouse in 3D. */
  const TILT_SELECTOR = '.whatif-result';
  /** Buttons that lean a few pixels towards the cursor. */
  const MAGNET_SELECTOR = '.btn-primary';

  /**
   * Pointer effects, for mouse users only: on touch screens there is no
   * hover, and the effects would only get in the way. A single listener for
   * the whole page; on each animation frame it finds the card, tilting card
   * and button under the pointer and writes the pointer's position into
   * their CSS variables:
   *  - --px / --py: where the light is drawn on a card;
   *  - --rx / --ry: the tilt, a few degrees at most;
   *  - --mx / --my: the pull on a button.
   * When the pointer leaves an element its variables are removed and CSS
   * eases it back. Tilt and pull are skipped with reduced motion.
   */
  function setupPointerEffects() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const still = prefersReducedMotion();
    let last = null,
      queued = false,
      tilted = null,
      pulled = null;

    function clear(el, a, b) {
      if (el) {
        el.style.removeProperty(a);
        el.style.removeProperty(b);
      }
    }

    function apply() {
      queued = false;
      const t = last.target && last.target.closest ? last.target : null;
      const x = last.clientX,
        y = last.clientY;
      const lit = t && t.closest(LIGHT_SELECTOR);
      if (lit) {
        const r = lit.getBoundingClientRect();
        lit.style.setProperty('--px', `${x - r.left}px`);
        lit.style.setProperty('--py', `${y - r.top}px`);
      }
      if (still) return;
      const tilt = t && t.closest(TILT_SELECTOR);
      if (tilted !== tilt) clear(tilted, '--rx', '--ry');
      tilted = tilt;
      if (tilt) {
        const b = tilt.getBoundingClientRect();
        tilt.style.setProperty('--rx', `${(((y - b.top) / b.height - 0.5) * -5).toFixed(2)}deg`);
        tilt.style.setProperty('--ry', `${(((x - b.left) / b.width - 0.5) * 6).toFixed(2)}deg`);
      }
      const btn = t && t.closest(MAGNET_SELECTOR);
      if (pulled !== btn) clear(pulled, '--mx', '--my');
      pulled = btn;
      if (btn) {
        const c = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', `${(((x - c.left) / c.width - 0.5) * 8).toFixed(1)}px`);
        btn.style.setProperty('--my', `${(((y - c.top) / c.height - 0.5) * 6).toFixed(1)}px`);
      }
    }

    document.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        last = e;
        if (!queued) {
          queued = true;
          requestAnimationFrame(apply);
        }
      },
      { passive: true }
    );
    // The pointer left the window: let everything settle back.
    document.documentElement.addEventListener('mouseleave', () => {
      clear(tilted, '--rx', '--ry');
      clear(pulled, '--mx', '--my');
      tilted = pulled = null;
    });
  }

  /* ============================= INIT ============================= */
  /**
   * Entry point. Pre-fills the setup form from any saved state (so a
   * returning visitor sees their own numbers rather than the defaults),
   * sets sane native min/max bounds on the date input (today, and 130
   * years back — matching the sanity check in handleShowLife so the
   * browser's own date picker refuses the same implausible range before
   * the user can even submit it), wires up all event listeners, and — if
   * there's saved data — immediately runs the same reveal path a manual
   * submit would (with `scrollTo:false`, since a returning visitor should
   * land on the results without being scrolled away from wherever the
   * page opened).
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

  // The script tag sits at the end of <body>, so in practice the DOM is
  // already parsed by the time this line runs — but guarding on
  // readyState costs nothing and makes the script safe to move (e.g. into
  // <head>) without silently breaking.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/*
   Service worker: makes the app installable and lets it open offline once
   visited. Only registered over http(s) — browsers don't allow service
   workers on file:// pages, where the app still works normally.
*/
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      /* offline mode unavailable; the app still works online */
    });
  });
}
