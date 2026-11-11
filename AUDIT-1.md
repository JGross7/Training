# AUDIT-1: engine audit after Step 1

Scope: the `<script id="engine">` block and the tests in `index.html`, plus `tests/run.js`, checked against `SPEC.md`.

## Verdict

**The math is right.** I found no formula that differs from `SPEC.md`, no timing error, no sign error and no computed number typed into the engine or the UI.

**The real problems were around the edges of the math**, and they would have bitten in Step 2 and Step 3:

- a bad input could silently become zero while the badge stayed green,
- the integrity badge turned red on a healthy, cash-generating company,
- several checks had blind spots, and
- the tests would not have noticed most bugs outside the two worked examples.

13 findings. 12 fixed. 1 made loud and left for your decision (finding 4).

Tests: **72 of 72 pass, 4,634 assertions** (was 55 tests, 2,784 assertions). Baseline badge: Integrity 16/16. No existing test was changed, weakened or deleted, and no reference value in `SPEC.md` changed.

## How the audit was done

1. **Read every engine line against `SPEC.md`** sections 1 to 3: assumptions, formulas, checks.
2. **Built a second model from the spec alone** (Python, written from sections 2.2 to 2.18 without copying engine code) and compared it with the engine on 111 scenarios: every initiative effect kind, every driver, milestones shipping in months 1, 35, 36 and 37, sales cycles of 0 to 12 months, payment terms of 0 to 60 days, horizons of 13 to 48 months, a 10,000,000 and a 100,000,000 spend, negative cash, a profitable company paying tax, the 13-week view from 13 different start months, and 40 seeded random combinations. **Largest difference on any number: 0.00000001.**
3. **Injected deliberate bugs** into a scratch copy of the engine, one at a time (an off-by-one ramp, tax not paid in cash, a check deleted, and so on), and ran the tests against each to see which bugs the tests miss.
4. **Probed about 80 edge cases** for crashes, NaN and silent wrong answers.

The second model and the bug-injection scripts were scratch tools and are not in the repository. Say the word if you want them added under `tests/` for the final audit in Step 8.

## Findings, ranked by severity

| # | Severity | Finding | Status | Test |
|---|---|---|---|---|
| 1 | High | A missing or non-numeric input was silently read as zero, with a green badge | Fixed | T70 |
| 2 | High | The integrity badge went red whenever the company was not burning cash in year one | Fixed | T71 |
| 3 | Medium | Check C5 could not fail when AE capacity was exceeded but not applied | Fixed | T72 |
| 4 | Medium | The cash floor lives in two inputs that could silently disagree | Made loud, **your decision** | T73 |
| 5 | Medium | The "Ramp" input on the hire templates did nothing | Fixed | T74 |
| 6 | Medium | The tests missed 68 of 108 injected bugs | Fixed | T70 to T86 |
| 7 | Medium | Stored totals were never checked, and the receivables and payables check was circular | Fixed | T85 |
| 8 | Low | A sales cycle of 2.5 or -1 months, or negative DSO or DPO, turned the whole model into NaN | Fixed | T70 |
| 9 | Low | A 13-week forecast starting outside the model returned NaN or nothing | Fixed | T70 |
| 10 | Low | The badge denominator was "however many checks ran", not 16 | Fixed | T71 |
| 11 | Low | C16 accepted minus infinity as a runway | Fixed | T71 |
| 12 | Low | `tests/run.js` reported success if zero tests ran | Fixed | in `run.js` |
| 13 | Low | "First month with any effect" in the payback rule was ambiguous | Clarified | T78, T80 |

### 1. A missing or non-numeric input was read as zero (High)

`runModel` copies its inputs through JSON. JSON turns `NaN`, `Infinity` and a missing value into `null`, and JavaScript then treats `null` as 0 in arithmetic.

Evidence, before the fix:

| Input | What happened | Badge |
|---|---|---|
| `churnRateMonthly` = NaN or missing | Churn became 0. ARR at month 12 rose from 30,048,489 to 32,121,199, so the 31,200,000 objective looked met. Ending cash rose from 18.1M to 30.1M | 16/16 |
| paid `acv` = Infinity | Paid ACV became 0 | 16/16 |
| hub `shipMonth` = null | The hub shipped at month 0 | 16/16 |
| A hire with no `startMonth` | The hire did nothing and cost nothing | 16/16 |
| `openingArr` = "24000000" (text, as an input box returns) | Text was glued to numbers. ARR at month 12 showed 26,198,540,642,707,510,000 | 10/16 |

This is the kind of error the Assumptions panel in Step 2 would trigger with one empty box.

**Fix.** `runModel` now checks its inputs before copying them. Every numeric assumption and every initiative amount must be a finite number. If not, the run stops with a reason that names the input, for example `Invalid input: churnRateMonthly must be a number`. The page already shows engine errors in red in the header. `Engine.validateAssumptions` and `Engine.validateInitiatives` are exported so a later screen can check a field before running. Cost: none measurable (0.61 ms a run before and after).

