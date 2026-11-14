/**
 * Motion and light: counting numbers, filled sliders, list items leaving,
 * the reading progress bar and the pointer effects on cards and buttons.
 */

import { $, prefersReducedMotion } from './utils.js';

/**
 * Counts the number shown in `el` up (or down) to `target`, easing out. It starts
 * from the value last shown, so dragging a slider moves it smoothly.
 * @param {HTMLElement} el
 * @param {number} target
 * @param {{duration?:number, decimals?:number, suffix?:string, formatter?:function}} [opts]
 */
export function animateNumber(el, target, opts) {
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
  // One frame: the eased value for the time elapsed, until the target is reached.
  function tick(now) {
    if (startTime === null) startTime = now;
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    el.textContent = render(from + (target - from) * eased);
    // Stop if a newer call has taken over this element.
    if (progress < 1 && el._value === target) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/**
 * Lights the part of a range slider left of its thumb: CSS draws the track
 * as a gradient that stops at --fill, and this keeps --fill in step with
 * the slider's value, min and max.
 * @param {HTMLInputElement} el
 */
export function paintRange(el) {
  const min = parseFloat(el.min) || 0;
  let max = parseFloat(el.max);
  const v = parseFloat(el.value) || 0;
  if (!isFinite(max)) max = 100;
  const pct = max > min ? ((v - min) / (max - min)) * 100 : 100;
  el.style.setProperty('--fill', `${Math.max(0, Math.min(100, pct))}%`);
}

/**
 * Plays the leaving animation on a list item (.leaving), then calls `done`
 * (which removes it from the state and re-renders). Straight away with
 * reduced motion; a timer makes sure `done` runs even if no animation does.
 * @param {Element|null} el
 * @param {function} done
 */
export function leave(el, done) {
  let finished = false;
  // Calls `done` only once, whether the animation ends or the timer fires first.
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

/**
 * Drives the thin progress bar fixed to the top of the page. Marked
 * `{ passive:true }` because this listener never calls
 * preventDefault() — telling the browser that up front lets it start
 * scrolling immediately rather than waiting to see if the listener will
 * block it, which matters for scroll smoothness on a page this long.
 */
export function setupScrollProgress() {
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

// ---------- Pointer effects ----------
/** Cards that a light follows across (see "Surfaces and light" in the stylesheet). */
const LIGHT_SELECTOR = '.stat-card, .habit-row, .weeks-grid, .whatif-result';

/** Cards that also lean towards the mouse in 3D. */
const TILT_SELECTOR = '.whatif-result';

/** Buttons that lean a few pixels towards the cursor. */
const MAGNET_SELECTOR = '.btn-primary';

/**
 * Pointer effects, for mouse users only. One listener for the page writes the
 * pointer position into CSS variables on the element under it: --px / --py (the
 * light on a card), --rx / --ry (a slight tilt), --mx / --my (a button's pull).
 * Tilt and pull are skipped when reduced motion is on.
 */
export function setupPointerEffects() {
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const still = prefersReducedMotion();
  let last = null,
    queued = false,
    tilted = null,
    pulled = null;

  // Drops a pair of CSS variables, so the element eases back to rest.
  function clear(el, a, b) {
    if (el) {
      el.style.removeProperty(a);
      el.style.removeProperty(b);
    }
  }

  // Once per frame: light, tilt and pull for whatever is under the pointer now.
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
