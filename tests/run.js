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

    // 5. Initiative Evaluator (Step 3), on a fresh page.
    const ev = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    ev.on('pageerror', e => errors.push(String(e)));
    await ev.goto(PAGE);
    await ev.click('[data-view-tab="initiatives"]');
    const tpls = await ev.$$eval('[data-template]', els => els.map(e => e.getAttribute('data-template') + ':' + e.querySelector('b').textContent));
    check('Five templates', tpls.join('|') === 'tradeShow:Trade show or event|hireSdrs:Hire SDRs|hireAes:Hire AEs|paidCampaign:Paid campaign|partnerProgram:Partner program', tpls.join('|'));
    const fieldsOf = () => ev.$$eval('#init-fields [data-param]', els => els.map(e => e.getAttribute('data-param')));
    check('Trade show asks for booth, travel, staff days and cost, leads, funnel and month',
      (await fieldsOf()).join(',') === 'name,month,channel,booth,travel,staffDays,dayCost,expectedLeads', (await fieldsOf()).join(','));
    const tsDefaults = await ev.$$eval('#init-fields [data-param]', els => Object.fromEntries(els.map(e => [e.getAttribute('data-param'), e.value])));
    check('Trade show defaults come from SPEC 1.17', tsDefaults.month === '4' && tsDefaults.channel === 'events' && tsDefaults.booth === '48,000' &&
      tsDefaults.travel === '12,000' && tsDefaults.staffDays === '20' && tsDefaults.dayCost === '800' && tsDefaults.expectedLeads === '200' &&
      tsDefaults.name === 'Trade show, Apr 2027', JSON.stringify(tsDefaults));
    const everyField = [];
    for (const t of ['hireSdrs', 'hireAes', 'paidCampaign', 'partnerProgram', 'tradeShow']) {
      await ev.click('[data-template="' + t + '"]');
      const want = await ev.evaluate(k => ['name'].concat(Object.keys(Engine.TEMPLATE_PARAMS[k])).sort().join(','), t);
      const got = (await fieldsOf()).sort().join(',');
      if (want !== got) everyField.push(t + ': ' + got + ' vs ' + want);
    }
    check('Every template asks for exactly its inputs', everyField.length === 0, everyField.join('; '));
    await ev.waitForTimeout(200);
    check('Preview shows the trade show NPV before adding', /NPV \$202\.2K/.test(await ev.textContent('#init-preview')), await ev.textContent('#init-preview'));
    await ev.click('#init-submit');
    await ev.waitForTimeout(200);
    const tiles = async uidIndex => ev.$$eval('.decision', (cards, i) => Object.fromEntries(Array.from(cards[i].querySelectorAll(':scope > .tiles [data-tile]'))
      .map(e => [e.getAttribute('data-tile'), e.querySelector('.t-value').textContent])), uidIndex);
    const ts = await tiles(0);
    check('Trade show card: cost, NPV, payback, ROI, new ARR per $1, ARR change (SPEC 4.3)', ts.cost === '$76.0K' && ts.npv === '$202.2K' &&
      ts.payback === 'Month 14' && ts.roi === '351%' && ts.arrPerDollar === '$1.71' && ts.arr === '+$133.1K', JSON.stringify(ts));
    const verdict = await ev.textContent('.decision [data-verdict]');
    check('Trade show verdict in plain English', verdict === 'Costs $76.0K in Apr 2027. Adds 2.5 deals and $130.0K of new ARR, starting Sep 2027. Pays back in cash by Month 14, Feb 2028. NPV $202.2K. Keeps all 5 guardrails.', verdict);
    const effects = await ev.$$eval('.decision [data-guard-effect]', els => els.map(e => e.getAttribute('data-guard-effect')).join(','));
    check('Trade show guardrails: all five pass, objective still not met', effects === 'objective:fails,cashFloor:passes,covenant:passes,runway:passes,cacPayback:passes,burnMultiple:passes,grossMargin:passes', effects);
    const kpiRows = await ev.$$eval('.decision [data-kpi-row]', els => els.map(e => Array.from(e.children).map(c => c.textContent).join('|')));
    check('Trade show effect on CAC payback, burn multiple, runway, cash low point', kpiRows.join(' / ') ===
      'Blended CAC payback (Dec 2027)|18.0 months|17.9 months|-0.2 months / Burn multiple (Dec 2027)|1.76x|1.72x|-0.04x / ' +
      'Lowest runway, first 12 months (Dec 2027)|34.4 months|33.7 months|-0.7 months / Cash low point|$18.0M (Oct 2029)|$18.2M (Sep 2029)|+$214.1K', kpiRows.join(' / '));
    const costBars = await ev.$$eval('.decision [data-chart="cost"] [data-cost-month]', els => els.map(e => e.getAttribute('data-cost-month')));
    check('Cost chart: one bar, in April 2027', costBars.join(',') === '4', costBars.join(','));
    await ev.click('.decision details.more summary');
    const monthRows = await ev.$$eval('.decision [data-months] tbody tr', trs => ({ n: trs.length, hi: trs.filter(t => t.classList.contains('highlight')).map(t => t.getAttribute('data-month')) }));
    check('Month-by-month table: 36 months, payback month marked', monthRows.n === 36 && monthRows.hi.join(',') === '14', JSON.stringify(monthRows));
    const m9 = await ev.$eval('.decision [data-months] tr[data-month="9"]', tr => Array.from(tr.children).map(c => c.textContent).join('|'));
    check('Month 9 row: 2.5 deals, $130,000 new ARR, -$13,000 net flow (SPEC 4.3)', /\|2\.5\|130,000\|130,000\|5,417\|4,750\|\(8,250\)\|\(13,000\)\|\(89,000\)\|/.test(m9), m9);
    check('Sources hidden until asked', (await ev.$$('[data-sources]')).length === 0);
    await ev.check('#show-sources');
    const trace = await ev.$eval('[data-trace="events:4"]', tr => Array.from(tr.children).map(c => c.firstChild.textContent).join('|'));
    check('Trace: 200 leads, 50 MQLs, 10 opportunities, Sep 2027, 25%, 2.5 deals, $52,000, $130,000',
      trace === 'Apr 2027|Events and trade shows|200|50|10|10|Sep 2027|25%|2.5|$52,000|130,000', trace);
    const srcText = await ev.textContent('[data-sources]');
    check('Sources name the drivers: funnel rates, sales cycle, ACV, retention', ['5 months', '$52,000', 'Lead to MQL', 'Net revenue retention a year', '110.03%', 'Win rate', 'Discount rate']
      .every(w => srcText.includes(w)), srcText.slice(0, 200));
    check('Sources explain NPV with its number', srcText.includes('$202,197') && srcText.includes('0.95% a month'));
    await ev.click('[data-view-tab="stand"]');
    const standDelta = await ev.textContent('[data-kpi="arr"] [data-delta]');
    check('Where we stand includes the initiative: ARR +$133.1K vs plan', standDelta === '▲ +$133.1K vs plan' && (await ev.textContent('#badge')).trim() === 'Integrity 16/16', standDelta);
    await ev.click('[data-view-tab="initiatives"]');
    await ev.click('[data-template="hireAes"]');
    check('Hire AEs asks for the ramp, default 4 months', (await ev.inputValue('#init-fields [data-param="rampMonths"]')) === '4');
    await ev.click('#init-submit'); await ev.waitForTimeout(200);
    const ae = await tiles(1);
    check('Two-AE card: cost, NPV, payback, ROI, new ARR per $1, ARR change (SPEC 4.4)', ae.cost === '$932.3K' && ae.npv === '$191.4K' &&
      ae.payback === 'Month 30' && ae.roi === '35%' && ae.arrPerDollar === '$1.09' && ae.arr === '+$148.0K', JSON.stringify(ae));
    const both = await ev.$$eval('#together [data-tile]', els => Object.fromEntries(els.map(e => [e.getAttribute('data-tile'), e.querySelector('.t-value').textContent])));
    check('Together: NPV $393.6K and ARR +$281.2K (SPEC T43)', both.npv === '$393.6K' && both.arr === '+$281.2K', JSON.stringify(both));
    check('Badge still 16/16 with both', (await ev.textContent('#badge')).trim() === 'Integrity 16/16');
    // Edit the trade show: 400 badge scans.
    await ev.click('.decision[data-init="init1"] [data-edit]');
    check('Edit loads the trade show into the form', (await ev.inputValue('#init-fields [data-param="expectedLeads"]')) === '200' && (await ev.textContent('#init-submit')) === 'Save changes');
    await ev.fill('#init-fields [data-param="expectedLeads"]', '400');
    await ev.waitForTimeout(200);
    await ev.click('#init-submit'); await ev.waitForTimeout(200);
    const expected400 = await ev.evaluate(() => { const A = Engine.defaultAssumptions(); return Engine.applyInitiatives(A, [Engine.templates.tradeShow(A, { expectedLeads: 400 })]).returns.npv; });
    const ts400 = await tiles(0);
    const fmt = x => '$' + (x / 1000).toFixed(1) + 'K';
    check('Saving an edit recalculates the card (400 scans)', ts400.npv === fmt(expected400) && (await ev.$$('.decision')).length === 2, ts400.npv + ' vs ' + fmt(expected400));
    // A bad input is caught before it reaches the model.
    await ev.click('[data-template="tradeShow"]');
    await ev.fill('#init-fields [data-param="booth"]', '-5'); await ev.waitForTimeout(200);
    check('A negative cost is flagged and blocks Add', (await ev.isDisabled('#init-submit')) && /0 or more/.test(await ev.textContent('#init-fields [data-field="booth"] .err')));
    await ev.click('#init-defaults'); await ev.waitForTimeout(200);
    check('Restore defaults clears it', !(await ev.isDisabled('#init-submit')) && (await ev.inputValue('#init-fields [data-param="booth"]')) === '48,000');
    // Leave the AEs out of the scenario, then remove everything.
    await ev.uncheck('.decision[data-init="init2"] [data-include]'); await ev.waitForTimeout(100);
    check('Out of the scenario: no "together" summary', await ev.$eval('#together', e => e.hidden));
    await ev.click('[data-view-tab="stand"]');
    const delta400 = await ev.textContent('[data-kpi="arr"] [data-delta]');
    await ev.click('[data-view-tab="initiatives"]');
    const expectedDelta = await ev.evaluate(() => { const A = Engine.defaultAssumptions(); const x = Engine.applyInitiatives(A, [Engine.templates.tradeShow(A, { expectedLeads: 400 })]);
      return x.scenario.arr.arr[12] - x.baseline.arr.arr[12]; });
    check('Where we stand counts only included initiatives', delta400 === '▲ +$' + (expectedDelta / 1000).toFixed(1) + 'K vs plan', delta400);
    await ev.click('[data-remove="init1"]'); await ev.click('[data-remove="init2"]'); await ev.waitForTimeout(100);
    check('Removing every initiative leaves the empty state', (await ev.$$('.decision')).length === 0 && (await ev.$eval('#init-count', e => e.hidden)));
    // Phone width on the evaluator with a card and its sources open.
    const evp = await browser.newPage({ viewport: { width: 390, height: 844 } });
    evp.on('pageerror', e => errors.push(String(e)));
    await evp.goto(PAGE);
    await evp.click('[data-view-tab="initiatives"]'); await evp.click('#init-submit'); await evp.check('#show-sources'); await evp.waitForTimeout(200);
    const evw = await evp.evaluate(() => ({ sw: document.documentElement.scrollWidth, right: Math.max(...Array.from(document.querySelectorAll('.card, .tile')).map(e => e.getBoundingClientRect().right)) }));
    check('Phone: evaluator has no horizontal page scroll', evw.sw <= 390 && evw.right <= 390, JSON.stringify(evw));

    const text = await app.evaluate(() => document.body.innerText);
    const src = require('fs').readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    check('No em dashes in the page or the file', !text.includes('\u2014') && !src.includes('\u2014'));
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
