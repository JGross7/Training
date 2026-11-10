# Playbook: phases, prompts and models

## How to use this
1. Make a new folder, put `CLAUDE.md` and this `PLAYBOOK.md` in it, and open it in Claude Code. Run `git init` so every phase can be committed.
2. Do **one phase per conversation**. Start each phase with a fresh conversation (`/clear`) so you don't pay to re-read old work.
3. **Switch models with `/model`** before pasting each prompt. The model and effort level for each phase are listed. If your Claude Code version shows an effort setting, use the level suggested; otherwise the default is fine.
4. Paste the prompt exactly, wait for it to finish, open `index.html` in your browser and look at it, then commit.
5. If something looks wrong, describe it in plain words in the same conversation ("the cash chart drops below zero in month 14, that can't be right") before moving on.

**Model rule of thumb:** Opus 5.5 builds. Fable 5.2 designs the math that must be right and audits it. Fable costs about twice as much per token and thinks longer, so it is used for 5 of the 13 steps below.

| Step | Model | Effort | What happens |
|---|---|---|---|
| 0 | Fable 5.2 | high | Write SPEC.md: assumptions, formulas, integrity checks |
| 1 | Opus 5.5 | high | Build the engine and the tests |
| 1b | Fable 5.2 | high | Audit the engine |
| 2 | Opus 5.5 | medium | "Where we stand" screens |
| 3 | Opus 5.5 | high | Sales and marketing initiative evaluator |
| 4a | Fable 5.2 | high | Design the product-acceleration math |
| 4b | Opus 5.5 | high | Build product-acceleration initiatives |
| 5 | Opus 5.5 | high | Simulation and sensitivity |
| 5b | Opus 5.5 | medium | Fix anything step 5's tests flag |
| 6a | Fable 5.2 | high | Design strategy scoring and portfolio selection |
| 6b | Opus 5.5 | high | Build strategy and portfolio screens |
| 7 | Opus 5.5 | medium | CFO briefing, learning loop, polish, demo script |
| 8 | Fable 5.2 | high | Final audit before anyone sees it |

---

## Step 0: Blueprint (Fable 5.2, high)
```
Read CLAUDE.md. Do not write any app code yet.

Write SPEC.md, the single source of truth for this project. It must include:

1. A complete, internally consistent assumptions set for Tallwater Software for a
   36-month monthly model starting January 2027: opening balance sheet that balances,
   headcount by department with fully loaded costs and planned hires, revenue built from
   an ARR rollforward (new, expansion, contraction, churn), COGS lines, operating expenses,
   working capital (DSO, DPO, deferred revenue from annual upfront billing for a stated
   share of customers), capex, venture debt with interest and the covenant, and tax kept
   simple. For each go-to-market channel: monthly program spend, cost per lead, conversion
   rates at each funnel stage, sales cycle in months, win rate, ACV, and ramp time for new
   reps. For the product roadmap: 3 milestones with planned date, team size, and the
   expected effect once shipped (win-rate lift, ACV lift, churn reduction, or COGS reduction).

2. Every formula, written in plain math with named variables: monthly P&L, balance sheet,
   cash flow (indirect method), 13-week cash forecast derived from the monthly model, ARR
   rollforward, funnel math with timing by sales cycle, CAC and CAC payback, LTV, burn
   multiple, runway, and how an initiative is applied as a month-by-month change against
   the baseline. Include how returns are measured: incremental ARR, revenue, gross profit,
   EBITDA and cash by month, payback month, NPV at a stated discount rate, ROI, and the
   cash low point.

3. A numbered list of integrity checks the engine must pass on every recalculation,
   including at least: balance sheet balances every month; cash flow ending cash equals
   balance sheet cash; net income rolls into retained earnings; ARR rollforward ties;
   funnel stages never increase from one stage to the next and are never negative;
   channel spend equals program spend in the P&L; an initiative with zero cost and zero
   effect changes nothing; revenue recognized equals what the ARR implies; deferred revenue
   rolls forward; covenant and cash floor are reported.

4. A test plan: specific test cases with expected results that a developer can turn into
   automated tests, including hand-calculated examples for a trade show and for hiring
   two account executives.

5. Units, sign conventions and rounding rules, and a short glossary in plain English.

Check your own work: recompute the opening balance sheet and one full month by hand in
the document and confirm every check passes. Flag any assumption that a real CFO would
question and say why you chose it.
```

