// The app as a visitor uses it. "Today" is fixed, so the figures are always the same.
import { expect, setRange, test } from './helpers.js';

const TODAY = new Date(2026, 5, 15, 12); // Monday 15 June 2026

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(TODAY);
  await page.goto('/');
});

/** Fills in the setup form for someone born on 9 March 2001 and shows the results. */
async function showMyLife(page, lifeExpectancy = 80) {
  await page.fill('#birthDate', '2001-03-09');
  await setRange(page.locator('#lifeExpectancy'), lifeExpectancy);
  await page.click('#ctaShow');
  await expect(page.locator('#yourLife')).toBeVisible();
}

test('the results stay hidden until a date of birth is given', async ({ page }) => {
  await expect(page.locator('#yourLife')).toBeHidden();
  await page.click('#ctaShow');
  await expect(page.locator('#setupError')).toHaveText('Please enter your date of birth.');
  await expect(page.locator('#yourLife')).toBeHidden();
});

test('a date in the future is refused', async ({ page }) => {
  await page.fill('#birthDate', '2030-01-01');
  await page.click('#ctaShow');
  await expect(page.locator('#setupError')).toHaveText("That date hasn't happened yet.");
  await expect(page.locator('#yourLife')).toBeHidden();
});

test('shows your age and the weeks you have lived and may have left', async ({ page }) => {
  await showMyLife(page);
  await expect(page.locator('#ageYears')).toHaveText('25');
  await expect(page.locator('#ageMonths')).toHaveText('3');
  await expect(page.locator('#weeksLivedNum')).toHaveText('1,318');
  await expect(page.locator('#weeksRemainingNum')).toHaveText('2,855');
  await expect(page.locator('#daysLivedNum')).toHaveText('9,229');
});

test('the grid has 52 squares for every year, and one of them is this week', async ({ page }) => {
  await showMyLife(page, 85);
  await expect(page.locator('.week-dot')).toHaveCount(85 * 52);
  await expect(page.locator('.week-dot.current')).toHaveCount(1);
  // Age 25, 14 weeks after the last birthday.
  await expect(page.locator('.week-dot.current')).toHaveAttribute('data-week', String(25 * 52 + 14));
  await expect(page.locator('.week-dot.past')).toHaveCount(25 * 52 + 14);
});

test('habits: a new activity appears in the chart, and can be removed', async ({ page }) => {
  await showMyLife(page);
  await expect(page.locator('.habit-row')).toHaveCount(3);
  await page.click('#addHabit');
  await expect(page.locator('.habit-row')).toHaveCount(4);
  await page.locator('.habit-name').last().fill('Reading');
  await page.locator('.habit-hours').last().fill('1.5');
  await expect(page.locator('.chart-row')).toHaveCount(4);
  // 1.5 hours a day over 80 years is 5 years.
  await expect(page.locator('.chart-row', { hasText: 'Reading' }).locator('.chart-value')).toHaveText(
    '5.0 yrs'
  );
  await page.locator('.habit-remove').last().click();
  await expect(page.locator('.habit-row')).toHaveCount(3);
  await expect(page.locator('.chart-row')).toHaveCount(3);
});

test('hours outside 0–24 are corrected when you leave the field', async ({ page }) => {
  await showMyLife(page);
  const hours = page.locator('.habit-hours').first();
  await hours.fill('30');
  await hours.blur();
  await expect(hours).toHaveValue('24');
});

test('what if: giving up an hour of a habit gives years back', async ({ page }) => {
  await showMyLife(page);
  await page.selectOption('#whatIfSelect', { label: 'Social Media' });
  await setRange(page.locator('#whatIfTarget'), 1); // from 2 hours a day to 1
  // One hour a day over the 54.73 years left: 54.73 / 24 = 2.3 years.
  await expect(page.locator('#whatIfYears')).toHaveText('2.3');
});

test('what if never suggests sleeping less than 7 hours', async ({ page }) => {
  await showMyLife(page);
  await page.selectOption('#whatIfSelect', { label: 'Sleep' });
  await expect(page.locator('#whatIfTarget')).toHaveAttribute('min', '7');
  await expect(page.locator('#whatIfSleepNote')).toBeVisible();
});

test('milestones are listed in order of date and can be removed', async ({ page }) => {
  await showMyLife(page);
  for (const [name, date] of [
    ['Run a marathon', '2030-10-12'],
    ['Graduate', '2027-07-15']
  ]) {
    await page.fill('#milestoneName', name);
    await page.fill('#milestoneDate', date);
    await page.click('#milestoneForm button[type=submit]');
  }
  await expect(page.locator('.milestone-name')).toHaveText(['Graduate', 'Run a marathon']);
  await page.locator('.milestone-remove').first().click();
  await expect(page.locator('.milestone-name')).toHaveText(['Run a marathon']);
});

test('the closing button shows a prompt', async ({ page }) => {
  await showMyLife(page);
  await page.click('#ctaFinale');
  await expect(page.locator('#finaleQuote')).not.toBeEmpty();
});

test('everything is still there after a reload, and reset clears it', async ({ page }) => {
  await showMyLife(page, 90);
  await page.click('#addHabit');
  await page.locator('.habit-name').last().fill('Reading');
  await page.reload();
  await expect(page.locator('#yourLife')).toBeVisible();
  await expect(page.locator('#birthDate')).toHaveValue('2001-03-09');
  await expect(page.locator('#lifeExpectancy')).toHaveValue('90');
  await expect(page.locator('.habit-name').last()).toHaveValue('Reading');

  await page.click('#resetBtn'); // the confirmation is accepted by the test helper
  await expect(page.locator('#yourLife')).toBeHidden();
  await expect(page.locator('#birthDate')).toHaveValue('');
});
