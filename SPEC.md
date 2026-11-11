# SPEC.md: Capital Allocation Copilot

Single source of truth for the math, the assumptions and the integrity checks. If this file and `CLAUDE.md` disagree, this file wins. If the code and this file disagree, the code is wrong.

Everything here describes **Tallwater Software, Inc., a fictional company. All numbers are made up for demonstration.**

Contents

0. Notation and how to read this document
1. Assumptions
2. Formulas
3. Integrity checks
4. Test plan
5. Units, sign conventions, rounding and glossary
6. Proof of work: opening balance sheet and January 2027 by hand
7. Assumptions a real CFO would question
8. Baseline reference tables
9. Product development acceleration

---

## 0. Notation and how to read this document

- **Months** are numbered `m = 1 … 36`. `m = 1` is January 2027 and `m = 36` is December 2029. `m = 0` is the opening position at December 31, 2026. Months before the model starts are `m ≤ 0` (December 2026 is `m = 0`, January 2026 is `m = −11`).
- `X_m` is the value of `X` in month `m`. For balances (ARR, cash, receivables) it is the value at the **end** of month `m`. For flows (revenue, spend, deals) it is the total **during** month `m`.
- `y(m) = floor((m − 1) / 12)` is the year index: 0 for 2027, 1 for 2028, 2 for 2029.
- `step(g, m) = (1 + g)^y(m)` is an annual step-up that takes effect each January.
- `ramp(k, R) = min(1, max(0, k / R))`. If `R = 0`, `ramp = 1` when `k ≥ 0`, else 0.
- `clamp(x, lo, hi) = min(hi, max(lo, x))`.
- Every input has a **key** in code font. These keys are the names used in the single assumptions object.
- Every input is tagged **Actual** (a fictional opening fact as of December 31, 2026) or **Assumption** (a forward-looking guess). The app must label assumptions as assumptions.
- "Baseline" means the model run with the assumptions and no initiatives. "Plan" means the baseline run with the default assumptions in this document. "Scenario" means a run with edited assumptions, initiatives, or both.
- Counts of leads, deals and customers are **expected values** and can be fractional (2.5 deals means "2 or 3 deals, 2.5 on average").

---

## 1. Assumptions

### 1.1 Model frame

| Key | Value | Type |
|---|---|---|
| `companyName` | Tallwater Software, Inc. (fictional) | Actual |
| `startMonth` | January 2027 | Actual |
| `horizonMonths` | 36 | Assumption |
| `currency` | USD | Actual |

### 1.2 ARR and customers

| Key | Value | Type | Note |
|---|---|---|---|
| `openingArr` | 24,000,000 | Actual | ARR at December 31, 2026 |
| `openingCustomers` | 600 | Actual | Average ARR per customer 40,000 |
| `churnRateMonthly` | 0.60% | Assumption | Share of beginning-of-month ARR (and of customers) lost each month |
| `contractionRateMonthly` | 0.27% | Assumption | Share of beginning-of-month ARR lost to downgrades |
| `expansionRateMonthly` | 1.67% | Assumption | Share of beginning-of-month ARR added by upsell and price |

Implied annual retention, compounding monthly:

- Gross revenue retention = `(1 − 0.0060 − 0.0027)^12 = 0.9913^12 = 90.0%`
- Net revenue retention = `(1 + 0.0167 − 0.0060 − 0.0027)^12 = 1.0080^12 = 110.0%`

### 1.3 Go-to-market channels

Funnel stages for every channel: **leads → qualified leads (MQLs) → opportunities → closed deals → new ARR**.

| Key (per channel) | Outbound (SDR to AE) | Paid digital | Events and trade shows | Partners and referrals | Type |
|---|---|---|---|---|---|
| Channel id | `outbound` | `paid` | `events` | `partners` | |
| `programSpendMonthly` (2027) | 28,000 | 60,000 | 28,000 | 24,000 | Assumption |
| `costPerLead` | none (see below) | 240 | 350 | 600 | Assumption |
| Leads per month at opening | 75 | 250 | 80 | 40 | Derived |
| `leadToMqlRate` | 20% | 20% | 25% | 45% | Assumption |
| `mqlToOppRate` | 30% | 15% | 20% | 25% | Assumption |
| Sourced opportunities per month at opening | 4.5 | 7.5 | 4.0 | 4.5 | Derived |
| AE self-sourced opportunities per month at opening | 9.0 | 0 | 0 | 0 | Derived |
| `winRate` | 24% | 18% | 25% | 30% | Assumption |
| `salesCycleMonths` | 4 | 2 | 5 | 3 | Assumption |
| `acv` | 45,000 | 30,000 | 52,000 | 38,000 | Assumption |
| `openingPipelineOppsPerMonth` | 13.5 | 7.5 | 4.0 | 4.5 | Actual |
| Deals per month at opening | 3.24 | 1.35 | 1.00 | 1.35 | Derived |
| New ARR per month at opening | 145,800 | 40,500 | 52,000 | 51,300 | Derived |

Totals at opening: 6.94 deals and 289,600 of new ARR per month, blended ACV about 41,700.

Notes:

- **Outbound has no cost per lead input.** Outbound leads come from SDR capacity (ramped SDRs times leads per SDR), not from program dollars. Outbound program spend (28,000 a month) pays for data and outreach tools and does not buy leads. The app shows a derived outbound cost per lead (program spend divided by leads, 373.33 at opening).
- `openingPipelineOppsPerMonth` is the number of opportunities created and worked in each month before the model starts. It feeds the deals that close in the first months of 2027.
- Baseline program spend steps up each January by `programSpendGrowthAnnual` (section 1.8).
- Ramp time for new reps applies to all channels through sales capacity (section 1.4).

### 1.4 Sales capacity

| Key | Value | Type | Meaning |
|---|---|---|---|
| `leadsPerSdrPerMonth` | 25 | Assumption | Outbound leads (prospects who respond) per fully ramped SDR |
| `selfSourcedOppsPerAePerMonth` | 1.5 | Assumption | Outbound opportunities a fully ramped AE creates from own prospecting |
| `oppCapacityPerAePerMonth` | 7 | Assumption | New opportunities a fully ramped AE can work in a month |
| `aeRampMonths` | 4 | Assumption | A new AE is at 0% in the hire month, then 25%, 50%, 75%, 100% |
| `sdrRampMonths` | 2 | Assumption | A new SDR is at 0% in the hire month, then 50%, 100% |
| `commissionRate` | 10% | Assumption | Commission on new ARR, expensed and paid in the month the deal closes |

At opening: 6 AEs give capacity for 42 new opportunities a month. The baseline creates 29.5 (13.5 + 7.5 + 4.0 + 4.5), so utilization is 70.2%.

### 1.5 Headcount at opening and fully loaded cost

Fully loaded cost is annual cash cost per person: salary, bonus, payroll taxes, benefits and equipment. Commissions are separate. Stock compensation is ignored.

| Role id | Department | P&L line | Opening count | Loaded cost per year | Type |
|---|---|---|---|---|---|
| `engineer` | R&D | R&D | 41 | 215,000 | Actual |
| `product_design` | R&D | R&D | 9 | 200,000 | Actual |
| `rd_leader` | R&D | R&D | 4 | 300,000 | Actual |
| `ae` | Sales | S&M | 6 | 150,000 | Actual |
| `sdr` | Sales | S&M | 3 | 95,000 | Actual |
| `sales_engineer` | Sales | S&M | 3 | 190,000 | Actual |
| `sales_leader_ops` | Sales | S&M | 4 | 230,000 | Actual |
| `marketer` | Marketing | S&M | 11 | 165,000 | Actual |
| `support_agent` | Customer Success | COGS | 16 | 90,000 | Actual |
| `onboarding_specialist` | Customer Success | COGS | 7 | 115,000 | Actual |
| `csm` | Customer Success | S&M | 15 | 140,000 | Actual |
| `ga_staff` | G&A | G&A | 17 | 165,000 | Actual |
| `executive` | G&A | G&A | 4 | 380,000 | Actual |
| **Total** | | | **140** | 24,975,000 total | |

Opening monthly payroll by P&L line (annual cost divided by 12):

| P&L line | Annual | Monthly |
|---|---|---|
| COGS (support and onboarding) | 2,245,000 | 187,083.33 |
| R&D | 11,815,000 | 984,583.33 |
| S&M (sales, marketing, CSMs) | 6,590,000 | 549,166.67 |
| G&A | 4,325,000 | 360,416.67 |
| **Total** | **24,975,000** | **2,081,250.00** |

### 1.6 Planned hires (in the baseline)

One person per row. A hire costs a full month of pay from the start month. Type: Assumption.

| Start month | m | Role |
|---|---|---|
| Mar 2027 | 3 | `support_agent` |
| Apr 2027 | 4 | `engineer` |
| Jun 2027 | 6 | `onboarding_specialist` |
| Jul 2027 | 7 | `sdr` |
| Aug 2027 | 8 | `csm` |
| Sep 2027 | 9 | `support_agent` |
| Oct 2027 | 10 | `engineer` |
| Nov 2027 | 11 | `ga_staff` |
| Jan 2028 | 13 | `ae` |
| Jan 2028 | 13 | `engineer` |
| Feb 2028 | 14 | `support_agent` |
| Mar 2028 | 15 | `engineer` |
| Apr 2028 | 16 | `marketer` |
| May 2028 | 17 | `csm` |
| Jun 2028 | 18 | `support_agent` |
| Jul 2028 | 19 | `onboarding_specialist` |
| Aug 2028 | 20 | `engineer` |
| Sep 2028 | 21 | `product_design` |
| Oct 2028 | 22 | `support_agent` |
| Nov 2028 | 23 | `ga_staff` |
| Jan 2029 | 25 | `ae` |
| Jan 2029 | 25 | `engineer` |
| Feb 2029 | 26 | `support_agent` |
| Mar 2029 | 27 | `engineer` |
| Apr 2029 | 28 | `sdr` |
| May 2029 | 29 | `csm` |
| Jun 2029 | 30 | `support_agent` |
| Jul 2029 | 31 | `onboarding_specialist` |
| Aug 2029 | 32 | `engineer` |
| Sep 2029 | 33 | `marketer` |
| Oct 2029 | 34 | `support_agent` |
| Nov 2029 | 35 | `ga_staff` |

Headcount by department:

| Department | Opening | Dec 2027 | Dec 2028 | Dec 2029 |
|---|---|---|---|---|
| R&D | 54 | 56 | 60 | 63 |
| Sales | 16 | 17 | 18 | 20 |
| Marketing | 11 | 11 | 12 | 13 |
| Customer Success | 38 | 42 | 47 | 52 |
| G&A | 21 | 22 | 23 | 24 |
| **Total** | 140 | 148 | 160 | 172 |

### 1.7 COGS

| Key | Value | Type | Meaning |
|---|---|---|---|
| `hostingCostPerCustomerPerMonth` | 360 | Assumption | Cloud hosting per average customer per month, 2027 dollars |
| `hostingCostGrowthAnnual` | 5% | Assumption | Step-up each January as customers use more |
| `thirdPartyPctOfRevenue` | 4.0% | Assumption | Embedded maps, messaging and other licensed software |
| Support and onboarding staff | from roster | Actual | Roles with P&L line COGS |

### 1.8 Operating expenses other than payroll

| Key | Value | Type | Meaning |
|---|---|---|---|
| `nonHeadcountMonthly.rd` | 170,000 | Assumption | Development tools, test environments, contractors |
| `nonHeadcountMonthly.sm` | 130,000 | Assumption | Agencies, brand, sales tools, travel (not channel programs) |
| `nonHeadcountMonthly.ga` | 300,000 | Assumption | Rent, legal, audit, insurance, software |
| `costInflationAnnual` | 3% | Assumption | Step-up each January on the three lines above |
| `meritIncreaseAnnual` | 3% | Assumption | Step-up each January on all loaded costs |
| `programSpendGrowthAnnual` | 5% | Assumption | Step-up each January on baseline channel program spend |

### 1.9 Billing and working capital

| Key | Value | Type | Meaning |
|---|---|---|---|
| `annualBillingShare` | 60% | Assumption | Share of every ARR dollar billed annually, upfront. The rest is billed monthly, in the month of service |
| `openingInvoiceWeights` | `(89 + 2i) / 1200` for `i = 0 … 11` | Actual | Share of opening annual-billed ARR invoiced in each month of 2026 (`i = 0` is January 2026). Weights sum to 1 |
| `dsoDays` | 45 | Assumption | Days from invoice to cash |
| `dpoDays` | 30 | Assumption | Days from vendor bill to payment |
| `openingMonthlyBillings` | 2,120,000 | Actual | Billings in December 2026 and, by assumption, in each earlier month |
| `openingMonthlyVendorSpend` | 1,040,000 | Actual | Vendor spend in December 2026 and, by assumption, in each earlier month |

Opening annual invoices (2026), from `annualBillingShare × openingArr × weight` = `14,400,000 × weight`:

| Month of 2026 | m | Invoice | Share still unearned at Dec 31, 2026 | Unearned amount |
|---|---|---|---|---|
| Jan | −11 | 1,068,000 | 1/24 | 44,500 |
| Feb | −10 | 1,092,000 | 3/24 | 136,500 |
| Mar | −9 | 1,116,000 | 5/24 | 232,500 |
| Apr | −8 | 1,140,000 | 7/24 | 332,500 |
| May | −7 | 1,164,000 | 9/24 | 436,500 |
| Jun | −6 | 1,188,000 | 11/24 | 544,500 |
| Jul | −5 | 1,212,000 | 13/24 | 656,500 |
| Aug | −4 | 1,236,000 | 15/24 | 772,500 |
| Sep | −3 | 1,260,000 | 17/24 | 892,500 |
| Oct | −2 | 1,284,000 | 19/24 | 1,016,500 |
| Nov | −1 | 1,308,000 | 21/24 | 1,144,500 |
| Dec | 0 | 1,332,000 | 23/24 | 1,276,500 |
| **Total** | | **14,400,000** | | **7,486,000** |

The invoices rise through the year because the company grew through 2026. The total equals 60% of opening ARR. The unearned total is opening deferred revenue.

### 1.10 Capex and depreciation

| Key | Value | Type | Meaning |
|---|---|---|---|
| `capexMonthly` | 40,000 | Assumption | Laptops, office equipment. Paid in cash in the month |
| `usefulLifeMonths` | 36 | Assumption | Straight-line, starting the month after purchase |
| `openingPpeRemainingLifeMonths` | 24 | Actual | Opening net PP&E is depreciated evenly over 24 months (45,000 a month) |

### 1.11 Venture debt, interest, covenant and cash floor

| Key | Value | Type | Meaning |
|---|---|---|---|
| `opening.ventureDebt` | 10,000,000 | Actual | Term loan outstanding |
| `debtInterestRateAnnual` | 11.0% | Actual | Interest on the opening-of-month balance, paid monthly (91,666.67 a month) |
| `debtAmortStartMonth` | 43 | Actual | First principal payment is July 2030, after the model ends |
| `debtAmortMonths` | 18 | Actual | Equal monthly principal payments once amortization starts |
| `minCashCovenant` | 12,000,000 | Actual | Lender covenant: month-end cash must stay at or above this |
| `cashFloor` | 15,000,000 | Assumption | Internal policy: month-end cash must stay at or above this |
| `cashYieldAnnual` | 4.0% | Assumption | Interest earned on the opening-of-month cash balance |

### 1.12 Tax (kept simple)

| Key | Value | Type | Meaning |
|---|---|---|---|
| `taxRate` | 25% | Assumption | Applied to monthly pre-tax profit after using tax losses |
| `openingNol` | 70,000,000 | Actual | Tax losses carried forward |

Tax is paid in the month it is incurred. There are no deferred taxes. In the baseline, pre-tax income is negative in every month, so tax is zero throughout and the tax-loss balance grows to 94,435,291.05 by December 2029.

### 1.13 Opening balance sheet (December 31, 2026)

| Line | Key | Amount | Type |
|---|---|---|---|
| Cash | `opening.cash` | 38,000,000 | Actual |
| Accounts receivable | `opening.accountsReceivable` | 3,180,000 | Actual |
| Prepaid and other current assets | `opening.prepaidAndOther` | 850,000 | Actual |
| PP&E, net | `opening.ppeNet` | 1,080,000 | Actual |
| **Total assets** | | **43,110,000** | |
| Accounts payable | `opening.accountsPayable` | 1,040,000 | Actual |
| Accrued liabilities | `opening.accruedLiabilities` | 1,300,000 | Actual |
| Deferred revenue | derived (section 1.9) | 7,486,000 | Derived |
| Venture debt | `opening.ventureDebt` | 10,000,000 | Actual |
| **Total liabilities** | | **19,826,000** | |
| Paid-in capital | `opening.paidInCapital` | 96,000,000 | Actual |
| Retained earnings (accumulated deficit) | balancing figure | −72,716,000 | Derived |
| **Total equity** | | **23,284,000** | |
| **Total liabilities and equity** | | **43,110,000** | |

Rules:

- Opening deferred revenue is always computed from the opening invoice schedule (section 2.6).
- Opening retained earnings is the balancing figure: `total assets − total liabilities − paid-in capital`. With the default assumptions it is −72,716,000. If someone edits an opening input, retained earnings moves so the opening balance sheet still balances.
- Opening receivables equal 1.5 months of opening billings (`45 / 30 × 2,120,000 = 3,180,000`). Opening payables equal one month of opening vendor spend.
- Prepaid and accrued liabilities are held flat for all 36 months.

### 1.14 Product roadmap (in the baseline)

Each milestone ships on its planned date in the baseline and its effect ramps in linearly after shipping. Teams are existing engineers from the roster, so the baseline has no extra cost. Type: Assumption.

| Key | Hosting cost optimization | Enterprise integrations hub | Offline mobile crew app |
|---|---|---|---|
| Milestone id | `hosting_optimization` | `integrations_hub` | `offline_mobile` |
| Owner | VP Infrastructure | VP Product | VP Engineering |
| `shipMonth` (planned) | 9 (Sep 2027, Q3 2027) | 12 (Dec 2027, Q4 2027) | 18 (Jun 2028, Q2 2028) |
| `teamSize` (engineers) | 5 | 8 | 6 |
| `rampMonths` | 3 | 6 | 6 |
| Effect once fully ramped | `hostingCostReduction` 20% of hosting cost per customer | `winRateLift` +8% of win rate on all channels (relative) and `acvLift` +5% of ACV on all channels | `churnReduction` 15% of the monthly churn rate (relative) |
| `enabled` | true | true | true |

The effect share in month `m` is `ramp(m − shipMonth, rampMonths)`: zero in the ship month, full `rampMonths` later. Example: the integrations hub ships in month 12, so the win-rate lift is 0 in month 12, 1.33% in month 13 and the full 8% from month 18.

Section 9 adds two more effect kinds (`expansionLift`, `thirdPartyCostReduction`) and optional timing for each effect (section 9.2). Their defaults leave this roadmap and the baseline unchanged.

### 1.15 Valuation, objective and guardrails

| Key | Value | Type |
|---|---|---|
| `discountRateAnnual` | 12% | Assumption |
| `objective.arrTarget` | 31,200,000 at month 12 (30% growth) | Assumption |
| `guardrails.cashFloor` | 15,000,000 | Assumption |
| `guardrails.minRunwayMonths` | 18 | Assumption |
| `guardrails.maxBlendedCacPaybackMonths` | 24 | Assumption |
| `guardrails.maxBurnMultiple` | 2.0 | Assumption |
| `guardrails.minGrossMargin` | 72% | Assumption |

How each guardrail is measured is in section 2.18. The strategy layer (scoring, portfolio selection) is specified later in the playbook.

### 1.16 Uncertainty ranges (for the simulation in a later phase)

Each run draws one multiplier per driver from a triangular distribution (low, most likely, high) and applies it to that driver for the whole run. The same draws apply to the baseline and to the scenario in that run, so the difference between them is measured in the same world. Type: Assumption.

| Driver | Low | Most likely | High | Drawn |
|---|---|---|---|---|
| Cost per lead | 0.85 | 1.00 | 1.30 | once per channel |
| Lead to MQL rate | 0.80 | 1.00 | 1.20 | once per channel |
| MQL to opportunity rate | 0.80 | 1.00 | 1.20 | once per channel |
| Win rate | 0.75 | 1.00 | 1.25 | once per channel |
| ACV | 0.85 | 1.00 | 1.15 | once per channel |
| Direct leads from an initiative (for example badge scans) | 0.70 | 1.00 | 1.20 | once per initiative |
| Size of a milestone effect | 0.50 | 1.00 | 1.25 | once per milestone |

Sales cycle shifts by a whole number of months, drawn once per channel: −1 month (15%), 0 (55%), +1 (20%), +2 (10%). The cycle never goes below 0. Ship-date slip is defined in section 9.9. Random numbers come from a seeded generator (`simulation.seed`, default 2027; `simulation.runs`, default 1,000).

### 1.17 Initiative template defaults

Defaults the Initiative Evaluator pre-fills. The effect kinds are defined in section 2.16. Type: Assumption.

| Template | Inputs and defaults | Effects it creates |
|---|---|---|
| Trade show or event | Month 4. Booth and sponsorship 48,000. Travel 12,000. Staff days 20 at 800 loaded cost per day. Expected leads 200. Funnel: `events` | `program_spend` on the chosen channel for booth plus travel in the event month with `leads: "none"`; `direct_leads` for the expected leads in the event month; `allocated_cost` for staff days times day cost |
| Hire SDRs | Count 2. Start month 2. Loaded cost 95,000. Ramp 2 months. Recruiting 8,000 each, once. Tools 1,500 per SDR per month | `headcount` (role `sdr`); `vendor_cost` on S&M for recruiting in the start month; `program_spend` on `outbound` for tools with `leads: "none"` from the start month to month 36 |
| Hire AEs (with ramp) | Count 2. Start month 2. Loaded cost 150,000. Ramp 4 months. Recruiting 15,000 each, once | `headcount` (role `ae`); `vendor_cost` on S&M for recruiting in the start month |
| Paid campaign | Channel `paid`. Budget 90,000 spread evenly over 3 months starting month 2. Cost per lead multiplier 1.20 (extra leads cost more than the average lead) | `program_spend` with `leads: "from_cpl"` and `cplMultiplier` |
| Partner program | Setup 40,000 once in month 2. Co-marketing 10,000 a month for 12 months from month 3 at the partner cost per lead | `vendor_cost` on S&M for setup; `program_spend` on `partners` with `leads: "from_cpl"` |

---

## 2. Formulas

All formulas use full precision. Nothing is rounded inside the engine (section 5.3).

### 2.1 Order of calculation