## Step 1: Engine and tests (Opus 5.5, high)
```
Read CLAUDE.md and SPEC.md. Build the calculation engine only, with a minimal page
that shows the integrity badge and a raw table of outputs. No styling yet.

- Create index.html with a <script id="engine"> block of pure functions that implement
  SPEC.md exactly: baseline 36-month model, 13-week cash, ARR rollforward, funnel, and a
  function that applies a list of initiatives as changes against the baseline.
- Implement every integrity check in SPEC.md and show the badge in the header.
- Create tests/run.js that loads index.html headlessly and runs every test case in the
  SPEC.md test plan, plus the integrity checks. Add index.html?test=1 that runs the same
  tests in the browser and prints results.
- Run the tests and fix the math until all pass. Do not change SPEC.md or weaken tests
  to make them pass; if you believe SPEC.md is wrong, stop and tell me what and why.
- Commit when everything passes and summarize what you built and the test results.
```

## Step 1b: Engine audit (Fable 5.2, high)
```
Read CLAUDE.md and SPEC.md, then audit the engine in index.html and tests/run.js.
Look for: any number that is typed in instead of calculated, formulas that differ from
SPEC.md, timing errors (off-by-one months, sales cycle lag, annual billing and deferred
revenue), sign errors, checks that can never fail, tests that would pass even if the
math were wrong, and edge cases (zero spend, very large spend, negative cash, a milestone
that ships in month 1 or after month 36). Write findings to AUDIT-1.md ranked by severity,
fix the real problems, add tests that would have caught each one, run all tests, and
commit. Keep fixes minimal and do not restyle anything.
```

## Step 2: Where we stand (Opus 5.5, medium)
```
Read CLAUDE.md. Build the "Where we stand" view on top of the existing engine. Do not
change engine math.
- KPI cards: ARR, revenue growth, gross margin, EBITDA margin, cash, runway, CAC payback,
  burn multiple, each with change vs plan and a small trend line.
- ARR bridge (opening ARR, new, expansion, contraction, churn, closing ARR).
- 13-week cash chart with the $15M floor and the $12M covenant drawn as lines.
- Tabs or toggles for P&L, balance sheet and cash flow tables by month, with a
  month/quarter/year switch.
- An Assumptions panel where every input can be edited, with a Reset button.
Clean, professional, readable on a laptop and a phone. Run the tests and commit.
```

## Step 3: Sales and marketing initiatives (Opus 5.5, high)
```
Read CLAUDE.md and SPEC.md. Build the Initiative Evaluator for sales and marketing
initiatives. Do not change baseline math; initiatives must use the engine's
apply-initiatives function.
- An "Add initiative" form with templates: Trade show or event, Hire SDRs, Hire AEs
  (with ramp), Paid campaign, Partner program. Each template asks only for what matters
  (for a trade show: booth and sponsorship cost, travel, staff days and their loaded
  cost, expected badge scans or leads, and which channel funnel rates to use) and fills
  sensible defaults from SPEC.md.
- A decision card for each initiative: total cost and when it is spent; expected leads,
  opportunities, deals and new ARR by month; revenue, gross profit, EBITDA and cash
  impact by month; payback month; NPV; ROI; new ARR per $1 spent; effect on CAC payback,
  burn multiple, runway and the cash low point; and which strategy guardrails it passes
  or breaks.
- A clear "where each number comes from" toggle that shows the drivers behind every
  output (funnel rates, sales cycle, ACV, retention).
- Add tests for the trade show and two-AE examples in SPEC.md. Run all tests and commit.
```

## Step 4a: Product acceleration design (Fable 5.2, high)
```
Read CLAUDE.md and SPEC.md. Add a new section to SPEC.md (do not write app code) that
defines product-development acceleration initiatives: pulling a roadmap milestone
forward by adding engineers, contractors or tooling.

Define precisely:
- The cost of acceleration by month (added headcount with ramp, contractors, tooling,
  extra cloud), including whether added people stay after launch.
- Months gained, and the probability distribution of the actual ship date (pulled-in
  dates can still slip; include a simple, explainable slip model).
- Revenue effects once shipped: win-rate lift, ACV lift, expansion lift, churn reduction,
  each with a ramp-up curve, flowing through the existing funnel and ARR rollforward.
- COGS effects once shipped (for example hosting cost per customer falling by X%), with
  a ramp.
- How to show the value of acceleration as the difference between "ship on the planned
  date" and "ship on the pulled-in date", both against the baseline.
- New integrity checks and hand-calculated test cases: one revenue milestone (Enterprise
  integrations hub, pulled in 2 quarters) and one COGS milestone (Hosting cost
  optimization, pulled in 1 quarter).
Check your own math and flag weak assumptions.
```

## Step 4b: Product acceleration build (Opus 5.5, high)
```
Read CLAUDE.md and the product-acceleration section of SPEC.md. Implement it in the
engine and add two initiative templates: "Pull in a revenue milestone" and "Pull in a
cost-saving milestone". Their decision cards show: added cost by month, months gained,
probability of hitting the new date, revenue or COGS benefit by month, payback, NPV,
the gross margin effect, and a side-by-side of planned date vs pulled-in date. Add the
SPEC.md test cases, run all tests and commit.
```

