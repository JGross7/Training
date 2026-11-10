# Capital Allocation Copilot

Claude Code reads this file automatically at the start of every session. It is the project brief. The detailed math lives in `SPEC.md` (written in Phase 0). Work phase by phase from `PLAYBOOK.md`.

## What we are building
A single-file web app (`index.html`) for a **fictional SaaS company** that turns its financial model into **capital allocation decisions**:

1. **Where we stand:** a monthly 3-statement model (P&L, balance sheet, cash flow), a 13-week cash forecast with a minimum-cash line, and an ARR rollforward.
2. **Initiative evaluator:** someone proposes spending money (a trade show, more sales reps, pulling a product milestone forward). The app shows what it costs, when the cost hits, what it should return and when, how uncertain that is, and what it does to cash.
3. **Strategy alignment:** the company's strategy is encoded as one objective plus guardrails. Every initiative is scored against it, and a portfolio view picks the best set of initiatives for a given budget.
4. **CFO briefing:** a plain-English recommendation that rewrites itself when the numbers change.
5. **Learning loop:** after an initiative runs, actuals replace assumptions so the next estimate improves.

The point of the app is the *decision*, not the dashboard.

## The fictional company (baseline, all numbers made up)
- **Name:** Tallwater Software, Inc. B2B SaaS that helps mid-market field-service companies schedule crews and bill customers. US-based, reports in USD.
- **Stage:** Series B. Model starts **January 2027**, horizon **36 months**.
- **ARR:** $24.0M opening. About 600 customers, average contract value (ACV) about $40K.
- **Retention:** gross revenue retention 90%, net revenue retention 110%.
- **Gross margin:** 76% (hosting, third-party software, customer support in COGS).
- **Headcount:** about 140 across R&D, Sales, Marketing, Customer Success, G&A, with fully loaded cost per role.
- **Cash:** $38M opening. Monthly burn about $1.1M before initiatives.
- **Debt:** $10M venture debt with a **minimum cash covenant of $12M**. Internal **minimum cash floor of $15M**.
- **Go-to-market channels:** Outbound (SDR to AE), Paid digital, Events and trade shows, Partners and referrals. Each has its own costs, funnel conversion rates, sales cycle and win rate.
- **Product roadmap:** a few planned milestones with dates, owners and expected impact (see Phase 4). Example: *Enterprise integrations hub* planned for Q4 2027; *Hosting cost optimization* planned for Q3 2027.

Phase 0 turns this into a complete, internally consistent set of assumptions in `SPEC.md`. If numbers here and in `SPEC.md` disagree, `SPEC.md` wins.

## Strategy (current focus)
**Objective:** grow ARR from $24.0M to at least **$31.2M in 12 months (30% growth)**.
**Guardrails (must not break):**
- Cash never drops below the $15M floor (and never near the $12M covenant).
- Runway stays at or above 18 months.
- Blended CAC payback at or below 24 months.
- Burn multiple (net burn / net new ARR) at or below 2.0x.
- Gross margin at or above 72%.

Other strategies come later (see Backlog in `PLAYBOOK.md`). Build the strategy layer so a new strategy is a new configuration object, not a rewrite.

## Initiative types
**A. Sales and marketing investment** (first): trade show or event, hiring SDRs or AEs (with ramp time), paid campaign, partner program. Cost goes in, then flows through the channel funnel: spend -> leads -> qualified leads -> opportunities -> closed deals -> new ARR, timed by the sales cycle, then retained or expanded over time.

**B. Product development acceleration** (second): pulling a roadmap milestone forward by adding engineers, contractors or tooling. Two kinds of payoff:
- **Revenue:** the feature lifts win rates, ACV, expansion or retention once it ships. Shipping earlier means the uplift starts earlier.
- **COGS reduction:** an efficiency project (for example hosting optimization) lowers cost per customer once it ships. Shipping earlier means months of savings sooner.
Both carry delivery risk: the pulled-in date can still slip. Model the cost of acceleration, the months gained, the uplift or savings, and the probability of hitting the new date.

Every initiative is modeled as a **change against the baseline** (incremental), month by month.

## Non-negotiable engineering rules
1. **One file:** everything in `index.html`. No build step, no backend. External scripts only from a CDN with an exact pinned version. Plain JavaScript is fine.
2. **Engine and UI are separate.** All math lives in pure functions in one `<script id="engine">` block. The UI only reads engine outputs and renders them. **Never type a computed number into the UI or the narrative.**
3. **Integrity checks run live.** The engine runs the checks in `SPEC.md` on every recalculation, and the header shows a badge (for example "Integrity 10/10"). A failing check shows in red with the reason.
4. **Tests:** there is a test runner (open `index.html?test=1`, or run the headless script `tests/run.js` with Node and Playwright). Run the tests after every change and before saying a phase is done. Never weaken or delete a test to make it pass; fix the math.
5. **Assumptions are visible.** Every input lives in one assumptions object, editable in an Assumptions panel, and any number that is a guess (not from "actuals") is labeled as an assumption.
6. **Reproducible randomness.** Simulations use a seeded random number generator so the same inputs give the same results.
7. **Fictional only.** Never use real company data. Label the app "Fictional company, for demonstration."
8. **Plain English.** UI text and briefings are short, plain and specific. Use dollars and months, not jargon. No em dashes in any text.
9. **Commit after each phase** with a clear message.

## Files
- `CLAUDE.md`: this brief.
- `PLAYBOOK.md`: phases, prompts and which model to use.
- `SPEC.md`: the math, assumptions and integrity checks (Phase 0 output, source of truth).
- `index.html`: the app.
- `tests/run.js`: headless test runner.
