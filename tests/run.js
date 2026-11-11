#!/usr/bin/env node
// Headless test runner: node tests/run.js
// Loads index.html?test=1 in Chromium (Playwright), runs the SPEC.md test plan
// that lives in index.html, and also checks the normal page renders with a
// passing integrity badge. Exits 1 if anything fails.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const { extract } = require('./extract-spec-tables');

const ROOT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(ROOT, 'index.html');

(async () => {
  const browser = await chromium.launch();
  let failed = 0;
  try {
    // 1. Test mode
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(PAGE + '?test=1');
    await page.waitForFunction(() => window.__TEST_RESULTS__, null, { timeout: 120000 });
    const rep = await page.evaluate(() => window.__TEST_RESULTS__);
    if (rep.error) {
      console.log('ENGINE ERROR\n' + rep.error);
      process.exitCode = 1;
      return;
    }
    console.log(await page.evaluate(() => document.getElementById('test-output').textContent));
    failed += rep.failed;

    // 2. T00: the reference tables embedded in index.html still match SPEC.md
    const embedded = await page.evaluate(() => window.SPEC_TABLES);
    const fromSpec = extract(path.join(ROOT, 'SPEC.md'));
    const t00 = JSON.stringify(embedded) === JSON.stringify(fromSpec);
    console.log((t00 ? 'PASS' : 'FAIL') + ' T00 Reference tables in index.html match SPEC.md');
    if (!t00) failed++;

    // 3. Normal page: renders, badge reads Integrity 16/16, no errors
    const app = await browser.newPage();
    app.on('pageerror', e => errors.push(String(e)));
    await app.goto(PAGE);
    const badge = (await app.textContent('#badge')).trim();
    const rows = await app.$$eval('#app table tr', trs => trs.length);
    const badgeOk = badge === 'Integrity 16/16' && rows > 36;
    console.log((badgeOk ? 'PASS' : 'FAIL') + ' PAGE Header badge "' + badge + '", ' + rows + ' table rows rendered');
    if (!badgeOk) failed++;

    const noErr = errors.length === 0;
    console.log((noErr ? 'PASS' : 'FAIL') + ' PAGE No script errors' + (noErr ? '' : ':\n  ' + errors.join('\n  ')));
    if (!noErr) failed++;

    console.log('\n' + (failed === 0 ? 'ALL TESTS PASSED' : failed + ' FAILED'));
    process.exitCode = failed === 0 ? 0 : 1;
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