Each run computes, in this order: headcount and payroll, funnel, ARR and customers, revenue, billing and deferred revenue, receivables, COGS and operating expenses, vendor spend and payables, capex and depreciation, then month by month: debt, interest, tax, net income and cash (interest depends on last month's cash, so there is no circular reference). Then the balance sheet, the cash flow statement, the 13-week forecast, the KPIs and the integrity checks.

### 2.2 Headcount and payroll

For role `r` with opening count `N0_r` and loaded annual cost `C_r`:

```
HC_r,m        = N0_r + (planned hires of r with start ≤ m) + (initiative hires of r with start ≤ m ≤ end)
Payroll_r,m   = [ (N0_r + planned hires with start ≤ m) × C_r
                  + Σ over active initiative hires (count × their loaded cost) ] / 12 × step(meritIncreaseAnnual, m)
Payroll_line,m = Σ Payroll_r,m over roles on that P&L line (COGS, R&D, S&M, G&A)
Payroll_m      = Σ over all roles
```

An initiative hire uses the role's loaded cost unless it gives its own. `end` is optional; without it the hire stays through month 36.

Ramped capacity for AEs and SDRs (opening staff are fully ramped):

```
RampedAE_m  = N0_ae  + Σ over AE hires active in m  (count × ramp(m − start, aeRampMonths))
RampedSDR_m = N0_sdr + Σ over SDR hires active in m (count × ramp(m − start, sdrRampMonths))
```

Planned hires and initiative hires both count. An initiative hire stops counting after its `end` month. An initiative hire may give its own `rampMonths` (the "Ramp" input of the hire templates in section 1.17); it then ramps over that many months instead of `aeRampMonths` or `sdrRampMonths`. Planned hires always use the company-wide ramp.

### 2.3 Funnel, capacity and timing by sales cycle

For channel `c` in month `m`. Driver changes from initiatives (section 2.16) are applied to `CPL`, the rates, `ACV` and the win rate before use.

Program spend:

```
BaseSpend_c,m = programSpendMonthly_c × step(programSpendGrowthAnnual, m)
Spend_c,m     = BaseSpend_c,m + Σ initiative program spend on c in m
```

Leads:

```
outbound:        Leads_c,m = RampedSDR_m × leadsPerSdrPerMonth + DirectLeads_c,m
other channels:  Leads_c,m = BaseSpend_c,m / CPL_c,m
                             + Σ over initiative spend with leads "from_cpl" (amount / (CPL_c,m × cplMultiplier))
                             + DirectLeads_c,m
```

If `CPL` is zero or missing, spend buys no leads. Initiative spend with `leads: "none"` buys no leads.

Qualified leads and opportunities:

```
MQL_c,m         = Leads_c,m × leadToMqlRate_c
SourcedOpps_c,m = MQL_c,m × mqlToOppRate_c
AeOpps_c,m      = RampedAE_m × selfSourcedOppsPerAePerMonth   (outbound only, else 0)
OppsCreated_c,m = SourcedOpps_c,m + AeOpps_c,m
```

AE capacity. If the team cannot work everything created in a month, every channel loses the same share and the unworked opportunities are lost (they do not roll to the next month):

```
Capacity_m     = RampedAE_m × oppCapacityPerAePerMonth
TotalCreated_m = Σ_c OppsCreated_c,m
WorkShare_m    = 1                              if TotalCreated_m ≤ Capacity_m
               = Capacity_m / TotalCreated_m    otherwise
OppsWorked_c,m = OppsCreated_c,m × WorkShare_m
Utilization_m  = TotalCreated_m / Capacity_m
```

For months before the model starts, `OppsWorked_c,m = openingPipelineOppsPerMonth_c` for all `m ≤ 0`.

Deals and new ARR, timed by the sales cycle. Milestone lifts and driver changes on win rate and ACV apply in the month the deal **closes**:

```
h_m          = ramp(m − shipMonth_hub, rampMonths_hub)      (0 if the milestone is disabled)
WinRate_c,m  = clamp(winRate_c × (1 + winRateLift × h_m), 0, 1)
Deals_c,m    = OppsWorked_c,(m − salesCycleMonths_c) × WinRate_c,m
NewARR_c,m   = Deals_c,m × acv_c × (1 + acvLift × h_m)
Deals_m      = Σ_c Deals_c,m
NewARR_m     = Σ_c NewARR_c,m
```

`salesCycleMonths` is a whole number, 0 or more. With a cycle of 4, opportunities worked in January close in May.

### 2.4 ARR rollforward and customers

```
ChurnRate_m     = churnRateMonthly × (1 − churnReduction × ramp(m − shipMonth_mobile, rampMonths_mobile))
Churn_m         = ARR_(m−1) × ChurnRate_m
Contraction_m   = ARR_(m−1) × contractionRateMonthly
Expansion_m     = ARR_(m−1) × expansionRateMonthly
ARR_m           = ARR_(m−1) + NewARR_m + Expansion_m − Contraction_m − Churn_m

LostCustomers_m = Customers_(m−1) × ChurnRate_m
Customers_m     = Customers_(m−1) + Deals_m − LostCustomers_m
```

`ARR_0 = openingArr`, `Customers_0 = openingCustomers`. The rates apply to all ARR at the start of the month, including ARR from customers who signed last month.

### 2.5 Revenue

ARR changes are assumed to happen evenly through the month, so revenue uses the average of opening and closing ARR (mid-month convention):

```
Revenue_m = (ARR_(m−1) + ARR_m) / 24
```

All revenue is subscription revenue. There is no services revenue.

### 2.6 Billing, deferred revenue and receivables

Let `s = annualBillingShare`.

Annual invoices. New and expansion ARR is invoiced for 12 months upfront when it lands. Each invoice renews 12 months later. Churn and contraction are assumed to come out of the group renewing that month:

```
I_m = s × ARR_0 × openingInvoiceWeights[m + 11]                          for m = −11 … 0
I_m = s × (NewARR_m + Expansion_m) + I_(m−12) − s × (Churn_m + Contraction_m)   for m ≥ 1
```

Monthly-billed customers are invoiced each month for that month:

```
MonthlyBilled_m = (1 − s) × Revenue_m
Billings_m      = I_m + MonthlyBilled_m
```

Deferred revenue. An annual invoice issued in month `t` is earned from the middle of month `t` to the middle of month `t + 12`, so at the end of month `t + j` the unearned share is `(23 − 2j) / 24`:

```
DR_0 = Σ_{j=0}^{11} I_(−j) × (23 − 2j) / 24
DR_m = DR_(m−1) + I_m − s × Revenue_m          for m ≥ 1
```

Receivables. Let `L = dsoDays / 30`, `n = floor(L)`, `f = L − n`. Billings for months `k ≤ 0` equal `openingMonthlyBillings`:

```
AR_m          = Σ_{j=0}^{n−1} Billings_(m−j) + f × Billings_(m−n)       for m ≥ 1
Collections_m = AR_(m−1) + Billings_m − AR_m
```

`AR_0` is the opening balance (an input). With 45 days, `AR_m = Billings_m + 0.5 × Billings_(m−1)`, which means half of each month's invoices are collected one month later and half two months later.

### 2.7 P&L

COGS:

```
g_m        = ramp(m − shipMonth_hosting, rampMonths_hosting)      (0 if disabled)
Hosting_m  = (Customers_(m−1) + Customers_m) / 2
             × hostingCostPerCustomerPerMonth × step(hostingCostGrowthAnnual, m)
             × (1 − hostingCostReduction × g_m)
ThirdParty_m = Revenue_m × thirdPartyPctOfRevenue
COGS_m       = Hosting_m + ThirdParty_m + Payroll_COGS,m + initiative vendor costs on COGS
GrossProfit_m = Revenue_m − COGS_m
GrossMargin_m = GrossProfit_m / Revenue_m
```

Operating expenses:

```
NonHC_line,m   = nonHeadcountMonthly.line × step(costInflationAnnual, m)        line = rd, sm, ga
ProgramSpend_m = Σ_c Spend_c,m
Commissions_m  = commissionRate × NewARR_m

RD_m = Payroll_RD,m + NonHC_rd,m + initiative vendor costs on R&D
SM_m = Payroll_SM,m + ProgramSpend_m + Commissions_m + NonHC_sm,m + initiative vendor costs on S&M
GA_m = Payroll_GA,m + NonHC_ga,m + initiative vendor costs on G&A
Opex_m = RD_m + SM_m + GA_m
```

Below the line:

```
EBITDA_m         = GrossProfit_m − Opex_m
EBIT_m           = EBITDA_m − Depreciation_m
InterestIncome_m = max(0, Cash_(m−1)) × cashYieldAnnual / 12
InterestExpense_m = Debt_(m−1) × debtInterestRateAnnual / 12
PreTaxIncome_m   = EBIT_m + InterestIncome_m − InterestExpense_m
Tax_m            = see 2.10
NetIncome_m      = PreTaxIncome_m − Tax_m
```

### 2.8 Vendor spend and payables

Everything that is not payroll, commissions, interest, tax or capex is a vendor bill:

```
VendorSpend_m = Hosting_m + ThirdParty_m + ProgramSpend_m + NonHC_rd,m + NonHC_sm,m + NonHC_ga,m
                + all initiative vendor costs in m
```

Let `Lp = dpoDays / 30`, `np = floor(Lp)`, `fp = Lp − np`. Vendor spend for months `k ≤ 0` equals `openingMonthlyVendorSpend`:

```
AP_m          = Σ_{j=0}^{np−1} VendorSpend_(m−j) + fp × VendorSpend_(m−np)     for m ≥ 1
VendorPaid_m  = AP_(m−1) + VendorSpend_m − AP_m
```

`AP_0` is the opening balance. With 30 days, `AP_m = VendorSpend_m`: each month's vendor bills are paid the following month. Payroll and commissions are paid in the month they are expensed.

### 2.9 Capex and depreciation

```
Capex_m        = capexMonthly + initiative capex in m
Depreciation_m = (opening.ppeNet / openingPpeRemainingLifeMonths   if m ≤ openingPpeRemainingLifeMonths, else 0)
                 + Σ_{j = max(1, m − usefulLifeMonths)}^{m−1} Capex_j / usefulLifeMonths
PPE_m          = PPE_(m−1) + Capex_m − Depreciation_m
```

### 2.10 Debt and tax

```
Principal_m = min(Debt_(m−1), opening.ventureDebt / debtAmortMonths)
              if debtAmortStartMonth ≤ m < debtAmortStartMonth + debtAmortMonths, else 0
Debt_m      = Debt_(m−1) − Principal_m
```

Tax, with `NOL_0 = openingNol`:

```
if PreTaxIncome_m ≤ 0:   Tax_m = 0;  NOL_m = NOL_(m−1) − PreTaxIncome_m
else:                    used  = min(PreTaxIncome_m, NOL_(m−1))
                         Tax_m = taxRate × (PreTaxIncome_m − used)
                         NOL_m = NOL_(m−1) − used
```

### 2.11 Cash (direct method, used for the balance sheet)

```
Cash_m = Cash_(m−1)
         + Collections_m
         − Payroll_m − Commissions_m
         − VendorPaid_m
         − Capex_m
         + InterestIncome_m − InterestExpense_m
         − Tax_m
         − Principal_m
```

Cash may go negative. The model does not stop or borrow; it reports the breach.

### 2.12 Balance sheet

```
Assets_m      = Cash_m + AR_m + opening.prepaidAndOther + PPE_m
Liabilities_m = AP_m + opening.accruedLiabilities + DR_m + Debt_m
RetainedEarnings_m = RetainedEarnings_(m−1) + NetIncome_m
Equity_m      = opening.paidInCapital + RetainedEarnings_m
```

`RetainedEarnings_0` is the balancing figure from section 1.13.

### 2.13 Cash flow statement (indirect method)

```
CFO_m = NetIncome_m + Depreciation_m
        − (AR_m − AR_(m−1))
        + (AP_m − AP_(m−1))
        + (DR_m − DR_(m−1))
CFI_m = − Capex_m
CFF_m = − Principal_m
NetChangeInCash_m = CFO_m + CFI_m + CFF_m
NetBurn_m = − (CFO_m + CFI_m)
FCF_m     = CFO_m + CFI_m − InterestIncome_m + InterestExpense_m       (free cash flow before interest)
```

Prepaid and accrued liabilities do not change, so they do not appear. The statement must end at the same cash as section 2.11 (check C2). The engine must compute cash with the direct method and this statement separately, so the check is real.

### 2.14 13-week cash forecast

The forecast starts on the first day of a month `t0` (default 1, so January 1, 2027; `t0` must be a whole month from 1 to the horizon) and covers 91 days. If fewer than 91 days are left in the model, the forecast stops at the horizon and reports whole weeks only. Week `w` is days `7w − 6` to `7w`. Each day belongs to a calendar month `m` with `D_m` days (real calendar: February 2028 has 29 days). Monthly flows from the model are placed on days like this:

| Flow | Placement |
|---|---|
| Collections | Evenly: `Collections_m / D_m` each day |
| Vendor payments and capex | Evenly: `(VendorPaid_m + Capex_m) / D_m` each day |
| Payroll | Half on the 15th, half on the last day of the month |
| Commissions | Last day of the month |
| Interest income, interest expense, principal, tax | Last day of the month |

```
DailyNet_d  = receipts − payroll and commissions − vendors and capex − debt service − tax on day d
DailyCash_d = DailyCash_(d−1) + DailyNet_d,   with DailyCash_0 = Cash_(t0 − 1)
WeekNet_w   = Σ DailyNet_d over the week;   WeekEndCash_w = DailyCash_(7w)
```

Receipts include interest income. Debt service is interest expense plus principal. The forecast reports each week's flows by category, ending cash, the lowest week, and whether any week ends below the cash floor or the covenant. By construction the daily path passes through the monthly ending cash on each month-end (check C15). Because 13 weeks is 91 days and January to March 2027 is 90 days, week 13 includes April 1.

### 2.15 KPIs

For a month `m`, the trailing window is `W = min(12, m)` months, covering months `m − W + 1` to `m`. `Σ_W` means a sum over that window.

```
GrossMarginTrailing_m = Σ_W GrossProfit / Σ_W Revenue
EBITDAMargin_m        = EBITDA_m / Revenue_m

ArrGrowth_m   = ARR_m / ARR_(m−12) − 1                 for m ≥ 12
              = (ARR_m / ARR_0)^(12 / m) − 1           for m < 12 (annualized)
RevenueGrowth_m = Revenue_m / Revenue_(m−12) − 1       for m ≥ 13; for m < 13 show ArrGrowth_m and say so

Runway_m      = max(0, Cash_m) / AvgBurn_m             where AvgBurn_m = average NetBurn over months max(1, m − 2) … m
              = "not burning" (infinite)               if AvgBurn_m ≤ 0

BurnMultiple_m = Σ_W NetBurn / (ARR_m − ARR_(m−W))     not meaningful if the denominator ≤ 0

BlendedCacPayback_m (months) = 12 × Σ_W SM / [ (Σ_W NewARR + Σ_W Expansion) × GrossMarginTrailing_m ]

AcquisitionSM_m       = SM_m − Payroll of role csm in m
NewLogoCacPayback_m   = 12 × Σ_W AcquisitionSM / ( Σ_W NewARR × GrossMarginTrailing_m )
CAC_m (per new customer) = Σ_W AcquisitionSM / Σ_W Deals
LTV_m                 = (ARR_m / Customers_m) × GrossMarginTrailing_m / (12 × (ChurnRate_m + contractionRateMonthly))
LtvToCac_m            = LTV_m / CAC_m

ChannelProgramCostPerDeal_c,m = Spend_c,m / (OppsWorked_c,m × winRate_c)      cost of the deals this month's spend should produce
```

Notes:

- **Blended CAC payback** is the guardrail metric. It asks: how many months of gross profit from the ARR added (new plus expansion) pay back all sales and marketing spend, including customer success managers. **New-logo CAC payback** is stricter: only new-customer ARR, and S&M without CSM pay.
- LTV ignores expansion and is not discounted.
- "Change vs plan" on a KPI card is the scenario value minus the plan value for the same month.

### 2.16 Initiatives: how they are applied against the baseline

An initiative is a named list of **effects**. Effects change drivers, never outputs. The engine then reruns the whole model with those drivers. Nothing is added to the results after the fact.

```
initiative = { id, name, template, effects: [ ... ] }
```

Effect kinds (`byMonth` maps a month number to an amount):

| Kind | Fields | What it does |
|---|---|---|
| `program_spend` | `channel`, `byMonth`, `leads` ("from_cpl" or "none"), `cplMultiplier` (default 1) | Adds to `Spend_c,m` (so it is in S&M and in vendor spend). With "from_cpl" it also buys leads at `CPL × cplMultiplier` |
| `direct_leads` | `channel`, `byMonth` | Adds leads to the channel funnel in those months (for example badge scans) |
| `headcount` | `role`, `count`, `startMonth`, `endMonth` (optional), `loadedCostAnnual` (optional), `rampMonths` (optional) | Adds people: payroll on the role's P&L line and, for AEs and SDRs, ramped capacity |
| `vendor_cost` | `line` ("cogs", "rd", "sm", "ga"), `byMonth` | Adds a non-payroll cost to that line, paid through payables |
| `allocated_cost` | `byMonth` | The cost of existing staff time. It does **not** change the P&L, the balance sheet or cash, because those people are already paid. It is counted in the investment and in the return measures (section 2.17) |
| `capex` | `byMonth` | Adds to capex |
| `driver_change` | `driver`, `channel` (optional), `fromMonth`, `toMonth`, `mode` ("multiply" or "add"), `value` | Changes one driver for those months. Drivers: `costPerLead`, `leadToMqlRate`, `mqlToOppRate`, `winRate`, `acv` (per channel), `churnRateMonthly`, `expansionRateMonthly`, `contractionRateMonthly`, `hostingCostPerCustomerPerMonth` |
| `milestone_shift` | `milestone`, `shipMonth` | Sets the month one roadmap milestone ships in this run (section 9.7). The costs of pulling it in are separate `headcount` and `vendor_cost` effects |

Rules:

1. For a driver in a month, `value = base × (product of all multipliers) + (sum of all adds)`. Rates are then clamped to 0 to 1 and other drivers to 0 or more. The result does not depend on the order of effects.
2. Lead-stage drivers (`costPerLead`, `leadToMqlRate`, `mqlToOppRate`) use the month the leads arrive. `winRate` and `acv` use the month the deal closes. Others use the month they are applied.
3. Several initiatives are applied together in one run. They interact only through shared drivers, in practice through AE capacity.
4. The engine never changes the assumptions object it is given.
5. The engine checks its inputs before it runs. Every numeric assumption and every amount in an initiative must be a finite number, `salesCycleMonths` must be a whole number of 0 or more, `dsoDays` and `dpoDays` must be 0 or more, and a `headcount` effect must have a `startMonth`. If not, the run stops with a plain reason that names the input. A missing or non-numeric input is never read as zero. Amounts in months after the horizon are ignored.

Incremental results, for every output series `X`:

```
ΔX_m = X_m(with initiatives) − X_m(baseline)        for m = 0 … 36
```

where both runs use the same assumptions. This gives incremental ARR, revenue, gross profit, EBITDA and cash by month, and every other line.

### 2.17 How returns are measured

```
Investment_m = initiative program spend + initiative payroll + initiative vendor costs
               + initiative capex + allocated cost, in month m (as expensed)
TotalInvestment = Σ_{m=1}^{36} Investment_m
```

Investment excludes the costs that only happen if the initiative works (commissions, hosting and third-party software on the extra revenue). Those reduce the return instead.

Net flow, the monthly series every return measure uses:

```
NF_m    = ΔFCF_m − AllocatedCost_m
CumNF_m = Σ_{k=1}^{m} NF_k
```

`ΔFCF` is the change in free cash flow before interest (section 2.13). Interest is left out so the time value of money is counted once, in the discount rate.

```
r = (1 + discountRateAnnual)^(1/12) − 1                      monthly discount rate (0.948879% at 12%)
NPV = Σ_{m=1}^{36} NF_m / (1 + r)^m                          flows at month-end, discounted to the start of month 1
ROI = CumNF_36 / TotalInvestment                             net return per dollar invested
NewArrPerDollar = Σ ΔNewARR_m / TotalInvestment
PaybackMonth = the first month m, after CumNF first goes negative, in which CumNF_m ≥ 0
             = "not within 36 months" if that never happens
             = the first month with any effect, if CumNF never goes negative
               ("any effect" = the first month in which the measured flow or the investment is not zero)
             = none, if the initiative has no effect at all
EarningsPaybackMonth = same rule applied to Σ (ΔEBITDA_k − AllocatedCost_k)
CashLowPoint = min over m = 1 … 36 of Cash_m in the scenario, and the month it happens
ΔCashLowPoint = CashLowPoint(scenario) − CashLowPoint(baseline)
ΔCash_m = Cash_m(scenario) − Cash_m(baseline)                includes the interest earned or lost on the difference
```

Notes:

- `PaybackMonth` is a **cash** payback. Annual upfront billing pulls cash forward, so cash payback is earlier than earnings payback. Show both.
- NPV covers the 36 months only. There is no terminal value, so long-lived initiatives such as hires are understated.

### 2.18 Objective and guardrails as reported

These are computed for the baseline and for every scenario and shown with pass or fail.

| Item | Measure | Pass when |
|---|---|---|
| Objective | `ARR_12` | at or above 31,200,000. Gap = `31,200,000 − ARR_12` |
| Cash floor | `min Cash_m` for `m = 1 … 36` | at or above 15,000,000 |
| Covenant | `min Cash_m` for `m = 1 … 36` | at or above 12,000,000 (reported separately from the floor) |
| Runway | `min Runway_m` for `m = 1 … 12` | at or above 18 |
| Blended CAC payback | `BlendedCacPayback_12` | at or below 24 |
| Burn multiple | `BurnMultiple_12` | at or below 2.0 |
| Gross margin | `GrossMarginTrailing_12` | at or above 72% |

Baseline values: ARR at month 12 is 30,048,489.36 (gap 1,151,510.64, objective not met); cash low point 18,008,506.93 in October 2029 (m = 34); lowest runway in months 1 to 12 is 34.44 months (m = 4); blended CAC payback 18.03 months; burn multiple 1.76; gross margin 77.45%. All guardrails pass in the baseline.

### 2.19 Recommended engine interface

Names are suggestions; the behavior is required.

- `runModel(assumptions, initiatives)` returns every monthly series in sections 2.2 to 2.13.
- `applyInitiatives(assumptions, initiatives)` returns `{ baseline, scenario, delta, returns }` using sections 2.16 and 2.17.
- `computeKpis(result)`, `cash13Week(result, t0)`, `guardrails(result)`.
- `runChecks(result)` returns the list of checks in section 3 with pass or fail and a reason. It takes a result object, so a test can damage a copy of the result and confirm the check fails.

---

## 3. Integrity checks

The engine runs every check on every recalculation, for the baseline and for the current scenario. The header badge shows "Integrity N/16" (a check that is missing counts as failed). A failed check is shown in red with its name, the first month that fails and the size of the difference. Section 9.10 adds checks C17 to C20 for product acceleration; once that section is built the badge shows "Integrity N/20".

Tolerance: a dollar check passes when the absolute difference is at most 0.01. A count check passes at 1e-6.

A check must compare two numbers that the engine computed by **different paths**. A check that compares a number with itself is a bug. `runChecks` recomputes every total from its component lines (for example total assets from cash, receivables, prepaid and PP&E) and does not trust a stored total.

| # | Check | Passes when, for every month in range |
|---|---|---|
| C1 | Balance sheet balances | `Assets_m = Liabilities_m + Equity_m` for `m = 0 … 36`; each stored total (assets, liabilities, equity, liabilities plus equity) equals the sum of its lines |
| C2 | Cash flow ties to the balance sheet | `Cash_m` (direct method, 2.11) `= Cash_(m−1) + CFO_m + CFI_m + CFF_m` (indirect, 2.13); stored net change in cash, net burn and free cash flow equal their formulas in 2.13 |
| C3 | Net income rolls into retained earnings | `RetainedEarnings_m = RetainedEarnings_(m−1) + NetIncome_m` |
| C4 | ARR rollforward ties | `ARR_m = ARR_(m−1) + NewARR_m + Expansion_m − Contraction_m − Churn_m`, `NewARR_m = Σ_c NewARR_c,m`, and `ARR_m ≥ 0` |
| C5 | Funnel shape | For every channel: `Leads ≥ MQL ≥ SourcedOpps ≥ 0`; `OppsCreated ≥ OppsWorked ≥ 0`; `Deals_c,m ≤ OppsWorked_c,(m − cycle)`; `Capacity_m = RampedAE_m × oppCapacityPerAePerMonth`; and `Σ_c OppsWorked_c,m ≤ Capacity_m` whenever `Σ_c OppsCreated_c,m > Capacity_m` (recomputed, not taken from the stored `WorkShare_m`) |
| C6 | Channel spend equals P&L program spend | `Σ_c Spend_c,m` from the funnel `=` the program-spend component of S&M `=` baseline spend plus initiative program spend summed from the inputs |
| C7 | A zero initiative changes nothing | Running the model with a null initiative (one of each effect kind, all amounts zero, count zero) gives the same value as the baseline for every series, within 1e-6 |
| C8 | Revenue equals what ARR implies | `Revenue_m × 24 = ARR_(m−1) + ARR_m` |
| C9 | Deferred revenue rolls forward | (a) `DR_m = DR_(m−1) + I_m − s × Revenue_m`; (b) `DR_m = Σ_{j=0}^{11} I_(m−j) × (23 − 2j) / 24`, recomputed from the invoice history; (c) `Σ_{j=0}^{11} I_(m−j) = s × ARR_m`; (d) `I_m ≥ 0` |
| C10 | Covenant and cash floor are reported | A floor result and a covenant result exist for every month 1 to 36; the reported low point equals the minimum of balance sheet cash; the reported breach months equal the months where balance sheet cash is below each threshold; the cash-floor and covenant rows of section 2.18 show the same low point and the same pass or fail; `guardrails.cashFloor = cashFloor` (the floor is one number held in two inputs, and the check fails if they differ) |
| C11 | Receivables and payables roll forward | `AR_m = AR_(m−1) + Billings_m − Collections_m`; `AP_m = AP_(m−1) + VendorSpend_m − VendorPaid_m`; `AR, AP, DR, Collections, VendorPaid ≥ 0`; `AR_m` and `AP_m` equal the values rebuilt from the billings and vendor-spend history with `dsoDays` and `dpoDays` (the formulas in 2.6 and 2.8) |
| C12 | Payroll ties to headcount | `Σ over P&L lines of Payroll_line,m = Σ over roles of the payroll formula in 2.2`, and total headcount equals the sum by role |
| C13 | P&L foots | `GrossProfit = Revenue − COGS`; `COGS` and `Opex` equal the sum of their lines; `EBITDA = GrossProfit − Opex`; `NetIncome = EBITDA − Depreciation + InterestIncome − InterestExpense − Tax`; stored EBIT and pre-tax income equal their formulas |
| C14 | PP&E and debt roll forward | `PPE_m = PPE_(m−1) + Capex_m − Depreciation_m ≥ 0`; `Debt_m = Debt_(m−1) − Principal_m ≥ 0`; `InterestExpense_m = Debt_(m−1) × rate / 12` |
| C15 | 13-week forecast ties to the monthly model | `DailyCash` on each month-end inside the window equals `Cash_m`; `Σ WeekNet_w = DailyCash_91 − DailyCash_0`; each week's net equals its categories and its ending cash equals the daily path |
| C16 | Customers roll forward and all numbers are finite | `Customers_m = Customers_(m−1) + Deals_m − LostCustomers_m ≥ 0`; no series contains NaN or an infinite value (a runway figure may be "not burning", plus infinity, in the KPI series and in the runway row of section 2.18) |

Covenant or cash-floor **breaches** and guardrail failures are business warnings, shown separately in amber or red. They are not integrity failures: the math can be right while the plan is bad.

---

## 4. Test plan

Unless a test says otherwise it uses the default assumptions and no initiatives. Tolerances: dollars ±0.01, counts and ratios ±0.0001. "Reference value" means the number came from an independent calculation of these formulas made while writing this spec; the January 2027 values and the two initiative examples are also worked by hand in sections 6, 4.3 and 4.4.

### 4.1 Baseline

| Test | What | Expected |
|---|---|---|
| T01 | Opening balance sheet | Every line of section 1.13: deferred revenue 7,486,000; retained earnings −72,716,000; total assets 43,110,000 = total liabilities and equity |
| T02 | Opening invoices | The 12 invoices of section 1.9, total 14,400,000 |
| T03 | January 2027 funnel | Leads 75 / 250 / 80 / 40; MQLs 15 / 50 / 20 / 18; sourced opps 4.5 / 7.5 / 4.0 / 4.5; AE opps 9 (outbound); created 13.5 / 7.5 / 4.0 / 4.5; capacity 42; utilization 0.7024; deals 3.24 / 1.35 / 1.00 / 1.35; new ARR 145,800 / 40,500 / 52,000 / 51,300 (order: outbound, paid, events, partners) |
| T04 | January 2027 ARR | New 289,600; expansion 400,800; contraction 64,800; churn 144,000; closing ARR 24,481,600; customers 603.34; revenue 2,020,066.67 |
| T05 | January 2027 P&L | Every line of section 6.3: gross profit 1,535,579.47; EBITDA −1,127,547.20; net income −1,137,547.20 |
| T06 | January 2027 cash and balance sheet | Every line of sections 6.4 to 6.6: billings 2,164,986.67; collections 2,120,000.00; ending cash 36,964,790.00; deferred revenue 7,630,920.00; total assets 42,114,776.67 |
| T07 | All 36 months | Every cell of the table in section 8.1 |
| T08 | Annual totals | Every cell of the table in section 8.2 |
| T09 | Balance sheets | Every cell of the table in section 8.3 |
| T10 | KPIs | Every cell of the table in section 8.4 |
| T11 | 13-week forecast | Every cell of the table in section 8.5; cash on day 31 = 36,964,790.00, day 59 = 35,951,218.77, day 90 = 34,967,666.36, day 91 = 35,005,855.48; lowest week is week 13 |
| T12 | Objective and guardrails | The baseline values in section 2.18; all five guardrails pass; objective not met |
| T13 | Integrity | 16 of 16 checks pass on the baseline and on every scenario in sections 4.3 to 4.6 |
| T14 | Determinism | Two runs give identical results; the assumptions object passed in is unchanged afterward |
| T15 | Second month spot check | Month 2: ARR 24,967,052.80; revenue 2,060,360.53; EBITDA −1,090,063.88; depreciation 46,111.11; interest income 123,215.97; net income −1,104,625.69; ending cash 35,951,218.77; annual invoices `I_2` 1,383,271.68 |

### 4.2 Checks can fail (tamper tests)

For each row: take a copy of the baseline result, make the change, run `runChecks` on the copy, and expect that check to fail (and report the month).

| Test | Change to the copy | Check that must fail |
|---|---|---|
| T20 | Add 1.00 to `AR_5` | C1 and C11 |
| T21 | Add 1.00 to `CFO_7` | C2 |
| T22 | Add 1.00 to `RetainedEarnings_3` | C3 and C1 |
| T23 | Add 1.00 to `ARR_9` | C4, C8 and C9 |
| T24 | Set `MQL` above `Leads` for paid in month 2 | C5 |
| T25 | Add 1.00 to the P&L program-spend component in month 4 | C6 |
| T26 | Add 1.00 to `Revenue_2` | C8 and C13 |
| T27 | Add 1.00 to `DR_4` | C9 and C1 |
| T28 | Remove the covenant result for month 10 | C10 |
| T29 | Add 1.00 to `Payroll_RD,6` without changing headcount | C12 |
| T30 | Add 1.00 to `EBITDA_8` | C13 |
| T31 | Add 1.00 to `Debt_12` | C14 and C1 |
| T32 | Add 1.00 to the daily cash path on day 31 | C15 |
| T33 | Set `Customers_5` to NaN | C16 |
| T34 | Run C7 with a null initiative whose paid program spend in month 3 is 1.00 instead of 0 | C7 |

### 4.3 Hand-calculated example: a trade show

**Initiative.** A trade show in April 2027 (m = 4), using the events channel:

- Booth and sponsorship 48,000 plus travel 12,000 = 60,000 of events program spend in month 4 (`leads: "none"`).
- 200 badge scans as `direct_leads` on `events` in month 4.
- 20 staff days at 800 = 16,000 of `allocated_cost` in month 4.

**Funnel (month 4).** Events rates: lead to MQL 25%, MQL to opportunity 20%, win rate 25%, cycle 5 months, ACV 52,000.

```
Extra leads   = 200
Extra MQLs    = 200 × 0.25 = 50
Extra opps    = 50 × 0.20 = 10
Capacity check: baseline creates 29.5 opportunities in month 4, capacity is 42.
                29.5 + 10 = 39.5 ≤ 42, so WorkShare stays 1 (utilization 94.05%). Nothing is lost.
Extra deals   = 10 × 0.25 = 2.5, closing in month 4 + 5 = 9 (September 2027)
Extra new ARR = 2.5 × 52,000 = 130,000 in month 9
```

The integrations hub ships in month 12, after these deals close, so it does not lift them.

**Month 4 (the show).**

```
ΔProgram spend = 60,000 → ΔS&M = 60,000 → ΔEBITDA = −60,000
ΔVendor spend  = 60,000 → ΔAP = +60,000 (paid next month) → ΔFCF = 0
Allocated cost = 16,000 → NF_4 = 0 − 16,000 = −16,000
```

**Month 5.** The vendor bill is paid: `ΔVendorPaid = 60,000`, `ΔFCF = −60,000`, `NF_5 = −60,000`, `CumNF_5 = −76,000`. Months 6 to 8: `NF = 0`.

**Month 9 (deals close).**

```
ΔARR_9       = 130,000
ΔRevenue_9   = (0 + 130,000) / 24 = 5,416.67
ΔCustomers_9 = 2.5
ΔHosting_9   = (0 + 2.5) / 2 × 360 = 450.00            (hosting milestone ships in month 9, effect starts month 10)
ΔThirdParty_9 = 0.04 × 5,416.67 = 216.67
ΔGrossProfit_9 = 5,416.67 − 450.00 − 216.67 = 4,750.00
ΔCommissions_9 = 0.10 × 130,000 = 13,000.00
ΔEBITDA_9    = 4,750.00 − 13,000.00 = −8,250.00

ΔI_9         = 0.60 × 130,000 = 78,000.00              (annual invoices)
ΔBillings_9  = 78,000.00 + 0.40 × 5,416.67 = 80,166.67
ΔAR_9        = 80,166.67                                (nothing collected yet)
ΔDR_9        = 78,000.00 − 0.60 × 5,416.67 = 74,750.00
ΔAP_9        = 450.00 + 216.67 = 666.67
ΔFCF_9       = ΔCollections 0 − commissions 13,000 − vendor paid 0 = −13,000.00
  cross-check, indirect: −8,250.00 − 80,166.67 + 666.67 + 74,750.00 = −13,000.00
NF_9 = −13,000.00;  CumNF_9 = −89,000.00
```

**Month 10.** The new ARR now expands and churns with the rest: net monthly rate `1 + 0.0167 − 0.0027 − 0.0060 = 1.008`.

```
ΔARR_10       = 130,000 × 1.008 = 131,040.00
ΔRevenue_10   = (130,000 + 131,040) / 24 = 10,876.67
ΔCustomers_10 = 2.5 × (1 − 0.006) = 2.485
ΔHosting_10   = (2.5 + 2.485) / 2 × 360 × (1 − 0.20 × 1/3) = 837.48
ΔThirdParty_10 = 435.07
ΔEBITDA_10    = 10,876.67 − 837.48 − 435.07 = 9,604.12
ΔI_10         = 0.60 × 130,000 × (0.0167 − 0.0027 − 0.0060) = 624.00
ΔBillings_10  = 624.00 + 0.40 × 10,876.67 = 4,974.67
ΔCollections_10 = 0.5 × ΔBillings_9 = 40,083.33
ΔVendorPaid_10  = ΔVendorSpend_9 = 666.67
NF_10 = 40,083.33 − 666.67 = 39,416.67;  CumNF_10 = −49,583.33
```

**Months 11 to 14.**

```
m = 11: ΔCollections = 0.5 × 80,166.67 + 0.5 × 4,974.67 = 42,570.67; ΔVendorPaid = 837.48 + 435.07 = 1,272.55
        NF = 41,298.12; CumNF = −8,285.21
m = 12: NF = 3,783.02; CumNF = −4,502.19
m = 13: NF = 3,883.21; CumNF = −618.97
m = 14: NF = 3,888.96; CumNF = +3,269.99  → payback month = 14 (February 2028)
```

The annual invoices renew in month 21, so collections jump again in months 22 and 23, and again in months 34 and 35.

**Month by month** (reference values from the same recurrences):

| m | Month | Δ New ARR | Δ ARR | Δ Revenue | Δ Gross profit | Δ EBITDA | Δ Collections | Δ Vendor paid | Net flow NF | Cumulative NF | Δ Cash balance |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 4 | Apr 2027 | 0.00 | 0.00 | 0.00 | 0.00 | −60,000.00 | 0.00 | −0.00 | −16,000.00 | −16,000.00 | 0.00 |
| 5 | May 2027 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 60,000.00 | −60,000.00 | −76,000.00 | −60,000.00 |
| 6 | Jun 2027 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −76,000.00 | −60,200.00 |
| 7 | Jul 2027 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −76,000.00 | −60,400.67 |
| 8 | Aug 2027 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −0.00 | −76,000.00 | −60,602.00 |
| 9 | Sep 2027 | 130,000.00 | 130,000.00 | 5,416.67 | 4,750.00 | −8,250.00 | −0.00 | 0.00 | −13,000.00 | −89,000.00 | −73,804.01 |
| 10 | Oct 2027 | 0.00 | 131,040.00 | 10,876.67 | 9,604.12 | 9,604.12 | 40,083.33 | 666.67 | 39,416.67 | −49,583.33 | −34,633.36 |
| 11 | Nov 2027 | 0.00 | 132,088.32 | 10,963.68 | 9,752.14 | 9,752.14 | 42,570.67 | 1,272.55 | 41,298.12 | −8,285.21 | 6,549.32 |
| 12 | Dec 2027 | 0.00 | 133,145.03 | 11,051.39 | 9,900.08 | 9,900.08 | 4,994.57 | 1,211.54 | 3,783.02 | −4,502.19 | 10,354.18 |
| 13 | Jan 2028 | 0.00 | 134,210.19 | 11,139.80 | 9,953.96 | 9,953.96 | 5,034.52 | 1,151.31 | 3,883.21 | −618.97 | 14,271.90 |
| 14 | Feb 2028 | 0.00 | 135,283.87 | 11,228.92 | 10,043.96 | 10,043.96 | 5,074.80 | 1,185.84 | 3,888.96 | 3,269.99 | 18,208.44 |
| 21 | Sep 2028 | 0.00 | 143,171.78 | 11,881.00 | 10,699.83 | 10,699.83 | 5,385.78 | 1,181.22 | 4,204.57 | 31,695.19 | 47,344.38 |
| 22 | Oct 2028 | 0.00 | 144,403.06 | 11,982.29 | 10,800.93 | 10,800.93 | 44,443.16 | 1,181.17 | 43,261.99 | 74,957.18 | 90,764.18 |
| 23 | Nov 2028 | 0.00 | 145,666.59 | 12,086.24 | 10,904.46 | 10,904.46 | 44,813.94 | 1,181.36 | 43,632.58 | 118,589.76 | 134,699.31 |
| 24 | Dec 2028 | 0.00 | 146,963.02 | 12,192.90 | 11,010.47 | 11,010.47 | 6,188.64 | 1,181.78 | 5,006.87 | 123,596.63 | 140,155.18 |
| 36 | Dec 2029 | 0.00 | 163,450.23 | 13,560.77 | 12,332.31 | 12,332.31 | 7,581.39 | 1,227.20 | 6,354.19 | 266,954.41 | 290,779.49 |

**Test T40, expected results.**

| Measure | Expected |
|---|---|
| Total investment | 76,000.00 (60,000 cash plus 16,000 allocated) |
| Extra deals, month 9 | 2.5 |
| Extra new ARR (sum) | 130,000.00 |
| ΔARR at month 12 / month 36 | 133,145.03 / 163,450.23 |
| Sum of Δ revenue / Δ gross profit / Δ EBITDA | 333,170.83 / 300,005.32 / 227,005.32 |
| Cumulative NF at month 36 | 266,954.41 |
| NPV at 12% | 202,196.90 |
| ROI | 3.5126 |
| New ARR per dollar | 1.7105 |
| Payback month (cash) / earnings payback month | 14 / 18 |
| ΔCash balance at month 12 / month 36 | 10,354.18 / 290,779.49 |
| Cash low point, scenario | 18,222,595.30 in month 33 (baseline 18,008,506.93 in month 34; change +214,088.37) |
| Burn multiple at month 12 | 1.7161 (baseline 1.7556) |
| Blended CAC payback at month 12 | 17.88 (baseline 18.03) |
| Lowest runway, months 1 to 12 | 33.72 (baseline 34.44) |
| Highest utilization | 0.9405 in month 4 |
| Every monthly cell in the table above | as shown |

### 4.4 Hand-calculated example: hiring two account executives

**Initiative.** Two AEs start in February 2027 (m = 2):

- `headcount`: role `ae`, count 2, start month 2, no end, loaded cost 150,000 each.
- `vendor_cost` on S&M: recruiting 2 × 15,000 = 30,000 in month 2.

**Cost.**

```
ΔPayroll_m = 2 × 150,000 / 12 = 25,000.00 for m = 2 … 12
           = 25,000 × 1.03   = 25,750.00 for m = 13 … 24
           = 25,000 × 1.03²  = 26,522.50 for m = 25 … 36
Total investment = 11 × 25,000 + 12 × 25,750 + 12 × 26,522.50 + 30,000 = 932,270.00
```

**Ramp and pipeline.** AE ramp is 4 months. Each ramped AE self-sources 1.5 outbound opportunities a month and adds capacity for 7.

| m | Ramp | Ramped AEs added | Extra opps created | Extra capacity |
|---|---|---|---|---|
| 2 | 0% | 0.0 | 0.00 | 0.0 |
| 3 | 25% | 0.5 | 0.75 | 3.5 |
| 4 | 50% | 1.0 | 1.50 | 7.0 |
| 5 | 75% | 1.5 | 2.25 | 10.5 |
| 6 and later | 100% | 2.0 | 3.00 | 14.0 |

Capacity is not binding in the baseline and the hires only add capacity, so every extra opportunity is worked.

**Deals.** Outbound: win rate 24%, cycle 4 months, ACV 45,000. Opportunities from month `m` close in month `m + 4`.

```
m = 7:  0.75 × 0.24 = 0.18 deals × 45,000 =  8,100
m = 8:  1.50 × 0.24 = 0.36 deals × 45,000 = 16,200
m = 9:  2.25 × 0.24 = 0.54 deals × 45,000 = 24,300
m = 10, 11, 12:  3.00 × 0.24 = 0.72 deals × 45,000 = 32,400 each
Extra new ARR in 2027 = 8,100 + 16,200 + 24,300 + 3 × 32,400 = 145,800
```

From month 13 the integrations hub lifts these deals too. Month 13: lift share `1/6`, win rate `0.24 × (1 + 0.08/6) = 0.2432`, deals `3 × 0.2432 = 0.7296`, ACV `45,000 × (1 + 0.05/6) = 45,375`, new ARR `0.7296 × 45,375 = 33,105.60`. From month 18: win rate `0.2592`, deals `0.7776`, ACV `47,250`, new ARR `36,741.60` a month.

**Month 2.** `ΔEBITDA = −25,000 − 30,000 = −55,000`. Payroll is paid now, recruiting next month: `NF_2 = −25,000`.

**Month 3.** `ΔEBITDA = −25,000`. `NF_3 = −25,000 − 30,000 = −55,000`. `CumNF_3 = −80,000`.

**Months 4 to 6.** `NF = −25,000` each. `CumNF_6 = −155,000`.

**Month 7 (first deals).**

```
ΔARR_7 = 8,100;  ΔRevenue_7 = 8,100 / 24 = 337.50
ΔCustomers_7 = 0.18;  ΔHosting_7 = 0.09 × 360 = 32.40;  ΔThirdParty_7 = 13.50
ΔCommissions_7 = 810.00
ΔEBITDA_7 = 337.50 − 32.40 − 13.50 − 810.00 − 25,000 = −25,518.40
ΔBillings_7 = 0.60 × 8,100 + 0.40 × 337.50 = 4,995.00   (collected in months 8 and 9)
NF_7 = −25,000 − 810 = −25,810.00;  CumNF_7 = −180,810.00
```

**Month 8.**

```
ΔARR_8 = 8,100 × 1.008 + 16,200 = 24,364.80
ΔRevenue_8 = (8,100 + 24,364.80) / 24 = 1,352.70
ΔCustomers_8 = 0.18 × 0.994 + 0.36 = 0.53892;  ΔHosting_8 = (0.18 + 0.53892) / 2 × 360 = 129.41
ΔThirdParty_8 = 54.11;  ΔCommissions_8 = 1,620.00
ΔEBITDA_8 = 1,352.70 − 129.41 − 54.11 − 1,620.00 − 25,000 = −25,450.81
ΔCollections_8 = 0.5 × 4,995.00 = 2,497.50;  ΔVendorPaid_8 = 32.40 + 13.50 = 45.90
NF_8 = 2,497.50 − 45.90 − 1,620.00 − 25,000 = −24,168.40;  CumNF_8 = −204,978.40
```

**Month by month** (reference values from the same recurrences):

| m | Month | Ramped AEs added | Δ Opps | Δ Deals | Δ New ARR | Δ ARR | Δ Revenue | Δ EBITDA | Δ Collections | Net flow NF | Cumulative NF | Δ Cash balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 | Feb 2027 | 0.00 | 0.000 | 0.0000 | 0.00 | 0.00 | 0.00 | −55,000.00 | 0.00 | −25,000.00 | −25,000.00 | −25,000.00 |
| 3 | Mar 2027 | 0.50 | 0.750 | 0.0000 | 0.00 | 0.00 | 0.00 | −25,000.00 | 0.00 | −55,000.00 | −80,000.00 | −80,083.33 |
| 4 | Apr 2027 | 1.00 | 1.500 | 0.0000 | 0.00 | 0.00 | 0.00 | −25,000.00 | 0.00 | −25,000.00 | −105,000.00 | −105,350.28 |
| 5 | May 2027 | 1.50 | 2.250 | 0.0000 | 0.00 | 0.00 | 0.00 | −25,000.00 | 0.00 | −25,000.00 | −130,000.00 | −130,701.45 |
| 6 | Jun 2027 | 2.00 | 3.000 | 0.0000 | 0.00 | 0.00 | 0.00 | −25,000.00 | 0.00 | −25,000.00 | −155,000.00 | −156,137.12 |
| 7 | Jul 2027 | 2.00 | 3.000 | 0.1800 | 8,100.00 | 8,100.00 | 337.50 | −25,518.40 | 0.00 | −25,810.00 | −180,810.00 | −182,467.57 |
| 8 | Aug 2027 | 2.00 | 3.000 | 0.3600 | 16,200.00 | 24,364.80 | 1,352.70 | −25,450.81 | 2,497.50 | −24,168.40 | −204,978.40 | −207,244.20 |
| 9 | Sep 2027 | 2.00 | 3.000 | 0.5400 | 24,300.00 | 48,859.72 | 3,051.02 | −24,791.65 | 7,647.48 | −19,966.03 | −224,944.43 | −227,901.05 |
| 10 | Oct 2027 | 2.00 | 3.000 | 0.7200 | 32,400.00 | 81,650.60 | 5,437.93 | −23,500.89 | 13,108.66 | −15,544.01 | −240,488.44 | −244,204.73 |
| 11 | Nov 2027 | 2.00 | 3.000 | 0.7200 | 32,400.00 | 114,703.80 | 8,181.43 | −21,054.71 | 18,883.53 | −10,055.29 | −250,543.74 | −255,074.04 |
| 12 | Dec 2027 | 2.00 | 3.000 | 0.7200 | 32,400.00 | 148,021.43 | 10,946.88 | −18,552.08 | 22,477.10 | −6,759.05 | −257,302.78 | −262,683.33 |
| 13 | Jan 2028 | 2.00 | 3.000 | 0.7296 | 33,105.60 | 182,311.20 | 13,763.86 | −16,923.40 | 23,736.91 | −6,582.61 | −263,885.39 | −270,141.55 |
| 14 | Feb 2028 | 2.00 | 3.000 | 0.7392 | 33,818.40 | 217,588.09 | 16,662.47 | −14,427.64 | 25,224.37 | −5,534.17 | −269,419.57 | −276,576.20 |
| 18 | Jun 2028 | 2.00 | 3.000 | 0.7776 | 36,741.60 | 368,870.59 | 29,098.48 | −3,659.89 | 32,401.82 | −5.04 | −277,917.52 | −288,846.31 |
| 24 | Dec 2028 | 2.00 | 3.000 | 0.7776 | 36,741.60 | 613,444.75 | 49,377.52 | 14,487.16 | 62,130.49 | 27,597.03 | −190,656.57 | −207,001.75 |
| 29 | May 2029 | 2.00 | 3.000 | 0.7776 | 36,741.60 | 828,240.53 | 67,198.22 | 29,518.51 | 72,670.00 | 35,358.97 | −32,242.92 | −51,061.56 |
| 30 | Jun 2029 | 2.00 | 3.000 | 0.7776 | 36,741.60 | 872,353.48 | 70,858.08 | 32,809.53 | 74,960.09 | 37,280.38 | 5,037.46 | −13,951.39 |
| 36 | Dec 2029 | 2.00 | 3.000 | 0.7776 | 36,741.60 | 1,145,399.22 | 93,511.53 | 53,245.77 | 107,092.71 | 67,197.07 | 324,125.37 | 307,182.01 |

Cumulative net flow turns positive in month 30 (June 2029).

**Test T41, expected results.**

| Measure | Expected |
|---|---|
| Total investment | 932,270.00 |
| Extra deals (sum over 36 months) | 21.7584 |
| Extra new ARR (sum) | 1,016,618.40 |
| ΔARR at month 12 / month 36 | 148,021.43 / 1,145,399.22 |
| Sum of Δ revenue / Δ gross profit / Δ EBITDA | 1,276,760.68 / 1,134,424.85 / 100,493.01 |
| Cumulative NF at month 36 | 324,125.37 |
| NPV at 12% | 191,401.37 |
| ROI | 0.3477 |
| New ARR per dollar | 1.0905 |
| Payback month (cash) / earnings payback month | 30 / 35 |
| ΔCash balance at month 12 / month 36 | −262,683.33 / 307,182.01 |
| Cash low point, scenario | 18,148,931.91 in month 33 (change +140,424.98) |
| Burn multiple at month 12 | 1.7560 (baseline 1.7556) |
| Blended CAC payback at month 12 | 18.27 (baseline 18.03) |
| Lowest runway, months 1 to 12 | 33.13 (baseline 34.44) |
| Capacity in month 6 | 56 (baseline 42) |
| Every monthly cell in the table above | as shown |

What the two examples say together: the trade show is small and pays back in cash by month 14. The two AEs add about seven times as much ARR by month 36 but take until month 30 to pay back, because the team already has spare capacity and each AE only brings the pipeline they source themselves.

### 4.5 Initiatives: more cases

| Test | Scenario | Expected |
|---|---|---|
| T42 | Null initiative: `program_spend` on paid of 0 in month 3, `direct_leads` on events of 0 in month 4, `headcount` AE count 0 from month 5, `vendor_cost`, `allocated_cost` and `capex` of 0 | Every series equals the baseline (largest difference 0 within 1e-6). NPV 0, total investment 0, payback "no effect" |
| T43 | Trade show (4.3) and two AEs (4.4) together | Capacity never binds, so results add up: NPV 393,598.27 = 202,196.90 + 191,401.37; ΔARR at month 12 = 281,166.46; ARR at month 12 = 30,329,655.82 |
| T44 | Trade show (4.3) plus `program_spend` on paid of 120,000 in month 4 (`from_cpl`, multiplier 1) | Month 4: created 13.5 / 22.5 / 14.0 / 4.5 (total 54.5), capacity 42, WorkShare 0.770642, worked 10.4037 / 17.3394 / 10.7890 / 3.4679. ΔARR at month 12 = 99,359.35, which is less than the two alone (133,145.03 for the show, 63,359.02 for the campaign, 196,504.05 together). ARR at month 12 = 30,147,848.71 |
| T45 | `program_spend` on paid of 120,000 in month 4 alone | Utilization in month 4 = 1.0595; WorkShare 0.943820; ΔARR at month 12 = 63,359.02 |
| T46 | Hire SDRs template defaults: 2 SDRs from month 2, recruiting 16,000 in month 2, tools 3,000 a month on outbound from month 2 to 36 (`leads: "none"`) | Reference values: NPV 466,556.62; payback month 24; ΔARR at month 12 = 181,471.27; ROI 0.9433; highest utilization 0.8286 |
| T47 | Paid campaign template defaults: 30,000 a month in months 2, 3, 4, `from_cpl`, `cplMultiplier` 1.20 | Month 2 paid leads = 250 + 30,000 / (240 × 1.2) = 354.1667; paid deals in month 4 = 1.9125; paid new ARR in month 4 = 57,375.00; P&L program spend in month 2 = 170,000. Reference values: NPV 26,163.11; payback month 29; ΔARR at month 12 = 53,530.09 |
| T48 | `driver_change`: `winRate` on paid, multiply by 1.5, months 10 to 12 | Paid deals: month 9 = 1.35; months 10, 11, 12 = 2.025; month 13 = 1.368 (the hub lift only). ΔARR at month 12 = 61,237.30 |
| T49 | `headcount`: 1 AE from month 2 with `endMonth` 7 | ΔPayroll = 12,500 in months 2 to 7 and 0 otherwise. Extra outbound opps: 0.375, 0.75, 1.125, 1.5, 1.5 in months 3 to 7, then 0. Extra deals: 0.09, 0.18, 0.27, 0.36, 0.36 in months 7 to 11, then 0 |

### 4.6 Edge cases

Each scenario must also pass all 16 integrity checks.

| Test | Scenario | Expected |
|---|---|---|
| T50 | `oppCapacityPerAePerMonth` = 4 | Month 1: capacity 24, created 29.5, WorkShare 0.813559, outbound worked 10.9831. New ARR: month 1 = 289,600.00 (from the opening pipeline); month 3 = 282,049.15; month 4 = 272,484.75; month 5 = 245,301.69; month 6 = 235,606.78 (= 289,600 × 24 / 29.5). ARR at month 12 = 29,576,442.26 |
| T51 | Paid `programSpendMonthly` = 0 | Paid leads 0 in every month. Paid deals 1.35 in months 1 and 2 (opening pipeline), then 0. P&L program spend in month 1 = 80,000. ARR at month 12 = 29,628,593.93; at month 36 = 44,955,862.07. No NaN anywhere |
| T52 | Extra `program_spend` on paid of 10,000,000 in month 1 (`from_cpl`) | Month 1: paid leads 41,916.67; created 1,279.5; WorkShare 0.032825; total worked 42.0. EBITDA in month 1 = −11,127,547.20. Cash at month 1 unchanged at 36,964,790.00 (the bill is paid in month 2); cash at month 2 = 25,951,218.77. New ARR in month 3 = 472,000.35. Cash low point 6,711,626.71 in month 35: floor and covenant both reported as breached. All numbers finite |
| T53 | `opening.cash` = 5,000,000 | Opening retained earnings −105,716,000. Cash at month 4 = 560,400.58; at month 5 = −479,522.32. Interest income in month 6 = 0. Runway at month 5 = 0. Balance sheet still balances |
| T54 | `dsoDays` = 30 | `AR_1` = 2,164,986.67; collections in month 1 = 3,180,000.00; cash at month 1 = 38,024,790.00 |
| T55 | `dsoDays` = 60 | `AR_1` = 4,284,986.67; collections in month 1 = 1,060,000.00; cash at month 1 = 35,904,790.00; cash at month 36 = 15,929,770.08 |
| T56 | `dsoDays` = 0 | `AR_1` = 0; collections in month 1 = 5,344,986.67 |
| T57 | `dpoDays` = 45 | `AP_1` = 1,557,403.87; vendor payments in month 1 = 520,000.00; cash at month 1 = 37,484,790.00 |
| T58 | `debtAmortStartMonth` = 25, `debtAmortMonths` = 20 | Principal 500,000 in each of months 25 to 36; debt at month 36 = 4,000,000; interest expense in month 25 = 91,666.67 and in month 26 = 87,083.33; `CFF_25` = −500,000; cash at month 36 = 12,328,356.50 (floor breached, covenant not breached) |
| T59 | Integrations hub `shipMonth` = 40 | Same as the hub disabled: ARR at month 36 = 45,700,686.96 |
| T60 | Hosting optimization `shipMonth` = 1 | Hosting: month 1 = 216,601.20 (no effect in the ship month); month 2 = 203,279.99 (one third of the effect); month 4 = 176,140.83 (full effect; baseline 220,176.04) |
| T61 | All three milestones disabled | ARR at month 12 = 30,048,489.36 (unchanged, no milestone affects ARR before month 13); ARR at month 36 = 45,114,663.02; cash low point 15,381,981.28 in month 36 |
| T62 | `annualBillingShare` = 0 | Deferred revenue is 0 in every month; opening retained earnings −65,230,000; cash at month 1 = 36,964,790.00 (unchanged, because month-1 collections come from opening receivables) |
| T63 | Tax function alone, `taxRate` 25% | (pre-tax −100,000, NOL 500,000) → tax 0, NOL 600,000. (100,000, 500,000) → tax 0, NOL 400,000. (100,000, 40,000) → tax 15,000, NOL 0. (100,000, 0) → tax 25,000, NOL 0 |
| T64 | Ramp function alone | `ramp(−1, 4) = 0`, `ramp(0, 4) = 0`, `ramp(1, 4) = 0.25`, `ramp(4, 4) = 1`, `ramp(9, 4) = 1`, `ramp(0, 0) = 1`, `ramp(−1, 0) = 0` |

### 4.7 Tests added by the first engine audit

Added in `AUDIT-1.md`. "Reference" expected values come from a second, independent calculation of the formulas in section 2. The others are worked by hand in the test.

| Test | What it proves |
|---|---|
| T70 | A missing, non-numeric or out-of-range input stops the run with a reason that names it (section 2.16 rule 5) |
| T71 | A profitable company: tax losses are used first, tax is then paid in cash and on the last day of the month in the 13-week view, runway is "not burning", and all 16 checks pass |
| T72 | C5 fails when AE capacity is exceeded but not applied |
| T73 | C10 fails when `cashFloor` and `guardrails.cashFloor` differ, and ties the guardrail rows to the breach report |
| T74 | Template defaults reproduce sections 4.3 and 4.4, and the template "Ramp" input changes the result |
| T75 | Partner program template: 16.67 extra leads a month for 12 months, 72,675 of partner new ARR in month 6, investment 160,000 |
| T76 | Capex initiative: depreciation starts the month after purchase and stops after the useful life |
| T77 | Vendor costs on COGS, R&D and G&A hit the right line and are paid a month later |
| T78 | Every driver, both modes, order independence, clamping, and lead-month versus close-month timing |
| T79 | Each guardrail can fail and the objective can be met |
| T80 | Payback month rules, including "never negative" and "not within 36 months" |
| T81 | 13-week forecast from other start months: leap-year February, principal payments, floor versus covenant flags |
| T82 | Debt amortization starts and stops on the right months |
| T83 | Annualized ARR growth, revenue growth, channel program cost per deal, and payables at 45 days |
| T84 | Milestones that ship in month 1, month 35, and month 36 or later |
| T85 | Every sub-test inside every integrity check can fail |
| T86 | An initiative hire uses its own loaded cost and stops at its end month |

### 4.8 Tests added in Step 2 (the "Where we stand" view)

The screen reads four engine views that only group the series above: `periods` (months, calendar quarters and calendar years, with partial periods marked), `statements` (P&L and cash flow summed over each period, balance sheet at each period end with an opening column, margins as period profit over period revenue), `arrBridge` (opening ARR, new, expansion, contraction, churn, closing ARR for any run of months) and `kpiCards` (the eight cards with value, plan value, change vs plan, trend and guardrail). "Plan" on the cards is the model run with the default assumptions.

| Test | What it proves |
|---|---|
| T90 | Yearly statements reproduce every comparable cell of section 8.2 and the year-end balance sheets of section 8.3 |
| T91 | Months and quarters add up to years; in every period opening cash plus net change equals ending cash, which equals balance sheet cash; partial years for a July start |
| T92 | The ARR bridge reproduces the ARR rows of section 8.2 for each year and for all 36 months, and always ties |
| T93 | The cards show the section 8.4 KPIs at month 12; change vs plan is scenario minus plan; guardrail flags, "not burning" and breaches |
| UI (in `tests/run.js`) | Eight cards with trend lines; ARR bridge labels; floor and covenant lines on the 13-week chart; month, quarter and year columns; every assumption has an input labeled Actual or Assumption; an edit recalculates and shows change vs plan; a blank input is an error, not zero; Reset; no sideways scrolling on a 390px phone; no em dashes |

### 4.9 Tests added in Step 3 (the Initiative Evaluator)

The Add initiative form builds each initiative with the templates of section 1.17 and evaluates it with `applyInitiatives`, alone against the plan; the scenario on "Where we stand" includes every initiative marked "In scenario", in one run. The decision card reads `decisionView`, which regroups that result by month (cost, leads, opportunities, deals, new ARR, revenue, gross profit, EBITDA, cash), and `initiativeTrace`, which follows every extra lead through the funnel to its close month and lists the drivers used. `checkTemplateParams` checks the form's inputs: months must be whole months inside the model, costs 0 or more, people and campaign months whole numbers of 1 or more, and a paid campaign needs a channel that buys leads with spend. A campaign that runs past the model is a warning; the months after it are not counted.

| Test | What it proves |
|---|---|
| T94 | The trade show template's card reproduces section 4.3: cost 76,000 in April 2027, 200 leads to 2.5 deals and 130,000 of new ARR in September 2027, every cell of the month-by-month table, NPV, ROI, payback 14 and 18, the KPI and cash low point effects, all five guardrails passing, and a one-row trace |
| T95 | The two-AE template's card reproduces section 4.4, including every cell of its month-by-month table, and the trace of AE-sourced opportunities through the integrations hub lift; 12 opportunities are still open when the model ends |
| T96 | Each template asks for exactly its default inputs; bad inputs are rejected with the field named; the paid campaign and SDR cards match T46 and T47 |
| T97 | For ten scenarios the trace adds up: leads times rates give MQLs and opportunities, worked times win rate gives deals, deals times ACV gives new ARR, and the traced total equals the new ARR in the returns; capacity losses show in April 2027 for T44 |
| UI (in `tests/run.js`) | The form's fields and defaults; the trade show and two-AE cards show the section 4.3 and 4.4 numbers; together they show the T43 NPV; the sources panel shows the drivers; editing, excluding, removing and input checks work; no sideways scrolling on a phone |

---

## 5. Units, sign conventions, rounding and glossary

### 5.1 Units

- Money is in US dollars. Inputs and engine values are plain dollars (not thousands).
- Rates are decimals in the engine (0.006) and percentages on screen (0.6%).
- Time is in whole months. Loaded costs are per year and are divided by 12. ARR is an annual amount; revenue is a monthly amount.
- Leads, MQLs, opportunities, deals and customers are expected counts and may be fractional.

### 5.2 Sign conventions

- Revenue, costs, spend, invoices, collections, payments, headcount and balances are stored as **positive** numbers. A cost is a positive number that is subtracted.
- Profit lines (gross profit, EBITDA, net income) are positive for profit and negative for loss.
- On the cash flow statement, inflows are positive and outflows are negative. `CFI` and `CFF` are negative when cash goes out.
- **Net burn** is positive when cash is going down. A negative net burn means the company is generating cash.
- Retained earnings is negative for an accumulated deficit.
- A **delta** is always scenario minus baseline. A positive delta on a cost is bad; a positive delta on cash is good.
- `NF` (net flow) is positive when the initiative is returning money and negative when it is consuming money.

### 5.3 Rounding

- The engine never rounds. All checks and tests use unrounded values.
- Display only: dollars in tables as whole dollars with thousands separators; large numbers on cards as $K or $M with one decimal ($30.0M); percentages with one decimal; multiples with two decimals and an "x" (1.76x); months as whole numbers with the calendar month ("Month 14, Feb 2028"); deals and customers with one decimal; leads as whole numbers.
- Totals on screen are the rounded unrounded total, not the sum of rounded rows, so a column can be off by 1 from its displayed rows.
- Losses in financial statements may be shown in parentheses. Elsewhere use a minus sign.
- A payback month is always a whole month: the first month in which the cumulative figure is zero or better.

### 5.4 Glossary

| Term | Plain meaning |
|---|---|
| ARR | Annual recurring revenue: the yearly value of all active subscriptions today |
| ACV | Annual contract value: the first-year subscription value of one new deal |
| New ARR | ARR from customers who signed this month |
| Expansion | ARR added by existing customers buying more or paying more |
| Contraction | ARR lost when existing customers buy less but stay |
| Churn | ARR lost when customers leave |
| Gross revenue retention | Share of last year's ARR still here a year later, ignoring expansion |
| Net revenue retention | The same, including expansion |
| Lead | A prospect who has responded or been captured (a form fill, a badge scan, a reply) |
| MQL | A lead that fits the profile and is worth a sales conversation |
| Opportunity | A qualified deal a sales rep is actively working |
| Win rate | Share of worked opportunities that become customers |
| Sales cycle | Months from an opportunity being created to the deal closing |
| SDR | Sales development rep: books first conversations |
| AE | Account executive: works opportunities and closes deals |
| Ramp | The months a new rep needs to reach full productivity |
| Capacity | The number of new opportunities the AE team can work in a month |
| Utilization | Opportunities created divided by capacity |
| Fully loaded cost | The full yearly cash cost of an employee: pay, taxes, benefits, equipment |
| COGS | Costs of delivering the product: hosting, licensed software, support and onboarding staff |
| Gross margin | Revenue minus COGS, as a share of revenue |
| EBITDA | Profit before interest, tax and depreciation |
| Deferred revenue | Money invoiced in advance for service not yet delivered. A liability |
| DSO | Days sales outstanding: how long customers take to pay |
| DPO | Days payable outstanding: how long the company takes to pay vendors |
| Net burn | Cash consumed in a month by operations and capex |
| Runway | Months of cash left at the recent burn rate |
| Burn multiple | Dollars of cash burned for each dollar of net new ARR. Lower is better |
| CAC | Customer acquisition cost: sales and marketing spend per new customer |
| CAC payback | Months of gross profit needed to earn back the sales and marketing spend |
| LTV | Lifetime value: the gross profit expected from a customer before they leave |
| Covenant | A lender's rule. Here: cash must stay at or above $12M |
| Cash floor | The company's own rule. Here: cash must stay at or above $15M |
| Baseline | The plan with no new initiatives |
| Initiative | A proposed use of money: an event, a hire, a campaign, a product pull-in |
| Incremental | The difference an initiative makes: scenario minus baseline |
| Allocated cost | The value of existing staff time spent on an initiative. Not extra cash |
| Net flow | The cash an initiative returns or consumes in a month, before interest, less allocated cost |
| Payback month | The first month in which an initiative has returned everything it cost |
| NPV | Net present value: all future net flows in today's dollars |
| ROI | Net return divided by the amount invested |
| Cash low point | The lowest month-end cash balance in the 36 months |
| Integrity check | A test that the model's numbers tie to each other |

---

## 6. Proof of work: opening balance sheet and January 2027 by hand

Every number below was calculated by hand from the assumptions in section 1 and then compared with the reference calculation. They match to the cent.

### 6.1 Opening balance sheet

Deferred revenue, from the invoice table in section 1.9:

```
44,500 + 136,500 + 232,500 + 332,500 + 436,500 + 544,500
+ 656,500 + 772,500 + 892,500 + 1,016,500 + 1,144,500 + 1,276,500 = 7,486,000
```

```
Assets      = 38,000,000 + 3,180,000 + 850,000 + 1,080,000 = 43,110,000
Liabilities = 1,040,000 + 1,300,000 + 7,486,000 + 10,000,000 = 19,826,000
Retained earnings = 43,110,000 − 19,826,000 − 96,000,000 = −72,716,000
Equity      = 96,000,000 − 72,716,000 = 23,284,000
Liabilities + equity = 19,826,000 + 23,284,000 = 43,110,000 = assets   ✓
```

Consistency of the opening inputs: receivables `1.5 × 2,120,000 = 3,180,000` ✓. Annual invoices total `14,400,000 = 0.60 × 24,000,000` ✓.

### 6.2 January 2027: funnel and ARR

Deals in January come from the opening pipeline, because every sales cycle is at least 2 months.

```
Outbound: 13.5 × 0.24 = 3.24 deals × 45,000 = 145,800
Paid:      7.5 × 0.18 = 1.35 deals × 30,000 =  40,500
Events:    4.0 × 0.25 = 1.00 deals × 52,000 =  52,000
Partners:  4.5 × 0.30 = 1.35 deals × 38,000 =  51,300
Total:                  6.94 deals            289,600
```

Leads created in January (they close in later months):

```
Outbound: 3 SDRs × 25 = 75 leads → 15 MQLs → 4.5 opps, plus 6 AEs × 1.5 = 9 → 13.5 created
Paid:     60,000 / 240 = 250 leads → 50 MQLs → 7.5 opps
Events:   28,000 / 350 =  80 leads → 20 MQLs → 4.0 opps
Partners: 24,000 / 600 =  40 leads → 18 MQLs → 4.5 opps
Created 29.5 ≤ capacity 6 × 7 = 42 → all worked; utilization 70.24%
```

ARR and customers:

```
Churn       = 24,000,000 × 0.0060 = 144,000
Contraction = 24,000,000 × 0.0027 =  64,800
Expansion   = 24,000,000 × 0.0167 = 400,800
ARR_1       = 24,000,000 + 289,600 + 400,800 − 64,800 − 144,000 = 24,481,600
Customers_1 = 600 + 6.94 − 600 × 0.006 = 603.34
Revenue_1   = (24,000,000 + 24,481,600) / 24 = 2,020,066.67
```

### 6.3 January 2027: P&L

| Line | Calculation | Amount |
|---|---|---|
| Revenue | above | 2,020,066.67 |
| Hosting | (600 + 603.34) / 2 × 360 | 216,601.20 |
| Third-party software | 4% × 2,020,066.67 | 80,802.67 |
| Support and onboarding staff | 2,245,000 / 12 | 187,083.33 |
| **COGS** | | **484,487.20** |
| **Gross profit** | 76.02% of revenue | **1,535,579.47** |
| R&D payroll | 11,815,000 / 12 | 984,583.33 |
| R&D non-headcount | | 170,000.00 |
| **R&D** | | **1,154,583.33** |
| S&M payroll | 6,590,000 / 12 | 549,166.67 |
| Program spend | 28,000 + 60,000 + 28,000 + 24,000 | 140,000.00 |
| Commissions | 10% × 289,600 | 28,960.00 |
| S&M non-headcount | | 130,000.00 |
| **S&M** | | **848,126.67** |
| G&A payroll | 4,325,000 / 12 | 360,416.67 |
| G&A non-headcount | | 300,000.00 |
| **G&A** | | **660,416.67** |
| **Operating expenses** | | **2,663,126.67** |
| **EBITDA** | 1,535,579.47 − 2,663,126.67 | **−1,127,547.20** |
| Depreciation | 1,080,000 / 24 | 45,000.00 |
| EBIT | | −1,172,547.20 |
| Interest income | 38,000,000 × 4% / 12 | 126,666.67 |
| Interest expense | 10,000,000 × 11% / 12 | 91,666.67 |
| Pre-tax income | | −1,137,547.20 |
| Tax | loss, so none | 0.00 |
| **Net income** | | **−1,137,547.20** |

### 6.4 January 2027: billing and working capital

```
Annual invoices I_1 = 0.60 × (289,600 + 400,800) + 1,068,000 − 0.60 × (144,000 + 64,800)
                    = 414,240 + 1,068,000 − 125,280 = 1,356,960.00
Monthly billed      = 0.40 × 2,020,066.67 = 808,026.67
Billings_1          = 1,356,960.00 + 808,026.67 = 2,164,986.67

Deferred revenue_1  = 7,486,000 + 1,356,960.00 − 0.60 × 2,020,066.67 = 7,630,920.00
AR_1                = 2,164,986.67 + 0.5 × 2,120,000 = 3,224,986.67
Collections_1       = 3,180,000 + 2,164,986.67 − 3,224,986.67 = 2,120,000.00

Vendor spend_1      = 216,601.20 + 80,802.67 + 140,000 + 170,000 + 130,000 + 300,000 = 1,037,403.87
AP_1                = 1,037,403.87
Vendor paid_1       = 1,040,000 + 1,037,403.87 − 1,037,403.87 = 1,040,000.00

PP&E_1              = 1,080,000 + 40,000 − 45,000 = 1,075,000.00
```

### 6.5 January 2027: cash, two ways

Direct method:

```
Opening cash                    38,000,000.00
+ Collections                    2,120,000.00
− Payroll                        2,081,250.00
− Commissions                       28,960.00
− Vendor payments                1,040,000.00
− Capex                             40,000.00
+ Interest income                  126,666.67
− Interest expense                  91,666.67
− Tax                                    0.00
− Principal                              0.00
= Ending cash                   36,964,790.00
```

Indirect method:

```
Net income                      −1,137,547.20
+ Depreciation                      45,000.00
− Increase in receivables          −44,986.67      (3,224,986.67 − 3,180,000)
+ Change in payables                −2,596.13      (1,037,403.87 − 1,040,000)
+ Increase in deferred revenue     144,920.00      (7,630,920 − 7,486,000)
= Cash from operations            −995,210.00
Capex                              −40,000.00
Financing                                0.00
= Net change in cash            −1,035,210.00
Opening cash + change = 38,000,000 − 1,035,210 = 36,964,790.00   ✓ same as the direct method
```

Net burn in January 2027 = 1,035,210.00. Free cash flow before interest = −1,035,210 − 126,666.67 + 91,666.67 = −1,070,210.00.

### 6.6 January 2027: balance sheet

```
Assets      = 36,964,790.00 + 3,224,986.67 + 850,000 + 1,075,000 = 42,114,776.67
Liabilities = 1,037,403.87 + 1,300,000 + 7,630,920.00 + 10,000,000 = 19,968,323.87
Retained earnings = −72,716,000 − 1,137,547.20 = −73,853,547.20
Equity      = 96,000,000 − 73,853,547.20 = 22,146,452.80
Liabilities + equity = 19,968,323.87 + 22,146,452.80 = 42,114,776.67 = assets   ✓
```

### 6.7 January 2027: KPIs

```
Runway            = 36,964,790.00 / 1,035,210.00 = 35.71 months
Burn multiple     = 1,035,210.00 / (24,481,600 − 24,000,000) = 2.15
Blended CAC payback = 12 × 848,126.67 / ((289,600 + 400,800) × 0.76016) = 19.39 months
Acquisition S&M   = 848,126.67 − 15 × 140,000 / 12 = 673,126.67
New-logo CAC payback = 12 × 673,126.67 / (289,600 × 0.76016) = 36.69 months
CAC per new customer = 673,126.67 / 6.94 = 96,992
LTV               = (24,481,600 / 603.34) × 0.76016 / (12 × 0.0087) = 295,450
```

The January burn multiple is above 2.0. The guardrail is measured over the 12 months to December 2027, where the baseline is 1.76.

### 6.8 January 2027: every integrity check

| # | Evidence for January 2027 | Result |
|---|---|---|
| C1 | Assets 42,114,776.67 = liabilities 19,968,323.87 + equity 22,146,452.80 | Pass |
| C2 | Direct cash 36,964,790.00 = 38,000,000 − 995,210 − 40,000 + 0 | Pass |
| C3 | −73,853,547.20 = −72,716,000 − 1,137,547.20 | Pass |
| C4 | 24,481,600 = 24,000,000 + 289,600 + 400,800 − 64,800 − 144,000; channel new ARR sums to 289,600 | Pass |
| C5 | Each channel: leads ≥ MQLs ≥ sourced opps (for example paid 250 ≥ 50 ≥ 7.5); created = worked; deals ≤ opening pipeline (for example outbound 3.24 ≤ 13.5) | Pass |
| C6 | Funnel spend 28,000 + 60,000 + 28,000 + 24,000 = 140,000 = P&L program spend | Pass |
| C7 | Null initiative run equals the baseline (difference 0) | Pass |
| C8 | 2,020,066.67 × 24 = 48,481,600 = 24,000,000 + 24,481,600 | Pass |
| C9 | (a) 7,630,920 = 7,486,000 + 1,356,960 − 1,212,040. (b) From the schedule: 1,356,960 × 23/24 + 1,332,000 × 21/24 + 1,308,000 × 19/24 + 1,284,000 × 17/24 + 1,260,000 × 15/24 + 1,236,000 × 13/24 + 1,212,000 × 11/24 + 1,188,000 × 9/24 + 1,164,000 × 7/24 + 1,140,000 × 5/24 + 1,116,000 × 3/24 + 1,092,000 × 1/24 = 7,630,920. (c) Last 12 invoices: 14,400,000 − 1,068,000 + 1,356,960 = 14,688,960 = 0.60 × 24,481,600. (d) 1,356,960 ≥ 0 | Pass |
| C10 | Cash 36,964,790 is above the 15,000,000 floor and the 12,000,000 covenant; both results reported | Pass |
| C11 | AR: 3,224,986.67 = 3,180,000 + 2,164,986.67 − 2,120,000. AP: 1,037,403.87 = 1,040,000 + 1,037,403.87 − 1,040,000 | Pass |
| C12 | Payroll by line 187,083.33 + 984,583.33 + 549,166.67 + 360,416.67 = 2,081,250 = 24,975,000 / 12; headcount 140 | Pass |
| C13 | 2,020,066.67 − 484,487.20 = 1,535,579.47; 1,535,579.47 − 2,663,126.67 = −1,127,547.20; −1,127,547.20 − 45,000 + 126,666.67 − 91,666.67 − 0 = −1,137,547.20 | Pass |
| C14 | PP&E 1,075,000 = 1,080,000 + 40,000 − 45,000; debt 10,000,000 unchanged; interest 91,666.67 = 10,000,000 × 11% / 12 | Pass |
| C15 | Daily path on January 31 = 36,964,790.00 (section 8.5) | Pass |
| C16 | 603.34 = 600 + 6.94 − 3.6; all values finite | Pass |

All 16 checks pass for the opening position and January 2027. The reference calculation confirms C1 to C4, C8, C9 and C11 to C16 for all 36 months of the baseline and for every scenario in section 4.

---

## 7. Assumptions a real CFO would question

Each item says what was chosen and why. All of them are editable in the Assumptions panel unless noted.

1. **The cost base is very heavy.** Operating expenses are 132% of revenue in January 2027 (R&D 57%, S&M 42%, G&A 33%), and EBITDA margin is −56%. Benchmarks for this size are far lower, especially G&A. This follows directly from the brief: about $1.1M of monthly burn on about $2.0M of monthly revenue with 140 people. I spread the excess across all three lines instead of hiding it in one.
2. **Month-1 burn is $1.04M, not exactly $1.1M.** `CLAUDE.md` says "about $1.1M". Burn then falls every month as revenue grows. Average burn in 2027 is $0.88M.
3. **The plan gets to cash breakeven with very little hiring.** Headcount goes from 140 to 172 while ARR nearly doubles to $46.8M and gross margin rises from 76% to 82%. That is optimistic operating leverage. It was chosen so the baseline stays above the $15M floor without a fundraise, which lets initiatives be judged on their own. Low point: $18.0M in October 2029.
4. **No fundraise and no refinancing are modeled.** A real Series B company would raise before 2029. Equity turns slightly negative on the balance sheet by December 2029 (−$1.2M), which a board would not ignore.
5. **Venture debt never amortizes inside the model.** Interest-only until July 2030 is generous for venture debt. If principal payments of $500K a month started in January 2029, cash would end at $12.3M: below the floor and just above the covenant (test T58). This is the single biggest risk to the cash picture.
6. **New-logo CAC payback is poor: 36 months.** Acquisition spend is about $97K per new customer against a $42K ACV. The guardrail uses the kinder **blended** measure (new plus expansion ARR against all S&M including CSMs), which is 18 months. Both are shown. A CFO may want the guardrail on the stricter one.
7. **Over 40% of net new ARR comes from the installed base.** In 2027, 2.57M of the 6.05M of net new ARR is expansion net of churn and contraction. Net revenue retention of 110% is applied as a flat monthly rate to all ARR, including customers who signed last month. There are no cohorts, no seasonality and no link between expansion and customer success headcount.
8. **AE capacity is a judgment call.** Seven new opportunities per AE per month puts baseline utilization at 70%. Opportunities above capacity are lost, not delayed, and every channel loses the same share. That is simple and conservative. It also means hiring AEs alone has a weak return (payback in month 30), because the team has spare capacity and a new AE only adds what they source themselves (1.5 opportunities a month).
9. **Sales cycles are exact.** Every deal closes exactly N months after the opportunity is created. Real pipelines spread out. The simulation phase varies the cycle.
10. **Annual upfront billing flatters cash.** 60% of ARR is billed a year in advance, expansion is billed upfront when it lands, and churn is assumed to come only out of the group renewing that month, so there are no refunds. Deferred revenue grows by $145K to $254K a month, which funds part of the burn. It also makes cash payback on initiatives faster than earnings payback (14 vs 18 months for the trade show).
11. **Mid-month revenue convention.** ARR changes are assumed to happen evenly through the month. Deals in a real quarter close late.
12. **Commissions are expensed and paid when the deal closes.** No capitalization and amortization of contract costs, no clawbacks, and no commission on expansion (assumed to be inside CSM pay).
13. **Accounting simplifications.** No stock compensation, no capitalized software, no lease accounting (rent is an expense), no services revenue, no bad debt, no sales tax, prepaid and accrued balances held flat, payroll paid in the month.
14. **Tax is effectively zero.** The company has $70M of tax losses and stays loss-making, so no tax is paid. State minimum taxes and limits on using losses are ignored.
15. **Cash earns 4%.** Reasonable for treasury bills today, but it adds $1.3M of income in 2027. Initiative returns exclude interest so they are not flattered by it.
16. **Discount rate of 12%.** Close to the cost of the venture debt (11%). A venture-backed company's cost of equity is higher; many CFOs would use 15% to 25%. A higher rate hurts slow-payback initiatives such as hires the most.
17. **NPV stops at month 36.** No terminal value. ARR still in place at month 36 has real value that is not counted, so long-lived initiatives look worse than they are.
18. **Product milestone effects are guesses.** Win rate +8% and ACV +5% on every channel from the integrations hub, churn −15% from the mobile app, hosting −20% from the optimization project. The first two are the hardest to defend and matter most after 2027. With all three switched off, the cash low point falls to $15.4M (test T61).
19. **Hosting scales with customers, not usage.** Cost per customer rises 5% a year. Third-party software is a flat 4% of revenue. Support and onboarding staff follow the hiring plan, not a ratio to customers.
20. **Events spend is smooth.** The baseline spreads events spend evenly ($28K a month). Real events are lumpy. A specific trade show is modeled as an initiative on top.
21. **Outbound program spend buys no leads.** Outbound leads come from SDR capacity. The $28K a month is treated as tooling. Cutting it changes cost only.
22. **The opening pipeline is a single number per channel.** Opportunities created before January 2027 are assumed equal to the January run rate.
23. **Staff time on an initiative counts as a cost in returns but not in cash.** The 16,000 of staff days on the trade show lowers its NPV and ROI but does not appear in the P&L or cash, because those people are paid anyway.
24. **Runway uses the last three months of burn.** It is a backward-looking measure. It says "not burning" once the three-month average burn is zero or negative.
25. **Guardrails are tested at month-end.** The 13-week view shows cash dipping within a month around payroll dates; the floor and covenant tests use month-end balances only.
26. **Uncertainty ranges and template defaults (sections 1.16, 1.17) are judgment.** They are starting points, not evidence.

Items 27 to 41, on product acceleration, are in section 9.15.

Differences from `CLAUDE.md`: month-1 burn 1.04M (brief: about 1.1M); new-deal ACV averages about 41.7K while the installed base averages 40K; the product roadmap has exact months (hosting optimization September 2027, integrations hub December 2027) inside the quarters the brief gives.

---

## 8. Baseline reference tables

Reference values for the default assumptions with no initiatives. Tests T07 to T11 compare the engine with these tables.

### 8.1 Monthly

| m | Month | New ARR | Closing ARR | Customers | Revenue | Gross profit | EBITDA | Net income | Net burn | Ending cash | Deferred revenue |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Jan 2027 | 289,600.00 | 24,481,600.00 | 603.3400 | 2,020,066.67 | 1,535,579.47 | −1,127,547.20 | −1,137,547.20 | 1,035,210.00 | 36,964,790.00 | 7,630,920.00 |
| 2 | Feb 2027 | 289,600.00 | 24,967,052.80 | 606.6600 | 2,060,360.53 | 1,573,062.79 | −1,090,063.88 | −1,104,625.69 | 1,013,571.23 | 35,951,218.77 | 7,777,975.36 |
| 3 | Mar 2027 | 289,600.00 | 25,456,389.22 | 609.9600 | 2,100,976.75 | 1,603,362.75 | −1,059,763.91 | −1,078,815.40 | 983,552.40 | 34,967,666.36 | 7,926,991.16 |
| 4 | Apr 2027 | 289,600.00 | 25,949,640.34 | 613.2402 | 2,141,917.90 | 1,641,481.81 | −1,039,561.53 | −1,063,002.64 | 965,060.88 | 34,002,605.48 | 8,077,791.09 |
| 5 | May 2027 | 289,600.00 | 26,446,837.46 | 616.5008 | 2,183,186.57 | 1,679,922.39 | −1,001,120.94 | −1,028,890.03 | 928,448.88 | 33,074,156.59 | 8,230,197.42 |
| 6 | Jun 2027 | 289,600.00 | 26,948,012.16 | 619.7418 | 2,224,785.40 | 1,709,103.65 | −971,939.68 | −1,003,914.72 | 901,154.96 | 32,173,001.63 | 8,384,031.00 |
| 7 | Jul 2027 | 289,600.00 | 27,453,196.26 | 622.9633 | 2,266,717.02 | 1,748,194.75 | −940,765.25 | −976,855.25 | 871,959.14 | 31,301,042.50 | 8,539,111.25 |
| 8 | Aug 2027 | 289,600.00 | 27,962,421.83 | 626.1656 | 2,308,984.09 | 1,787,614.85 | −913,011.81 | −953,119.45 | 846,270.67 | 30,454,771.82 | 8,695,256.14 |
| 9 | Sep 2027 | 289,600.00 | 28,475,721.20 | 629.3486 | 2,351,589.29 | 1,819,866.51 | −880,760.16 | −924,799.81 | 816,183.54 | 29,638,588.28 | 8,852,282.19 |
| 10 | Oct 2027 | 289,600.00 | 28,993,126.97 | 632.5125 | 2,394,535.34 | 1,875,094.60 | −843,448.73 | −891,320.10 | 796,265.33 | 28,842,322.95 | 9,010,004.44 |
| 11 | Nov 2027 | 289,600.00 | 29,514,671.99 | 635.6574 | 2,437,824.96 | 1,930,810.79 | −801,482.54 | −853,119.24 | 756,823.19 | 28,085,499.76 | 9,168,236.48 |
| 12 | Dec 2027 | 297,700.00 | 30,048,489.36 | 638.9635 | 2,481,798.39 | 1,987,314.38 | −745,788.95 | −801,059.51 | 704,008.54 | 27,381,491.22 | 9,331,447.87 |
| 13 | Jan 2028 | 312,459.64 | 30,601,336.92 | 642.5270 | 2,527,076.10 | 2,014,215.03 | −835,593.44 | −894,321.80 | 745,504.11 | 26,635,987.11 | 9,503,870.75 |
| 14 | Feb 2028 | 319,187.24 | 31,165,334.86 | 646.1665 | 2,573,611.32 | 2,050,074.74 | −800,406.48 | −862,730.97 | 741,692.96 | 25,894,294.15 | 9,681,374.40 |
| 15 | Mar 2028 | 328,141.45 | 31,742,798.99 | 649.9517 | 2,621,172.24 | 2,094,610.61 | −775,220.20 | −841,128.11 | 713,412.77 | 25,180,881.38 | 9,864,751.38 |
| 16 | Apr 2028 | 337,842.27 | 32,334,583.65 | 653.8835 | 2,669,890.94 | 2,140,213.75 | −744,749.65 | −814,146.71 | 681,423.32 | 24,499,458.06 | 10,053,838.28 |
| 17 | May 2028 | 344,877.78 | 32,938,138.10 | 657.8909 | 2,719,696.74 | 2,186,826.91 | −710,856.70 | −783,636.29 | 645,599.08 | 23,853,858.98 | 10,246,471.18 |
| 18 | Jun 2028 | 359,523.36 | 33,561,166.56 | 662.1246 | 2,770,804.36 | 2,226,919.18 | −672,228.99 | −748,271.68 | 606,243.06 | 23,247,615.92 | 10,446,510.46 |
| 19 | Jul 2028 | 364,116.06 | 34,198,806.13 | 666.5293 | 2,823,332.20 | 2,266,168.94 | −633,438.50 | −712,613.11 | 565,951.43 | 22,681,664.49 | 10,650,205.35 |
| 20 | Aug 2028 | 368,708.76 | 34,851,364.98 | 671.1055 | 2,877,090.46 | 2,316,418.96 | −602,101.92 | −684,274.15 | 532,809.89 | 22,148,854.60 | 10,857,021.72 |
| 21 | Sep 2028 | 373,301.46 | 35,519,160.48 | 675.8535 | 2,932,105.23 | 2,367,823.32 | −568,323.49 | −653,382.87 | 499,188.51 | 21,649,666.09 | 11,066,415.51 |
| 22 | Oct 2028 | 373,301.46 | 36,197,926.72 | 680.6765 | 2,988,211.97 | 2,412,513.66 | −523,633.15 | −611,467.60 | 454,951.91 | 21,194,714.18 | 11,275,191.53 |
| 23 | Nov 2028 | 373,301.46 | 36,887,960.04 | 685.5755 | 3,045,245.28 | 2,465,795.67 | −484,513.64 | −574,975.71 | 417,781.74 | 20,776,932.44 | 11,482,991.36 |
| 24 | Dec 2028 | 373,301.46 | 37,589,564.34 | 690.5517 | 3,103,230.18 | 2,519,968.04 | −430,341.27 | −523,307.05 | 367,152.60 | 20,409,779.84 | 11,694,306.26 |
| 25 | Jan 2029 | 373,301.46 | 38,297,412.92 | 695.5025 | 3,161,957.39 | 2,556,834.76 | −516,072.97 | −566,373.71 | 417,650.71 | 19,992,129.13 | 11,910,509.52 |
| 26 | Feb 2029 | 373,301.46 | 39,011,561.36 | 700.4280 | 3,221,207.26 | 2,604,189.92 | −468,717.81 | −521,521.82 | 404,660.48 | 19,587,468.65 | 12,127,944.66 |
| 27 | Mar 2029 | 375,712.63 | 39,734,476.88 | 705.4050 | 3,281,084.93 | 2,660,100.36 | −432,056.28 | −487,320.27 | 367,147.56 | 19,220,321.09 | 12,349,123.35 |
| 28 | Apr 2029 | 378,766.77 | 40,466,880.50 | 710.4331 | 3,341,723.22 | 2,716,724.72 | −384,136.12 | −441,735.05 | 318,991.33 | 18,901,329.76 | 12,574,553.05 |
| 29 | May 2029 | 378,766.77 | 41,205,802.51 | 715.4356 | 3,403,028.46 | 2,773,985.29 | −339,252.73 | −399,026.07 | 272,190.48 | 18,629,139.28 | 12,800,540.13 |
| 30 | Jun 2029 | 386,455.29 | 41,958,989.44 | 720.5664 | 3,465,199.66 | 2,824,104.12 | −289,902.74 | −351,694.50 | 222,492.09 | 18,406,647.19 | 13,035,854.39 |
| 31 | Jul 2029 | 391,047.99 | 42,723,472.44 | 725.7683 | 3,528,435.91 | 2,873,003.53 | −241,462.60 | −305,107.11 | 171,275.08 | 18,235,372.11 | 13,275,176.84 |
| 32 | Aug 2029 | 395,640.69 | 43,499,352.04 | 731.0409 | 3,592,617.69 | 2,932,955.11 | −200,978.09 | −266,304.62 | 126,111.52 | 18,109,260.59 | 13,518,204.64 |
| 33 | Sep 2029 | 409,418.79 | 44,295,915.07 | 736.5782 | 3,658,136.13 | 2,994,136.64 | −155,761.74 | −222,619.76 | 79,161.50 | 18,030,099.09 | 13,769,917.70 |
| 34 | Oct 2029 | 418,604.19 | 45,108,752.90 | 742.2816 | 3,725,194.50 | 3,048,771.35 | −102,045.57 | −170,278.57 | 21,592.16 | 18,008,506.93 | 14,024,206.91 |
| 35 | Nov 2029 | 418,604.19 | 45,928,825.00 | 747.9560 | 3,793,232.41 | 3,112,281.41 | −53,122.89 | −122,538.98 | −31,200.69 | 18,039,707.62 | 14,275,257.72 |
| 36 | Dec 2029 | 418,604.19 | 46,756,195.73 | 753.6014 | 3,861,875.86 | 3,176,381.99 | 10,977.70 | −59,445.50 | −93,993.86 | 18,133,701.48 | 14,527,807.65 |

### 8.2 Annual

| Line | 2027 | 2028 | 2029 |
|---|---|---|---|
| New ARR | 3,483,300.00 | 4,228,062.41 | 4,718,224.44 |
| Expansion ARR | 5,354,832.79 | 6,680,786.02 | 8,347,010.79 |
| Contraction ARR | 865,751.41 | 1,080,127.08 | 1,349,516.71 |
| Churned ARR | 1,923,892.02 | 2,287,646.36 | 2,549,087.13 |
| Net new ARR | 6,048,489.36 | 7,541,074.98 | 9,166,631.39 |
| Closing ARR | 30,048,489.36 | 37,589,564.34 | 46,756,195.73 |
| ARR growth | 25.20% | 25.10% | 24.39% |
| New customers (deals) | 83.460 | 97.041 | 107.022 |
| Closing customers | 638.9635 | 690.5517 | 753.6014 |
| Revenue | 26,972,742.91 | 33,651,467.02 | 42,033,693.42 |
| COGS | 6,081,334.17 | 6,589,918.22 | 7,760,224.23 |
| Gross profit | 20,891,408.74 | 27,061,548.80 | 34,273,469.20 |
| Gross margin | 77.45% | 80.42% | 81.54% |
| R&D | 14,070,000.00 | 15,280,479.17 | 16,564,627.38 |
| Sales and marketing | 10,284,163.33 | 11,201,452.07 | 12,094,469.40 |
| G&A | 7,952,500.00 | 8,361,025.00 | 8,786,904.25 |
| EBITDA | −11,415,254.59 | −7,781,407.44 | −3,172,531.83 |
| Depreciation | 613,333.33 | 773,333.33 | 393,333.33 |
| Interest income | 1,311,518.88 | 950,484.73 | 751,899.20 |
| Interest expense | 1,100,000.00 | 1,100,000.00 | 1,100,000.00 |
| Net income | −11,817,069.04 | −8,704,256.04 | −3,913,965.96 |
| Cash from operations | −10,138,508.78 | −6,491,711.38 | −1,796,078.36 |
| Capex | 480,000.00 | 480,000.00 | 480,000.00 |
| Net burn | 10,618,508.78 | 6,971,711.38 | 2,276,078.36 |
| Ending cash | 27,381,491.22 | 20,409,779.84 | 18,133,701.48 |
| Ending headcount | 148 | 160 | 172 |

### 8.3 Balance sheets

| Line | Opening (Dec 31, 2026) | Jan 2027 (m=1) | Dec 2027 (m=12) | Dec 2028 (m=24) | Dec 2029 (m=36) |
|---|---|---|---|---|---|
| Cash | 38,000,000.00 | 36,964,790.00 | 27,381,491.22 | 20,409,779.84 | 18,133,701.48 |
| Accounts receivable | 3,180,000.00 | 3,224,986.67 | 3,943,038.28 | 4,941,067.64 | 6,136,567.41 |
| Prepaid and other | 850,000.00 | 850,000.00 | 850,000.00 | 850,000.00 | 850,000.00 |
| PP&E, net | 1,080,000.00 | 1,075,000.00 | 946,666.67 | 653,333.33 | 740,000.00 |
| **Total assets** | 43,110,000.00 | 42,114,776.67 | 33,121,196.17 | 26,854,180.81 | 25,860,268.89 |
| Accounts payable | 1,040,000.00 | 1,037,403.87 | 1,022,817.34 | 1,097,199.64 | 1,183,752.29 |
| Accrued liabilities | 1,300,000.00 | 1,300,000.00 | 1,300,000.00 | 1,300,000.00 | 1,300,000.00 |
| Deferred revenue | 7,486,000.00 | 7,630,920.00 | 9,331,447.87 | 11,694,306.26 | 14,527,807.65 |
| Venture debt | 10,000,000.00 | 10,000,000.00 | 10,000,000.00 | 10,000,000.00 | 10,000,000.00 |
| **Total liabilities** | 19,826,000.00 | 19,968,323.87 | 21,654,265.21 | 24,091,505.90 | 27,011,559.93 |
| Paid-in capital | 96,000,000.00 | 96,000,000.00 | 96,000,000.00 | 96,000,000.00 | 96,000,000.00 |
| Retained earnings (accumulated deficit) | −72,716,000.00 | −73,853,547.20 | −84,533,069.04 | −93,237,325.09 | −97,151,291.05 |
| **Total equity** | 23,284,000.00 | 22,146,452.80 | 11,466,930.96 | 2,762,674.91 | −1,151,291.05 |
| **Liabilities plus equity** | 43,110,000.00 | 42,114,776.67 | 33,121,196.17 | 26,854,180.81 | 25,860,268.89 |
| Difference | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

### 8.4 KPIs

| Metric | m=1 | m=6 | m=12 | m=24 | m=36 |
|---|---|---|---|---|---|
| Runway (months) | 35.71 | 34.54 | 36.39 | 49.38 | not burning |
| Burn multiple | 2.1495 | 1.9766 | 1.7556 | 0.9245 | 0.2483 |
| Gross margin, trailing | 76.02% | 76.52% | 77.45% | 80.42% | 81.54% |
| Blended CAC payback (months) | 19.39 | 18.71 | 18.03 | 15.32 | 13.62 |
| New-logo CAC payback (months) | 36.69 | 36.45 | 36.14 | 31.05 | 29.54 |
| CAC per new customer | 96,992 | 96,992 | 97,362 | 90,664 | 88,492 |
| LTV | 295,450 | 318,723 | 348,890 | 467,675 | 540,483 |
| LTV to CAC | 3.05 | 3.29 | 3.58 | 5.16 | 6.11 |
| Capacity utilization | 70.24% | 70.24% | 73.81% | 67.96% | 66.32% |
| EBITDA margin (month) | −55.82% | −43.69% | −30.05% | −13.87% | 0.28% |

### 8.5 13-week cash forecast from January 1, 2027

| Week | Days | Receipts | Payroll and commissions | Vendors and capex | Debt service | Net cash flow | Ending cash |
|---|---|---|---|---|---|---|---|
| 1 | Jan 1 to Jan 7 | 478,709.68 | 0.00 | 243,870.97 | 0.00 | 234,838.71 | 38,234,838.71 |
| 2 | Jan 8 to Jan 14 | 478,709.68 | 0.00 | 243,870.97 | 0.00 | 234,838.71 | 38,469,677.42 |
| 3 | Jan 15 to Jan 21 | 478,709.68 | 1,040,625.00 | 243,870.97 | 0.00 | −805,786.29 | 37,663,891.13 |
| 4 | Jan 22 to Jan 28 | 478,709.68 | 0.00 | 243,870.97 | 0.00 | 234,838.71 | 37,898,729.84 |
| 5 | Jan 29 to Feb 4 | 637,898.43 | 1,069,585.00 | 258,430.97 | 91,666.67 | −781,784.20 | 37,116,945.64 |
| 6 | Feb 5 to Feb 11 | 535,623.33 | 0.00 | 269,350.97 | 0.00 | 266,272.37 | 37,383,218.00 |
| 7 | Feb 12 to Feb 18 | 535,623.33 | 1,040,625.00 | 269,350.97 | 0.00 | −774,352.63 | 36,608,865.37 |
| 8 | Feb 19 to Feb 25 | 535,623.33 | 0.00 | 269,350.97 | 0.00 | 266,272.37 | 36,875,137.74 |
| 9 | Feb 26 to Mar 4 | 634,859.31 | 1,069,585.00 | 254,818.63 | 91,666.67 | −781,210.99 | 36,093,926.75 |
| 10 | Mar 5 to Mar 11 | 493,658.35 | 0.00 | 243,919.38 | 0.00 | 249,738.97 | 36,343,665.72 |
| 11 | Mar 12 to Mar 18 | 493,658.35 | 1,044,375.00 | 243,919.38 | 0.00 | −794,636.03 | 35,549,029.69 |
| 12 | Mar 19 to Mar 25 | 493,658.35 | 0.00 | 243,919.38 | 0.00 | 249,738.97 | 35,798,768.66 |
| 13 | Mar 26 to Apr 1 | 617,263.27 | 1,073,335.00 | 245,174.78 | 91,666.67 | −792,913.18 | 35,005,855.48 |

Cash on January 31 (day 31) is 36,964,790.00, on February 28 (day 59) 35,951,218.77 and on March 31 (day 90) 34,967,666.36, equal to the monthly model. Week 13 ends on April 1 at 35,005,855.48. The lowest week is week 13. No week is below the floor or the covenant.

---

## 9. Product development acceleration

This section defines the second initiative type: **pulling a roadmap milestone forward** by adding engineers, contractors or tooling. It adds to sections 1 to 8 and changes none of their numbers. With no acceleration initiative, every value in section 8 and every test T01 to T97 is unchanged (test T100).

The short version:

1. Added people and tools add capacity. Capacity decides the **target ship month**, so months gained are an output, not a wish (9.3).
2. The pulled-in date can slip. A one-line rule gives the probability of each ship month (9.4).
3. Cost is counted month by month and depends on when the milestone actually ships, because contractors and other until-it-ships costs keep running during a slip (9.5).
4. Once shipped, the milestone's effects ramp in and flow through the same funnel, ARR rollforward and COGS formulas as the baseline (9.6).
5. The value of acceleration is "pulled-in date" minus "planned date", with both measured against the same run without the milestone (9.8).

### 9.1 What an acceleration initiative is, and the three runs

An acceleration initiative names **one** milestone from the roadmap (section 1.14) and lists the resources added to its team. It does two things and nothing else:

- it changes the month that milestone ships, through a `milestone_shift` effect;
- it adds cost, through the existing `headcount` and `vendor_cost` effects (section 2.16).

The engine then reruns the whole model. Nothing is added to the results after the fact.

Three runs are used throughout this section. All use the same assumptions.

| Run | Symbol | The milestone ships | Added resources |
|---|---|---|---|
| Without | `R0` | never (that one milestone has `enabled = false`) | none |
| Planned date | `B` | in its planned month `P` | none |
| Pulled-in date | `S_k` | in month `T + k` (target month `T`, slip of `k` months) | yes |

`B` is the baseline of section 2.16, because the plan already contains every milestone on its planned date. So the incremental result of an acceleration initiative is `S − B`, exactly as for any other initiative. `R0` exists only to show what the milestone itself is worth (9.8).

### 9.2 Assumptions

New company-wide inputs. All are type Assumption and all are editable in the Assumptions panel.

| Key | Value | Meaning |
|---|---|---|
| `acceleration.engineerRampMonths` | 3 | A new engineer is at 0% in the start month, then 33%, 67%, 100% |
| `acceleration.contractorRampMonths` | 1 | A new contractor is at 0% in the start month, then 100% |
| `acceleration.addedPersonEfficiency` | 0.80 | A fully ramped added person counts as 0.8 of an existing team member (coordination and hand-offs) |
| `acceleration.maxCompression` | 50% | No pull-in can cut more than this share of the planned months remaining, whatever is added |
| `acceleration.contractorMonthlyRate` | 20,000 | Default cost of one contract engineer per month |
| `acceleration.engineerRecruitingEach` | 20,000 | Default one-time recruiting cost per engineer hired |
| `acceleration.slipSensitivity` | 1.0 | How fast the chance of hitting the new date falls as the schedule is compressed (9.4) |
| `acceleration.minOnTimeProbability` | 10% | The rule never gives a chance of hitting the date below this |
| `acceleration.maxOverrunMonths` | 0 | How many months after the **planned** date a pulled-in milestone can still slip to. 0 means the worst case is "ships on the planned date" |
| `uncertainty.plannedShipSlip` | 0 months (60%), +1 (20%), +2 (12%), +3 (8%) | Simulation only: slip of a milestone's planned date (9.9) |

Additions to each milestone in the roadmap (section 1.14). Defaults leave the baseline unchanged.

| Key (per milestone) | Default | Meaning |
|---|---|---|
| `effects.expansionLift` | none (0) | Relative lift of the monthly expansion rate |
| `effects.thirdPartyCostReduction` | none (0) | Relative cut of third-party software cost as a share of revenue |
| `effectTiming.<effect>.delayMonths` | 0 | Months after shipping before this effect starts to ramp |
| `effectTiming.<effect>.rampMonths` | the milestone's `rampMonths` | Months this effect takes to reach full size |

The initiative itself:

```
initiative = {
  id, name, template: "accelerateRevenue" or "accelerateCost",
  acceleration: {
    milestone,                                   id of an enabled roadmap milestone
    people: [
      { type: "contractor", count, startMonth, monthlyRate, rampMonths },
      { type: "employee", role, count, startMonth, loadedCostAnnual, rampMonths,
        recruitingEach, afterLaunch: "leave" | "stay" | "replace_planned_hire" }
    ],
    tooling:    { startMonth, oneTime, monthly, speedup, afterLaunch: "stop" | "keep" },
    extraCloud: { startMonth, monthly, line: "rd" | "cogs" },
    slip:       { pOnTime, probabilities },      both optional (9.4)
    actualShipMonth                              optional: a known ship month (learning loop)
  }
}
```

`rampMonths`, `monthlyRate`, `loadedCostAnnual` and `recruitingEach` default to the inputs above and to the role's loaded cost. `role` defaults to `engineer`. `people`, `tooling` and `extraCloud` are each optional.

Template defaults (same style as section 1.17). They are the two worked examples in 9.11 and 9.12.

| Template | Inputs and defaults |
|---|---|
| Pull in a revenue milestone (`accelerateRevenue`) | Milestone `integrations_hub`. Contractors: 8 from month 1 at 20,000 a month. Engineers: 2 from month 2 at 215,000 a year, recruiting 20,000 each, after launch `replace_planned_hire`. Tooling from month 1: 30,000 once and 10,000 a month until it ships, speed-up 15%. Extra cloud: 6,000 a month from month 1 until it ships, on R&D (test environments). Slip from the rule |
| Pull in a cost-saving milestone (`accelerateCost`) | Milestone `hosting_optimization`. Contractors: 4 from month 1 at 20,000 a month. No engineers and no tooling. Extra cloud: 15,000 a month from month 4 until it ships, on COGS (old and new infrastructure running side by side). Slip from the rule |

### 9.3 Months gained: work, capacity and the target ship date

The baseline team finishes the milestone in month `P` (the roadmap `shipMonth`). The work left is measured in person-months. Added people and tools add capacity, and the milestone ships in the first month in which enough work has been done.

```
P  = planned ship month of the milestone
a  = the earliest startMonth among the people lines and a tooling line with speedup > 0   (acceleration start)
R  = P − a + 1                                   planned months of work left: months a … P
W  = teamSize × R                                planned work left, in person-months

Added_m  = addedPersonEfficiency × Σ over people lines ( count × ramp(m − startMonth, rampMonths) )
Speed_m  = tooling.speedup if m > tooling.startMonth, else 0
Cap_m    = (teamSize + Added_m) × (1 + Speed_m)                  for m = a … P
CumCap_m = Σ_{j=a}^{m} Cap_j

T_raw   = the first month m ≥ a with CumCap_m ≥ W − 1e-9
T_floor = a − 1 + ceil( R × (1 − maxCompression) − 1e-9 )
T       = min(P, max(T_raw, T_floor))            target ship month
G       = P − T                                  months gained if it ships on the target date
c       = G / R                                  compression: the share of the remaining schedule that is cut
```

Notes:

- `ramp` is the function of section 0, so a person does no useful work in the start month. This is the same convention as AEs and SDRs (section 1.4).
- For capacity, every added person counts until the milestone ships, whatever happens to them afterward (9.5).
- `Cap_m ≥ teamSize`, so `T_raw ≤ P` always: adding people never delays the target. A late or overstaffed project is handled by slip (9.4), not here.
- If `T_floor > T_raw`, the compression limit binds. The engine reports `limitedByCompression = true` and the card says "more people would not ship this sooner".
- If `G = 0`, the resources do not gain a whole month. The cost still counts. The card says so.
- With no people and no tooling speed-up, `T = P`, `G = 0`, `c = 0` (the null acceleration).
- `T` does not depend on which month is called `a`: every earlier month adds `teamSize` to both `W` and `CumCap`. `a` matters only for `R`, `c` and `T_floor`.
- Ship months are whole months. A milestone has no effect in the month it ships (section 1.14), so shipping in month `T` means the first effect is in month `T + 1`.

### 9.4 The actual ship date: a simple slip model

A pulled-in date can still slip. The rule, in words: **each month from the target date on, the milestone ships with probability `q` if it has not shipped yet. If it still has not shipped by the planned date, it ships then.** `q` falls one for one with compression: cut a third of the remaining schedule and the chance of hitting the new date is two in three; cut half and it is a coin flip.

```
q   = slip.pOnTime                                                  if the initiative gives one
    = clamp(1 − slipSensitivity × c, minOnTimeProbability, 1)        otherwise

K   = G + maxOverrunMonths                       the largest slip
p_k = q × (1 − q)^k                              for k = 0 … K − 1
p_K = (1 − q)^K                                  whatever is left
Ship_k = T + k                                   the actual ship month with a slip of k months
```

`p_0 = q` is the probability of hitting the new date. The `p_k` sum to 1. If `slip.probabilities` is given it replaces the whole table: a list of `p_0, p_1, …` of any length, each between 0 and 1, summing to 1 within 1e-9. A list longer than `G + 1` lets the milestone ship later than its planned date.

Reported from the table:

```
ExpectedSlip         = Σ_k k × p_k
ExpectedShipMonth    = T + ExpectedSlip                               (can be a fraction)
ExpectedMonthsGained = G − ExpectedSlip
ProbabilityOnTime    = p_0
ProbabilityNoGain    = Σ p_k over outcomes with Ship_k ≥ P             (the money is spent and nothing is gained)
ShippedBy_m          = Σ p_k over outcomes with Ship_k ≤ m             (cumulative, for the chart)
PlanningSlip         = floor(ExpectedSlip + 0.5)                       (nearest whole month, halves round later)
PlanningShipMonth    = T + PlanningSlip
```

Slip here means months of the pull-in that are lost. The planned date itself is assumed to hold in the deterministic model (see 9.9 for the simulation and 9.15 for why that is a weak assumption).

### 9.5 Cost of acceleration by month

Let `A` be the actual ship month of the run (one of the `Ship_k`). Costs that run "until it ships" stop after month `A`, so a slip costs twice: the benefit starts later and the bills keep coming.

| Cost line | Amount in month `m` | Months | Effect kind and P&L line |
|---|---|---|---|
| Contractors | `count × monthlyRate` | `startMonth … A` | `vendor_cost` on R&D |
| Employees | `count × loadedCostAnnual / 12 × step(meritIncreaseAnnual, m)` | `startMonth … End` | `headcount`: payroll on the role's P&L line |
| Recruiting | `count × recruitingEach` | `startMonth` only | `vendor_cost` on R&D |
| Tooling, one-time | `oneTime` | `tooling.startMonth` only | `vendor_cost` on R&D |
| Tooling, monthly | `monthly` | `startMonth … A` if "stop", `startMonth … 36` if "keep" | `vendor_cost` on R&D |
| Extra cloud | `monthly` | `startMonth … A` | `vendor_cost` on `line`: R&D for test environments, COGS for production capacity |

**Whether added people stay after launch.** Contractors always leave at the end of the ship month. For each employee line, `afterLaunch` sets `End`:

| `afterLaunch` | `End` | Meaning |
|---|---|---|
| `"leave"` | `A` | Temporary staff. Paid through the ship month |
| `"stay"` | 36 | Permanent hires. The initiative carries their cost to the end of the model |
| `"replace_planned_hire"` | one month before the matched planned hire starts | The person is hired early into a seat the plan already has (section 1.6). From the planned start month the baseline pays for that seat, so the initiative pays only for the months in between |

Matching for `"replace_planned_hire"`: each added person takes the earliest planned hire of the same role whose start month is after the person's start month and that is not already taken. A planned hire can be taken once per run (people are matched in the order the initiatives and lines are listed). A person with no seat left is treated as `"stay"`. The matched planned hire still appears in the baseline roster from its planned month, so headcount is never counted twice.

Rules:

1. A line whose `startMonth` is after `A` costs nothing. A line whose `startMonth` is after `P` is an input error.
2. Contractor rates, tooling and extra cloud are not inflated. Employee pay takes the merit step each January like every other role (section 2.2).
3. Payroll is paid in the month. Vendor costs are paid through payables, one month later at 30 days (section 2.8).
4. `Investment_m` (section 2.17) is the sum of the lines above as expensed. There is no `allocated_cost`: the existing team's time is the same work done sooner.
5. Recruiting is charged even for `"replace_planned_hire"`. The plan has no recruiting cost for planned hires, so this slightly overstates the cost.

**Team time freed (reported, not counted).** When the milestone ships early, the existing team is free sooner. No cash is saved, because those people are paid anyway, so this is left out of every return measure. It is shown beside them:

```
FreedPersonMonths = teamSize × (P − A)                                           negative if A > P
FreedValue_m      = teamSize × roles.engineer.loadedCostAnnual / 12 × step(meritIncreaseAnnual, m)
                    for m = A + 1 … P       (with a minus sign for m = P + 1 … A when A > P; months after 36 are ignored)
FreedTeamValue    = Σ_m FreedValue_m
NpvWithFreedTeam  = NPV + Σ_m FreedValue_m / (1 + r)^m                           r from section 2.17
```

### 9.6 Effects once shipped: revenue and COGS

Every effect of every enabled milestone has a ramp-up curve: nothing through the ship month plus its delay, then a straight line up to full size.

```
Ship_i      = the roadmap shipMonth of milestone i, or the month named by a milestone_shift for i
s_i,e(m)    = ramp(m − Ship_i − delayMonths_i,e, rampMonths_i,e)      share of effect e that is live in month m
              (0 for every m if milestone i is disabled)

Lift_e(m)   = Σ_i effects_i,e × s_i,e(m)                              e = winRateLift, acvLift, expansionLift
Cut_e(m)    = clamp( Σ_i effects_i,e × s_i,e(m), 0, 1 )               e = churnReduction, hostingCostReduction,
                                                                          thirdPartyCostReduction
```

| Effect | What it changes | Formula (replaces the single-milestone form in sections 2.3, 2.4 and 2.7) | Month it uses |
|---|---|---|---|
| `winRateLift` | Win rate, all channels | `WinRate_c,m = clamp(winRate_c × (1 + Lift_win(m)), 0, 1)` | The month the deal closes |
| `acvLift` | ACV of new deals, all channels | `ACV_c,m = acv_c × (1 + Lift_acv(m))` | The month the deal closes |
| `expansionLift` | Expansion rate | `ExpansionRate_m = clamp(expansionRateMonthly × (1 + Lift_exp(m)), 0, 1)` | The month it is applied |
| `churnReduction` | Churn rate (ARR and customers) | `ChurnRate_m = churnRateMonthly × (1 − Cut_churn(m))` | The month it is applied |
| `hostingCostReduction` | Hosting cost per customer | `Hosting_m = average customers × hostingCostPerCustomerPerMonth × step(hostingCostGrowthAnnual, m) × (1 − Cut_host(m))` | The month of the cost |
| `thirdPartyCostReduction` | Third-party software cost | `ThirdParty_m = Revenue_m × thirdPartyPctOfRevenue × (1 − Cut_tp(m))` | The month of the cost |

The driver on the right of each formula is the value after any `driver_change` (section 2.16 rule 1). With the default roadmap and no timing overrides these formulas give exactly the baseline of section 2.

How the revenue effects flow, with no new formulas:

- A higher win rate gives more deals from the same opportunities: `Deals_c,m = OppsWorked_c,(m − cycle) × WinRate_c,m`. It needs no extra leads and no extra AE capacity.
- A higher ACV makes each new deal larger: `NewARR_c,m = Deals_c,m × ACV_c,m`. It does not reprice the installed base.
- Extra new ARR, extra expansion and lower churn all enter the ARR rollforward (section 2.4) and from then on expand, contract and churn like any other ARR.
- Extra deals and lower churn add customers, which add hosting cost. Extra revenue adds third-party cost (4%). Extra new ARR pays commission (10%); expansion does not.
- 60% of new and expansion ARR is invoiced a year upfront (section 2.6), so pulled-in ARR pulls cash forward as well as revenue.

COGS effects change no revenue. They lower `COGS_m`, raise gross profit and gross margin by the same amount, and reach cash one month later through lower vendor payments.

A useful identity for a milestone whose ramps finish inside the model: summed over all months, the extra share from shipping in month `T` instead of month `P` is exactly `P − T`. Pulling a milestone in by 3 months buys 3 months of its full effect, spread over the months when one ramp is ahead of the other (test T112).

### 9.7 Running an acceleration: outcomes, expected case and planning case

For an actual ship month `A` the initiative expands into ordinary effects:

```
effects(A) = [ { kind: "milestone_shift", milestone, shipMonth: A } ]  +  the cost effects of 9.5 for ship month A
```

`milestone_shift` sets `Ship_i = A` for that milestone in that run. `shipMonth` is a whole month of 1 or more; a month after 36 means the milestone has no effect inside the model. Two `milestone_shift` effects on the same milestone in one run are an input error (two ways of accelerating one milestone are alternatives, not a pair).

**Outcomes.** There is one run per row of the slip table:

```
S_k       = runModel(assumptions, [ the initiative expanded at Ship_k ])
Δ_k       = S_k − B                                 every series, section 2.16
returns_k = the measures of section 2.17 for S_k against B
SO_k      = runModel(assumptions, [ the milestone_shift to Ship_k alone ])      "shift only": the date with no cost
```

**On-target case.** Outcome `k = 0`: what happens if the new date holds.

**Expected case** (the headline on the decision card). Each outcome is weighted by its probability:

```
E[X] = Σ_k p_k × X_k        for every monthly Δ series, Investment_m, NF_m, CumNF_m, TotalInvestment and NPV

ExpectedROI             = E[CumNF_36] / E[TotalInvestment]
ExpectedNewArrPerDollar = E[Σ ΔNewARR] / E[TotalInvestment]
ExpectedPaybackMonth    = the payback rule of section 2.17 applied to the series E[CumNF_m]
ProbabilityOfPayback    = Σ p_k over outcomes whose own PaybackMonth is a month
```

Because NPV is a weighted sum of net flows, `Σ_k p_k × NPV_k` equals the NPV of the series `E[NF_m]` (check C20).

**Benefit and cost, separately.**

```
BenefitNpv_k = NPV of SO_k against B               what the earlier date is worth with no cost: the most it is worth paying
CostNpv_k    = BenefitNpv_k − NPV_k                what the acceleration costs, in today's dollars
ValuePerMonthGained = E[BenefitNpv] / ExpectedMonthsGained
CostPerMonthGained  = E[CostNpv] / ExpectedMonthsGained
```

The on-target versions use `k = 0` and `G`. If months gained is 0 the two per-month figures are not shown.

**Planning case.** A run that contains several initiatives needs one ship month per milestone. Whenever an acceleration initiative is part of a combined run (the scenario on "Where we stand", the guardrails of the combined plan, a portfolio), it is expanded at `PlanningShipMonth` (9.4), or at `actualShipMonth` if one is given. KPI effects and guardrail results on its own decision card are also those of the planning case, because ratios such as burn multiple do not average. Beside them the card shows, for each guardrail, the probability-weighted share of outcomes that pass it.

**Input checks** (section 2.16 rule 5 applies). The run stops with a plain reason if: the milestone is unknown or disabled; a `startMonth` is not a whole month from 1 to `P`; a count, rate or cost is negative or not finite; `speedup` is negative; `afterLaunch` or `line` is not one of the listed values; `pOnTime` is outside 0 to 1; `probabilities` has a value outside 0 to 1 or does not sum to 1; `actualShipMonth` is not a whole month of 1 or more; or two initiatives in one run shift the same milestone.

### 9.8 Showing the value: planned date versus pulled-in date

"Ship on the planned date" compared with the baseline is zero by definition, because the baseline is the planned date. To show what is at stake, both dates are measured against the same reference, the run without the milestone:

```
Planned_X   = X(B)   − X(R0)        what the milestone adds if it ships on the planned date
PulledIn_X  = X(S)   − X(R0)        what it adds if it ships on the pulled-in date, after the cost of pulling it in
Value_X     = PulledIn_X − Planned_X = X(S) − X(B)        the value of acceleration
```

`Value_X` is the initiative's ordinary delta, so the side-by-side and the decision card can never disagree (check C20). `S` is the expected case by default (`X(S) = Σ_k p_k × X(S_k)`), with the on-target case one tap away.

The side-by-side table has four columns (Without, Planned date, Pulled-in date, Value of acceleration) and these rows:

| Row | Measure `X` |
|---|---|
| Ship month | `P`, then `T` with the expected ship month, then months gained |
| First month with an effect | Ship month plus 1 plus the shortest delay |
| ARR at month 12 and at month 36 | `ARR_12`, `ARR_36` |
| New ARR, revenue, COGS, gross profit, EBITDA | Each summed over months 1 to 36 |
| Hosting cost (cost-saving milestones) | Summed over months 1 to 36 |
| Gross margin | `GrossMarginTrailing` at months 12, 24 and 36, in percentage points |
| Net flow and NPV | `CumNF_36` and NPV of section 2.17, computed against `R0` for the two date columns |
| Cash at month 36 | `Cash_36` |

For net flow and NPV the Planned column is the return of `B` against `R0` (no investment: the baseline team is already paid) and the Pulled-in column is the return of `S` against `R0` (investment is the acceleration cost). Their difference is the NPV on the decision card.

The decision card for an acceleration initiative shows, all from the engine:

1. **Schedule:** planned month, target month, months gained, compression, whether the compression limit binds, and capacity against work by month.
2. **Ship date odds:** the slip table as a small chart, the probability of hitting the new date, the expected ship month, the expected months gained and the probability of no gain.
3. **Added cost by month,** by line (9.5), for the expected case and the on-target case, with the total.
4. **Benefit by month:** extra new ARR, ARR, revenue and gross profit for a revenue milestone; hosting or third-party savings and gross margin points for a cost-saving milestone.
5. **Returns:** NPV, payback month, ROI, new ARR per dollar, benefit NPV and cost NPV, value and cost per month gained, for the expected case, with the on-target case and the worst outcome beside it.
6. **Guardrails and KPIs** for the planning case, with the share of outcomes that pass each guardrail.
7. **The side-by-side** above.
8. **Not counted:** team time freed (person-months and dollars) with `NpvWithFreedTeam`, and the extra ARR still in place at month 36.

### 9.9 Simulation rules for ship dates

This replaces the note in section 1.16 that ship-date slip is defined later. In each simulation run:

1. **Planned-date slip.** For every enabled milestone, draw one slip from `uncertainty.plannedShipSlip` (0, 1, 2 or 3 months). Add it to that milestone's ship month in **both** the baseline and the scenario of that run. This is the risk every project carries, pulled in or not.
2. **Acceleration slip.** For every acceleration initiative, draw one `k` from its slip table (9.4). The scenario ships that milestone in month `T + k + planned-date slip`; the baseline ships it in `P + planned-date slip`.
3. Costs that run until the milestone ships (9.5) run until the scenario's ship month in that run.
4. The effect-size multiplier of section 1.16 applies to every effect of the milestone in both runs.
5. Draws are made in a fixed order (milestones in roadmap order, then initiatives in list order) from the seeded generator, so the same seed gives the same results.

The planned-date slip moves the baseline and the scenario together, so it changes when the benefit arrives but not the months gained. The deterministic model uses no planned-date slip.

### 9.10 Integrity checks C17 to C20

These follow the rules of section 3: same tolerances, and every check compares numbers computed by different paths. Once this section is built the badge reads "Integrity N/20".

The model result must expose what the checks need: the ship month used for each milestone, every effect share `s_i,e(m)`, the win rate and ACV used per channel and month, the expansion rate, churn rate, hosting reduction and third-party reduction used per month, the initiative cost by line and month, and, for each acceleration initiative, its schedule (9.3), slip table (9.4) and the ship month it was expanded at.

| # | Check | Passes when |
|---|---|---|
| C17 | Milestone effects follow the ship dates | (a) The ship month used for each milestone equals its roadmap `shipMonth`, or the month in the one `milestone_shift` that names it. (b) Every stored share equals `ramp(m − Ship − delay, rampMonths)` recomputed from (a), lies between 0 and 1, is 0 for `m ≤ Ship + delay` and never falls from one month to the next. (c) The outputs agree with the rates rebuilt from the inputs, the driver changes and the shares of (b): `Deals_c,m = OppsWorked_c,(m − cycle) × WinRate_c,m`; `NewARR_c,m = Deals_c,m × ACV_c,m`; `Expansion_m = ARR_(m−1) × ExpansionRate_m`; `Churn_m = ARR_(m−1) × ChurnRate_m`; `Hosting_m` and `ThirdParty_m` equal the formulas of 9.6 |
| C18 | Acceleration schedule ties | For each acceleration initiative, rebuilt from its resource lines: `W = teamSize × R`; `Cap_m ≥ teamSize`; `CumCap_T ≥ W`; `CumCap_(T−1) < W` unless `T = T_floor`; `a ≤ T ≤ P`; `G = P − T`; `c = G / R ≤ maxCompression`. Every slip probability is between 0 and 1 and they sum to 1 within 1e-9; `Ship_k = T + k`; `ExpectedShipMonth = Σ p_k × Ship_k`; `PlanningShipMonth = T + floor(ExpectedSlip + 0.5)`. The ship month the run used for that milestone is the planning month, the given `actualShipMonth`, or (in an outcome run) that outcome's `Ship_k` |
| C19 | Acceleration cost follows the ship date | For each run that contains an acceleration initiative and every month: initiative payroll by role, initiative vendor cost by P&L line and `Investment_m` in the model equal the amounts rebuilt by `runChecks` from the resource lines and the ship month the run used (9.5). Nothing from a contractor line, a `"leave"` line, stop-at-launch tooling or extra cloud falls after the ship month. A `"replace_planned_hire"` person's pay stops the month before the matched planned hire starts, and headcount in that role equals baseline headcount plus the initiative people still active. Every amount is 0 or more |
| C20 | Expected value and the side-by-side tie | For each acceleration initiative evaluated alone: (a) the planned-date run rebuilt as "a `milestone_shift` to month `P` and no resources" equals the baseline in every series, within 1e-6 (the acceleration version of C7); (b) in `R0` every share of that milestone is 0 in every month; (c) for every row of the side-by-side, stored `PulledIn − Planned` equals the delta returned by `applyInitiatives`, for each outcome and for the expected case; (d) every stored expected series equals `Σ_k p_k ×` the outcome series recomputed, `Σ_k p_k × NPV_k` equals the NPV of the stored `E[NF_m]`, and `E[TotalInvestment] = Σ_m E[Investment_m]`; (e) for each outcome `BenefitNpv_k − CostNpv_k = NPV_k`, with `BenefitNpv_k` taken from the shift-only run |

When the scenario has no acceleration initiative, C18 to C20 run on the **null acceleration** of every enabled milestone (that milestone with no people, no tooling and no extra cloud). It must give `T = P`, `G = 0`, a slip table of one row with probability 1, zero cost in every month and zero difference from the baseline in every series. The null initiative of check C7 also gains a `milestone_shift` of each milestone to its own planned month.

A broken guardrail in some outcomes is a business warning, not an integrity failure.

### 9.11 Hand-calculated example: Enterprise integrations hub, pulled in 2 quarters

**Initiative.** The `accelerateRevenue` template with its defaults (9.2). The hub is planned for December 2027 (`P = 12`), team of 8, win-rate lift 8% and ACV lift 5% on all channels, ramp 6 months.

**Schedule (9.3).** `a = 1`, `R = 12`, `W = 8 × 12 = 96` person-months.

| Month | Existing team | Contractors: 8 × ramp × 0.8 | Engineers: 2 × ramp × 0.8 | Tooling factor | Capacity | Cumulative |
|---|---|---|---|---|---|---|
| 1 | 8 | 0 | 0 | 1.00 | 8.0000 | 8.0000 |
| 2 | 8 | 6.4 | 0 | 1.15 | 16.5600 | 24.5600 |
| 3 | 8 | 6.4 | 0.5333 | 1.15 | 17.1733 | 41.7333 |
| 4 | 8 | 6.4 | 1.0667 | 1.15 | 17.7867 | 59.5200 |
| 5 | 8 | 6.4 | 1.6 | 1.15 | 18.4000 | 77.9200 |
| 6 | 8 | 6.4 | 1.6 | 1.15 | 18.4000 | 96.3200 |

```
T_raw   = 6            (96.32 ≥ 96 in month 6; 77.92 < 96 in month 5)
T_floor = 0 + ceil(12 × 0.5) = 6
T = 6 (June 2027),  G = 12 − 6 = 6 months,  c = 6 / 12 = 0.5
```

The pull-in sits exactly at the compression limit and clears the work by only 0.32 person-months.

**Slip (9.4).** `q = 1 − 1.0 × 0.5 = 0.5`, `K = 6`: probabilities 1/2, 1/4, 1/8, 1/16, 1/32, 1/64 and 1/64 for ship months 6 to 12.

```
ExpectedSlip = 1/4 + 2/8 + 3/16 + 4/32 + 5/64 + 6/64 = 0.984375 months
ExpectedShipMonth = 6.984375;  ExpectedMonthsGained = 5.015625
ProbabilityOnTime = 0.5;  ProbabilityNoGain = 1/64 = 0.015625
PlanningSlip = floor(0.984375 + 0.5) = 1, so PlanningShipMonth = 7 (July 2027)
```

**Cost if it ships on the target date (`A = 6`).** Contractors: 8 × 20,000 = 160,000 a month in months 1 to 6. Engineers: 215,000 / 12 = 17,916.67 a month each. Both start in month 2; the first takes the planned engineer seat of month 4, so the initiative pays for months 2 and 3; the second takes the seat of month 10, so months 2 to 9. Tooling: 30,000 + 10,000 in month 1, then 10,000 a month to month 6. Extra cloud: 6,000 a month in months 1 to 6.

| Month | Contractors | Engineer pay | Recruiting | Tooling | Extra cloud | Total cost |
|---|---|---|---|---|---|---|
| 1 | 160,000.00 | 0.00 | 0.00 | 40,000.00 | 6,000.00 | 206,000.00 |
| 2 | 160,000.00 | 35,833.33 | 40,000.00 | 10,000.00 | 6,000.00 | 251,833.33 |
| 3 | 160,000.00 | 35,833.33 | 0.00 | 10,000.00 | 6,000.00 | 211,833.33 |
| 4 | 160,000.00 | 17,916.67 | 0.00 | 10,000.00 | 6,000.00 | 193,916.67 |
| 5 | 160,000.00 | 17,916.67 | 0.00 | 10,000.00 | 6,000.00 | 193,916.67 |
| 6 | 160,000.00 | 17,916.67 | 0.00 | 10,000.00 | 6,000.00 | 193,916.67 |
| 7 | 0.00 | 17,916.67 | 0.00 | 0.00 | 0.00 | 17,916.67 |
| 8 | 0.00 | 17,916.67 | 0.00 | 0.00 | 0.00 | 17,916.67 |
| 9 | 0.00 | 17,916.67 | 0.00 | 0.00 | 0.00 | 17,916.67 |
| Total | 960,000.00 | 179,166.67 | 40,000.00 | 90,000.00 | 36,000.00 | 1,305,166.67 |

Each month of slip adds 160,000 + 10,000 + 6,000 = 176,000 (the engineers do not depend on the ship date). Headcount: engineers are 2 above the baseline in months 2 and 3, 1 above in months 4 to 9, and equal from month 10.

**Benefit.** Let `f(h) = (1 + 0.08h)(1 + 0.05h) − 1` be the combined lift on new ARR at share `h`. The lift is the same on every channel, so new ARR equals the new ARR of the run without the hub times `1 + f(h)`. Without the hub, new ARR is 289,600 in months 1 to 11, 297,700 in month 12, 305,800 in months 13 and 14, 307,825 in month 15 and 310,390 in months 16 and 17.

Pulled in, the share is `(m − 6) / 6` in months 7 to 12 and 1 after. Planned, it is 0 through month 12, `(m − 12) / 6` in months 13 to 17 and 1 from month 18. Factors below are shown to 7 decimals; the amounts use full precision.

```
m = 7:   f(1/6) = 0.0217778   Δ New ARR = 289,600 × 0.0217778 =  6,306.84
m = 8:   f(2/6) = 0.0437778   Δ New ARR = 289,600 × 0.0437778 = 12,678.04
m = 9:   f(3/6) = 0.0660000   Δ New ARR = 289,600 × 0.0660000 = 19,113.60
m = 10:  f(4/6) = 0.0884444   Δ New ARR = 289,600 × 0.0884444 = 25,613.51
m = 11:  f(5/6) = 0.1111111   Δ New ARR = 289,600 × 0.1111111 = 32,177.78
m = 12:  f(1)   = 0.1340000   Δ New ARR = 297,700 × 0.1340000 = 39,891.80
m = 13:  0.134 − f(1/6) = 0.1122222   Δ New ARR = 305,800 × 0.1122222 = 34,317.56
m = 14:  0.134 − f(2/6) = 0.0902222   Δ New ARR = 305,800 × 0.0902222 = 27,589.96
m = 15:  0.134 − f(3/6) = 0.0680000   Δ New ARR = 307,825 × 0.0680000 = 20,932.10
m = 16:  0.134 − f(4/6) = 0.0455556   Δ New ARR = 310,390 × 0.0455556 = 14,139.99
m = 17:  0.134 − f(5/6) = 0.0228889   Δ New ARR = 310,390 × 0.0228889 =  7,104.48
m ≥ 18:  both at full lift, Δ New ARR = 0
Sum of Δ New ARR = 239,865.66
```

Extra ARR at month 12, with each month's new ARR growing at the net monthly rate 1.008 (section 4.3):

```
ΔARR_12 = 6,306.84 × 1.008^5 + 12,678.04 × 1.008^4 + 19,113.60 × 1.008^3
        + 25,613.51 × 1.008^2 + 32,177.78 × 1.008 + 39,891.80 = 137,579.80
```

**Month 1.** Cost 206,000, all vendor bills: `ΔEBITDA = −206,000`, nothing is paid yet, `NF_1 = 0`.

**Month 2.** `ΔEBITDA = −251,833.33`. Cash out: last month's vendor bills 206,000 plus this month's pay 35,833.33. `NF_2 = −241,833.33`.

**Month 3.** Vendor bills of month 2 are 160,000 + 40,000 + 10,000 + 6,000 = 216,000. `NF_3 = −216,000 − 35,833.33 = −251,833.33`. `CumNF_3 = −493,666.67`.

**Months 4 to 6.** `NF = −176,000 − 17,916.67 = −193,916.67` each. `CumNF_6 = −1,075,416.67`.

**Month 7 (first lifted deals).**

```
ΔDeals_7      = 6.94 × 0.08 × 1/6 = 0.0925          (the win-rate part of the lift only)
ΔARR_7        = 6,306.84;  ΔRevenue_7 = 6,306.84 / 24 = 262.79
ΔHosting_7    = 0.0925 / 2 × 360 = 16.66;  ΔThirdParty_7 = 0.04 × 262.79 = 10.51
ΔGrossProfit_7 = 262.79 − 16.66 − 10.51 = 235.62
ΔCommissions_7 = 630.68
ΔEBITDA_7     = 235.62 − 630.68 − 17,916.67 = −18,311.73
ΔBillings_7   = 0.60 × 6,306.84 + 0.40 × 262.79 = 3,889.22      (collected in months 8 and 9)
NF_7 = −176,000 (June vendor bills) − 17,916.67 − 630.68 = −194,547.35;  CumNF_7 = −1,269,964.02
```

**Month 8.**

```
ΔARR_8 = 6,306.84 × 1.008 + 12,678.04 = 19,035.34;  ΔRevenue_8 = (6,306.84 + 19,035.34) / 24 = 1,055.92
ΔCollections_8 = 0.5 × 3,889.22 = 1,944.61;  ΔVendorPaid_8 = 16.66 + 10.51 = 27.17;  ΔCommissions_8 = 1,267.80
NF_8 = 1,944.61 − 27.17 − 1,267.80 − 17,916.67 = −17,267.03;  CumNF_8 = −1,287,231.05
```

From month 10 the monthly net flow is positive, but it never recovers the 1.3 million inside the model.

**Month by month, on target** (reference values from the same recurrences):

| m | Month | Cost | Δ New ARR | Δ ARR | Δ Revenue | Δ COGS | Δ Gross profit | Δ EBITDA | Δ Collections | Δ Vendor paid | Net flow NF | Cumulative NF | Δ Cash balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Jan 2027 | 206,000.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −206,000.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 2 | Feb 2027 | 251,833.33 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −251,833.33 | 0.00 | 206,000.00 | −241,833.33 | −241,833.33 | −241,833.33 |
| 3 | Mar 2027 | 211,833.33 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −211,833.33 | 0.00 | 216,000.00 | −251,833.33 | −493,666.67 | −494,472.78 |
| 4 | Apr 2027 | 193,916.67 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −193,916.67 | 0.00 | 176,000.00 | −193,916.67 | −687,583.33 | −690,037.69 |
| 5 | May 2027 | 193,916.67 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −193,916.67 | 0.00 | 176,000.00 | −193,916.67 | −881,500.00 | −886,254.48 |
| 6 | Jun 2027 | 193,916.67 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −193,916.67 | 0.00 | 176,000.00 | −193,916.67 | −1,075,416.67 | −1,083,125.33 |
| 7 | Jul 2027 | 17,916.67 | 6,306.84 | 6,306.84 | 262.79 | 27.17 | 235.62 | −18,311.73 | 0.00 | 176,000.00 | −194,547.35 | −1,269,964.02 | −1,281,283.10 |
| 8 | Aug 2027 | 17,916.67 | 12,678.04 | 19,035.34 | 1,055.92 | 108.76 | 947.16 | −18,237.31 | 1,944.61 | 27.17 | −17,267.03 | −1,287,231.05 | −1,302,821.07 |
| 9 | Sep 2027 | 17,916.67 | 19,113.60 | 38,301.23 | 2,389.02 | 244.97 | 2,144.06 | −17,683.97 | 5,974.35 | 108.76 | −13,962.44 | −1,301,193.49 | −1,321,126.25 |
| 10 | Oct 2027 | 0.00 | 25,613.51 | 64,221.15 | 4,271.77 | 418.30 | 3,853.47 | 1,292.12 | 10,287.30 | 244.97 | 7,480.99 | −1,293,712.50 | −1,318,049.01 |
| 11 | Nov 2027 | 0.00 | 32,177.78 | 96,912.69 | 6,713.91 | 626.85 | 6,087.06 | 2,869.28 | 14,887.90 | 418.30 | 11,251.82 | −1,282,460.68 | −1,311,190.69 |
| 12 | Dec 2027 | 0.00 | 39,891.80 | 137,579.80 | 9,770.52 | 868.21 | 8,902.31 | 4,913.13 | 19,780.58 | 626.85 | 15,164.55 | −1,267,296.13 | −1,300,396.78 |
| 13 | Jan 2028 | 0.00 | 34,317.56 | 172,997.99 | 12,940.74 | 1,175.59 | 11,765.15 | 8,333.39 | 25,304.48 | 868.21 | 21,004.51 | −1,246,291.62 | −1,283,726.92 |
| 14 | Feb 2028 | 0.00 | 27,589.96 | 201,971.93 | 15,623.75 | 1,411.42 | 14,212.33 | 11,453.34 | 27,367.84 | 1,175.59 | 23,433.25 | −1,222,858.37 | −1,264,572.76 |
| 15 | Mar 2028 | 0.00 | 20,932.10 | 224,519.80 | 17,770.49 | 1,595.99 | 16,174.50 | 14,081.29 | 25,030.54 | 1,411.42 | 21,525.91 | −1,201,332.46 | −1,247,262.09 |
| 16 | Apr 2028 | 0.00 | 14,139.99 | 240,455.95 | 19,373.99 | 1,729.36 | 17,644.63 | 16,230.63 | 22,135.39 | 1,595.99 | 19,125.40 | −1,182,207.06 | −1,232,294.23 |
| 17 | May 2028 | 0.00 | 7,104.48 | 249,484.08 | 20,414.17 | 1,810.21 | 18,603.96 | 17,893.51 | 18,974.10 | 1,729.36 | 16,534.30 | −1,165,672.76 | −1,219,867.58 |
| 18 | Jun 2028 | 0.00 | 0.00 | 251,479.95 | 20,873.50 | 1,837.61 | 19,035.90 | 19,035.90 | 15,446.91 | 1,810.21 | 13,636.71 | −1,152,036.05 | −1,210,297.10 |
| 24 | Dec 2028 | 0.00 | 0.00 | 264,620.39 | 21,954.43 | 1,847.91 | 20,106.52 | 20,106.52 | 27,598.59 | 1,845.28 | 25,753.32 | −1,054,158.99 | −1,136,210.62 |
| 36 | Dec 2029 | 0.00 | 0.00 | 294,307.12 | 24,417.42 | 1,934.32 | 22,483.09 | 22,483.09 | 30,106.37 | 1,930.62 | 28,175.75 | −792,599.34 | −915,731.84 |

**Every outcome.** Cost rises by 176,000 and the benefit falls with each month of slip. "Benefit NPV" is the shift-only run (9.7). Guardrails are those of section 2.18.

| Slip k | Ship month | Probability (fraction) | Probability | Months gained | Cost | Benefit NPV | NPV | Δ ARR at month 12 | Δ ARR at month 36 | Burn multiple at month 12 | Cash low point | Guardrails passed | NPV with freed team |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 6 (Jun 2027) | 1/2 | 0.500000 | 6 | 1,305,166.67 | 410,365.51 | −841,257.30 | 137,579.80 | 294,307.12 | 1.9267 | 17,046,921.95 | 5 of 5 | −54,952.97 |
| 1 | 7 (Jul 2027) | 1/4 | 0.250000 | 5 | 1,481,166.67 | 332,067.79 | −1,082,747.69 | 97,812.69 | 245,488.61 | 1.9707 | 16,765,576.13 | 5 of 5 | −430,607.57 |
| 2 | 8 (Aug 2027) | 1/8 | 0.125000 | 4 | 1,657,166.67 | 257,963.99 | −1,318,510.22 | 64,937.55 | 196,606.36 | 2.0122 | 16,489,992.37 | 4 of 5 | −799,273.22 |
| 3 | 9 (Sep 2027) | 1/16 | 0.062500 | 3 | 1,833,166.67 | 187,975.91 | −1,548,637.50 | 38,835.83 | 147,665.29 | 2.0512 | 16,220,095.66 | 4 of 5 | −1,161,054.39 |
| 4 | 10 (Oct 2027) | 1/32 | 0.031250 | 2 | 2,009,166.67 | 121,960.96 | −1,773,286.40 | 19,389.94 | 98,614.71 | 2.0875 | 15,953,878.65 | 4 of 5 | −1,516,119.68 |
| 5 | 11 (Nov 2027) | 1/64 | 0.015625 | 1 | 2,185,166.67 | 59,763.10 | −1,992,627.12 | 6,483.24 | 49,390.61 | 2.1211 | 15,689,355.97 | 4 of 5 | −1,864,650.93 |
| 6 | 12 (Dec 2027) | 1/64 | 0.015625 | 0 | 2,361,166.67 | 0.00 | −2,208,056.00 | 0.00 | 0.00 | 2.1233 | 15,426,536.97 | 4 of 5 | −2,208,056.00 |

The burn multiple guardrail (2.0 or less) breaks whenever the hub slips two months or more: it passes in 75% of outcomes. The cash floor holds in every outcome, with as little as 426,536.97 to spare.

**Expected case.**

```
E[TotalInvestment] = 1,305,166.67 + 176,000 × 0.984375 = 1,478,416.67
E[Investment_m], m ≥ 7 = 17,916.67 (to month 9) + 176,000 × probability it has not shipped before month m
   m = 7: 105,916.67   m = 8: 61,916.67   m = 9: 39,916.67   m = 10: 11,000.00   m = 11: 5,500.00   m = 12: 2,750.00
E[NPV] = 0.5 × (−841,257.30) + 0.25 × (−1,082,747.69) + 0.125 × (−1,318,510.22) + 0.0625 × (−1,548,637.50)
       + 0.03125 × (−1,773,286.40) + 0.015625 × (−1,992,627.12) + 0.015625 × (−2,208,056.00) = −1,073,970.07
```

**Planned date versus pulled-in date, on target** (9.8):

| Integrations hub, on target | Without the hub | Planned date (Dec 2027) | Pulled-in date (Jun 2027) | Value of acceleration |
|---|---|---|---|---|
| ARR at month 12 | 30,048,489.36 | 0.00 | 137,579.80 | 137,579.80 |
| ARR at month 36 | 45,700,686.96 | 1,055,508.77 | 1,349,815.88 | 294,307.12 |
| New ARR, 36 months | 11,464,226.75 | 965,360.10 | 1,205,225.76 | 239,865.66 |
| Revenue, 36 months | 101,763,468.67 | 894,434.69 | 1,434,039.87 | 539,605.18 |
| Hosting cost, 36 months | 7,695,293.30 | 43,907.85 | 68,222.56 | 24,314.71 |
| COGS, 36 months | 20,351,791.38 | 79,685.24 | 125,584.15 | 45,898.92 |
| Gross profit, 36 months | 81,411,677.29 | 814,749.45 | 1,308,455.72 | 493,706.26 |
| EBITDA, 36 months | −23,087,407.31 | 718,213.44 | −117,233.53 | −835,446.97 |
| Cash at month 36 | 17,180,865.60 | 952,835.88 | 37,104.04 | −915,731.84 |
| Gross margin, trailing, month 12 (points) | 77.4538 | 0.0000 | 0.0119 | 0.0119 |
| Gross margin, trailing, month 24 (points) | 80.3642 | 0.0530 | 0.1285 | 0.0755 |
| Gross margin, trailing, month 36 (points) | 81.3696 | 0.1685 | 0.2360 | 0.0675 |
| Net flow, 36 months | n/a | 930,954.89 | 138,355.55 | −792,599.34 |
| NPV of net flow at 12% | n/a | 708,400.64 | −132,856.67 | −841,257.30 |

Read across: on its planned date the hub is worth 708,400.64 of NPV inside the model. Pulling it in adds 410,365.51 of benefit and costs 1,251,622.81 in today's dollars, which turns the hub's whole contribution negative.

**Tests T103, T104 and T105, expected results.**

| Measure | On target (k = 0) | Expected case | Planning case (k = 1) |
|---|---|---|---|
| Ship month | 6 | 6.984375 | 7 |
| Months gained | 6 | 5.015625 | 5 |
| Total investment | 1,305,166.67 | 1,478,416.67 | 1,481,166.67 |
| Extra new ARR (sum) | 239,865.66 | 201,145.24 | 200,873.86 |
| ΔARR at month 12 | 137,579.80 | 104,494.74 | 97,812.69 |
| ΔARR at month 36 | 294,307.12 | 246,184.02 | 245,488.61 |
| Sum of Δ revenue | 539,605.18 | 446,156.23 | 441,804.10 |
| Sum of Δ gross profit | 493,706.26 | 408,168.17 | 404,167.07 |
| Sum of Δ EBITDA | −835,446.97 | −1,090,363.02 | −1,097,086.98 |
| Cumulative NF at month 36 | −792,599.34 | −1,057,280.55 | −1,065,930.27 |
| NPV at 12% | −841,257.30 | −1,073,970.07 | −1,082,747.69 |
| Benefit NPV | 410,365.51 | 336,938.78 | 332,067.79 |
| Cost NPV | 1,251,622.81 | 1,410,908.85 | 1,414,815.48 |
| Value per month gained | 68,394.25 | 67,177.82 | not tested |
| Cost per month gained | 208,603.80 | 281,302.70 | not tested |
| ROI | −0.6073 | −0.7151 | −0.7197 |
| New ARR per dollar | 0.1838 | 0.1361 | 0.1356 |
| Payback month (cash) | not within 36 months | not within 36 months | not within 36 months |
| Probability of payback | not tested | 0 | not tested |
| Team time freed | 48 person-months, 860,000.00 | 40.125 person-months, 718,906.25 | not tested |
| NPV with freed team | −54,952.97 | −418,618.21 | not tested |
| ARR at month 12 (gap to 31,200,000) | 30,186,069.16 (1,013,930.84) | not tested | 30,146,302.06 (1,053,697.94) |
| Cash low point | 17,046,921.95 in month 34 | not tested | 16,765,576.13 in month 34 |
| Burn multiple at month 12 (baseline 1.7556) | 1.9267 | not tested | 1.9707 |
| Blended CAC payback at month 12 (baseline 18.03) | 17.77 | not tested | 17.84 |
| Lowest runway, months 1 to 12 (baseline 34.44) | 27.35 | not tested | 27.06 |
| Gross margin, trailing, month 12 (baseline 77.4538%) | 77.4657% | not tested | 77.4610% |
| Guardrails passed | 5 of 5 | burn multiple passes in 75% of outcomes, the other four in 100% | 5 of 5 |
| Every cell of the three tables above | as shown | | |

### 9.12 Hand-calculated example: Hosting cost optimization, pulled in 1 quarter

**Initiative.** The `accelerateCost` template with its defaults (9.2). The project is planned for September 2027 (`P = 9`), team of 5, and cuts hosting cost per customer by 20% over a 3-month ramp.

**Schedule.** `a = 1`, `R = 9`, `W = 5 × 9 = 45` person-months. Four contractors add `4 × 0.8 = 3.2` from month 2.

```
Capacity:    5.0 in month 1, then 8.2 a month
Cumulative:  5.0, 13.2, 21.4, 29.6, 37.8, 46.0      (46.0 ≥ 45 in month 6; 37.8 < 45 in month 5)
T_raw = 6;  T_floor = 0 + ceil(9 × 0.5) = 5;  T = 6 (June 2027);  G = 3 months;  c = 3 / 9 = 1/3
```

**Slip.** `q = 1 − 1/3 = 2/3`, `K = 3`: probabilities 2/3, 2/9, 2/27 and 1/27 for ship months 6 to 9.

```
ExpectedSlip = 2/9 + 2 × 2/27 + 3 × 1/27 = 13/27 = 0.481481 months
ExpectedShipMonth = 6.481481;  ExpectedMonthsGained = 2.518519;  ProbabilityNoGain = 1/27 = 0.037037
PlanningSlip = floor(0.481481 + 0.5) = 0, so PlanningShipMonth = 6
```

**Cost if it ships on the target date.** Contractors 4 × 20,000 = 80,000 a month in months 1 to 6 (R&D). Extra cloud 15,000 a month in months 4 to 6 (COGS). Total `480,000 + 45,000 = 525,000`. Each month of slip adds 95,000.

**Benefit.** Customers do not change, so the only effect is on hosting. "Hosting before the project" is average customers × 360 (the hosting line of the run without the milestone).

```
Saving_m = Hosting before the project × 0.20 × (share pulled in − share planned)

m = 7:   223,686.92 × 0.20 × (1/3 − 0)   = 14,912.46
m = 8:   224,843.20 × 0.20 × (2/3 − 0)   = 29,979.09
m = 9:   225,992.54 × 0.20 × (1 − 0)     = 45,198.51
m = 10:  227,134.99 × 0.20 × (1 − 1/3)   = 30,284.67
m = 11:  228,270.58 × 0.20 × (1 − 2/3)   = 15,218.04
m ≥ 12:  both at the full 20%, saving = 0
Total saving = 135,592.77
```

The extra shares are 1/3 + 2/3 + 1 + 2/3 + 1/3 = 3, the months gained: three months of the full saving, about 45,000 each.

**Cash.** Every line is a vendor bill, paid a month later.

```
NF_1 = 0
NF_2, NF_3, NF_4 = −80,000 each              (contractor bills of months 1 to 3)
NF_5, NF_6, NF_7 = −95,000 each              (contractors plus extra cloud, months 4 to 6)
NF_8 = +14,912.46;  NF_9 = +29,979.09;  NF_10 = +45,198.51;  NF_11 = +30,284.67;  NF_12 = +15,218.04
CumNF_36 = −525,000 + 135,592.77 = −389,407.23
```

**Gross margin.** Extra cloud in COGS costs 45,000 of gross profit in months 4 to 6 and the earlier saving adds 135,592.77 in months 7 to 11, so gross profit over 2027 is up 90,592.77 and trailing gross margin at month 12 rises from 77.4538% to 77.7896%. By month 24 the two cases are identical.

**Month by month, on target** (reference values):

| m | Month | Cost | Δ Hosting | Δ COGS | Δ Gross profit | Δ EBITDA | Δ Vendor paid | Net flow NF | Cumulative NF | Δ Cash balance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Jan 2027 | 80,000.00 | 0.00 | 0.00 | 0.00 | −80,000.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 2 | Feb 2027 | 80,000.00 | 0.00 | 0.00 | 0.00 | −80,000.00 | 80,000.00 | −80,000.00 | −80,000.00 | −80,000.00 |
| 3 | Mar 2027 | 80,000.00 | 0.00 | 0.00 | 0.00 | −80,000.00 | 80,000.00 | −80,000.00 | −160,000.00 | −160,266.67 |
| 4 | Apr 2027 | 95,000.00 | 0.00 | 15,000.00 | −15,000.00 | −95,000.00 | 80,000.00 | −80,000.00 | −240,000.00 | −240,800.89 |
| 5 | May 2027 | 95,000.00 | 0.00 | 15,000.00 | −15,000.00 | −95,000.00 | 95,000.00 | −95,000.00 | −335,000.00 | −336,603.56 |
| 6 | Jun 2027 | 95,000.00 | 0.00 | 15,000.00 | −15,000.00 | −95,000.00 | 95,000.00 | −95,000.00 | −430,000.00 | −432,725.57 |
| 7 | Jul 2027 | 0.00 | −14,912.46 | −14,912.46 | 14,912.46 | 14,912.46 | 95,000.00 | −95,000.00 | −525,000.00 | −529,167.99 |
| 8 | Aug 2027 | 0.00 | −29,979.09 | −29,979.09 | 29,979.09 | 29,979.09 | −14,912.46 | 14,912.46 | −510,087.54 | −516,019.42 |
| 9 | Sep 2027 | 0.00 | −45,198.51 | −45,198.51 | 45,198.51 | 45,198.51 | −29,979.09 | 29,979.09 | −480,108.44 | −487,760.39 |
| 10 | Oct 2027 | 0.00 | −30,284.67 | −30,284.67 | 30,284.67 | 30,284.67 | −45,198.51 | 45,198.51 | −434,909.94 | −444,187.75 |
| 11 | Nov 2027 | 0.00 | −15,218.04 | −15,218.04 | 15,218.04 | 15,218.04 | −30,284.67 | 30,284.67 | −404,625.27 | −415,383.71 |
| 12 | Dec 2027 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −15,218.04 | 15,218.04 | −389,407.23 | −401,550.29 |
| 13 | Jan 2028 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −389,407.23 | −402,888.79 |
| 24 | Dec 2028 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −389,407.23 | −417,910.06 |
| 36 | Dec 2029 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | −389,407.23 | −434,936.36 |

**Every outcome.**

| Slip k | Ship month | Probability (fraction) | Probability | Months gained | Cost | Benefit NPV | NPV | Hosting saved | Gross margin, trailing, month 12 | Burn multiple at month 12 | Cash low point | Guardrails passed | NPV with freed team |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 6 (Jun 2027) | 2/3 | 0.666667 | 3 | 525,000.00 | 123,372.85 | −379,237.48 | 135,592.77 | 77.7896% | 1.8220 | 17,576,455.71 | 5 of 5 | −130,036.72 |
| 1 | 7 (Jul 2027) | 2/9 | 0.222222 | 2 | 620,000.00 | 82,068.99 | −508,628.30 | 90,624.59 | 77.5673% | 1.8454 | 17,424,001.05 | 5 of 5 | −343,280.17 |
| 2 | 8 (Aug 2027) | 2/27 | 0.074074 | 1 | 715,000.00 | 40,944.20 | −637,012.06 | 45,426.54 | 77.3441% | 1.8688 | 17,271,803.89 | 5 of 5 | −554,728.38 |
| 3 | 9 (Sep 2027) | 1/27 | 0.037037 | 0 | 810,000.00 | 0.00 | −764,395.03 | 0.00 | 77.1201% | 1.8921 | 17,119,865.70 | 5 of 5 | −764,395.03 |

**Expected case.**

```
E[TotalInvestment] = 525,000 + 95,000 × 13/27 = 570,740.74
E[Hosting saved]   = 2/3 × 135,592.77 + 2/9 × 90,624.59 + 2/27 × 45,426.54 = 113,898.91
E[NPV]             = 2/3 × (−379,237.48) + 2/9 × (−508,628.30) + 2/27 × (−637,012.06) + 1/27 × (−764,395.03) = −441,350.50
```

**Planned date versus pulled-in date, on target:**

| Hosting optimization, on target | Without the project | Planned date (Sep 2027) | Pulled-in date (Jun 2027) | Value of acceleration |
|---|---|---|---|---|
| ARR at month 12 | 30,048,489.36 | 0.00 | 0.00 | 0.00 |
| ARR at month 36 | 46,756,195.73 | 0.00 | 0.00 | 0.00 |
| New ARR, 36 months | 12,429,586.85 | 0.00 | 0.00 | 0.00 |
| Revenue, 36 months | 102,657,903.36 | 0.00 | 0.00 | 0.00 |
| Hosting cost, 36 months | 9,119,130.92 | −1,379,929.77 | −1,515,522.54 | −135,592.77 |
| COGS, 36 months | 21,811,406.39 | −1,379,929.77 | −1,470,522.54 | −90,592.77 |
| Gross profit, 36 months | 80,846,496.97 | 1,379,929.77 | 1,470,522.54 | 90,592.77 |
| EBITDA, 36 months | −23,749,123.63 | 1,379,929.77 | 990,522.54 | −389,407.23 |
| Cash at month 36 | 16,761,634.67 | 1,372,066.81 | 937,130.45 | −434,936.36 |
| Gross margin, trailing, month 12 (points) | 77.1147 | 0.3391 | 0.6750 | 0.3359 |
| Gross margin, trailing, month 24 (points) | 78.6295 | 1.7876 | 1.7876 | 0.0000 |
| Gross margin, trailing, month 36 (points) | 79.9039 | 1.6342 | 1.6342 | 0.0000 |
| Net flow, 36 months | n/a | 1,320,332.96 | 930,925.72 | −389,407.23 |
| NPV of net flow at 12% | n/a | 1,049,672.75 | 670,435.27 | −379,237.48 |

The project is worth 1,049,672.75 of NPV on its planned date. A quarter sooner is worth 123,372.85 more and costs 502,610.33.

**Tests T106, T107 and T108, expected results.**

| Measure | On target (k = 0, also the planning case) | Expected case |
|---|---|---|
| Ship month | 6 | 6.481481 |
| Months gained | 3 | 2.518519 |
| Total investment | 525,000.00 | 570,740.74 |
| Hosting saved (sum of −Δ hosting) | 135,592.77 | 113,898.91 |
| Sum of Δ gross profit | 90,592.77 | 61,676.68 |
| Sum of Δ EBITDA | −389,407.23 | −456,841.84 |
| Cumulative NF at month 36 | −389,407.23 | −456,841.84 |
| NPV at 12% | −379,237.48 | −441,350.50 |
| Benefit NPV | 123,372.85 | 103,519.02 |
| Cost NPV | 502,610.33 | 544,869.53 |
| Value per month gained | 41,124.28 | 41,103.14 |
| Cost per month gained | 167,536.78 | 216,345.25 |
| ROI | −0.7417 | −0.8004 |
| Payback month (cash) | not within 36 months | not within 36 months |
| Team time freed | 15 person-months, 268,750.00 | 12.592593 person-months, 225,617.28 |
| NPV with freed team | −130,036.72 | −232,377.54 |
| ΔARR at month 12 and month 36 | 0.00 | 0.00 |
| ΔCash balance at month 12 / month 36 | −401,550.29 / −434,936.36 | not tested |
| Cash low point | 17,576,455.71 in month 34 (change −432,051.22) | not tested |
| Burn multiple at month 12 (baseline 1.7556) | 1.8220 | not tested |
| Blended CAC payback at month 12 (baseline 18.03) | 17.95 | not tested |
| Lowest runway, months 1 to 12 (baseline 34.44) | 30.88 | not tested |
| Gross margin, trailing, month 12 (baseline 77.4538%) | 77.7896% | not tested |
| Guardrails passed | 5 of 5 | all five pass in 100% of outcomes |
| Every cell of the three tables above | as shown | |

What the two examples say together: under the plan's assumptions neither pull-in pays for itself within 36 months. A month sooner is worth about 68,000 for the hub and 41,000 for hosting, and costs about 209,000 and 168,000 to buy with contractors. Section 9.15 explains which assumptions drive that.

### 9.13 More test cases

Reference values unless marked. Every scenario must pass all 20 checks.

| Test | Scenario | Expected |
|---|---|---|
| T100 | No acceleration initiative | Every test T01 to T97 passes with its expected values unchanged. Ship months used are 9, 12 and 18. C17 to C20 pass. The badge reads "Integrity 20/20" |
| T101 | Schedule function alone (9.3) | Hub example: `W` 96, cumulative capacity as in 9.11, `T_raw` 6, `T_floor` 6, `T` 6, `G` 6, `c` 0.5, limit not binding. Hosting example: `W` 45, `T_raw` 6, `T_floor` 5, `T` 6, `G` 3. Hub with 20 contractors from month 1 and nothing else: cumulative 8, 32, 56, 80, 104; `T_raw` 5, `T_floor` 6, `T` 6, limit binding. Hub with 2 contractors from month 1: `T` 11, `G` 1, `c` 0.083333. Hub with 1 contractor from month 9: `a` 9, `R` 4, `W` 32, cumulative 8, 16.8, 25.6, 34.4; `T` 12, `G` 0. Hub with 4 contractors from month 5: `a` 5, `R` 8, `W` 64, cumulative reaches exactly 64.0 in month 10, which counts as reached: `T_raw` 10, `T_floor` 8, `T` 10, `G` 2, `c` 0.25. Hub example with `addedPersonEfficiency` 0.79: cumulative 95.791 in month 6, so `T` 7 and `G` 5 |
| T102 | Slip rule alone (9.4) | `G` 0: one row, probability 1. `G` 6, `c` 0.5: 0.5, 0.25, 0.125, 0.0625, 0.03125, 0.015625, 0.015625; expected slip 0.984375. `G` 3, `c` 1/3: 2/3, 2/9, 2/27, 1/27; expected slip 0.481481. `G` 6, `c` 0.5, `slipSensitivity` 1.5: `q` 0.25, last probability 0.177979, expected slip 2.466064. `slipSensitivity` 2: `q` held at the minimum 0.10, last probability 0.531441, expected slip 4.217031. `G` 3, `c` 1/3, `maxOverrunMonths` 2: six rows, last probability (1/3)^5 = 0.004115, expected slip 0.497942. Every table sums to 1 |
| T109 | Null acceleration: the hub with no people, tooling or cloud | `T` 12, `G` 0, one outcome with probability 1, cost 0 in every month, every series equals the baseline within 1e-6, NPV 0, payback "no effect" |
| T110 | After launch (9.5), hub example with the two engineers changed | `"stay"`: on-target investment 2,419,253.67 (cost in month 13 is 36,908.33 and in month 25 is 38,015.58), NPV −1,753,563.12; expected investment 2,592,503.67, expected NPV −1,986,275.88. `"leave"`: cost in month 4 is 211,833.33 and in month 7 is 0; on-target investment 1,305,166.67 (ten engineer-months, the same total as the example by coincidence), NPV −842,689.58; expected investment 1,513,690.10, expected NPV −1,108,140.46 |
| T111 | Slip overrides | Hosting example with `probabilities` 0.5, 0.2, 0.1, 0.1, 0.1: five outcomes, ship months 6 to 10; expected slip 1.1; probability of no gain 0.2; planning ship month 7. The last outcome ships a month **later** than planned: investment 905,000.00, benefit NPV −40,764.05, NPV −890,785.36, hosting cost up 45,655.82. Expected investment 629,500.00, expected benefit NPV 78,118.24, expected NPV −520,563.64. Hub example with `pOnTime` 0.8: probabilities 0.8, 0.16, 0.032, 0.0064, 0.00128, 0.000256, 0.000064; expected slip 0.249984; planning ship month 6; expected investment 1,349,163.85; expected benefit NPV 391,052.56; expected NPV −901,270.32 |
| T112 | Shift only: a `milestone_shift` and no cost | Hub to month 6: NPV 410,365.51, cumulative NF 512,567.33, ΔARR at month 36 = 294,307.12. Hosting to month 6: NPV 123,372.85, cumulative NF 135,592.77. Offline mobile app from month 18 to month 15: churn rate in month 16 = 0.585%, ΔARR at month 24 = 95,198.85 and at month 36 = 105,878.84, extra customers at month 36 = 1.6491, NPV 118,793.16. In each case the extra effect share summed over months 1 to 36 equals the months gained (6, 3 and 3) |
| T113 | Combined runs use the planning case (9.7) | Trade show (section 4.3) with the hub example: the hub ships in month 7, so the show's deals closing in month 9 get a 2/6 share of the lift: 130,000 × (1 + 0.08 × 2/6) × (1 + 0.05 × 2/6) = 135,691.11 of new ARR instead of 130,000. Together: investment 1,557,166.67, NPV −868,254.59, which is 12,296.21 better than the two alone (202,196.90 and −1,082,747.69); ΔARR at month 12 = 236,786.51. Hub example with the hosting example (ship months 7 and 6): investment 2,006,166.67, NPV −1,461,937.29 (47.88 better than the two alone), cash low point 16,333,582.25 in month 34, lowest runway 24.71, and burn multiple at month 12 = 2.0360, so the combined plan breaks a guardrail (4 of 5 pass) that each passes alone |
| T114 | New effect kinds and timing (9.6), as assumption edits with no initiative | `offline_mobile.effects.expansionLift` 0.05: expansion rate 1.683917% in month 19 and 1.7535% from month 24; expansion ARR in month 19 = 565,142.08 (baseline 560,471.48); ARR at month 24 = 37,695,684.95 and at month 36 = 47,314,913.89; cash at month 36 = 18,572,753.52. `hosting_optimization.effects.thirdPartyCostReduction` 0.10: third-party cost falls by 3,192.71 in month 10 and 9,927.19 in month 12; COGS in month 12 = 484,556.81; trailing gross margin at month 12 = 77.5265%; cash at month 36 = 18,452,200.84. `integrations_hub.effectTiming.acvLift` with `delayMonths` 3 and `rampMonths` 3: new ARR in month 13 = 305,800 × (1 + 0.08/6) = 309,877.33, in month 16 = 310,390 × (1 + 0.08 × 4/6) × (1 + 0.05/3) = 332,393.20, in month 18 = 359,523.36; ARR at month 36 = 46,727,401.57 |
| T115 | Tamper tests, as in section 4.2, on the planning-case result of the hub example | Add 0.01 to the stored win-rate share in month 9: C17. Add 1.00 to `Hosting_10`: C17 and C13. Set the stored ship month of the hub to 6 while the run used 7: C17 and C18. Add 0.01 to the second slip probability: C18. Set stored months gained to 7: C18. Add 1.00 to initiative vendor cost on R&D in month 8 (after the ship month): C19. Add 1.00 to `Investment_3`: C19. Add 1.00 to the stored expected NPV: C20. Add 1.00 to the pulled-in ARR at month 36 in the side-by-side: C20. Run C20 with a null acceleration that has one contractor: C20 |
| T116 | Input checks (9.7) | Each of these stops the run and names the input: unknown milestone; disabled milestone; `startMonth` 13 for the hub; `startMonth` 2.5; count −1; `speedup` −0.1; `afterLaunch` "maybe"; `line` "sm"; `pOnTime` 1.2; `probabilities` 0.5, 0.4; two initiatives shifting the hub in one run |
| T117 | Template defaults | The `accelerateRevenue` and `accelerateCost` templates with no edits reproduce 9.11 and 9.12 |
| UI (in `tests/run.js`, written in Step 4b) | The two cards | Added cost by month; months gained; probability of hitting the new date; benefit by month; payback, NPV and the gross margin effect; the side-by-side with its Value column equal to the card's numbers; the "not counted" block; no em dashes; no sideways scrolling on a 390px phone |

### 9.14 Check of this section's math

What was done to check the numbers above, so the next reader does not have to trust them:

1. **Two independent calculations of both examples.** The reference values in 9.11 and 9.12 were computed with the audited engine of Steps 1 to 3 used as a calculator (a pulled-in ship month is an edited `shipMonth`, and every cost line is an existing `headcount` or `vendor_cost` effect). They were then recomputed by a separate script that shares no code with the engine and applies the recurrences of sections 2.3 to 2.8 directly to the deltas. Its only inputs from the model are the baseline customer counts and the new ARR and deals of the run without the hub. Across all 11 outcome runs the two agree on investment, NPV, benefit NPV and the full 36-month series of net flow and Δ gross profit (plus ΔARR and Δ revenue for the hub and Δ hosting for hosting): 1,473 values, largest difference under 0.000001.
2. **Hand checks.** The capacity tables, both slip tables, both cost tables, all eleven hub new-ARR lines, `ΔARR_12`, hub months 1 to 8, all five hosting savings lines and the hosting net flows are worked by hand above and match the reference tables.
3. **Integrity.** All 16 existing checks pass on every outcome run of both examples (11 runs) and on both combined runs of T113.
4. **Identities.** Slip probabilities sum to 1 (1/2 + 1/4 + 1/8 + 1/16 + 1/32 + 1/64 + 1/64 and 2/3 + 2/9 + 2/27 + 1/27). `Σ p_k × NPV_k` equals the NPV of the expected net-flow series (−1,073,970.07 and −441,350.50 both ways). In both side-by-side tables, Pulled-in minus Planned equals the Value column, which equals the initiative delta (a cell can differ by 0.01 from rounding). Extra effect shares sum to the months gained. The hub's 1,305,166.67 and hosting's 525,000.00 foot from their cost lines.
5. **What was checked by one path only:** the variant cases in 9.13 (T110, T111, T113) use the engine as calculator and a hand check of the cost lines. The three new-effect cases in T114 cannot be run by today's engine as written, so each was computed by expressing the new effect through an existing mechanism (a month-by-month `driver_change` for the expansion lift, a negative `vendor_cost` on COGS for the third-party cut, a second milestone entry for the delayed ACV lift), plus a hand check of the first affected month. If Step 4b gets different numbers for T114, recheck these three before changing the engine.

### 9.15 Assumptions a real CFO would question

These continue the list in section 7.

27. **Neither worked example pays within the model, and that is a result, not a typo.** The acceleration buys work the existing team would have done anyway, a few months sooner, at about 25,000 per effective person-month (20,000 a month at 0.8 efficiency). Moving the hub by one month takes 8 person-months, about 209,000, and is worth about 68,000. For hosting it is 5 person-months, about 168,000, against 41,000. Items 28 and 29 are the two assumptions that most hold the benefit down.
28. **No value after month 36.** Section 2.17 has no terminal value. On target, the hub pull-in still has 294,307.12 of extra ARR in place at month 36, earning about 240,000 of gross profit a year, and none of that later profit is counted. About three and a half more years of it would cover the on-target shortfall. A pull-in of a revenue milestone is exactly the kind of initiative this rule punishes.
29. **Team time freed is not counted.** Shipping the hub 6 months early frees 8 engineers for 6 months: 48 person-months, 860,000 at loaded cost. Counting it would move the on-target NPV from −841,257.30 to −54,952.97. It is left out because no cash is saved and because its real value depends on what the team does next, which the model does not know. This is stricter than the treatment of staff time **used** by an initiative, which is charged (section 7 item 23). A CFO who believes the next roadmap item is waiting would count it.
30. **Person-months are treated as interchangeable.** The capacity model assumes work can be handed to new people at 80% efficiency with no drag on the existing team. In practice new people slow the team down before they speed it up. The 50% compression limit is generous; a common rule of thumb is that a schedule cannot be cut by much more than a quarter.
31. **The target date is a cliff.** Ship months are whole months, so a small change in capacity moves the date by a full month. The hub example clears its work by 0.32 person-months out of 96; at an efficiency of 0.79 instead of 0.80 the target is July, not June (T101).
32. **The slip rule is a guess with a tidy shape.** "Chance of hitting the date = 1 minus compression" is easy to explain and has no data behind it. It ignores how the pull-in is staffed and how much slack the plan has. The same chance repeats every month, and by default the worst case is the planned date: an overstaffed project that finishes later than it would have is only modeled if `maxOverrunMonths` or a custom table says so.
33. **Planned dates are assumed to hold.** The deterministic model ships every baseline milestone on time, so the pulled-in case carries schedule risk and the planned case carries none. The simulation adds a common slip to both (9.9).
34. **Nobody pulls the plug.** Contractors, tooling and extra cloud run until the milestone ships. In the worst hub outcome that is 2,361,166.67 spent for nothing. A real team would stop or re-plan after a month or two of slip.
35. **The win-rate lift reaches deals already in the pipeline.** The lift applies in the month a deal closes, so a deal opened four months before the hub ships still benefits. If only new opportunities benefited, the effect would start one sales cycle later (2 to 5 months) and a pull-in would be worth less inside the model.
36. **Effect sizes do not depend on the ship date.** Shipping six months sooner gives the same 8% and 5%, just earlier. There is no first-mover gain, no competitor response and no decay. The lifts are the same on every channel, the ACV lift reaches new deals only, and every ramp is a straight line.
37. **Expected values hide the spread.** The headline is a probability-weighted average of 4 or 7 outcomes. The planning case rounds the expected slip to a whole month. For the hub the burn multiple guardrail passes in the planning case and fails in 25% of outcomes, which is why the card shows the pass share.
38. **Hiring early into a planned seat is treated as nearly free.** After the planned start month the baseline pays. That is right only if the plan would really have made that hire. Recruiting is charged in full although the fee is only moved forward.
39. **Cost-saving effects are a fixed percentage.** The hosting project saves 20% per customer whenever it ships. Migration risk, an outage during cutover and the chance that the saving is smaller are not modeled (the simulation varies the size). Extra cloud during the cutover is a judgment, and placing it in COGS lowers gross margin for three months.
40. **Acceleration costs are judgment.** Contractor rate, efficiency, ramp, recruiting fee and the tooling speed-up are starting points, not evidence. Contractor rates and tools are not inflated.
41. **Initiatives do not compete for people.** Two accelerations can each hire into planned seats until the seats run out, but nothing limits how many contractors can be found or managed at once, and a slip on one milestone does not delay another.

### 9.16 Glossary additions and engine interface

| Term | Plain meaning |
|---|---|
| Pull-in (acceleration) | Spending money to ship a roadmap milestone sooner than planned |
| Person-month | One person working for one month. The unit of work left on a milestone |
| Planned date | The month the milestone ships in the plan |
| Target date | The month it should ship with the added resources |
| Months gained | Planned date minus target date |
| Compression | Months gained as a share of the planned months of work left |
| Slip | Months the milestone ships after its target date |
| On-target case | The result if the milestone ships on the target date |
| Expected case | The average result across all possible ship dates, each weighted by its probability |
| Planning case | The single ship date used when the initiative sits in a plan with others: the expected ship month, rounded |
| Without run | The model with this one milestone switched off. The reference for the side-by-side |
| Benefit NPV | What the earlier date is worth in today's dollars before any cost. The most it is worth paying |
| Team time freed | The months the existing team gets back when the milestone ships early. Reported, not counted |

Engine interface (names are suggestions, behavior is required; this extends section 2.19):

- `accelerationSchedule(assumptions, acceleration)` returns the schedule of 9.3 and the slip table and summary of 9.4.
- `accelerationEffects(assumptions, acceleration, shipMonth)` returns the effects of 9.7 for one actual ship month.
- `evaluateAcceleration(assumptions, initiative)` returns `{ schedule, without, planned, outcomes, onTarget, expected, planning, sideBySide }` using 9.7 and 9.8.
- `runModel` and `applyInitiatives` accept an initiative that carries `acceleration` and expand it at the planning ship month, or at `actualShipMonth` when given.
- `templates.accelerateRevenue(params)` and `templates.accelerateCost(params)` build the initiative from the defaults in 9.2.
- `runChecks` returns 20 checks.
