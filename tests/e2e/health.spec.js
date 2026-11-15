// Checks that hold for the whole page, whatever the app does.
import AxeBuilder from '@axe-core/playwright';

import { expect, sidewaysOverflow, test } from './helpers.js';

test('loads without errors and makes no request to another site', async ({ page }) => {
  const external = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.host !== '127.0.0.1:4173') external.push(url.host);
  });
  await page.goto('/');
  await expect(page).toHaveTitle(/UNTIL/);
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});

test('never scrolls sideways', async ({ page }) => {
  await page.goto('/');
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
});

test('uses its own typefaces', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').length);
  expect(loaded).toBeGreaterThanOrEqual(3);
});

test('has no accessibility violations on the opening screen (axe, WCAG 2.2 AA)', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('opens again with no connection after one visit', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // now controlled by the service worker
    await page.waitForLoadState('networkidle');
    await context.setOffline(true);
    await page.reload();
    await expect(page).toHaveTitle(/UNTIL/);
    await expect(page.locator('h1, .logo').first()).toBeVisible();
  });
});
