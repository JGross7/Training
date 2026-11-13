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
const APP = PAGE + '?mode=analyst'; // the detailed app (the bare page opens the dashboard)

(async () => {
  const browser = await chromium.launch();
  let failed = 0;
  try {
    // 1. Test mode
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    // The suite runs while the page loads (about two minutes with the section 11 searches and stress tests).
    await page.goto(PAGE + '?test=1', { timeout: 0, waitUntil: 'commit' });
    await page.waitForFunction(() => window.__TEST_RESULTS__, null, { timeout: 900000, polling: 1000 });
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

    // 3. Normal page: renders, badge reads Integrity 24/24, no errors
    const app = await browser.newPage();
    app.on('pageerror', e => errors.push(String(e)));
    await app.goto(APP);
    const badge = (await app.textContent('#badge')).trim();
    const rows = await app.$$eval('#app table tr', trs => trs.length);
    const badgeOk = badge === 'Integrity 24/24' && rows > 36;
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
    check('The change is counted and integrity still passes', after.count === '1' && after.badge === 'Integrity 24/24', JSON.stringify(after));
    await app.fill('[data-path="openingArr"]', '');
    await app.waitForTimeout(400);
    const err = { badge: (await app.textContent('#badge')).trim(), msg: await app.textContent('#input-error'), arr: await app.textContent('[data-kpi="arr"] .kpi-value') };
    check('A blank input is an input error, not zero', err.badge === 'Input error' && /Opening ARR/.test(err.msg) && err.arr === '$28.1M', JSON.stringify(err));
    await app.click('#reset-assumptions');
    await app.waitForTimeout(200);
    const reset = { badge: (await app.textContent('#badge')).trim(), arr: await app.textContent('[data-kpi="arr"] .kpi-value'),
      delta: await app.textContent('[data-kpi="arr"] [data-delta]'), hidden: await app.$eval('#change-count', e => e.hidden),
      churn: await app.inputValue('[data-path="churnRateMonthly"]'), err: (await app.textContent('#input-error')).trim() };
    check('Reset restores the plan', reset.badge === 'Integrity 24/24' && reset.arr === '$30.0M' && reset.delta === 'Same as plan' && reset.hidden &&
      reset.churn === '0.6' && reset.err === '', JSON.stringify(reset));
    await app.click('details[data-group="Debt, covenant and cash"] > summary');
    await app.fill('[data-path="cashFloor"]', '30,000,000'); await app.waitForTimeout(400);
    const floor = await app.evaluate(() => [window.__APP__.state.A.cashFloor, window.__APP__.state.A.guardrails.cashFloor]);
    check('The cash floor input sets both floors', floor[0] === 30000000 && floor[1] === 30000000 && (await app.textContent('#badge')).trim() === 'Integrity 24/24', JSON.stringify(floor));
    await app.click('#reset-assumptions');

    // Phone width: no sideways scrolling of the page, and the cards are on screen.
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
    phone.on('pageerror', e => errors.push(String(e)));
    await phone.goto(APP);
    const pw = await phone.evaluate(() => ({ sw: document.documentElement.scrollWidth, cards: document.querySelectorAll('[data-kpi]').length,
      right: Math.max(...Array.from(document.querySelectorAll('.kpi, .card')).map(e => e.getBoundingClientRect().right)) }));
    check('Phone: no horizontal page scroll', pw.sw <= 390 && pw.right <= 390, JSON.stringify(pw));
    check('Phone: eight cards', pw.cards === 8);

    // 5. Initiative Evaluator (Step 3), on a fresh page.
    const ev = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    ev.on('pageerror', e => errors.push(String(e)));
    await ev.goto(APP);
    await ev.click('[data-view-tab="initiatives"]');
    const tpls = await ev.$$eval('[data-template]', els => els.map(e => e.getAttribute('data-template') + ':' + e.querySelector('b').textContent));
    check('Seven templates', tpls.join('|') === 'tradeShow:Trade show or event|hireSdrs:Hire SDRs|hireAes:Hire AEs|paidCampaign:Paid campaign|partnerProgram:Partner program|' +
      'accelerateRevenue:Pull in a revenue milestone|accelerateCost:Pull in a cost-saving milestone', tpls.join('|'));
    const fieldsOf = () => ev.$$eval('#init-fields [data-param]', els => els.map(e => e.getAttribute('data-param')));
    check('Trade show asks for booth, travel, staff days and cost, leads, funnel and month',
      (await fieldsOf()).join(',') === 'name,month,channel,booth,travel,staffDays,dayCost,expectedLeads', (await fieldsOf()).join(','));
    const tsDefaults = await ev.$$eval('#init-fields [data-param]', els => Object.fromEntries(els.map(e => [e.getAttribute('data-param'), e.value])));
    check('Trade show defaults come from SPEC 1.17', tsDefaults.month === '4' && tsDefaults.channel === 'events' && tsDefaults.booth === '48,000' &&
      tsDefaults.travel === '12,000' && tsDefaults.staffDays === '20' && tsDefaults.dayCost === '800' && tsDefaults.expectedLeads === '200' &&
      tsDefaults.name === 'Trade show, Apr 2027', JSON.stringify(tsDefaults));
    const everyField = [];
    for (const t of ['hireSdrs', 'hireAes', 'paidCampaign', 'partnerProgram', 'accelerateRevenue', 'accelerateCost', 'tradeShow']) {
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
    check('Trade show guardrails: all five pass, objective still not met', effects === 'objective:fails,cashFloor:passes,runway:passes,cacPayback:passes,burnMultiple:passes,grossMargin:passes,covenant:passes', effects);
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
    check('Where we stand includes the initiative: ARR +$133.1K vs plan', standDelta === '▲ +$133.1K vs plan' && (await ev.textContent('#badge')).trim() === 'Integrity 24/24', standDelta);
    await ev.click('[data-view-tab="initiatives"]');
    await ev.click('[data-template="hireAes"]');
    check('Hire AEs asks for the ramp, default 4 months', (await ev.inputValue('#init-fields [data-param="rampMonths"]')) === '4');
    await ev.click('#init-submit'); await ev.waitForTimeout(200);
    const ae = await tiles(1);
    check('Two-AE card: cost, NPV, payback, ROI, new ARR per $1, ARR change (SPEC 4.4)', ae.cost === '$932.3K' && ae.npv === '$191.4K' &&
      ae.payback === 'Month 30' && ae.roi === '35%' && ae.arrPerDollar === '$1.09' && ae.arr === '+$148.0K', JSON.stringify(ae));
    const both = await ev.$$eval('#together [data-tile]', els => Object.fromEntries(els.map(e => [e.getAttribute('data-tile'), e.querySelector('.t-value').textContent])));
    check('Together: NPV $393.6K and ARR +$281.2K (SPEC T43)', both.npv === '$393.6K' && both.arr === '+$281.2K', JSON.stringify(both));
    check('Badge still 20/20 with both', (await ev.textContent('#badge')).trim() === 'Integrity 24/24');
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
    // 6. Product acceleration cards (Step 4b, SPEC.md 9.8 and 9.13), on a fresh page.
    const ac = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    ac.on('pageerror', e => errors.push(String(e)));
    await ac.goto(APP);
    await ac.click('[data-view-tab="initiatives"]');
    await ac.click('[data-template="accelerateRevenue"]');
    const accFields = await ac.$$eval('#init-fields [data-param]', els => Object.fromEntries(els.map(e => [e.getAttribute('data-param'), e.value])));
    check('Revenue pull-in form defaults come from SPEC 9.2', accFields.milestone === 'integrations_hub' && accFields.contractors === '8' && accFields.contractorMonthlyRate === '20,000' &&
      accFields.engineers === '2' && accFields.engineerStartMonth === '2' && accFields.engineerLoadedCostAnnual === '215,000' && accFields.recruitingEach === '20,000' &&
      accFields.afterLaunch === 'replace_planned_hire' && accFields.toolingOneTime === '30,000' && accFields.toolingMonthly === '10,000' && accFields.toolingSpeedup === '15' &&
      accFields.cloudMonthly === '6,000' && accFields.cloudLine === 'rd' && accFields.name === 'Pull in Enterprise integrations hub', JSON.stringify(accFields));
    await ac.waitForTimeout(250);
    const accPreview = await ac.textContent('#init-preview');
    check('Preview names the target month, the odds, the expected cost and NPV', /ships Jun 2027.*6 months sooner \(50% chance\).*expected cost \$1\.5M, expected NPV -\$1\.1M/.test(accPreview), accPreview);
    await ac.click('#init-submit'); await ac.waitForTimeout(300);
    const accTiles = async i => ac.$$eval('.decision', (cards, k) => Object.fromEntries(Array.from(cards[k].querySelectorAll(':scope > .tiles [data-tile]'))
      .map(e => [e.getAttribute('data-tile'), e.querySelector('.t-value').textContent + ' | ' + (e.querySelector('.t-note') ? e.querySelector('.t-note').textContent : '')])), i);
    const hubT = await accTiles(0);
    check('Hub card: months gained 5.0 expected, 6 on target', /^5\.0 months \| 6 months if it ships on target, Jun 2027/.test(hubT.monthsGained), hubT.monthsGained);
    check('Hub card: 50% chance of hitting Jun 2027', /^50% \| Expected ship month 6\.98/.test(hubT.onTime), hubT.onTime);
    check('Hub card: expected cost $1.5M, $176.0K per month of slip', /^\$1\.5M \| On target \$1\.3M; each month of slip adds \$176\.0K/.test(hubT.cost), hubT.cost);
    check('Hub card: expected NPV -$1.1M, on target -$841.3K', /^-\$1\.1M \| On target -\$841\.3K/.test(hubT.npv), hubT.npv);
    check('Hub card: payback not within 36 months', /^Not within 36 months \| 0% chance/.test(hubT.payback), hubT.payback);
    check('Hub card: gross margin effect +0.01 pts at Dec 2027', /^\+0\.01 pts \| Trailing 12 months, vs 77\.45%/.test(hubT.grossMargin), hubT.grossMargin);
    const hubCost = await ac.$$eval('.decision [data-chart="accel-cost"] [data-bar-month]', els => els.map(e => e.getAttribute('data-bar-month')));
    check('Added cost by month: bars from Jan to Dec 2027 in the expected case', hubCost.join(',') === '1,2,3,4,5,6,7,8,9,10,11,12', hubCost.join(','));
    check('Added cost note shows the expected total', /Total \$1,478,417\./.test(await ac.textContent('.decision [data-cost-note]')));
    const odds = await ac.$$eval('.decision [data-chart="odds"] [data-odds]', els => els.map(e => e.getAttribute('data-odds') + ':' + e.querySelector('text').textContent));
    check('Ship date odds: 50%, 25%, 13% ... for months 6 to 12', odds.join(',') === '6:50%,7:25%,8:13%,9:6.3%,10:3.1%,11:1.6%,12:1.6%', odds.join(','));
    const benefitBars = await ac.$$eval('.decision [data-chart="benefit"] [data-bar-month]', els => els.length);
    check('Benefit by month: revenue bars from Jul 2027 on', benefitBars === 30, String(benefitBars));
    check('Benefit note: extra new ARR and revenue', /Extra new ARR \$201,145, extra revenue \$446,156 and gross profit \$408,168/.test(await ac.textContent('.decision [data-benefit-note]')));
    const sideRow = async (key) => ac.$eval('.decision [data-side] tr[data-side-row="' + key + '"]', tr => Array.from(tr.children).map(c => c.textContent).join('|'));
    check('Side-by-side: ship month row', (await sideRow('shipMonth')) === 'Ship month|Never|Dec 2027|month 6.98|5.0 months sooner', await sideRow('shipMonth'));
    check('Side-by-side: NPV value equals the card NPV', (await sideRow('npv')) === 'NPV of net flow at 12%|n/a|708,401|(365,569)|(1,073,970)' && /-\$1\.1M/.test(hubT.npv), await sideRow('npv'));
    check('Side-by-side: net flow value equals cumulative net cash flow', (await sideRow('netFlow')).endsWith('|(1,057,281)'), await sideRow('netFlow'));
    await ac.click('.decision [data-case="onTarget"]'); await ac.waitForTimeout(250);
    check('On target: side-by-side matches SPEC 9.11 (ARR at month 36 and NPV)', (await sideRow('arr36')) === 'ARR at month 36|45,700,687|1,055,509|1,349,816|294,307' &&
      (await sideRow('npv')) === 'NPV of net flow at 12%|n/a|708,401|(132,857)|(841,257)', (await sideRow('arr36')) + ' / ' + (await sideRow('npv')));
    check('On target: added cost total is 1,305,167', /Total \$1,305,167\./.test(await ac.textContent('.decision [data-cost-note]')));
    await ac.click('.decision [data-case="expected"]'); await ac.waitForTimeout(250);
    const ret = await ac.$$eval('.decision [data-returns] tr[data-return-row]', trs => Object.fromEntries(trs.map(tr => [tr.getAttribute('data-return-row'), Array.from(tr.children).slice(1).map(c => c.textContent).join('|')])));
    check('Returns: NPV, payback, benefit and cost NPV, value and cost of a month', ret.npv === '-$1.1M|-$841.3K|-$2.2M' && ret.payback === 'Not within 36 months|Not within 36 months|Not within 36 months' &&
      ret.benefitNpv === '$336.9K|$410.4K|$0' && ret.valuePerMonthGained === '$67.2K|$68.4K|n/a' && ret.costPerMonthGained === '$281.3K|$208.6K|n/a', JSON.stringify(ret));
    const gmTiles = await ac.$$eval('.decision [data-gm] [data-tile]', els => els.map(e => e.querySelector('.t-value').textContent));
    check('Gross margin effect at months 12, 24, 36', gmTiles.join(',') === '+0.01 pts,+0.06 pts,+0.06 pts', gmTiles.join(','));
    const share = await ac.textContent('.decision [data-pass-share="burnMultiple"]');
    check('Guardrails: burn multiple passes in 75% of outcomes', /Passes in 75% of outcomes/.test(share), share);
    const nc = await ac.textContent('.decision [data-not-counted]');
    check('Not counted: team time freed and ARR after Dec 2029', /40\.1 person-months, \$718,906/.test(nc) && /NPV would be -\$418\.6K/.test(nc) && /\$246,184 of extra ARR/.test(nc), nc);
    const hv = await ac.textContent('.decision [data-verdict]');
    check('Hub verdict in plain English', hv.startsWith('Pulls Enterprise integrations hub in from Dec 2027 to Jun 2027, 6 months sooner, if the new date holds (50% chance).') &&
      /A month sooner is worth \$67\.2K and costs \$281\.3K to buy\./.test(hv), hv);
    await ac.click('.decision details.more summary');
    const hubRows = await ac.$$eval('.decision [data-accel-months="expected"] tbody tr', trs => trs.length);
    check('Month-by-month table has 36 months', hubRows === 36);

    await ac.click('[data-template="accelerateCost"]'); await ac.waitForTimeout(150);
    await ac.click('#init-submit'); await ac.waitForTimeout(300);
    const costT = await accTiles(1);
    check('Hosting card: 2.5 months gained, 67% chance, $570.7K, -$441.4K, +0.23 pts', /^2\.5 months/.test(costT.monthsGained) && /^67% \|/.test(costT.onTime) &&
      /^\$570\.7K \| On target \$525\.0K; each month of slip adds \$95\.0K/.test(costT.cost) && /^-\$441\.4K/.test(costT.npv) && /^\+0\.23 pts/.test(costT.grossMargin), JSON.stringify(costT));
    const costBenefit = await ac.$$eval('.decision[data-init="init2"] [data-chart="benefit"] [data-bar-month] [data-series="hostingSaved"]', els => els.length);
    check('Hosting card: COGS benefit by month (hosting saved)', costBenefit === 5, String(costBenefit));
    const hostSide = await ac.$eval('.decision[data-init="init2"] [data-side] tr[data-side-row="hosting"]', tr => Array.from(tr.children).map(c => c.textContent).join('|'));
    check('Hosting card: side-by-side hosting row', hostSide === 'Hosting cost, 36 months|9,119,131|(1,379,930)|(1,493,829)|(113,899)', hostSide);
    const both2 = await ac.$$eval('#together [data-tile]', els => Object.fromEntries(els.map(e => [e.getAttribute('data-tile'), e.querySelector('.t-value').textContent])));
    check('Together: hub and hosting in the planning case break a guardrail (SPEC T113)', both2.cost === '$2.0M' && both2.npv === '-$1.5M' && both2.guardrails === '4 of 5 pass', JSON.stringify(both2));
    check('Badge 20/20 with both pull-ins', (await ac.textContent('#badge')).trim() === 'Integrity 24/24');
    await ac.click('[data-view-tab="stand"]');
    check('Where we stand includes the planning case', (await ac.textContent('[data-kpi="arr"] [data-delta]')) === '▲ +$97.8K vs plan', await ac.textContent('[data-kpi="arr"] [data-delta]'));
    await ac.click('[data-view-tab="initiatives"]');
    await ac.click('[data-template="accelerateRevenue"]');
    await ac.selectOption('#init-fields [data-param="engineerStartMonth"]', '14'); await ac.waitForTimeout(200);
    check('A start month after the planned date blocks Add', (await ac.isDisabled('#init-submit')) && /on or before the planned ship month, Dec 2027/.test(await ac.textContent('#init-fields [data-field="engineerStartMonth"] .err')));
    const accText = await ac.evaluate(() => document.body.innerText);
    check('No em dashes on the acceleration cards', !accText.includes('\u2014'));

    const acp = await browser.newPage({ viewport: { width: 390, height: 844 } });
    acp.on('pageerror', e => errors.push(String(e)));
    await acp.goto(APP);
    await acp.click('[data-view-tab="initiatives"]'); await acp.click('[data-template="accelerateRevenue"]'); await acp.click('#init-submit'); await acp.waitForTimeout(300);
    await acp.click('.decision details.more summary');
    const acw = await acp.evaluate(() => ({ sw: document.documentElement.scrollWidth, right: Math.max(...Array.from(document.querySelectorAll('.card, .tile, .chart svg')).map(e => e.getBoundingClientRect().right)) }));
    check('Phone: acceleration card has no horizontal page scroll', acw.sw <= 390 && acw.right <= 390, JSON.stringify(acw));

    // 7. Uncertainty on the cards and the scenario cockpit (Step 5, SPEC.md section 10), on a fresh page.
    const un = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    un.on('pageerror', e => errors.push(String(e)));
    await un.goto(APP);
    await un.click('[data-view-tab="initiatives"]');
    await un.click('#init-submit');
    check('A new card shows the simulation progress or its result', (await un.$$('[data-uncertainty]')).length === 1);
    await un.waitForSelector('[data-uncertainty][data-sim-done]', { timeout: 60000 });
    const simRows = await un.$$eval('[data-uncertainty] [data-sim-row]', trs => Object.fromEntries(trs.map(tr => [tr.getAttribute('data-sim-row'), Array.from(tr.children).slice(1).map(c => c.textContent).join('|')])));
    check('Trade show: P10 / P50 / P90 and plan for new ARR', simRows.newArr === '$94.1K|$122.5K|$156.4K|$130.0K', simRows.newArr);
    check('Trade show: P10 / P50 / P90 and plan for payback month', simRows.payback === 'Month 11|Month 15|Month 21|Month 14', simRows.payback);
    check('Trade show: P10 / P50 / P90 and plan for cash low point', simRows.cashLow === '$15.9M|$17.7M|$19.3M|$18.2M', simRows.cashLow);
    check('Trade show: P10 / P50 / P90 and plan for NPV', simRows.npv === '$121.8K|$181.8K|$255.1K|$202.2K', simRows.npv);
    const simTiles = await un.$$eval('[data-uncertainty] [data-tile]', els => Object.fromEntries(els.map(e => [e.getAttribute('data-tile'), e.querySelector('.t-value').textContent + ' | ' + e.querySelector('.t-note').textContent])));
    check('Trade show: chance of paying back within 24 months', /^100% \|/.test(simTiles.pPayback24), simTiles.pPayback24);
    check('Trade show: chance of breaking the cash floor, with the plan alone beside it', simTiles.pFloor === '2.7% | The plan alone: 3.8% of runs', simTiles.pFloor);
    const inPage = await un.evaluate(() => { const A = Engine.defaultAssumptions(); const s = Engine.simulate(A, Engine.templates.tradeShow(A)); return [s.probabilityPaybackWithin24, s.probabilityFloorBreach, s.npv.p50]; });
    check('The card shows the engine simulation (same seed, same numbers)', inPage[0] === 1 && inPage[1] === 0.027 && Math.round(inPage[2] / 100) === 1818, JSON.stringify(inPage));
    const npvBins = await un.$$eval('[data-uncertainty] [data-chart="npv-spread"] [data-bin]', els => els.length);
    const marks = await un.$$eval('[data-uncertainty] [data-chart="npv-spread"] [data-marker]', els => els.map(e => e.getAttribute('data-marker')).join(','));
    check('NPV spread chart: 20 bins with P10, P50, P90 and plan marked', npvBins === 20 && marks === 'p10,p50,p90,plan', npvBins + ' ' + marks);
    const torn = await un.$$eval('[data-uncertainty] [data-tornado]', els => els.map(e => e.getAttribute('data-tornado')));
    check('Sensitivity chart: nine drivers, win rate first for the trade show', torn.length === 9 && torn[0] === 'winRate', torn.join(','));
    const sens = await un.$eval('[data-uncertainty] [data-sens-row="winRate"]', tr => Array.from(tr.children).map(c => c.textContent).join('|'));
    check('Sensitivity numbers: win rate at 0.75x and 1.25x', sens === 'Win rate|0.75x|$133.5K|1.25x|$270.9K|$137.4K', sens);

    await un.click('[data-template="accelerateRevenue"]'); await un.click('#init-submit');
    await un.waitForFunction(() => document.querySelectorAll('[data-uncertainty][data-sim-done]').length === 2, null, { timeout: 60000 });
    const hubSim = await un.$$eval('[data-uncertainty]', boxes => ({ floor: boxes[1].querySelector('[data-tile="pFloor"] .t-value').textContent,
      pay: boxes[1].querySelector('[data-sim-row="payback"]').textContent, top: boxes[1].querySelector('[data-tornado]').getAttribute('data-tornado') }));
    check('Hub pull-in: 25% chance of breaking the floor, never pays back, slip moves NPV most', hubSim.floor === '25.0%' &&
      hubSim.pay === 'Cash paybackAfter Dec 2029After Dec 2029After Dec 2029After Dec 2029' && hubSim.top === 'accelerationSlip', JSON.stringify(hubSim));

    // Scenario cockpit: live recalculation of everything.
    check('Cockpit is closed by default and says what it does', !(await un.$eval('#cockpit', e => e.open)) && /What-if sliders/.test(await un.textContent('#cockpit-sub')));
    await un.click('#cockpit > summary');
    const sliders = await un.$$eval('[data-ck-input]', els => els.map(e => e.getAttribute('data-ck-input')));
    check('Cockpit has nine sliders', sliders.join(',') === 'winRate,acv,leadToMqlRate,mqlToOppRate,costPerLead,salesCycleShift,milestoneEffect,churnRateMonthly,expansionRateMonthly', sliders.join(','));
    check('Each slider shows its simulation range', (await un.textContent('#ck-winRate-hint')) === 'Simulated from 0.75x to 1.25x' && (await un.textContent('#ck-churnRateMonthly-hint')) === 'Not simulated');
    await un.fill('[data-ck-input="winRate"]', '1.1');
    await un.waitForTimeout(500);
    const ck = { value: await un.textContent('[data-ck-value="winRate"]'), sub: await un.textContent('#cockpit-sub'), stored: await un.evaluate(() => window.__APP__.state.A.cockpit.winRate),
      badge: (await un.textContent('#badge')).trim(), count: await un.textContent('#change-count') };
    check('Moving the win rate slider to 1.10x is stored and counted', ck.value === '1.10x' && ck.stored === 1.1 && /^1 driver moved/.test(ck.sub) && ck.count === '1' && ck.badge === 'Integrity 24/24', JSON.stringify(ck));
    const expNpv = await un.evaluate(() => { const A = Engine.defaultAssumptions(); A.cockpit.winRate = 1.1; return Engine.applyInitiatives(A, [Engine.templates.tradeShow(A)]).returns.npv; });
    const tsNpv = await un.$eval('.decision [data-tile="npv"] .t-value', e => e.textContent);
    check('The trade show card recalculates with the cockpit', tsNpv === '$' + (expNpv / 1000).toFixed(1) + 'K', tsNpv + ' vs ' + expNpv);
    await un.waitForFunction(() => document.querySelectorAll('[data-uncertainty][data-sim-done]').length === 2, null, { timeout: 60000 });
    const ckSim = await un.evaluate(() => { const A = Engine.defaultAssumptions(); A.cockpit.winRate = 1.1; return Engine.simulate(A, Engine.templates.tradeShow(A)).newArr.p50; });
    const ckP50 = await un.$eval('[data-uncertainty] [data-sim-row="newArr"]', tr => tr.children[2].textContent);
    check('The simulation reruns around the cockpit', ckP50 === '$' + (ckSim / 1000).toFixed(1) + 'K', ckP50 + ' vs ' + ckSim);
    await un.click('[data-view-tab="stand"]');
    const ckArr = await un.textContent('[data-kpi="arr"] [data-delta]');
    const expArr = await un.evaluate(() => { const A = Engine.defaultAssumptions(); A.cockpit.winRate = 1.1; const x = Engine.applyInitiatives(A, [Engine.templates.tradeShow(A), Engine.templates.accelerateRevenue(A)]);
      return x.scenario.arr.arr[12] - Engine.runModel(Engine.defaultAssumptions(), []).arr.arr[12]; });
    check('Where we stand includes the cockpit', ckArr === '▲ +$' + (expArr / 1000).toFixed(1) + 'K vs plan', ckArr + ' vs ' + expArr);
    await un.click('#open-assumptions');
    check('The cockpit is listed in Assumptions', (await un.inputValue('[data-path="cockpit.winRate"]')) === '1.1');
    await un.click('#close-assumptions').catch(() => un.keyboard.press('Escape'));
    await un.click('#cockpit-reset'); await un.waitForTimeout(300);
    check('Reset sliders restores the plan', (await un.evaluate(() => Engine.cockpitIsNeutral(window.__APP__.state.A.cockpit))) && (await un.textContent('[data-ck-value="winRate"]')) === 'As planned');

    const unp = await browser.newPage({ viewport: { width: 390, height: 844 } });
    unp.on('pageerror', e => errors.push(String(e)));
    await unp.goto(APP);
    await unp.click('#cockpit > summary');
    await unp.click('[data-view-tab="initiatives"]'); await unp.click('#init-submit');
    await unp.waitForSelector('[data-uncertainty][data-sim-done]', { timeout: 60000 });
    const unw = await unp.evaluate(() => ({ sw: document.documentElement.scrollWidth, right: Math.max(...Array.from(document.querySelectorAll('.card, .tile, .chart svg, .ck-item')).map(e => e.getBoundingClientRect().right)) }));
    check('Phone: cockpit and uncertainty have no horizontal page scroll', unw.sw <= 390 && unw.right <= 390, JSON.stringify(unw));
    check('No em dashes with the cockpit and simulation shown', !(await unp.evaluate(() => document.body.innerText)).includes('—'));

    // Phone width on the evaluator with a card and its sources open.
    const evp = await browser.newPage({ viewport: { width: 390, height: 844 } });
    evp.on('pageerror', e => errors.push(String(e)));
    await evp.goto(APP);
    await evp.click('[data-view-tab="initiatives"]'); await evp.click('#init-submit'); await evp.check('#show-sources'); await evp.waitForTimeout(200);
    const evw = await evp.evaluate(() => ({ sw: document.documentElement.scrollWidth, right: Math.max(...Array.from(document.querySelectorAll('.card, .tile')).map(e => e.getBoundingClientRect().right)) }));
    check('Phone: evaluator has no horizontal page scroll', evw.sw <= 390 && evw.right <= 390, JSON.stringify(evw));

    // 5. Strategy view (Step 6b, SPEC.md 11.13 UI row)
    const st = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    st.on('pageerror', e => errors.push(String(e)));
    st.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await st.goto(APP);
    await st.click('[data-view-tab="strategy"]');
    const ready = () => st.waitForFunction(() => document.getElementById('strategy-portfolio').getAttribute('data-status') === 'ready', null, { timeout: 180000 });
    const chosen = async () => Number(await st.getAttribute('#strategy-portfolio', 'data-chosen-set'));
    const opts = await st.$$eval('#strategy-select option', os => os.map(o => o.textContent));
    check('Strategy selector lists four strategies, three labelled Draft', opts.length === 4 && opts.filter(o => /\(Draft\)$/.test(o)).length === 3 && !/Draft/.test(opts[0]), opts.join(' | '));
    check('Empty strategy view offers the example list', await st.isVisible('#load-examples'));
    await st.click('#load-examples');
    await ready();
    check('Badge 24/24 with the eight loaded', (await st.textContent('#badge')).trim() === 'Integrity 24/24', await st.textContent('#badge'));
    const obj = await st.evaluate(() => ({ target: document.querySelector('[data-obj="target"] .t-value').textContent, plan: document.querySelector('[data-obj="plan"] .t-value').textContent,
      withP: document.querySelector('[data-obj="with"] .t-value').textContent, gap: document.querySelector('[data-obj="gap"] .t-value').textContent,
      progress: document.querySelector('[data-progress]').textContent, guards: Array.from(document.querySelectorAll('[data-sguard]')).map(li => li.getAttribute('data-sguard') + ':' + li.querySelector('.pill').textContent) }));
    check('Objective with progress to target: $31.2M target, plan $30.0M, with set 51 $30.5M, gap $696.2K',
      obj.target === '$31.2M' && obj.plan === '$30.0M' && obj.withP === '$30.5M' && obj.gap === '$696.2K' && /84% of the way.*90%/.test(obj.progress), JSON.stringify(obj));
    check('Five guardrails and the covenant watch line, all passing', obj.guards.join(',') === 'cashFloor:Pass,runway:Pass,cacPayback:Pass,burnMultiple:Pass,grossMargin:Pass,covenant:Pass', obj.guards.join(','));
    const ranked = await st.$$eval('[data-ranked] tbody tr', trs => trs.map(tr => ({ name: tr.querySelector('th').firstChild.textContent,
      score: tr.querySelector('[data-col="score"]').textContent, cost: tr.querySelector('[data-col="budgetCost"]').firstChild.textContent,
      arr: tr.querySelector('[data-col="extraNewArr"]').textContent, g: tr.querySelector('[data-col="guardrails"]').textContent })));
    check('Ranked list in SPEC 11.12 order', ranked.map(r => r.name).join(', ') === 'Trade show, Partner program, Hire 2 SDRs, Paid search campaign, Paid social test, Hire 2 AEs, Hub pull-in, Hosting pull-in',
      ranked.map(r => r.name).join(', '));
    check('Ranked list shows score, budget cost, extra new ARR and guardrail status', ranked[0].score === '1.60' && ranked[0].cost === '$60.0K' && /^\+\$/.test(ranked[0].arr) &&
      ranked[2].cost === '$223.2K' && ranked.every(r => r.g === '5 of 5'), JSON.stringify(ranked.slice(0, 3)));
    const engineArr = await st.evaluate(() => { const S = window.__APP__.state.strat; return S.scores.filter(s => s.name === 'Trade show')[0].extraNewArr; });
    check('Extra new ARR comes from the engine', ranked[0].arr === '+$' + (engineArr / 1000).toFixed(1) + 'K', ranked[0].arr + ' vs ' + engineArr);
    check('Default budget $500K picks set 51', await chosen() === 51);
    const fc = await st.evaluate(() => ({ gap: Number(document.getElementById('forecast-summary').getAttribute('data-gap')), label: document.querySelector('[data-gap-label]').textContent,
      plan: !!document.querySelector('#forecast-chart [data-series="plan"]'), withP: !!document.querySelector('#forecast-chart [data-series="withPlan"]'), target: !!document.querySelector('#forecast-chart [data-ref="target"]') }));
    check('Combined forecast: plan against plan plus set 51, gap $696.2K to the target', fc.plan && fc.withP && fc.target && Math.abs(fc.gap - 696236.22) < 0.01 && fc.label === 'Gap $696.2K', JSON.stringify(fc));
    // The budget slider picks again from the stored table: no new combinations are run.
    await st.evaluate(() => { const E = window.Engine; window.__runs = 0; ['portfolioRows', 'portfolioSetup', 'buildPortfolio'].forEach(k => { const f = E[k]; E[k] = function () { window.__runs++; return f.apply(this, arguments); }; }); });
    const picks = [];
    for (const [budget, want] of [[100000, 1], [285000, 49], [500000, 51], [600000, 45], [900000, 63], [3000000, 127]]) {
      await st.fill('#budget-input', String(budget)); await st.press('#budget-input', 'Enter');
      await st.waitForTimeout(150);
      picks.push(budget + ':' + (await chosen()) + (await chosen() === want ? '' : ' (want ' + want + ')'));
    }
    check('Budget input reproduces the SPEC 11.12 risk-adjusted selections', picks.every(x => !/want/.test(x)), picks.join(' '));
    check('Moving the budget runs no new combinations', await st.evaluate(() => window.__runs) === 0, String(await st.evaluate(() => window.__runs)));
    await st.evaluate(() => { const r = document.getElementById('budget-range'); r.value = '500000'; r.dispatchEvent(new Event('input')); });
    await st.waitForTimeout(200);
    check('The slider moves the budget too', await chosen() === 51 && (await st.inputValue('#budget-input')) === '500,000');
    const ex = await st.evaluate(() => ({ text: document.querySelector('[data-explain]').textContent,
      reasons: Array.from(document.querySelectorAll('[data-left-out] [data-reason]')).map(td => td.getAttribute('data-reason')).join(','),
      members: Array.from(document.querySelectorAll('[data-member]')).map(tr => tr.getAttribute('data-member')).length }));
    check('The explanation names the search and the pick', /^We ran all 256 combinations and 248 keep every guardrail\./.test(ex.text) && ex.members === 4 && ex.reasons === 'over_budget,over_budget,over_budget,over_budget', JSON.stringify(ex));
    check('Badge still 24/24 after the budget moves', (await st.textContent('#badge')).trim() === 'Integrity 24/24');
    // Stress test of set 51 (SPEC.md 11.9): main risk is the cash floor.
    await st.click('#stress-run');
    await st.waitForFunction(() => document.querySelector('[data-stress] .tiles'), null, { timeout: 120000 });
    const stress = await st.evaluate(() => ({ risk: document.querySelector('[data-tile="stressRisk"] .t-value') ? document.querySelector('[data-tile="stressRisk"] .t-value').textContent : document.querySelector('[data-stress]').textContent,
      met: document.querySelector('[data-stress]').textContent }));
    check('Stress test of set 51: main risk is the cash floor, target met in 0.7% of runs', /Cash floor/.test(stress.risk) && /0\.7%/.test(stress.met), stress.risk);
    // Switching strategies reproduces T142 (budget 550,000, plan case).
    await st.fill('#budget-input', '550000'); await st.press('#budget-input', 'Enter');
    const t142 = [];
    for (const [id, want] of [['arr_growth_30', 43], ['margin_expansion', 43], ['cash_runway', 1], ['efficient_growth', 6]]) {
      await st.selectOption('#strategy-select', id);
      await st.waitForTimeout(300);
      if (await st.isChecked('#risk-toggle')) await st.uncheck('#risk-toggle');
      await ready();
      t142.push(id + ':' + (await chosen()) + (await chosen() === want ? '' : ' (want ' + want + ')'));
    }
    check('Switching strategy reproduces T142', t142.every(x => !/want/.test(x)), t142.join(' '));
    check('A draft strategy is labelled Draft in the view', /Draft/.test(await st.textContent('#strategy-summary')));
    // AUDIT-FINAL F3: decision cards show the active strategy's rows (SPEC.md 11.1)
    await st.selectOption('#strategy-select', 'margin_expansion');
    await st.waitForTimeout(300);
    await st.click('[data-view-tab="initiatives"]');
    const showUid = await st.evaluate(() => window.__APP__.state.initiatives[0].uid);
    const me = await st.evaluate(u => ({ keys: Array.from(document.querySelectorAll('[data-init="' + u + '"] [data-guard-effect]')).map(e => e.getAttribute('data-guard-effect').split(':')[0]).join(','),
      first: document.querySelector('[data-init="' + u + '"] [data-guard-effect] .gl-label').textContent }), showUid);
    check('Decision card shows the active strategy\'s rows (margin expansion)', me.keys === 'objective,arrGrowth,cashFloor,grossMargin,covenant' && /^Objective: EBITDA margin/.test(me.first), JSON.stringify(me));
    // AUDIT-FINAL F6 and F9: committed initiatives over the budget, and the badge note while the table rebuilds
    await st.click('[data-view-tab="strategy"]');
    await st.selectOption('#strategy-select', 'arr_growth_30');
    await st.waitForTimeout(300);
    await ready();
    await st.fill('#budget-input', '500000'); await st.press('#budget-input', 'Enter');
    const hubUid = await st.evaluate(() => window.__APP__.state.initiatives.filter(i => i.params.name === 'Hub pull-in')[0].uid);
    await st.selectOption('[data-status-for="' + hubUid + '"]', 'committed');
    const noteDuring = await st.evaluate(() => !document.getElementById('badge-note').hidden);
    await ready();
    await st.waitForFunction(() => document.getElementById('badge-note').hidden, null, { timeout: 30000 }).catch(() => {});
    const ob = await st.evaluate(() => ({ note: document.querySelector('[data-tile="budgetUsed"] .t-note').textContent, explain: document.querySelector('[data-explain]').textContent,
      badgeNote: document.getElementById('badge-note').hidden }));
    check('Committed over budget: the tile says by how much, nothing is clipped', /^Over budget by \$981\.2K\./.test(ob.note) && /cost \$981\.2K more than the budget/.test(ob.explain), JSON.stringify(ob));
    check('The badge says it is updating while the table rebuilds, and stops when done', noteDuring && ob.badgeNote, 'during ' + noteDuring + ', hidden after ' + ob.badgeNote);
    await st.selectOption('[data-status-for="' + hubUid + '"]', 'candidate');
    await ready();
    check('Badge 24/24 under another strategy', (await st.textContent('#badge')).trim() === 'Integrity 24/24', await st.textContent('#badge'));
    const stText = await st.evaluate(() => document.body.innerText);
    check('No em dashes in the Strategy view', !stText.includes('—'));
    const sp = await browser.newPage({ viewport: { width: 390, height: 844 } });
    sp.on('pageerror', e => errors.push(String(e)));
    await sp.goto(APP);
    await sp.click('[data-view-tab="strategy"]'); await sp.click('#load-examples');
    await sp.waitForFunction(() => document.getElementById('strategy-portfolio').getAttribute('data-status') === 'ready', null, { timeout: 180000 });
    const spw = await sp.evaluate(() => ({ sw: document.documentElement.scrollWidth, right: Math.max(...Array.from(document.querySelectorAll('.card, .tile, .guards li')).map(e => e.getBoundingClientRect().right)) }));
    check('Phone: Strategy view has no horizontal page scroll', spw.sw <= 390 && spw.right <= 390, JSON.stringify(spw));

    // 6. Briefing, learning loop, scenarios and the overlay (Step 7, SPEC.md 12.4 UI row)
    const bp = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    bp.on('pageerror', e => errors.push(String(e)));
    bp.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await bp.goto(APP);
    await bp.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await bp.click('#open-howto');
    const howto = await bp.evaluate(() => ({ open: !document.getElementById('howto').hidden, text: document.getElementById('howto').innerText, focus: document.activeElement.id }));
    check('"How to read this" opens with the check count from the engine', howto.open && /24 of them/.test(howto.text) && /Four tabs/.test(howto.text) && howto.focus === 'close-howto', JSON.stringify(howto).slice(0, 200));
    await bp.keyboard.press('Escape');
    check('Escape closes it', await bp.evaluate(() => document.getElementById('howto').hidden));
    await bp.click('[data-view-tab="briefing"]');
    const b0 = await bp.$$eval('[data-brief]', els => els.map(e => e.getAttribute('data-brief') + ':' + e.innerText));
    check('Briefing has four sections in order', b0.map(x => x.split(':')[0]).join(',') === 'happened,why,decide,recommend', b0.map(x => x.split(':')[0]).join(','));
    check('On the plan it says so and asks for initiatives', /This is the plan/.test(b0[0]) && /nothing to decide yet/.test(b0[2]), b0[0].slice(0, 160));
    await bp.click('[data-view-tab="strategy"]'); await bp.click('#load-examples');
    await bp.waitForFunction(() => document.getElementById('strategy-portfolio').getAttribute('data-status') === 'ready', null, { timeout: 180000 });
    await bp.click('[data-view-tab="briefing"]');
    await bp.waitForFunction(() => /Main risk: cash floor/.test(document.getElementById('briefing-body').innerText), null, { timeout: 180000 });
    const b1 = await bp.textContent('#briefing-body');
    check('Briefing recommends set 51 with the cash floor as the main risk', /Approve Trade show, Hire 2 SDRs, Paid social test and Partner program for \$483\.2K of the \$500\.0K budget/.test(b1) &&
      /keeps it in 99\.1% of them, and meets the target in 0\.7%/.test(b1), b1.slice(0, 300));
    await bp.click('[data-view-tab="strategy"]');
    await bp.fill('#budget-input', '600000'); await bp.press('#budget-input', 'Enter');
    await bp.click('[data-view-tab="briefing"]');
    const b2 = await bp.textContent('#briefing-body');
    check('Briefing rewrites itself when the budget moves', /for \$595\.0K of the \$600\.0K budget/.test(b2) && b2 !== b1, b2.slice(0, 300));
    // Learning loop on the trade show
    const uid = await bp.evaluate(() => window.__APP__.state.initiatives[0].uid);
    const L = '[data-learn="' + uid + '"]';
    await bp.click('[data-view-tab="initiatives"]');
    await bp.check('[data-complete="' + uid + '"]');
    await bp.waitForSelector(L + ' [data-actual="leads"]');
    for (const [k, v] of [['leads', '160'], ['deals', '1'], ['arr', '48000']]) { await bp.fill(L + ' [data-actual="' + k + '"]', v); await bp.press(L + ' [data-actual="' + k + '"]', 'Tab'); }
    const lr = await bp.evaluate(sel => ({ rows: Array.from(document.querySelectorAll(sel + ' [data-learn-row]')).map(tr => Array.from(tr.children).map(c => c.textContent).join('|')),
      ups: Array.from(document.querySelectorAll(sel + ' [data-update]')).map(tr => tr.lastChild.textContent) }), L);
    check('Actual vs expected: leads, deals and new ARR', lr.rows[0] === 'Leads|200|160|80%' && lr.rows[1] === 'Deals|2.5|1|40%' && lr.rows[2] === 'New ARR|$130.0K|$48.0K|37%', lr.rows.join(' ; '));
    check('Proposed events rates and ACV (SPEC.md 12.1)', lr.ups.join(',') === '23.75%,19.00%,23.75%,$51,636', lr.ups.join(','));
    await bp.click('[data-apply-learning="' + uid + '"]');
    await bp.waitForSelector(L + ' [data-applied]');
    const ap = await bp.evaluate(() => ({ wr: window.__APP__.state.A.channels.events.winRate, hint: document.querySelector('#assumption-groups [data-row="channels.events.winRate"] .hint').textContent,
      changed: document.querySelector('#assumption-groups [data-row="channels.events.winRate"]').classList.contains('changed'), count: document.getElementById('change-count').textContent, badge: document.getElementById('badge').textContent }));
    check('Applying updates the events assumptions, visibly', Math.abs(ap.wr - 0.237479) < 1e-6 && ap.changed && /Updated from the actuals of Trade show/.test(ap.hint) && ap.count === '5', JSON.stringify(ap)); // the four events inputs plus the budget moved above
    check('Badge 24/24 after learning', ap.badge.trim() === 'Integrity 24/24', ap.badge);
    await bp.click('[data-view-tab="briefing"]');
    const b3 = await bp.textContent('#briefing-body');
    check('The briefing reports the completed trade show', /Trade show is complete: 160 leads against 200 expected/.test(b3) && /conversion assumptions now reflect these actuals/.test(b3), b3.slice(0, 400));
    check('A completed initiative leaves the search', !/Approve Trade show/.test(b3));
    // Scenarios: save, reload, compare, load
    await bp.fill('#scenario-name', 'Learned from the show'); await bp.click('#scenario-save');
    check('Saved scenario is listed', (await bp.$$('[data-scenario]')).length === 1);
    await bp.click('[data-view-tab="initiatives"]');
    await bp.click('[data-undo-learning="' + uid + '"]');
    check('Undo restores the events win rate', await bp.evaluate(() => window.__APP__.state.A.channels.events.winRate) === 0.25);
    await bp.reload();
    await bp.click('[data-view-tab="briefing"]');
    check('The saved scenario survives a reload', (await bp.$$('[data-scenario]')).length === 1);
    await bp.check('[data-compare]');
    const cmp = await bp.evaluate(() => ({ cols: document.querySelectorAll('[data-compare-table] thead th').length,
      arr: Array.from(document.querySelectorAll('[data-compare-row="arr12"] td')).map(td => td.textContent) }));
    check('Compare shows the plan, the screen and the saved scenario', cmp.cols === 4 && cmp.arr[0] === '$30.0M' && cmp.arr.length === 3, JSON.stringify(cmp));
    await bp.click('[data-load]');
    const ld = await bp.evaluate(() => ({ n: window.__APP__.state.initiatives.length, wr: window.__APP__.state.A.channels.events.winRate, done: !!window.__APP__.state.initiatives[0].completed }));
    check('Loading brings back the initiatives and the learned rates', ld.n === 8 && Math.abs(ld.wr - 0.237479) < 1e-6 && ld.done, JSON.stringify(ld));
    const bText = await bp.evaluate(() => document.body.innerText);
    check('No em dashes in the briefing, scenarios or overlay', !bText.includes('—') && !howto.text.includes('—'));
    const bph = await browser.newPage({ viewport: { width: 390, height: 844 } });
    bph.on('pageerror', e => errors.push(String(e)));
    await bph.goto(APP);
    await bph.click('[data-view-tab="briefing"]');
    const bw = await bph.evaluate(() => ({ sw: document.documentElement.scrollWidth, right: Math.max(...Array.from(document.querySelectorAll('.card, .scn-list li')).map(e => e.getBoundingClientRect().right)) }));
    check('Phone: briefing and scenarios have no horizontal page scroll', bw.sw <= 390 && bw.right <= 390, JSON.stringify(bw));
    await bph.click('#open-howto');
    const hw = await bph.evaluate(() => { const r = document.getElementById('howto').getBoundingClientRect(); return { l: r.left, r: r.right }; });
    check('Phone: the overlay fits the screen', hw.l >= 0 && hw.r <= 390, JSON.stringify(hw));

    // AUDIT-FINAL F1: on a phone, the finished simulation tables and the learning tables scroll inside the card, not the page
    const fp = await browser.newPage({ viewport: { width: 390, height: 844 } });
    fp.on('pageerror', e => errors.push(String(e)));
    await fp.goto(APP);
    await fp.click('[data-view-tab="initiatives"]'); await fp.click('#init-submit');
    await fp.waitForSelector('[data-sim-table]', { timeout: 120000 });
    await fp.waitForSelector('[data-sens]', { state: 'attached', timeout: 120000 });
    await fp.evaluate(() => document.querySelectorAll('.decision details').forEach(d => { d.open = true; }));
    const fuid = await fp.evaluate(() => window.__APP__.state.initiatives[0].uid);
    const FL = '[data-learn="' + fuid + '"]';
    await fp.check('[data-complete="' + fuid + '"]'); await fp.waitForSelector(FL + ' [data-actual]');
    for (const [k, v] of [['leads', '160'], ['deals', '1'], ['arr', '48000']]) { await fp.fill(FL + ' [data-actual="' + k + '"]', v); await fp.press(FL + ' [data-actual="' + k + '"]', 'Tab'); }
    await fp.waitForSelector(FL + ' [data-learn-updates]');
    await fp.waitForSelector('[data-sens]', { state: 'attached', timeout: 120000 });
    await fp.evaluate(() => document.querySelectorAll('.decision details').forEach(d => { d.open = true; }));
    const fw = await fp.evaluate(() => document.documentElement.scrollWidth);
    check('Phone: finished simulation, sensitivity and learning tables do not widen the page', fw <= 390, String(fw));
    // AUDIT-FINAL F5: every compare column is integrity-checked
    await fp.click('[data-view-tab="briefing"]');
    const integ = await fp.$$eval('[data-compare-row="integrity"] td', tds => tds.map(td => td.textContent));
    check('Compare columns carry the model checks of their runs', integ.length === 2 && integ.every(x => x === 'All pass'), integ.join(' | '));

    // 7. The dashboard, the first screen (SPEC.md 13.5)
    const dp = await browser.newPage({ viewport: { width: 1366, height: 800 } });
    dp.on('pageerror', e => errors.push(String(e)));
    dp.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await dp.goto(PAGE);
    await dp.waitForFunction(() => document.getElementById('d-main').getAttribute('data-ready') === 'yes', null, { timeout: 120000 });
    const d0 = await dp.evaluate(() => ({ dash: !document.getElementById('dash').hidden, analystHidden: getComputedStyle(document.getElementById('app')).display === 'none',
      sections: Array.from(document.querySelectorAll('#dash .d-card h2')).map(h => h.textContent), kpis: Array.from(document.querySelectorAll('[data-dkpi]')).map(k => k.getAttribute('data-dkpi')).join(','),
      guards: Array.from(document.querySelectorAll('[data-dguard]')).map(g => g.getAttribute('data-dguard') + ':' + g.classList.contains('pass')).join(','),
      badge: document.getElementById('d-badge').textContent, text: document.getElementById('dash').innerText }));
    check('Dashboard is the first screen, with six numbered sections', d0.dash && d0.analystHidden && d0.sections.length === 6 && d0.sections[1] === '02The plan for this budget' &&
      d0.sections[3] === '04Test a decision' && /^06Cash river/.test(d0.sections[5]), JSON.stringify(d0.sections));
    check('Dashboard cards: ARR, revenue growth, invested, net cash return', d0.kpis === 'arr,growth,invested,return', d0.kpis);
    check('Lowest cash and burn multiple are guardrails, all passing', d0.guards === 'cashFloor:true,runway:true,cacPayback:true,burnMultiple:true,grossMargin:true,covenant:true', d0.guards);
    check('Dashboard: badge 24/24, labelled fictional, no gut-feel comparison', d0.badge === 'Integrity 24/24' && d0.text.includes('Fictional company, for demonstration.') && !/gut/i.test(d0.text), d0.badge);
    const read = () => dp.evaluate(() => ({ set: document.getElementById('d-main').getAttribute('data-plan-set'), big: Number(document.querySelector('#d-hero .big').getAttribute('data-v')),
      out: Array.from(document.querySelectorAll('[data-out-id]')).map(li => li.firstChild.textContent + ':' + li.querySelector('[data-reason]').getAttribute('data-reason')).join(', '),
      bars: Array.from(document.querySelectorAll('#d-bridge-chart [data-bar-value]')).map(t => t.textContent).join(' '), next: document.getElementById('d-next').textContent,
      brief: document.getElementById('d-brief-body').innerText, ret: Number(document.querySelector('[data-dkpi="return"] .d-value').getAttribute('data-v')),
      growth: Number(document.querySelector('[data-dkpi="growth"] .d-value').getAttribute('data-v')), arr: Number(document.querySelector('[data-dkpi="arr"] .d-value').getAttribute('data-v')) }));
    const at500 = await read();
    check('Net cash return is the plan\'s return over the model: +$1.26M, positive', Math.abs(at500.ret - 1258869.63) < 0.01, String(at500.ret));
    check('Revenue growth for 2027 is shown', Math.abs(at500.growth - 0.270426) < 0.000001, String(at500.growth));
    check('At $500K: fund trade show, SDRs and partner program for $919.7K of value', at500.set === '35' && Math.abs(at500.big - 919707.86) < 0.01 &&
      at500.bars === '+$466.6K +$305.2K +$147.9K $919.7K', JSON.stringify(at500).slice(0, 300));
    check('Each proposal left out says why', at500.out === 'Hire 2 AEs:over_budget, Paid search campaign:over_budget, Paid social test:lowers_value, Hub pull-in:over_budget, Hosting pull-in:over_budget', at500.out);
    check('The next step is named', at500.next === 'Next step: $168.2K more budget would add $43.5K of value.', at500.next);
    await dp.click('.d-seg [data-year="3"]');
    const y3 = await read();
    const growth29 = await dp.evaluate(() => window.__APP__.state.dashView.cards[1].value);
    check('2029: revenue growth and the cash river move to the year; the return stays the whole plan\'s', Math.abs(y3.growth - growth29) < 1e-9 && y3.growth !== at500.growth && Math.abs(y3.ret - 1258869.63) < 0.01 &&
      /^Dec 2029/.test(await dp.textContent('#d-stand-sub')) && /Jan 2029 to Dec 2029/.test(await dp.textContent('#d-river-sub')), JSON.stringify({ ret: y3.ret, growth: y3.growth }));
    await dp.click('.d-seg [data-year="1"]');
    await dp.evaluate(() => { const r = document.querySelector('[data-slider="budget"]'); r.value = '700000'; r.dispatchEvent(new Event('input')); });
    await dp.waitForFunction(() => document.getElementById('d-main').getAttribute('data-plan-set') === '38', null, { timeout: 30000 }).catch(() => {});
    await dp.waitForTimeout(600);
    const at700 = await read();
    check('At $700K the plan changes: SDRs, AEs and partner program, $963.2K of value', at700.set === '38' && Math.abs(at700.big - 963165.17) < 0.01, JSON.stringify(at700).slice(0, 200));
    check('The dashboard briefing rewrites itself with the budget', /fits the \$700\.0K budget comes from Hire 2 SDRs, Hire 2 AEs and Partner program/.test(at700.brief), at700.brief.slice(0, 300));
    const eng = await dp.evaluate(() => { const v = window.__APP__.state.dashView; return { npv: v.picks.npv, ret: v.returns.netReturn }; });
    check('Dashboard numbers are the engine\'s', Math.abs(eng.npv - at700.big) < 0.01 && Math.abs(eng.ret - at700.ret) < 0.01, JSON.stringify(eng));
    await dp.evaluate(() => { const r = document.querySelector('[data-slider="winRate"]'); r.value = '1.25'; r.dispatchEvent(new Event('input')); });
    await dp.waitForFunction(() => window.__APP__.state.A.cockpit.winRate === 1.25 && document.getElementById('d-busy').hidden && document.getElementById('d-main').getAttribute('data-ready') === 'yes' &&
      Number(document.querySelector('[data-dkpi="arr"] .d-value').getAttribute('data-v')) > 30700000, null, { timeout: 60000 }).catch(() => {});
    const wr = await dp.evaluate(() => ({ arr: Number(document.querySelector('[data-dkpi="arr"] .d-value').getAttribute('data-v')), out: document.querySelector('[data-out="winRate"]').textContent,
      badge: document.getElementById('d-badge').textContent }));
    check('Win rate +25% lifts ARR and keeps every check passing', wr.arr > at700.arr && wr.out === '+25%' && wr.badge === 'Integrity 24/24', JSON.stringify(wr));
    await dp.click('#d-reset');
    await dp.waitForFunction(() => window.__APP__.state.A.cockpit.winRate === 1 && window.__APP__.state.A.portfolio.budget === 500000 && document.getElementById('d-main').getAttribute('data-plan-set') === '35', null, { timeout: 60000 }).catch(() => {});
    check('Reset restores the sliders', await dp.evaluate(() => window.__APP__.state.A.cockpit.winRate === 1 && window.__APP__.state.A.portfolio.budget === 500000));
    await dp.waitForFunction(() => document.getElementById('d-main').getAttribute('data-ready') === 'yes' && document.getElementById('d-busy').hidden, null, { timeout: 60000 }).catch(() => {});
    // Test a decision (SPEC.md 13.6): the trade show on top of the rest of the plan
    await dp.waitForFunction(() => document.getElementById('d-test').getAttribute('data-test-uid'), null, { timeout: 30000 });
    const tv = () => dp.evaluate(() => ({ uid: document.getElementById('d-test').getAttribute('data-test-uid'),
      vals: Object.fromEntries(Array.from(document.querySelectorAll('#d-test [data-test]')).map(e => [e.getAttribute('data-test'), e.textContent])),
      verdict: document.getElementById('d-verdict').innerText, use: document.getElementById('d-test-use').disabled,
      pressed: Array.from(document.querySelectorAll('[data-test-pick][aria-pressed="true"]')).map(b => b.textContent).join(',') }));
    const tv0 = await tv();
    check('Test a decision starts on the trade show, with near and long term', tv0.pressed === 'Trade show' && tv0.vals.budget === '$60.0K' && tv0.vals.nearArr === '+$107.0K' &&
      tv0.vals.nearCash === '-$19.0K' && tv0.vals.longCash === '+$199.7K' && tv0.vals.roi === '+263%' && tv0.vals.payback === 'Jun 2028' && tv0.use === true, JSON.stringify(tv0.vals));
    check('The decision verdict is written from the model', /Trade show is in the plan\. It uses \$60\.0K of this year's budget/.test(tv0.verdict) && /All 22 model checks pass on this run/.test(tv0.verdict), tv0.verdict.slice(0, 200));
    await dp.evaluate(() => { const r = document.querySelector('[data-test-field="expectedLeads"]'); r.value = '350'; r.dispatchEvent(new Event('input')); });
    await dp.waitForFunction(() => document.querySelector('#d-test [data-test="roi"]').textContent !== '+263%', null, { timeout: 10000 }).catch(() => {});
    const tv1 = await tv();
    check('More expected leads: the ROI and payback update live', tv1.vals.roi === '+311%' && tv1.vals.payback === 'Apr 2028' && tv1.use === false, JSON.stringify(tv1.vals));
    const aesUid = await dp.evaluate(() => window.__APP__.state.initiatives.filter(i => i.params.name === 'Hire 2 AEs')[0].uid);
    await dp.click('[data-test-pick="' + aesUid + '"]');
    await dp.waitForFunction(u => document.getElementById('d-test').getAttribute('data-test-uid') === u, aesUid, { timeout: 10000 });
    const tv2 = await tv();
    check('Testing a proposal not in the plan says what adding it would do and that it needs more budget', /Hire 2 AEs is not in the plan/.test(tv2.verdict) && /more than the \$500\.0K budget/.test(tv2.verdict), tv2.verdict.slice(0, 260));
    const tShowUid = await dp.evaluate(() => window.__APP__.state.initiatives[0].uid);
    await dp.click('[data-test-pick="' + tShowUid + '"]');
    await dp.evaluate(() => { const r = document.querySelector('[data-test-field="expectedLeads"]'); r.value = '350'; r.dispatchEvent(new Event('input')); });
    await dp.waitForTimeout(200);
    await dp.click('#d-test-use');
    await dp.waitForFunction(() => window.__APP__.state.initiatives[0].params.expectedLeads === 350 && document.getElementById('d-main').getAttribute('data-ready') === 'yes' &&
      !document.getElementById('d-busy').hidden === false, null, { timeout: 60000 }).catch(() => {});
    await dp.waitForTimeout(800);
    const applied = await dp.evaluate(() => ({ leads: window.__APP__.state.initiatives[0].params.expectedLeads, value: window.__APP__.state.dashView.picks.npv, badge: document.getElementById('d-badge').textContent }));
    check('Use these inputs in the plan: the proposal changes and the plan re-optimizes', applied.leads === 350 && applied.value > 919707.86 + 1 && applied.badge === 'Integrity 24/24', JSON.stringify(applied));
    await dp.click('#d-analyst');
    const an = await dp.evaluate(() => ({ dash: document.getElementById('dash').hidden, app: getComputedStyle(document.getElementById('app')).display !== 'none', n: window.__APP__.state.initiatives.length }));
    check('Analyst view opens the detailed app with the same eight initiatives', an.dash && an.app && an.n === 8, JSON.stringify(an));
    await dp.click('#to-dash');
    check('The Dashboard button comes back', await dp.evaluate(() => !document.getElementById('dash').hidden));
    const dText = await dp.evaluate(() => document.getElementById('dash').innerText);
    check('No em dashes on the dashboard', !dText.includes('—'));
    const dph = await browser.newPage({ viewport: { width: 390, height: 844 } });
    dph.on('pageerror', e => errors.push(String(e)));
    await dph.goto(PAGE);
    await dph.waitForFunction(() => document.getElementById('d-main').getAttribute('data-ready') === 'yes', null, { timeout: 120000 });
    const dpw = await dph.evaluate(() => ({ sw: document.documentElement.scrollWidth, cockpit: Math.round(document.querySelector('.d-cockpit-in').getBoundingClientRect().right) }));
    check('Phone: dashboard has no horizontal page scroll and the sliders fit', dpw.sw <= 390 && dpw.cockpit <= 390, JSON.stringify(dpw));

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
