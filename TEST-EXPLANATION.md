# BugMD Quiz Funnel — Automated Test Suite

## What the tests cover

### End-to-End Funnel Tests (`specs/quiz-funnel.spec.js`)

7 tests × 3 browser/device profiles = **21 tests total**, all passing.

| Test | What it verifies |
|---|---|
| Annual plan → cart | Adds `BG-PDPCNANN-08` at $140, stores ZIP/pest data in cart properties |
| Quarterly subscription → cart | Adds `BG-PDP2CNBT-03` at $45 **with** a selling plan (subscription) |
| One-time purchase → cart | Adds `BG-PDP2CNBT-03` at $55 **without** a selling plan |
| Progress bar | Hidden on hero/plan selection, visible on quiz steps 1–3, label updates correctly |
| Back button | Returns to previous step correctly |
| ZIP validation | Continue button disabled until exactly 5 digits entered |
| Pest validation | Continue button disabled until at least one pest selected |

### Cross-Browser Screenshot Tests (`specs/screenshots.spec.js`)

3 screenshots × 3 device profiles = **9 tests total**, all passing.

Captures hero screen, plan selection, and review screen on:
- **Desktop Chrome** (1280×720)
- **Pixel 7 / Chrome Android** (412×915)
- **iPhone 15 / Mobile Safari** (390×844, WebKit)

Screenshots saved to `screenshots/`.

---

## Why built this way

**Cart verification via route interception, not UI scraping.** Each plan test intercepts the real `/cart/add.js` Shopify API call using `page.route()`. The response is captured and asserted against — confirming the correct SKU, price in cents, and whether a selling plan is attached. This is far more reliable than reading text from the UI, because it validates the actual data sent to Shopify's backend.

**Shared `runQuiz()` helper.** All quiz steps are extracted into a reusable function so each plan test stays focused on its cart assertion. If the quiz UI changes, there's one place to update.

**Three real browser engines.** Playwright runs tests on Chromium (Desktop Chrome), Chromium mobile (Pixel 7/Android Chrome), and WebKit (iPhone 15/Mobile Safari). This covers the exact browsers in the QA brief and catches engine-specific bugs — especially important for a mobile-first DTC funnel where the majority of traffic comes from paid social on iOS.

**Quiz data verified in cart properties.** The annual plan test also checks that ZIP code and pest selections are stored as cart item properties — confirming the full data pipeline from quiz input to Shopify cart.

**Store password handled automatically.** The `unlockStore()` helper detects the Shopify password page and enters credentials before each test, so tests work on a password-protected development store.

---

## Quiz Flow (tested)

```
Hero → Plan Selection (Standard/XL toggle + plan cards)
     → Severity (auto-advances on select)
     → ZIP Code (continue enabled at 5 digits)
     → Pest Selection (continue enabled when ≥1 selected)
     → Loading
     → Review → Checkout
```

---

## Setup & run

```bash
cd tests
npm install
npx playwright install chromium webkit

# Run all E2E tests (headless, all 3 browsers)
npm test

# Run screenshot capture across all devices
npx playwright test screenshots --project="Desktop Chrome" --project="Pixel 7" --project="iPhone 15"

# Run with browser visible
npm run test:headed

# View HTML report
npm run test:report
```

Set your store password via environment variable:
```bash
STORE_PASSWORD=open npm test
```

---

## Files

```
tests/
  specs/
    quiz-funnel.spec.js     # 7 E2E tests × 3 browsers = 21 total
    screenshots.spec.js     # Cross-browser screenshot capture
  screenshots/
    hero-Desktop-Chrome.png
    hero-Pixel-7.png
    hero-iPhone-15.png
    plan-Desktop-Chrome.png
    plan-Pixel-7.png
    plan-iPhone-15.png
    review-Desktop-Chrome.png
    review-Pixel-7.png
    review-iPhone-15.png
  package.json
  playwright.config.js      # Desktop Chrome + Pixel 7 + iPhone 15
  TEST-EXPLANATION.md       # This file
```

---

## Test results summary

```
quiz-funnel.spec.js   21 passed  (3.3m)
screenshots.spec.js    9 passed  (1.4m)
```

All tests verified against live store: https://bugmd-connor-koch.myshopify.com
Store password: `open`
