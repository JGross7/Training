# Demo scripts: Capital Allocation Copilot

Two scripts: a 75-second screen recording for LinkedIn (the dashboard), and a 5-minute walkthrough for an interview (the Analyst view). Open `index.html` in a browser; no server is needed. The numbers below are what the app shows with the default assumptions; if you change anything first, the app's numbers win.

---

## LinkedIn video: "What is deciding with data worth?" (about 75 seconds)

**Set-up:** browser at 1366 x 800 or larger, page zoom 100%, the dashboard freshly loaded (it opens on 2027 with a $500K budget). Record the browser window only. Move the mouse slowly; every change animates.

**0:00 to 0:08. The hook.** Hover the title.
> "Eight teams want money. One budget. Do you trust your gut, or the data? Here is what the difference is worth, in dollars."

**0:08 to 0:20. 01 Where we stand.** Sweep left to right across the four cards.
> "A fictional SaaS company: ARR, cash, burn and margin, each against the plan and its limit. Every number comes from a three-statement model, and the green badge says all 24 integrity checks pass."

**0:20 to 0:35. 02 Same budget, two ways to spend it.** Point at the two columns, then the gold headline.
> "Gut feel funds the biggest promises first. The data runs every combination through the model and keeps the one with the most value that fits the budget and breaks no guardrail. At $500K, the data plan creates $29K more value and spends $60K less."

**0:35 to 0:50. Drag the budget slider to $600K.** Let the numbers settle.
> "Give gut feel more money and it hires two account executives because they promise the most ARR. The data plan says no: it keeps the partner program instead. $60K more value, $165K less spent this year, and 99 cents of value per dollar committed against 51."

**0:50 to 0:58. 03 Where the extra value comes from.** Point at the red and green bars.
> "Here is why: dropping the AEs costs $203K of value, adding the partner program brings $262K. Each bar is a full model run."

**0:58 to 1:08. Drag the budget to $1.5M, then back to $600K.**
> "With a big budget, gut feel even funds a hosting project that never pays back. The data plan leaves $682K unspent and still creates $408K more value."

**1:08 to 1:15. 04 CFO briefing.** Scroll down a little.
> "And the briefing writes itself from the model: what happened, why, what to decide. Change any slider and it rewrites. Deciding with data is not a feeling; it is a number."

**Optional extras** (if you want a longer cut): click **2029** to show the three-year view, move **Win rate** to +25% to show everything recalculating, or click **Analyst view** to show the full model behind it.

**Caption idea:** "Same budget. Gut feel vs data. The data plan created $60K more value and spent $165K less. Fictional company, real method: every combination run through a 3-statement model, 24 integrity checks on every recalculation."

---

## Interview walkthrough (5 minutes, Analyst view)

Open `index.html?mode=analyst`, or click **Analyst view** on the dashboard.

**Before you start:** open the page once, click **Reset** in Assumptions if you used it before, and close any saved-scenario experiments. Have the window at laptop width.

---

## 0:00 to 0:30. What this is

> "This is a capital allocation copilot for a fictional Series B SaaS company, Tallwater Software. It turns a 36-month, three-statement model into decisions: should we spend this money, and which set of proposals best serves the strategy?"

- Point at **Fictional company, for demonstration** in the header.
- Point at the green **Integrity 24/24** badge: "24 checks run on every recalculation: the balance sheet balances, cash ties, the ARR rollforward ties, and the chosen portfolio really is the best one. If any fails, it turns red and says why."
- Optional: click **How to read this** for a one-screen orientation, then press Escape.

## 0:30 to 1:15. Start with the strategy

Click the **Strategy** tab.

> "The strategy is data, not code: one objective and five guardrails."

- Objective: ARR of **$31.2M** by Dec 2027. The plan gets to **$30.0M**, so there is a **$1.2M gap**.
- Guardrails: cash floor $15M, runway at least 18 months, CAC payback at most 24 months, burn multiple at most 2.0x, gross margin at least 72%. The $12M covenant is a watch line.
- Open the **Strategy** dropdown: "Three more strategies are drafted, margin expansion, cash preservation, Rule of 40. Adding one is a new configuration object, no new code." Leave it on the growth strategy.
- If the ranked list is empty (you opened `?mode=analyst` directly), click **Load the example list**: eight proposals appear in the ranked list. Coming from the dashboard, they are already there. "Each is scored alone: how much of the gap it closes that we can count on, per dollar of this year's budget." The scores fill in over about ten seconds as each one's risk simulation finishes.

