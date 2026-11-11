// Extracts the reference tables from SPEC.md as raw cell strings.
// Used by tests/run.js to confirm the expected values embedded in index.html
// are exactly the ones written in SPEC.md (SPEC.md is the source of truth).
'use strict';
const fs = require('fs');
const path = require('path');

// Each table is found by the exact text of its header row prefix.
const TABLES = {
  openingInvoices: '| Month of 2026 | m | Invoice |',
  janPl: '| Line | Calculation | Amount |',
  tradeShowMonthly: '| m | Month | Δ New ARR | Δ ARR | Δ Revenue | Δ Gross profit |',
  aeMonthly: '| m | Month | Ramped AEs added | Δ Opps |',
  monthly: '| m | Month | New ARR | Closing ARR | Customers |',
  annual: '| Line | 2027 | 2028 | 2029 |',
  balanceSheets: '| Line | Opening (Dec 31, 2026) |',
  kpis: '| Metric | m=1 | m=6 | m=12 | m=24 | m=36 |',
  week13: '| Week | Days | Receipts |'
};

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim().replace(/\*\*/g, ''));
}

function extract(specPath) {
  const lines = fs.readFileSync(specPath, 'utf8').split('\n');
  const out = {};
  for (const [key, prefix] of Object.entries(TABLES)) {
    const start = lines.findIndex(l => l.startsWith(prefix));
    if (start < 0) throw new Error('Table not found in SPEC.md: ' + key);
    const header = splitRow(lines[start]);
    const rows = [];
    for (let i = start + 2; i < lines.length && lines[i].startsWith('|'); i++) rows.push(splitRow(lines[i]));
    out[key] = { header, rows };
  }
  return out;
}

module.exports = { extract };

if (require.main === module) {
  const spec = path.join(__dirname, '..', 'SPEC.md');
  process.stdout.write(JSON.stringify(extract(spec)));
}
