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
    // A run that executed nothing must not count as a pass.
    if (!(rep.total > 0 && rep.assertions > 0)) { console.log('FAIL No tests ran'); failed++; }

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

    // 4. "Where we stand" screen (Step 2). Each check prints PASS or FAIL.
    const ui = [];
    const check = (name, ok, detail) => { ui.push(ok); console.log((ok ? 'PASS' : 'FAIL') + ' UI ' + name + (ok || !detail ? '' : ': ' + detail)); };
    const kpis = await app.$$eval('[data-kpi]', els => els.map(e => ({ id: e.getAttribute('data-kpi'),
      value: e.querySelector('.kpi-value').textContent, delta: e.querySelector('[data-delta]').textContent,
      spark: !!e.querySelector('svg.spark path'), note: e.querySelector('.kpi-note').textContent })));
    check('Eight KPI cards in order', kpis.map(k => k.id).join(',') === 'arr,revenueGrowth,grossMargin,ebitdaMargin,cash,runway,cacPayback,burnMultiple', kpis.map(k => k.id).join(','));
    check('Every card has a value, a change vs plan, a trend line and a note', kpis.every(k => k.value && k.delta && k.spark && k.note));
    check('Plan shows "Same as plan" on every card', kpis.every(k => k.delta === 'Same as plan'), kpis.map(k => k.delta).join(' | '));
    const kv = Object.fromEntries(kpis.map(k => [k.id, k.value]));
    check('Default as-of Dec 2027 shows SPEC values', kv.arr === '$30.0M' && kv.cash === '$27.4M' && kv.burnMultiple === '1.76x' && kv.grossMargin === '77.5%' &&
      kv.runway === '36.4months' && kv.cacPayback === '18.0months', JSON.stringify(kv));
    await app.selectOption('#asof', '1');
    check('As-of Jan 2027 shows month-1 ARR', (await app.textContent('[data-kpi="arr"] .kpi-value')) === '$24.5M');
    await app.selectOption('#asof', '12');
    check('Seven objective and guardrail results', (await app.$$('[data-guard]')).length === 7);

    const bars = await app.$$eval('#bridge [data-bar]', els => els.map(e => e.getAttribute('data-bar')));
    check('ARR bridge has six bars', bars.join(',') === 'opening,newArr,expansion,contraction,churn,closing', bars.join(','));
    const bl = await app.$$eval('#bridge [data-value]', els => els.map(e => e.textContent));
    check('ARR bridge 2027 labels match SPEC 8.2', bl.join(' ') === '$24.0M +$3.5M +$5.4M -$865.8K -$1.9M $30.0M', bl.join(' '));
    await app.selectOption('#bridge-period', 'all');
    const bl36 = await app.$$eval('#bridge [data-value]', els => els.map(e => e.textContent));
    check('ARR bridge over 36 months ends at $46.8M', bl36[5] === '$46.8M', bl36.join(' '));

    const ref = await app.evaluate(() => {
      const y = n => Number(document.querySelector('#cash13 [data-ref="' + n + '"]').getAttribute('y1'));
      return { floor: y('floor'), covenant: y('covenant'), weeks: document.querySelectorAll('#cash13 [data-week]').length,
        labels: Array.from(document.querySelectorAll('#cash13 text')).map(t => t.textContent) };
    });
    check('13-week chart draws the floor above the covenant', ref.floor > 0 && ref.covenant > ref.floor, JSON.stringify(ref));
    check('13-week chart labels the floor and covenant', ref.labels.includes('Cash floor $15.0M') && ref.labels.includes('Covenant $12.0M'), ref.labels.join('|'));
    check('13-week chart has 13 week points', ref.weeks === 13);
    const lastWeek = await app.$$eval('#cash13-table tbody tr', trs => trs.length + ' ' + trs[12].lastChild.textContent);
    check('13-week table ends at SPEC 8.5 week 13 cash', lastWeek === '13 35,005,855', lastWeek);

    const cols = async () => app.$$eval('#fs-table thead th', ths => ths.length);
    check('P&L by month has 36 month columns', (await cols()) === 37);
    await app.click('[data-grain="quarter"]'); check('P&L by quarter has 12 columns', (await cols()) === 13);
    await app.click('[data-grain="year"]'); check('P&L by year has 3 columns', (await cols()) === 4);
    const ni = await app.$eval('#fs-table [data-row="netIncome"]', tr => Array.from(tr.children).map(c => c.textContent).join('|'));
    check('Yearly net income matches SPEC 8.2', ni === 'Net income|(11,817,069)|(8,704,256)|(3,913,966)', ni);
    await app.click('[data-tab="bs"]');
    const ta = await app.$eval('#fs-table [data-row="totalAssets"]', tr => Array.from(tr.children).map(c => c.textContent).join('|'));
    check('Balance sheet by year has the opening column and matches SPEC 8.3', ta === 'Total assets|43,110,000|33,121,196|26,854,181|25,860,269', ta);
    await app.click('[data-tab="cf"]');
    const ec = await app.$eval('#fs-table [data-row="endingCash"]', tr => tr.lastChild.textContent);
    check('Cash flow ends at December 2029 cash', ec === '18,133,701', ec);
    await app.click('[data-grain="month"]'); await app.click('[data-tab="pl"]');

    // Assumptions panel: every input is editable and labeled, edits recalculate, Reset restores.
    await app.click('#open-assumptions');
    const cover = await app.evaluate(() => {
      const paths = new Set(Array.from(document.querySelectorAll('[data-path]')).flatMap(e => [e.getAttribute('data-path'), e.getAttribute('data-also')]).filter(Boolean));
      const missing = [];
      (function walk(o, p) {
        if (o === null || typeof o !== 'object') { if (!paths.has(p)) missing.push(p); return; }
        if (Array.isArray(o)) o.forEach((v, i) => walk(v, p + '[' + i + ']'));
        else Object.keys(o).forEach(k => { if (k !== 'channelOrder') walk(o[k], p ? p + '.' + k : k); });
      })(Engine.defaultAssumptions(), '');
      const fields = Array.from(document.querySelectorAll('#assumption-groups .field'));
      const untagged = fields.filter(f => !f.querySelector('.tag')).length;
      const wrongTag = fields.filter(f => f.querySelector('.tag').textContent !== Engine.assumptionType(f.getAttribute('data-row'))).length;
      return { inputs: paths.size, missing, untagged, wrongTag };
    });
    check('Every assumption has an input (' + cover.inputs + ')', cover.missing.length === 0, cover.missing.slice(0, 10).join(', '));
    check('Every input is labeled Actual or Assumption correctly', cover.untagged === 0 && cover.wrongTag === 0, JSON.stringify(cover));
    await app.click('details[data-group="ARR and customers"] > summary');
    await app.fill('[data-path="churnRateMonthly"]', '1.2');
    await app.waitForTimeout(400);
    const after = { arr: await app.textContent('[data-kpi="arr"] .kpi-value'), delta: await app.textContent('[data-kpi="arr"] [data-delta]'),
      count: await app.textContent('#change-count'), badge: (await app.textContent('#badge')).trim(),
      stored: await app.evaluate(() => window.__APP__.state.A.churnRateMonthly) };
    check('Churn of 1.2% is stored as 0.012', after.stored === 0.012, String(after.stored));
    check('Editing churn recalculates ARR and shows change vs plan', after.arr === '$28.1M' && /▼ -\$1\.9M vs plan/.test(after.delta), JSON.stringify(after));
    check('The change is counted and integrity still passes', after.count === '1' && after.badge === 'Integrity 16/16', JSON.stringify(after));
    await app.fill('[data-path="openingArr"]', '');
    await app.waitForTimeout(400);
    const err = { badge: (await app.textContent('#badge')).trim(), msg: await app.textContent('#input-error'), arr: await app.textContent('[data-kpi="arr"] .kpi-value') };
    check('A blank input is an input error, not zero', err.badge === 'Input error' && /Opening ARR/.test(err.msg) && err.arr === '$28.1M', JSON.stringify(err));
    await app.click('#reset-assumptions');
    await app.waitForTimeout(200);
    const reset = { badge: (await app.textContent('#badge')).trim(), arr: await app.textContent('[data-kpi="arr"] .kpi-value'),
      delta: await app.textContent('[data-kpi="arr"] [data-delta]'), hidden: await app.$eval('#change-count', e => e.hidden),
      churn: await app.inputValue('[data-path="churnRateMonthly"]'), err: (await app.textContent('#input-error')).trim() };
    check('Reset restores the plan', reset.badge === 'Integrity 16/16' && reset.arr === '$30.0M' && reset.delta === 'Same as plan' && reset.hidden &&
      reset.churn === '0.6' && reset.err === '', JSON.stringify(reset));
    await app.click('details[data-group="Debt, covenant and cash"] > summary');
    await app.fill('[data-path="cashFloor"]', '30,000,000'); await app.waitForTimeout(400);
    const floor = await app.evaluate(() => [window.__APP__.state.A.cashFloor, window.__APP__.state.A.guardrails.cashFloor]);
    check('The cash floor input sets both floors', floor[0] === 30000000 && floor[1] === 30000000 && (await app.textContent('#badge')).trim() === 'Integrity 16/16', JSON.stringify(floor));
    await app.click('#reset-assumptions');

    // Phone width: no sideways scrolling of the page, and the cards are on screen.
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
    phone.on('pageerror', e => errors.push(String(e)));
    await phone.goto(PAGE);
    const pw = await phone.evaluate(() => ({ sw: document.documentElement.scrollWidth, cards: document.querySelectorAll('[data-kpi]').length,
      right: Math.max(...Array.from(document.querySelectorAll('.kpi, .card')).map(e => e.getBoundingClientRect().right)) }));
    check('Phone: no horizontal page scroll', pw.sw <= 390 && pw.right <= 390, JSON.stringify(pw));
    check('Phone: eight cards', pw.cards === 8);

    const text = await app.evaluate(() => document.body.innerText);
    const src = require('fs').readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    check('No em dashes in the page or the file', !text.includes('—') && !src.includes('—'));
    check('Labeled as a fictional company', text.includes('Fictional company, for demonstration.'));
    failed += ui.filter(ok => !ok).length;

    const noErr = errors.length === 0;
    console.log((noErr ? 'PASS' : 'FAIL') + ' PAGE No script errors' + (noErr ? '' : ':\n  ' + errors.join('\n  ')));
    if (!noErr) failed++;

    console.log('\n' + (failed === 0 ? 'ALL TESTS PASSED' : failed + ' FAILED'));
    process.exitCode = failed === 0 ? 0 : 1;
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