### 2. Red badge on a cash-generating company (High)

Check C16 scans every number for NaN or infinity. It allowed "not burning" (infinite runway) in the monthly KPI series but not in the runway guardrail row, which holds the lowest runway of months 1 to 12. Any scenario that stops burning cash inside year one therefore showed **Integrity 15/16** with the reason `Not a finite number at .guardrails.items.runway.value`. The math was right and the best possible outcome was flagged as broken. 7 of the 89 comparison scenarios hit it.

**Fix.** "Not burning" is allowed in both runway figures and nowhere else. See also finding 11.

### 3. C5 could not fail on capacity (Medium)

C5 tested "opportunities worked do not exceed AE capacity" only when the engine's own stored `WorkShare` was below 1. If a future change dropped the capacity limit, `WorkShare` would stay at 1 and the test would be skipped. In other words, the check asked the suspect whether a crime had happened.

**Fix.** C5 recomputes capacity from ramped AEs and total opportunities created from the funnel, and applies the test whenever created exceeds capacity. It also ties stored capacity to ramped AEs times opportunities per AE.

### 4. Two cash floors (Medium, your decision)

`SPEC.md` defines the floor twice: `cashFloor` (section 1.11) and `guardrails.cashFloor` (section 1.15). The engine used the first for the month-by-month breach report and the 13-week view, and the second for the guardrail table. Changing one to 30,000,000 produced a guardrail that said "pass" beside a report listing 28 breach months, with a green badge.

**What I did.** C10 now fails, with a reason naming both inputs and both values, when they differ. It also ties the guardrail rows (low point, pass or fail) to the breach report. Nothing was removed, because either removal changes the spec.

**What you need to decide.** Keep one. My recommendation: keep `guardrails.cashFloor` (it belongs to the strategy, and CLAUDE.md wants a new strategy to be a new configuration object) and delete `cashFloor` from section 1.11. Until then the Assumptions panel in Step 2 should show one box that writes both.

### 5. The template "Ramp" input was dead (Medium)

Section 1.17 lists "Ramp 4 months" and "Ramp 2 months" as inputs of the hire templates. The engine stored them and ignored them: every hire ramped on the company-wide `aeRampMonths` and `sdrRampMonths`. Changing the AE template's ramp from 4 to 8 months left NPV at 191,401.37.

**Fix.** A `headcount` effect accepts an optional `rampMonths`, and the two hire templates pass theirs through. With the defaults nothing changes (4 and 2 equal the company-wide values, and the section 4.4 reference values still match to the cent). With a ramp of 8 months the two-AE hire is now worth 66,368.62 and pays back in month 33. Planned hires still use the company-wide ramp. This needed one sentence in `SPEC.md` 2.2 and one field in the 2.16 table.

### 6. The tests missed most bugs outside the worked examples (Medium)

I injected 108 single bugs. **68 survived (63%).** Whole areas had no test at all:

- every driver except win rate, the "add" mode, clamping, and lead-month versus close-month timing,
- the capex effect, and vendor costs on any line except S&M,
- tax inside the model (only the stand-alone tax function was tested, and the baseline never pays tax),
- the trade show, AE and partner templates (the tests used hand-built effect lists, so a wrong template passed),
- the 13-week view from any month other than January 2027, including February 2028 with 29 days,
- any guardrail failing (four of them could have been hard-wired to "pass"),
- payback rules other than "paid back",
- the end of debt amortization, and depreciation rolling off,
- most sub-tests inside the integrity checks (each check had one tamper test, so deleting other parts went unnoticed).

**Fix.** 17 new tests, T70 to T86, listed in `SPEC.md` section 4.7. After them: **115 of 118 injected bugs are caught** (10 more were added to cover the new code). The 3 survivors cannot change any output: two are safeguards that back each other up (the amortization window and the cap on principal), and one only matters if two months end with exactly the same cash.

Expected values in the new tests are either worked by hand in a comment beside them or marked "reference", meaning they came from the second model, not from the engine being tested.

Run against the engine as it was before this audit, the new tests fail T70 to T74, T85 and T13, one per finding above. T75 to T84 and T86 pass on the old engine: those areas were correct, just untested.

### 7. Stored totals unchecked, and a circular check (Medium)

- `runChecks` rightly recomputes totals from their lines, but it never compared the **stored** totals with them. Total assets, total liabilities, net change in cash, net burn, free cash flow, EBIT, pre-tax income and the weekly 13-week categories could all be wrong with a green badge. Net burn feeds runway and burn multiple. Free cash flow feeds every NPV.
- C11 checked receivables against `AR = prior AR + billings - collections`. Collections are defined by that same line, so it could only catch tampering. A wrong payment lag (for example, the half-month of a 45-day term taken from the wrong month) was invisible to it.

