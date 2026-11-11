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

    // 3. Normal page: renders, badge reads Integrity 20/20, no errors
    const app = await browser.newPage();
    app.on('pageerror', e => errors.push(String(e)));
    await app.goto(PAGE);
    const badge = (await app.textContent('#badge')).trim();
    const rows = await app.$$eval('#app table tr', trs => trs.length);
    const badgeOk = badge === 'Integrity 20/20' && rows > 36;
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
    check('The change is counted and integrity still passes', after.count === '1' && after.badge === 'Integrity 20/20', JSON.stringify(after));
    await app.fill('[data-path="openingArr"]', '');
    await app.waitForTimeout(400);
    const err = { badge: (await app.textContent('#badge')).trim(), msg: await app.textContent('#input-error'), arr: await app.textContent('[data-kpi="arr"] .kpi-value') };
    check('A blank input is an input error, not zero', err.badge === 'Input error' && /Opening ARR/.test(err.msg) && err.arr === '$28.1M', JSON.stringify(err));
    await app.click('#reset-assumptions');
    await app.waitForTimeout(200);
    const reset = { badge: (await app.textContent('#badge')).trim(), arr: await app.textContent('[data-kpi="arr"] .kpi-value'),
      delta: await app.textContent('[data-kpi="arr"] [data-delta]'), hidden: await app.$eval('#change-count', e => e.hidden),
      churn: await app.inputValue('[data-path="churnRateMonthly"]'), err: (await app.textContent('#input-error')).trim() };
    check('Reset restores the plan', reset.badge === 'Integrity 20/20' && reset.arr === '$30.0M' && reset.delta === 'Same as plan' && reset.hidden &&
      reset.churn === '0.6' && reset.err === '', JSON.stringify(reset));
    await app.click('details[data-group="Debt, covenant and cash"] > summary');
    await app.fill('[data-path="cashFloor"]', '30,000,000'); await app.waitForTimeout(400);
    const floor = await app.evaluate(() => [window.__APP__.state.A.cashFloor, window.__APP__.state.A.guardrails.cashFloor]);
    check('The cash floor input sets both floors', floor[0] === 30000000 && floor[1] === 30000000 && (await app.textContent('#badge')).trim() === 'Integrity 20/20', JSON.stringify(floor));
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
    check('Where we stand includes the initiative: ARR +$133.1K vs plan', standDelta === '▲ +$133.1K vs plan' && (await ev.textContent('#badge')).trim() === 'Integrity 20/20', standDelta);
    await ev.click('[data-view-tab="initiatives"]');
    await ev.click('[data-template="hireAes"]');
    check('Hire AEs asks for the ramp, default 4 months', (await ev.inputValue('#init-fields [data-param="rampMonths"]')) === '4');
    await ev.click('#init-submit'); await ev.waitForTimeout(200);
    const ae = await tiles(1);
    check('Two-AE card: cost, NPV, payback, ROI, new ARR per $1, ARR change (SPEC 4.4)', ae.cost === '$932.3K' && ae.npv === '$191.4K' &&
      ae.payback === 'Month 30' && ae.roi === '35%' && ae.arrPerDollar === '$1.09' && ae.arr === '+$148.0K', JSON.stringify(ae));
    const both = await ev.$$eval('#together [data-tile]', els => Object.fromEntries(els.map(e => [e.getAttribute('data-tile'), e.querySelector('.t-value').textContent])));
    check('Together: NPV $393.6K and ARR +$281.2K (SPEC T43)', both.npv === '$393.6K' && both.arr === '+$281.2K', JSON.stringify(both));
    check('Badge still 20/20 with both', (await ev.textContent('#badge')).trim() === 'Integrity 20/20');
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
    await ac.goto(PAGE);
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
    check('Badge 20/20 with both pull-ins', (await ac.textContent('#badge')).trim() === 'Integrity 20/20');
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
    await acp.goto(PAGE);
    await acp.click('[data-view-tab="initiatives"]'); await acp.click('[data-template="accelerateRevenue"]'); await acp.click('#init-submit'); await acp.waitForTimeout(300);
    await acp.click('.decision details.more summary');
    const acw = await acp.evaluate(() => ({ sw: document.documentElement.scrollWidth, right: Math.max(...Array.from(document.querySelectorAll('.card, .tile, .chart svg')).map(e => e.getBoundingClientRect().right)) }));
    check('Phone: acceleration card has no horizontal page scroll', acw.sw <= 390 && acw.right <= 390, JSON.stringify(acw));

    // 7. Uncertainty on the cards and the scenario cockpit (Step 5, SPEC.md section 10), on a fresh page.
    const un = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    un.on('pageerror', e => errors.push(String(e)));
    await un.goto(PAGE);
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
    check('Moving the win rate slider to 1.10x is stored and counted', ck.value === '1.10x' && ck.stored === 1.1 && /^1 driver moved/.test(ck.sub) && ck.count === '1' && ck.badge === 'Integrity 20/20', JSON.stringify(ck));
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
    await unp.goto(PAGE);
    await unp.click('#cockpit > summary');
    await unp.click('[data-view-tab="initiatives"]'); await unp.click('#init-submit');
    await unp.waitForSelector('[data-uncertainty][data-sim-done]', { timeout: 60000 });
    const unw = await unp.evaluate(() => ({ sw: document.documentElement.scrollWidth, right: Math.max(...Array.from(document.querySelectorAll('.card, .tile, .chart svg, .ck-item')).map(e => e.getBoundingClientRect().right)) }));
    check('Phone: cockpit and uncertainty have no horizontal page scroll', unw.sw <= 390 && unw.right <= 390, JSON.stringify(unw));
    check('No em dashes with the cockpit and simulation shown', !(await unp.evaluate(() => document.body.innerText)).includes('—'));

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
