# KCU LTP Strategy Guide

## Framework Overview

**LTP** = **L**evels + **T**rend + **P**atient Candle

The LTP framework is designed to identify high-probability trading setups by ensuring three critical components align:

1. **Levels** - Strong support/resistance zones with confluence
2. **Trend** - Clear directional bias confirmed by ORB and hourly structure
3. **Patient Candle** - Valid entry signal with proper containment

---

## Core Timeframes

- **60-minute**: Primary level discovery (include pre-market & after-hours data)
- **5-minute**: Main execution timeframe
- **2-minute**: Precision entries in strong trends
- **10-minute**: Trend clarity on SPX after ~11:00 ET

---

## Opening Range Breakout (ORB)

**Purpose**: Classify the day as TREND or CHOP

**Rules**:

- First 15 minutes (09:30-09:45 ET) forms the range
- Visualize with green top/bottom lines
- Break + hold = TREND day → expect sequential PCs and momentum
- Stays inside / fails = CHOP day → deprioritize trading (study day)

**Not an entry tool** - Use for day classification only

---

## Core Indicators

### VWAP (Intraday "King")

- Baseline for smart-money flow
- Post-10:00 ET rule applies
- King & Queen setups (VWAP + any level)

### EMA(8) and EMA(21)

- **8-EMA**: Favored for bounce in strong trends (hold as long as price respects)
- **21-EMA**: NOT for bounce - used for King & Queen confluence with VWAP
- Hourly trend filter: Favor longs above 21-EMA on 1H; shorts below

### 200 SMA

- What-NOT-to-trade guardrail
- Skip trades where 200 SMA blocks direction (poor R:R)

### Fibonacci

- **0.236** (primary tier) - Best option viability
- **0.382** (secondary tier) - Still valid
- **Above 0.5** - Skip (weakened edge + option decay)

---

## Setup Types

### 1. ORB Breakout + PC

**When**: After ORB forms; day classified as TREND
**Entry**: PC at ORB line retest with confluence (8-EMA, 200 SMA, VWAP)
**Stop**: Other side of PC
**Targets**: Intraday levels, half-day levels

### 2. EMA(8) Bounce + PC

**Prerequisites**:

- Visible trend
- Pre-market high/low or hourly level already broken (momentum "on")
  **Entry**: PC at 8-EMA (NOT 21-EMA)
  **Management**: Hold as long as price respects 8-EMA on execution timeframe
  **Stop**: Other side of PC
  **Targets**: Next hourly or HOD/LOD

### 3. VWAP Strategy

**When**: After 10:00 ET only
**Prefer**: Price near VWAP with open-price consolidation
**Entry**: PC at VWAP
**Avoid**: Mid-air signals, counter-trend plays, obvious rejections

### 4. King & Queen

**Concept**: VWAP (king) + any level (queen) = defended confluence
**Queen can be**: 8/21-EMA, ORB, open, hourly, 200 SMA
**When**: Works best after 09:40 ET
**Entry**: PC at king+queen touch
**Expect**: Decisive bounce/reject with trend

### 5. Cloud Strategy (Afternoon)

**When**: 13:00-15:00 ET (1:00-3:00 PM)
**Algos**: Watch for around 12:55 ET
**Prerequisite**: Morning trended (skip if AM was chop)
**Entry**: PC within/at cloud zone
**Think**: Scalps to intraday levels

### 6. Fib Pullback + PC

**Best for**: Options (manage decay)
**Entry zones**:

- 0.236 (top tier)
- 0.382 (2nd tier)
- Skip if already at 0.5
  **Requirements**: Trend + PC containment

### 7. Gap / "Sucker" Reversal

**Setup**: Gap up, fails pre-market high
**Entry**: First reversal short
**Manage**: To VWAP/premarket levels

---

## Patient Candle (PC) Rules

### Containment Rule (CRITICAL)

- **For longs**: Top of PC is fully contained inside prior candle's range
- **For shorts**: Bottom of PC is fully contained inside prior candle's range
- **Any wick poking out = INVALID**

### Entry Rules

- PC must occur at/near confluence - NEVER "in the middle of nowhere"
- Stop always goes on the other side of the PC
- Size vs. prior candle matters (too large = suspicious)

---

## Market Timing & Phases

### 09:30-09:45 ET

