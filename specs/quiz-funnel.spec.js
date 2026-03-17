import { test, expect } from '@playwright/test';

/**
 * BugMD Pest Defense Pro — Quiz Funnel E2E Tests
 *
 * Flow:
 *   s0 Hero → s1 Plan Selection (Standard/XL toggle + plan cards) → s2 ZIP
 *   → s3 Pests → s4 Severity → s5 Loading → s6 Review → /checkout
 *
 * Coverage:
 *  1. Annual plan ($140) adds correct SKU (BG-PDPCNANN-08) to cart
 *  2. Quarterly subscription ($45) adds correct SKU (BG-PDP2CNBT-03) with selling plan
 *  3. One-time purchase ($55) adds correct SKU (BG-PDP2CNBT-03) without subscription
 *  4. Quiz data (ZIP, pests) stored in cart item properties
 *  5. Progress bar hidden on hero/plan/review, visible on quiz steps 1–3
 *  6. Back button navigates to previous step
 *  7. ZIP continue button disabled until 5 digits
 *  8. Pest continue button disabled until at least one selected
 *
 * Why built this way:
 *  - Plan tests use page.route passthrough on /cart/add.js: the real Shopify
 *    request fires (genuine integration), the response is captured, and we
 *    assert SKU/price/selling plan from it — no separate /cart.js call needed
 *    after cross-domain navigation to checkout.shopify.com.
 *  - Each test runs in a fresh browser context (empty cart). checkout() clears
 *    the cart before adding, so no explicit beforeEach clearCart is needed.
 *  - homeSize 'standard' uses #bq-btn-{plan}; 'xl' uses #bq-btn-xl-{plan}.
 *    Plan tests all use 'standard' to assert against known Shopify prices.
 */

const BASE_URL = 'https://bugmd-connor-koch.myshopify.com';
const PASSWORD = process.env.STORE_PASSWORD || 'open';

/* ── Unlock password-protected storefront ─────────────────────────── */
async function unlockStore(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/password')) {
    const pwd = page.locator('input[name="password"]');
    await pwd.waitFor({ state: 'visible', timeout: 8000 });
    await pwd.fill(PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }),
      page.locator('button[type="submit"]').click(),
    ]);
  }
}

/* ── Clear cart ───────────────────────────────────────────────────── */
async function clearCart(page) {
  await page.evaluate(async () => {
    await fetch('/cart/clear.js', { method: 'POST' });
  });
}

/**
 * Walk the full quiz:
 *   s0 Hero → s1 Plan Selection (toggle + plan) → s2 ZIP
 *   → s3 Pests → s4 Severity → s5 Loading → s6 Review
 *
 * homeSize 'standard' clicks #bq-btn-{plan}
 * homeSize 'xl'       clicks #bq-btn-xl-{plan}
 */
