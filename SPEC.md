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

Sales cycle shifts by a whole number of months, drawn once per channel: −1 month (15%), 0 (55%), +1 (20%), +2 (10%). The cycle never goes below 0. Ship-date slip is defined with product acceleration in a later phase. Random numbers come from a seeded generator (`simulation.seed`, default 2027; `simulation.runs`, default 1,000).

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

Planned hires and initiative hires both count. An initiative hire stops counting after its `end` month.

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

The forecast starts on the first day of a month `t0` (default 1, so January 1, 2027) and covers 91 days. Week `w` is days `7w − 6` to `7w`. Each day belongs to a calendar month `m` with `D_m` days (real calendar: February 2028 has 29 days). Monthly flows from the model are placed on days like this:

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
| `headcount` | `role`, `count`, `startMonth`, `endMonth` (optional), `loadedCostAnnual` (optional) | Adds people: payroll on the role's P&L line and, for AEs and SDRs, ramped capacity |
| `vendor_cost` | `line` ("cogs", "rd", "sm", "ga"), `byMonth` | Adds a non-payroll cost to that line, paid through payables |
| `allocated_cost` | `byMonth` | The cost of existing staff time. It does **not** change the P&L, the balance sheet or cash, because those people are already paid. It is counted in the investment and in the return measures (section 2.17) |
| `capex` | `byMonth` | Adds to capex |
| `driver_change` | `driver`, `channel` (optional), `fromMonth`, `toMonth`, `mode` ("multiply" or "add"), `value` | Changes one driver for those months. Drivers: `costPerLead`, `leadToMqlRate`, `mqlToOppRate`, `winRate`, `acv` (per channel), `churnRateMonthly`, `expansionRateMonthly`, `contractionRateMonthly`, `hostingCostPerCustomerPerMonth` |
| `milestone_shift` | reserved | Defined with product acceleration in a later phase |

Rules:

1. For a driver in a month, `value = base × (product of all multipliers) + (sum of all adds)`. Rates are then clamped to 0 to 1 and other drivers to 0 or more. The result does not depend on the order of effects.
2. Lead-stage drivers (`costPerLead`, `leadToMqlRate`, `mqlToOppRate`) use the month the leads arrive. `winRate` and `acv` use the month the deal closes. Others use the month they are applied.
3. Several initiatives are applied together in one run. They interact only through shared drivers, in practice through AE capacity.
4. The engine never changes the assumptions object it is given.

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

The engine runs every check on every recalculation, for the baseline and for the current scenario. The header badge shows "Integrity N/16". A failed check is shown in red with its name, the first month that fails and the size of the difference.

Tolerance: a dollar check passes when the absolute difference is at most 0.01. A count check passes at 1e-6.

A check must compare two numbers that the engine computed by **different paths**. A check that compares a number with itself is a bug. `runChecks` recomputes every total from its component lines (for example total assets from cash, receivables, prepaid and PP&E) and does not trust a stored total.

| # | Check | Passes when, for every month in range |
|---|---|---|
| C1 | Balance sheet balances | `Assets_m = Liabilities_m + Equity_m` for `m = 0 … 36` |
| C2 | Cash flow ties to the balance sheet | `Cash_m` (direct method, 2.11) `= Cash_(m−1) + CFO_m + CFI_m + CFF_m` (indirect, 2.13) |
| C3 | Net income rolls into retained earnings | `RetainedEarnings_m = RetainedEarnings_(m−1) + NetIncome_m` |
| C4 | ARR rollforward ties | `ARR_m = ARR_(m−1) + NewARR_m + Expansion_m − Contraction_m − Churn_m`, `NewARR_m = Σ_c NewARR_c,m`, and `ARR_m ≥ 0` |
| C5 | Funnel shape | For every channel: `Leads ≥ MQL ≥ SourcedOpps ≥ 0`; `OppsCreated ≥ OppsWorked ≥ 0`; `Deals_c,m ≤ OppsWorked_c,(m − cycle)`; and `Σ_c OppsWorked_c,m ≤ Capacity_m` whenever `WorkShare_m < 1` |
| C6 | Channel spend equals P&L program spend | `Σ_c Spend_c,m` from the funnel `=` the program-spend component of S&M `=` baseline spend plus initiative program spend summed from the inputs |
| C7 | A zero initiative changes nothing | Running the model with a null initiative (one of each effect kind, all amounts zero, count zero) gives the same value as the baseline for every series, within 1e-6 |
| C8 | Revenue equals what ARR implies | `Revenue_m × 24 = ARR_(m−1) + ARR_m` |
| C9 | Deferred revenue rolls forward | (a) `DR_m = DR_(m−1) + I_m − s × Revenue_m`; (b) `DR_m = Σ_{j=0}^{11} I_(m−j) × (23 − 2j) / 24`, recomputed from the invoice history; (c) `Σ_{j=0}^{11} I_(m−j) = s × ARR_m`; (d) `I_m ≥ 0` |
| C10 | Covenant and cash floor are reported | A floor result and a covenant result exist for every month 1 to 36; the reported low point equals the minimum of balance sheet cash; the reported breach months equal the months where balance sheet cash is below each threshold |
| C11 | Receivables and payables roll forward | `AR_m = AR_(m−1) + Billings_m − Collections_m`; `AP_m = AP_(m−1) + VendorSpend_m − VendorPaid_m`; `AR, AP, DR, Collections, VendorPaid ≥ 0` |
| C12 | Payroll ties to headcount | `Σ over P&L lines of Payroll_line,m = Σ over roles of the payroll formula in 2.2`, and total headcount equals the sum by role |
| C13 | P&L foots | `GrossProfit = Revenue − COGS`; `COGS` and `Opex` equal the sum of their lines; `EBITDA = GrossProfit − Opex`; `NetIncome = EBITDA − Depreciation + InterestIncome − InterestExpense − Tax` |
| C14 | PP&E and debt roll forward | `PPE_m = PPE_(m−1) + Capex_m − Depreciation_m ≥ 0`; `Debt_m = Debt_(m−1) − Principal_m ≥ 0`; `InterestExpense_m = Debt_(m−1) × rate / 12` |
| C15 | 13-week forecast ties to the monthly model | `DailyCash` on each month-end inside the window equals `Cash_m`; `Σ WeekNet_w = DailyCash_91 − DailyCash_0` |
| C16 | Customers roll forward and all numbers are finite | `Customers_m = Customers_(m−1) + Deals_m − LostCustomers_m ≥ 0`; no series contains NaN or an infinite value (runway may be "not burning") |

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
