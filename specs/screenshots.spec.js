import { test } from '@playwright/test';

/**
 * Cross-browser screenshot capture — hero and offer screens.
 * Run with: npx playwright test screenshots --project="Desktop Chrome" --project="Pixel 7" --project="iPhone 15" --reporter=list
 * Screenshots saved to: tests/screenshots/
 *
 * Quiz flow: Hero → Plan Selection (s1) → Severity (s2) → ZIP (s3) → Pests (s4) → Loading (s5) → Review (s6)
 */

async function unlockAndNavigate(page) {
  const BASE_URL = 'https://bugmd-connor-koch.myshopify.com';
  const PASSWORD = process.env.STORE_PASSWORD || 'open';

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  if (page.url().includes('/password')) {
    const pwd = page.locator('input[name="password"]');
    await pwd.waitFor({ state: 'visible', timeout: 8000 });
    await pwd.fill(PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
      page.locator('button[type="submit"]').click(),
    ]);
  }
}

test('screenshot — hero screen', async ({ page }, testInfo) => {
  await unlockAndNavigate(page);
  await page.locator('#bq-s0').waitFor({ state: 'visible', timeout: 10000 });
  const projectName = testInfo.project.name.replace(/\s+/g, '-');
  await page.screenshot({
    path: `tests/screenshots/hero-${projectName}.png`,
    fullPage: false,
  });
});

test('screenshot — plan selection', async ({ page }, testInfo) => {
  await unlockAndNavigate(page);
  await page.locator('#bq-s0').waitFor({ state: 'visible', timeout: 10000 });
  await page.click('button.bq-btn-hero');
  await page.locator('#bq-s1').waitFor({ state: 'visible', timeout: 5000 });
  const projectName = testInfo.project.name.replace(/\s+/g, '-');
  await page.screenshot({
    path: `tests/screenshots/plan-${projectName}.png`,
    fullPage: false,
  });
});

test('screenshot — review screen', async ({ page }, testInfo) => {
  await unlockAndNavigate(page);
  await page.locator('#bq-s0').waitFor({ state: 'visible', timeout: 10000 });

  // Hero → Plan Selection
  await page.click('button.bq-btn-hero');
  await page.locator('#bq-s1').waitFor({ state: 'visible', timeout: 5000 });
  await page.click('[data-value="standard"]');
  await page.click('#bq-btn-quarterly');

  // Severity (s2)
  await page.locator('#bq-s2').waitFor({ state: 'visible', timeout: 5000 });
  await page.click('#bq-s2 [data-value="some"]');

  // ZIP (s3)
  await page.locator('#bq-s3').waitFor({ state: 'visible', timeout: 5000 });
  await page.fill('#bq-zip', '90210');
  await page.click('#bq-zip-btn');

  // Pests (s4)
  await page.locator('#bq-s4').waitFor({ state: 'visible', timeout: 5000 });
  await page.click('[data-value="ants"]');
  await page.click('#bq-pest-btn');

  // Review (s6)
  await page.locator('#bq-s6').waitFor({ state: 'visible', timeout: 15000 });

  const projectName = testInfo.project.name.replace(/\s+/g, '-');
  await page.screenshot({
    path: `tests/screenshots/review-${projectName}.png`,
    fullPage: false,
  });
});