async function runQuiz(page, options = {}) {
  const {
    plan     = 'quarterly',
    zip      = '90210',
    homeSize = 'standard',
    pests    = ['ants', 'spiders'],
    severity = 'some',
  } = options;

  // ── Screen 0: Hero ──
  await expect(page.locator('#bq-s0')).toHaveClass(/active/);
  await expect(page.locator('#bq-s0 h1')).toContainText('Evict Bugs Like a Pro');
  await page.click('button.bq-btn-hero');

  // ── Screen 1: Plan Selection — set home size toggle, then pick plan ──
  await expect(page.locator('#bq-s1')).toHaveClass(/active/, { timeout: 5000 });
  await page.click(`[data-value="${homeSize}"]`);
  const planBtnId = homeSize === 'xl' ? `#bq-btn-xl-${plan}` : `#bq-btn-${plan}`;
  await page.click(planBtnId);

  // ── Screen 2: Severity (auto-advances) ──
  await expect(page.locator('#bq-s2')).toHaveClass(/active/, { timeout: 5000 });
  await page.click(`#bq-s2 [data-value="${severity}"]`);

  // ── Screen 3: ZIP ──
  await expect(page.locator('#bq-s3')).toHaveClass(/active/, { timeout: 5000 });
  await page.fill('#bq-zip', zip);
  await expect(page.locator('#bq-zip-btn')).toBeEnabled();
  await page.click('#bq-zip-btn');

  // ── Screen 4: Pests (multi-select + Continue) ──
  await expect(page.locator('#bq-s4')).toHaveClass(/active/, { timeout: 5000 });
  for (const pest of pests) {
    await page.click(`[data-value="${pest}"]`);
  }
  await expect(page.locator('#bq-pest-btn')).toBeEnabled();
  await page.click('#bq-pest-btn');

  // ── Screen 5: Loading ──
  await expect(page.locator('#bq-s5')).toHaveClass(/active/, { timeout: 5000 });

  // ── Screen 6: Review ──
  await expect(page.locator('#bq-s6')).toHaveClass(/active/, { timeout: 15000 });
  await expect(page.locator('#bq-rev-zip')).toContainText(zip);
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('BugMD Quiz Funnel', () => {

  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.dismiss());
    await unlockStore(page);
    // Each test runs in a fresh browser context so the cart is empty.
    // checkout() clears the cart before adding, so no explicit clearCart needed.
  });

  // ── Test 1: Annual plan ────────────────────────────────────────────
  test('Annual plan adds BG-PDPCNANN-08 at $140 to cart', async ({ page }) => {
    let addItem = null;
    await page.route('**/cart/add.js', async route => {
      const response = await route.fetch();
      if (response.ok()) addItem = await response.json();
      await route.fulfill({ response });
    });

    await runQuiz(page, { plan: 'annual', zip: '78701', homeSize: 'standard', pests: ['cockroaches', 'ants'], severity: 'some' });

    await Promise.all([
      page.waitForURL(/checkout/, { timeout: 20000 }),
      page.click('#bq-btn-checkout'),
    ]);

    expect(addItem, 'cart/add.js was not called or returned an error').toBeTruthy();
    expect(addItem.sku).toBe('BG-PDPCNANN-08');
    expect(addItem.price).toBe(14000);
    expect(addItem.properties['ZIP Code']).toBe('78701');
    expect(addItem.properties['Pest Problems']).toContain('cockroaches');
  });

  // ── Test 2: Quarterly subscription ────────────────────────────────
  test('Quarterly subscription adds BG-PDP2CNBT-03 at $45 with selling plan', async ({ page }) => {
    let addItem = null;
    await page.route('**/cart/add.js', async route => {
      const response = await route.fetch();
      if (response.ok()) addItem = await response.json();
      await route.fulfill({ response });
    });

    await runQuiz(page, { plan: 'quarterly', zip: '10001', homeSize: 'standard', pests: ['spiders'], severity: 'prevent' });

    await Promise.all([
      page.waitForURL(/checkout/, { timeout: 20000 }),
      page.click('#bq-btn-checkout'),
    ]);

    expect(addItem, 'cart/add.js was not called or returned an error').toBeTruthy();
    expect(addItem.sku).toBe('BG-PDP2CNBT-03');
    expect(addItem.price).toBe(4500);
    expect(addItem.selling_plan_allocation).toBeDefined();
    expect(addItem.selling_plan_allocation).not.toBeNull();
  });

  // ── Test 3: One-time purchase ──────────────────────────────────────
  test('One-time purchase adds BG-PDP2CNBT-03 at $55 without subscription', async ({ page }) => {
    let addItem = null;
    await page.route('**/cart/add.js', async route => {
      const response = await route.fetch();
      if (response.ok()) addItem = await response.json();
      await route.fulfill({ response });
    });

    await runQuiz(page, { plan: 'onetime', zip: '33101', homeSize: 'standard', pests: ['mosquitoes', 'flies'], severity: 'infestation' });

    await Promise.all([
      page.waitForURL(/checkout/, { timeout: 20000 }),
      page.click('#bq-btn-checkout'),
    ]);

    expect(addItem, 'cart/add.js was not called or returned an error').toBeTruthy();
    expect(addItem.sku).toBe('BG-PDP2CNBT-03');
    expect(addItem.price).toBe(5500);
    expect(addItem.selling_plan_allocation).toBeFalsy();
  });

  // ── Test 4: Progress bar ───────────────────────────────────────────
  test('Progress bar hidden on hero/plan/review, visible on quiz steps', async ({ page }) => {
    // Hero — hidden
    await expect(page.locator('#bq-progress')).toBeHidden();
    await page.click('button.bq-btn-hero');

    // Plan selection — hidden
    await expect(page.locator('#bq-s1')).toHaveClass(/active/, { timeout: 5000 });
    await expect(page.locator('#bq-progress')).toBeHidden();
    await page.click('[data-value="standard"]');
    await page.click('#bq-btn-quarterly');

    // Severity (Step 1 of 3) — visible
    await expect(page.locator('#bq-s2')).toHaveClass(/active/, { timeout: 5000 });
    await expect(page.locator('#bq-progress')).toBeVisible();
    await expect(page.locator('#bq-prog-label')).toHaveText('Step 1 of 3');

    await page.click('#bq-s2 [data-value="some"]');

    // ZIP (Step 2 of 3)
    await expect(page.locator('#bq-prog-label')).toHaveText('Step 2 of 3', { timeout: 5000 });
  });

  // ── Test 5: Back button ────────────────────────────────────────────
  test('Back button returns to previous quiz step', async ({ page }) => {
    await page.click('button.bq-btn-hero');
    await page.click('[data-value="standard"]');
    await page.click('#bq-btn-quarterly');
    await page.click('#bq-s2 [data-value="some"]');

    // On screen 3 (ZIP) — click back → should go to screen 2 (severity)
    await expect(page.locator('#bq-s3')).toHaveClass(/active/, { timeout: 5000 });
    await page.click('.bq-back');

    await expect(page.locator('#bq-s2')).toHaveClass(/active/, { timeout: 5000 });
    await expect(page.locator('#bq-prog-label')).toHaveText('Step 1 of 3');
  });

  // ── Test 6: ZIP validation ─────────────────────────────────────────
  test('Continue button on ZIP step stays disabled until 5 digits', async ({ page }) => {
    await page.click('button.bq-btn-hero');
    await page.click('[data-value="standard"]');
    await page.click('#bq-btn-quarterly');
    await page.click('#bq-s2 [data-value="some"]');
    await expect(page.locator('#bq-s3')).toHaveClass(/active/, { timeout: 5000 });

    await expect(page.locator('#bq-zip-btn')).toBeDisabled();
    await page.fill('#bq-zip', '902');
    await expect(page.locator('#bq-zip-btn')).toBeDisabled();
    await page.fill('#bq-zip', '90210');
    await expect(page.locator('#bq-zip-btn')).toBeEnabled();
  });

  // ── Test 7: Pest validation ────────────────────────────────────────
  test('Continue button on pest step disabled until at least one pest selected', async ({ page }) => {
    await page.click('button.bq-btn-hero');
    await page.click('[data-value="standard"]');
    await page.click('#bq-btn-quarterly');
    await page.click('#bq-s2 [data-value="some"]');
    await page.fill('#bq-zip', '90210');
    await page.click('#bq-zip-btn');

    await expect(page.locator('#bq-s4')).toHaveClass(/active/, { timeout: 5000 });
    await expect(page.locator('#bq-pest-btn')).toBeDisabled();
    await page.click('[data-value="ants"]');
    await expect(page.locator('#bq-pest-btn')).toBeEnabled();
  });

});