- ORB forming
- Let first 15-min complete

### 09:40+ ET

- King & Queen setups become reliable

### 10:00+ ET

- VWAP strategies activate
- DO NOT trade VWAP setups before 10:00 ET

### 11:00+ ET (SPX)

- 10-min trend clarity improves

### 12:55 ET

- Beware algos (preface to Cloud)

### 13:00-15:00 ET

- Cloud Strategy window
- Only if morning trended

### FOMC Days

- Usually chop until 14:00 decision
- Tactical approach: Wait 14:25-14:35, look for PC with clear stop
- **Most traders skip FOMC days entirely**

---

## Risk & Reward

### Minimum Requirements

- **R:R**: Do NOT take trades risking ≈2-3 to make ≈2
- **Aim**: ≥1:2 (prefer 1:3+)
- Visualize projected move to next hourly/intraday level before entry

### Stop Placement

- Always other side of PC
- No exceptions

### Profit Targets

- Next hourly levels
- HOD/LOD
- 5-min 200 SMA (get out on touch/approach)

### Sizing Heuristics

- **Size UP**: Trading with hourly trend
- **Size DOWN**: Going against trend before bigger structure breaks

---

## No-Trade Filters

### Skip if:

1. **200 SMA headwind** - Blocks trade direction just ahead
2. **ORB = CHOP day** - Treat as study day
3. **VWAP setup before 10:00 ET** - Rule violation
4. **Poor R:R** - Below 1:2 minimum
5. **PC not contained** - Invalidates setup
6. **Mid-air entries** - No confluence nearby

---

## Confluence Scoring

### Elements to Check:

1. ORB line
2. VWAP
3. 8-EMA
4. 21-EMA
5. Open price
6. Hourly level
7. 200 SMA
8. Fibonacci level

**Higher confluence = Higher probability**
Entry button should require minimum score + valid PC

---

## Management Rules

### Hold Above 8-EMA

- In trends, valid to trail by "stays above 8-EMA = hold"
- Break of 8-EMA = trim/exit signal

### Bid/Ask Confirmation

- For breakouts: Require bid AND ask both above critical level
- Don't enter on false breakouts

### Exit Points

1. Target hit
2. 5-min 200 SMA touch/approach
3. 8-EMA break (in trend-following trades)
4. Hourly level resistance

---

## Metrics to Track

### Essential KPIs:

1. **Trend vs. Chop Win Rate** (by ORB classification)
2. **Confluence Score** per trade
3. **PC Quality Rate** (contained? size appropriate?)
4. **R:R at Entry vs. Realized R**
5. **Management Discipline** (% of trend trades held above 8-EMA)
6. **Sizing Discipline** (% trades sized with/against hourly trend)
7. **No-Trade Compliance** (correctly skipped trades)
8. **Event Hygiene** (FOMC outcomes vs. normal days)

---

## Quick Reference Checklist

### Before Entry:

- [ ] ORB labeled day (TREND or CHOP)?
- [ ] Hourly trend direction confirmed?
- [ ] Valid PC with containment?
- [ ] Confluence score adequate (7+)?
- [ ] R:R ≥ 1:2 (prefer 1:3+)?
- [ ] 200 SMA not blocking?
- [ ] Time-based rule met? (VWAP post-10:00, etc.)
- [ ] Stop placement clear (other side of PC)?

### During Trade:

- [ ] Respecting 8-EMA (if trend-following)?
- [ ] Approaching 5-min 200 SMA?
- [ ] Nearing hourly level?
- [ ] Sized appropriately for trend direction?

### After Trade:

- [ ] Why did I enter?
- [ ] Why did I exit?
- [ ] What can I improve?
- [ ] Weekly: 3 strengths, 3 fixes

---

## Philosophy

**"Getting Paid" means**:

1. Never enter on PC without confluence
2. Respect time-based rules (10:00 for VWAP, etc.)
3. Skip obvious no-trade setups (chop days, 200 SMA blocks)
4. Trail winners using 8-EMA in trends
5. Cut losers at PC stop - no second-guessing

**Edge comes from**:

- Participation in TREND days
- Cutting out CHOP days
- Patient, high-confluence entries
- Proper risk management

---

_Remember: This is a playbook, not a prediction tool. Follow the rules, journal religiously, and let probability work in your favor._