## Step 5: Simulation and sensitivity (Opus 5.5, high)
```
Read CLAUDE.md and SPEC.md. Add uncertainty to the Initiative Evaluator:
- A seeded simulation (1,000 runs by default) that varies the key drivers within ranges
  defined in the assumptions (conversion rates, win rate, ACV, sales cycle, ship-date
  slip, uplift size). Show P10 / P50 / P90 for new ARR, payback month and cash low point,
  plus the probability of paying back within 24 months and of breaking the cash floor.
- A sensitivity chart that shows which drivers move NPV the most.
- A scenario cockpit with sliders for the most important drivers that recalculates
  everything live.
Tests: same seed gives the same results; P50 is close to the deterministic case; widening
a range never narrows the P10 to P90 spread. Run all tests and commit.
```

## Step 6a: Strategy and portfolio design (Fable 5.2, high)
```
Read CLAUDE.md and SPEC.md. Add a section to SPEC.md (no app code) that defines:
- A strategy as a configuration object: one objective plus guardrails. Write the current
  one (grow ARR 30% in 12 months with the guardrails in CLAUDE.md) and stub three for
  later: margin expansion, cash preservation and runway, efficient growth (Rule of 40).
- How each initiative is scored against the objective (contribution to closing the gap
  to the target, per dollar and risk-adjusted) and how guardrails are checked on the
  combined plan, not just one initiative at a time.
- Portfolio selection: given a budget and a list of initiatives, choose the set that best
  meets the objective without breaking any guardrail. Initiatives can interact (two
  campaigns in the same channel share leads; hiring AEs and running a trade show both
  depend on rep capacity). Choose a method that is exact for up to about 15 initiatives
  and explainable to a CFO.
- Test cases with expected answers. Check your own work.
```

## Step 6b: Strategy and portfolio build (Opus 5.5, high)
```
Read CLAUDE.md and the strategy section of SPEC.md. Build the Strategy view: the
objective and guardrails at the top with progress to target; a ranked list of
initiatives with score, cost, expected new ARR and guardrail status; a budget slider
that recalculates the best portfolio live; and a combined forecast showing baseline vs
baseline plus the chosen portfolio, with the gap to the $31.2M target. Make the strategy
configuration selectable so a later strategy can be added without changing code. Add
the SPEC.md test cases, run all tests and commit.
```

## Step 7: CFO briefing, learning loop and polish (Opus 5.5, medium)
```
Read CLAUDE.md. Add:
- A CFO briefing panel written from engine outputs only (no typed-in numbers): what
  happened, why, what to decide, and the recommended portfolio with the main risk. It
  rewrites itself when inputs change.
- A learning loop: for an initiative marked "completed", enter actual leads, deals and
  ARR; the app shows actual vs expected and updates that channel's conversion
  assumptions, with the change visible.
- Save, load and compare scenarios in the browser.
- Final design polish and a short "How to read this" overlay.
- DEMO.md: a 5-minute walkthrough script for showing this in an interview: start with
  the strategy, evaluate a trade show, pull in a product milestone, pick the portfolio,
  read the briefing.
Run all tests and commit.
```

## Step 8: Final audit (Fable 5.2, high)
```
Read CLAUDE.md and SPEC.md, then audit the whole app as a skeptical CFO and a careful
engineer. Confirm every displayed number comes from the engine, every integrity check
can actually fail, the briefing never states a number the engine didn't produce, the
simulation is reproducible, the strategy and portfolio logic matches SPEC.md, and
nothing breaks on a phone. Write AUDIT-FINAL.md ranked by severity, fix real problems
with minimal changes, add tests for each, run everything and commit.
```

---

## Backlog (later)
**Strategies:** margin expansion; cash preservation and runway; efficient growth (Rule of 40); new market or segment expansion.
**Initiatives:** pricing and packaging changes; hiring plans by department; cost-reduction programs; acquisitions (buy vs build); fundraising and debt options.
**Data:** import actuals from CSV (CRM export, accounting export) to replace the fictional company with a real one, kept local in the browser.

## Usage tips
- Fable steps are the expensive ones. Give Fable the whole task at once (these prompts already do) instead of chatting back and forth.
- If a step uses too much of your weekly usage, re-run it on Opus at a higher effort and then use Fable only for the audit steps (1b and 8).
- Keep `SPEC.md` as the source of truth. If you change your mind about the math, change `SPEC.md` first, then ask Opus to bring the code in line.