**Fix.** C1, C2, C13 and C15 tie the stored totals to their parts. C11 rebuilds receivables and payables from the billings and vendor-spend history and the payment terms. T85 shows 62 separate ways a result can be damaged and the check that catches each.

### 8 to 13. Low severity

- **8.** A sales cycle of 2.5 months read past the end of an array and a cycle of -1 read the future. Both filled the model with NaN and failed 10 or 11 checks with unreadable reasons. Negative DSO or DPO did the same. Now a clear input error (covered by finding 1).
- **9.** `cash13Week` with a start month of 0 or 37 returned NaN or an empty forecast. Now an error naming the valid range.
- **10.** The badge read "Integrity N/N" using the number of checks returned. If a check were dropped it would show a green 15/15. A missing check now counts as failed.
- **11.** C16 accepted any infinity under `kpis.runway`, including minus infinity. Only "not burning" is allowed now.
- **12.** `tests/run.js` printed "ALL TESTS PASSED" if the suite registered no tests. It now fails in that case.
- **13.** For an initiative that never goes negative, the spec says payback is "the first month with any effect". The engine uses the first month the measured flow moves, so a churn improvement from month 13 shows earnings payback in month 13 and cash payback in month 14 (the larger invoices are collected a month later). That is sensible. I wrote the reading into section 2.17 and tested it.

## What was checked and found correct

- **Typed-in numbers: none.** Every number the page shows comes from an engine output. The literals inside the engine are constants from the spec (12-month windows, the 1/24 mid-month revenue rule, a 30-day month for DSO and DPO, 91 days, payroll on the 15th and the last day). `tests/run.js` contains "Integrity 16/16", which is an expected value in a test and belongs there.
- **Formulas:** all of sections 2.2 to 2.18, and all 16 checks, match the spec.
- **Timing:** hire ramps (0% in the hire month), sales cycle lag and the opening pipeline, milestone effects (0 in the ship month), annual invoices renewing 12 months later, deferred revenue earned mid-month to mid-month, DSO and DPO fractions, depreciation starting the month after purchase, interest on opening balances, leap-year February.
- **Signs:** costs positive and subtracted, net burn positive when cash falls, CFI and CFF negative on outflows, deltas as scenario minus baseline.
- **Edge cases:** zero program spend, zero AEs, zero SDRs, a 10,000,000 and a 100,000,000 spend, negative cash (interest income stops, runway shows 0, the balance sheet still balances), milestones shipping in month 1, 35, 36, 37 and 40, a ramp of 0 months.

## Left as is

These are behavior you should know about. None is a math error.

| Item | What happens | Why it is left |
|---|---|---|
| DSO or DPO above 60 days | Month-1 collections or vendor payments go negative and C11 turns red | Correct: opening receivables of 1.5 months of billings cannot belong to a 90-day DSO. The Assumptions panel should say "also change opening receivables" |
| Very high churn | Annual invoices go negative and C9 turns red | By design: the model has no refunds (CFO question 10 in the spec) |
| Negative headcount (layoffs) | Capacity ramps down over the ramp period instead of at once, and can go below zero (C5 catches that) | Not in the spec. Flag if you want layoffs as an initiative |
| Costs after month 36 | Ignored. A 3-month campaign starting in month 35 counts 60,000 of its 90,000 | The model ends at month 36 |
| A bill expensed in month 36 | Counts in the investment (as expensed) but not in net flow (it is paid in month 37) | Follows sections 2.8 and 2.17. T77 shows it: 129,000 invested, 120,000 paid |
| An initiative with no investment | ROI and new ARR per dollar are empty | Dividing by zero has no answer. The Step 3 screen must show "n/a" |
| A hire whose end month is before its start | Does nothing, silently | Harmless |
| Horizon under 12 months | Objective and guardrails are measured at the last month. A 13-week view near the end of the model is shorter than 13 weeks | Now stated in section 2.14 |
| Checks C3, C8, and the roll-forward parts of C4, C14 and C16 | They compare a number with the formula that produced it, so they catch tampering but not a wrong formula | The spec lists them. The independent protection comes from C1, C2, C6, C9, C11 and C12 |

## Changes to `SPEC.md`

Small, and none changes a number:

- 2.2 and 2.16: optional `rampMonths` on a `headcount` effect (finding 5).
- 2.16 rule 5: inputs are checked and a bad one stops the run (finding 1).
- 2.14: valid start months for the 13-week view (finding 9).
- 2.17: what "any effect" means in the payback rule (finding 13).
- Section 3: the check table now states the extra ties in C1, C2, C5, C10, C11, C13, C15 and C16.
- New section 4.7: the 17 audit tests.

## Test results

```
node tests/run.js

Baseline Integrity 16/16
72 of 72 tests passed, 4634 assertions.
PASS T00 Reference tables in index.html match SPEC.md
PASS PAGE Header badge "Integrity 16/16", 76 table rows rendered
PASS PAGE No script errors
ALL TESTS PASSED
```
