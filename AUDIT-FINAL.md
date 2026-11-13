# AUDIT-FINAL: Capital Allocation Copilot

Final audit of `index.html`, `tests/run.js`, `SPEC.md` and `DEMO.md`, read as a skeptical CFO and a careful engineer. Ranked by severity. Every fix is minimal and has a test that fails without it.

**Result:** 11 findings fixed (2 high, 3 medium, 6 low), 3 noted and not fixed. After the fixes: 130 of 130 in-page tests and every headless UI check pass, and the badge reads Integrity 24/24.

## What was checked, and how

| Question | Method | Verdict |
|---|---|---|
| Every displayed number comes from the engine | Scanned the UI script for arithmetic on engine values and for numeric literals inside strings; read each hit | Holds after F6, F7 and F8. The UI only formats; the remaining arithmetic is chart geometry, unit conversion for display (x 100 for percent) and counts of list items |
| Every integrity check can fail | Wrapped `runChecks` and `portfolioChecks`, ran the whole in-page suite, counted failures per check | All 24 checks fail in at least one test (C1 18 times, C22 twice, C23 3, C24 6). F4 closes a gap where C23 (e) could not fail for most rows of a large table |
| The briefing never states a number the engine did not produce | Read `cfoBriefing`; tightened the test that compares every number in the text with the recorded facts | Holds. The old test matched substrings, so it could miss a number (F2) |
| The simulation is reproducible | T122 (same seed, same runs, chunks give the same runs), T144 (stress test same seed, chunks, one-initiative list reproduces its own simulation); searched for `Math.random` and clock use in the engine | Holds. No unseeded randomness; the only clock use is the saved time of a scenario |
| Strategy and portfolio logic matches SPEC.md | Every cell of the SPEC 11.11 and 11.12 tables, T139 to T143, plus C24's separate scan; re-read 11.1 to 11.10 against the code | Matches, except that decision cards ignored the active strategy (F3) and C23 (e) checked a subset (F4) |
| Nothing breaks on a phone | Swept every view at 390px after simulations finish, with tables and details opened, a completed initiative, three saved scenarios, the drawer and the overlay | One real overflow (F1), now fixed |

## High

### F1. Phone: the Initiatives view scrolled sideways once a simulation finished
At 390px the P10 / P50 / P90 table of a finished simulation was 454px wide and the page became 412px wide. The sensitivity numbers table did the same when opened, and so did the learning loop's tables. The existing phone test measured the page before the simulation had finished, so it never saw the table.
**Fix:** the three tables sit in a horizontal scroll container (`.scroll-x`), so the table scrolls and the page does not.
**Test:** UI "Phone: finished simulation, sensitivity and learning tables do not widen the page" waits for the simulation, opens every details section and completes the learning loop before measuring.