## 1:15 to 2:15. Evaluate a trade show

Click the **Initiatives** tab and scroll to the **Trade show** card.

> "Someone wants $60K for a booth and travel, plus 20 days of staff time."

- Total cost **$76.0K** (the $16.0K of staff time is counted in the return, not in cash).
- **NPV $202.2K**, cash payback in **month 14**.
- Pipeline: 200 badge scans become 2.5 deals in September 2027, which is why it moves December ARR.
- Scroll to **Uncertainty**: P10, P50 and P90 from 1,000 seeded runs, and the sensitivity chart: win rate moves NPV the most.
- Tick **Show where each number comes from** to show the funnel trace: leads, conversion rates, sales cycle and ACV behind every figure.

## 2:15 to 3:00. Pull in a product milestone

Scroll to the **Hub pull-in** card.

> "Engineering proposes contractors and tooling to ship the enterprise integrations hub six months early."

- It gains about **5 months** on average, with only a **50%** chance of hitting the new date.
- The side-by-side shows the planned date against the pulled-in date: more ARR, but the expected **NPV is about -$1.1M** and it never pays back within the model.
- Contrast with the **Hosting pull-in** card: a cost-saving milestone, 2.5 months gained, 67% chance, gross margin up about 0.23 points, and still a negative NPV at this cost.

> "Both are real options; the model just makes the trade-off explicit."

## 3:00 to 4:00. Pick the portfolio

Back to the **Strategy** tab, **Best plan for the budget**.

- At **$500K**: "We ran all 256 combinations; 248 keep every guardrail. The best one is the trade show, two SDRs, the paid social test and the partner program, for $483.2K."
- Point at **Interaction**: the four overlap for AE time in April 2027, so together they add less than the sum of their parts.
- Type **600000** in the budget box: the pick changes to the trade show, two AEs, paid search and the partner program. "SDRs drop out and AEs come in, because AEs add capacity and April is already full. A ranked list filled from the top would have missed that."
- Point at **Left out**: why each one is out, and what forcing it in would cost.
- Click **Run the stress test** (a few seconds): the plan keeps every guardrail in most runs; the main risk is named.
- Scroll to the **Combined forecast**: the plan against the plan plus the chosen set, with the remaining gap to $31.2M.

## 4:00 to 4:45. Read the briefing

Click the **Briefing** tab.

> "This is written from the engine's numbers only. Nothing in it is typed in, and a test checks that every number in the text is one the engine produced."

Read the four headings aloud and one sentence from each:
1. **What happened:** where ARR lands against the target, cash low point against the floor.
2. **Why:** the ARR bridge and the tightest guardrail.
3. **What to decide:** what to approve and for how much, and what the next dollar of budget buys.
4. **Recommended portfolio and main risk.**

Change the budget on the Strategy tab and come back: the briefing has rewritten itself.

## 4:45 to 5:00. Close with the learning loop

> "After the trade show runs, we close the loop."

- On the trade show card, tick **Mark as completed**, enter **160** leads, **1** deal, **48000** new ARR.
- The card shows actual against expected and proposes new events conversion rates and ACV, weighted by how much evidence the actuals carry. Click **Update the Events and trade shows assumptions**: the next estimate uses what we learned, and the Assumptions panel shows exactly which inputs moved.
- If there is time: **Briefing > Scenarios**, save this as "After the trade show" and tick **Compare** to set it beside the plan.

---

### If you are asked

- **"Where do the numbers come from?"** `SPEC.md` defines every formula and has hand-calculated tests; the engine in `index.html` implements it, and `node tests/run.js` checks it.
- **"How is the portfolio chosen?"** Every combination of up to 15 candidates is a real model run, so shared leads, AE capacity and milestone effects are all inside the answer. Ranking is fewest broken guardrails, then the smallest gap still open, then the lowest cost.
- **"What would a CFO question?"** `SPEC.md` lists the weak assumptions in sections 7, 9.15, 10.7 and 11.15, for example that the objective counts ARR on one date only.
