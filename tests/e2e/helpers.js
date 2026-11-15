import { expect, test as base } from '@playwright/test';

/**
 * The test function used by every spec: it fails a test if the page logged an error or threw,
 * and accepts the confirmation dialogs (reset, remove) the app shows.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('dialog', (dialog) => dialog.accept());
    await use(page);
    expect(errors, 'errors logged by the page').toEqual([]);
  }
});

export { expect };

/** Moves a range slider to a value the way a user would: the page hears `input` and `change`. */
export async function setRange(locator, value) {
  await locator.evaluate((el, v) => {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

/** How far the page can scroll sideways, in pixels (0 when nothing overflows). */
export function sidewaysOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}