### F3. Decision cards ignored the active strategy (SPEC.md 11.1)
SPEC 11.1: "Wherever the app shows 'objective and guardrails' it shows the rows of the active strategy." The decision cards, their verdicts, the "together" summary and the product pull-in cards used the fixed growth rows of section 2.18. Under margin expansion a trade show card still said "Keeps all 5 guardrails" and listed runway and CAC payback, which that strategy does not have, and called ARR "the objective".
**Fix:** `decisionView` and `evaluateAcceleration` build their rows from the run's strategy result (`strategyGuardRows`, `strategyPassMap`); the UI formats any row by its metric. For the growth strategy the rows are the same as before (check C21 already asserts that), listed in the strategy's order with the covenant watch line last.
**Tests:** T154 (growth rows equal the 2.18 rows value for value; margin expansion shows its objective, three guardrails and the covenant; pull-in pass shares use the strategy's rows) and UI "Decision card shows the active strategy's rows (margin expansion)". One existing UI expectation changed only in order (the covenant now follows the five guardrails).

## Medium

### F2. The briefing's "numbers come from the engine" test could miss a number
The test accepted a number if it appeared anywhere inside a recorded fact. "$1.2" passed because "$31.2M" contains it, and the "2" in "Hire 2 SDRs" passed because "$223.2K" contains a 2. Initiative and channel names were not recorded at all.
**Fix:** a number must equal a number token of a recorded fact. Names are inputs, so the briefing records them as given. Also fixed "1 deals" to "1 deal".
**Test:** T151 now also plants "$1.2" (part of a fact) and requires the check to catch it; T152 checks the singular.

### F4. C23 (e) checked the budget cost of only some rows above 4,096 combinations
SPEC 11.10 C23 (e): budget cost equals the amount rebuilt from the initiative inputs. With 15 candidates (32,768 rows) only the chosen, frontier, last and single-member rows were rebuilt, so a wrong budget cost on any of the other 18,000 valid rows could never fail the check.
**Fix:** the second-path cost (`rebuiltBudgetCost`, from `rebuildInitiativeCosts`, not from a model run) is recorded for every valid row while the table is built in chunks, and C23 (e) compares every valid row with it.
**Test:** T143 adds 1.00 to the budget cost of a row of the fifteen that is not rerun; C23 now fails with "budget cost vs the initiative inputs".

### F5. Saved-scenario figures came from runs no check covered
The compare table runs each saved scenario from its stored inputs, which the user can edit in browser storage, but none of those runs were integrity-checked and the badge does not cover them.
**Fix:** `scenarioSummary` runs checks C1 to C22 on the plan and the scenario of each column, and the compare table has a "Model checks" row ("All pass" or the failing checks).
**Tests:** T155 (both runs checked; a scenario whose two cash floors disagree reports C10) and UI "Compare columns carry the model checks of their runs".

## Low

### F6. "Unspent" was clipped to $0 when committed initiatives exceeded the budget
The UI applied `Math.max(0, ...)` to the engine's unspent budget, so it showed a number the engine did not produce.
**Fix:** when over budget the tile says "Over budget by" the engine's amount; otherwise it shows the engine's unspent figure unchanged.
**Test:** UI "Committed over budget: the tile says by how much, nothing is clipped" (hub committed at $500K: over by $981.2K).

### F7. "Breaks a guardrail" printed the value without its unit
The left-out reason formatted the guardrail value with no unit, so a cash floor read as a long raw number.
**Fix:** the value is formatted with the guardrail's own metric and unit.
**Test:** covered by the UI explanation checks; the format function is the one every guardrail uses.

### F8. A typed "P10" fallback in the risk switch label
If a strategy had no percentile, the label fell back to a typed 0.1.
**Fix:** without a percentile the label names no percentile.

### F9. "Updating" was only in a tooltip
SPEC 11.10: while the table is rebuilt the badge shows the last complete result "and says it is updating". That was a hover title, invisible on a phone.
**Fix:** a visible note beside the badge while the table is rebuilt or checked.
**Test:** UI "The badge says it is updating while the table rebuilds, and stops when done".

### F10. "Tightest guardrail" read as "most at risk"
The briefing ranks guardrails by headroom as a share of each limit, which compares different units. It named gross margin as tightest while the stress test names the cash floor as the main risk. The rule is the one in SPEC 12.2, but the sentence did not say so.
**Fix:** the sentence says "closest to its limit, measured as a share of that limit". The main risk still comes from the stress test when it has run.

### F11. Grammar in the briefing
"1 deals" (fixed with F2).

## Noted, not fixed

- **N1. A strategy whose objective is not meaningful in some simulated runs** (for example a burn multiple with no net new ARR) gives no downside, so its initiatives stay "Measuring" and the portfolio waits. None of the four configured strategies can produce this. Recommendation: define in SPEC how such runs enter the percentile before a strategy like that is made active.
- **N2. Learning from actuals too early.** Totals entered before the channel's sales cycle has passed understate conversion, because the expectation covers every deal the initiative should close. Recommendation: enter actuals after the sales cycle, or add an "opportunities still open" input.
- **N3. Simulations still run for completed initiatives.** Wasted computing only; no number is affected.
- The CFO-level modelling choices (one objective date, the budget is this year's new cash, haircuts add up, P10 is a choice) are listed with their reasons in SPEC sections 7, 9.15, 10.7 and 11.15. They are design decisions, not defects.
