// The small helpers every other module relies on.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addYears,
  daysBetween,
  escapeHtml,
  fmtInt,
  isIsoDate,
  num,
  parseIsoDate,
  uid
} from '../../js/utils.js';

test('num clamps to the range and falls back on anything unreadable', () => {
  assert.equal(num('7.5', 0, 24, 0), 7.5);
  assert.equal(num('-3', 0, 24, 0), 0);
  assert.equal(num('30', 0, 24, 0), 24);
  assert.equal(num('abc', 0, 24, 8), 8);
  assert.equal(num(undefined, 0, 24, 8), 8);
  assert.equal(num(Infinity, 0, 24, 8), 8);
});

test('isIsoDate accepts real calendar dates only', () => {
  assert.equal(isIsoDate('2024-02-29'), true); // leap year
  assert.equal(isIsoDate('2023-02-29'), false);
  assert.equal(isIsoDate('2023-13-01'), false);
  assert.equal(isIsoDate('2023-4-1'), false);
  assert.equal(isIsoDate('01/04/2023'), false);
  assert.equal(isIsoDate(20230401), false);
});

test('parseIsoDate reads the date in local time', () => {
  const d = parseIsoDate('2001-03-09');
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2001, 2, 9, 0]);
});

test('daysBetween counts calendar days, also across a daylight-saving change', () => {
  assert.equal(daysBetween(new Date(2024, 0, 1), new Date(2024, 0, 31)), 30);
  assert.equal(daysBetween(new Date(2024, 0, 1), new Date(2025, 0, 1)), 366); // leap year
  // Clocks go forward in Europe on 31 March 2024: that day has 23 hours.
  assert.equal(daysBetween(new Date(2024, 2, 30, 12), new Date(2024, 3, 1, 12)), 2);
  assert.equal(daysBetween(new Date(2024, 0, 31), new Date(2024, 0, 1)), -30);
});

test('addYears keeps the day, and moves 29 February to the 28th in common years', () => {
  const plain = addYears(new Date(2001, 2, 9), 80);
  assert.deepEqual([plain.getFullYear(), plain.getMonth(), plain.getDate()], [2081, 2, 9]);
  const leap = addYears(new Date(2000, 1, 29), 1);
  assert.deepEqual([leap.getFullYear(), leap.getMonth(), leap.getDate()], [2001, 1, 28]);
});

test('escapeHtml neutralises markup, quotes included', () => {
  assert.equal(
    escapeHtml('<b onclick="x">Tom & "Jerry"</b>'),
    '&lt;b onclick=&quot;x&quot;&gt;Tom &amp; &quot;Jerry&quot;&lt;/b&gt;'
  );
  assert.equal(escapeHtml("it's"), 'it&#39;s');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(42), '42');
});

test('fmtInt rounds and groups thousands', () => {
  assert.equal(fmtInt(1234.6), '1,235');
  assert.equal(fmtInt(0), '0');
});

test('uid gives a new id every time, with the given prefix', () => {
  const ids = new Set(Array.from({ length: 200 }, () => uid('a')));
  assert.equal(ids.size, 200);
  assert.ok([...ids].every((id) => id.startsWith('a')));
});
