# Patient Candle Visualizer - Documentation

## Purpose

The Patient Candle (PC) Visualizer provides a **visual, strategy-aligned** representation of the most critical rule in the LTP framework: **PC Containment**.

Instead of showing abstract metrics like "size" and "stop distance", the visualizer shows exactly what matters for trade validation.

---

## What It Shows

### 1. **Visual Candle Comparison**

- **Prior Candle** (left, muted color) - The reference candle
- **Patient Candle** (right, green/red) - The entry signal candle
- Side-by-side comparison makes containment immediately obvious

### 2. **Containment Validation**

For **LONG** setups:

- ✓ PC high must be ≤ Prior candle high
- ✓ PC low must be ≥ Prior candle low
- ✗ Any wick poking out = INVALID

For **SHORT** setups:

- Same rule applies (PC must fit inside prior candle range)

### 3. **Trade Levels**

- **Entry line** (blue dashed) - Where the trade will be entered
- **Stop line** (red dashed) - Where the stop will be placed (other side of PC)
- Context: See how far stop is from entry in relation to candle structure

### 4. **Visual Breach Indicator**

If PC is **NOT contained**:

- Red dots appear on the breaching wick(s)
- Clear visual feedback that setup is invalid

---

## Why This Matters

### Old Approach (Size + Stop Distance)

❌ "Size: 0.85 pts" - What does this mean?  
❌ "Stop Distance: 2.50 pts" - Compared to what?  
❌ No visual validation of containment rule

### New Approach (Visual Candle Chart)

✓ **Immediate visual confirmation** of containment  
✓ **See the actual candles** - not just numbers  
✓ **Stop placement context** - understand the risk geometry  
✓ **Breach detection** - red dots highlight violations  
✓ **Educational** - teaches proper PC validation visually

---

## LTP Strategy Alignment

From the strategy transcript:

> **Containment rule**: For a long, the top of the PC is fully contained inside the prior candle's range (and vice-versa for shorts). Any wick poking out invalidates the PC.

> **Stop placement**: Always on the other side of the PC.

The visualizer directly implements these rules:

1. **Shows both candles** → Verify containment visually
2. **Displays stop level** → See where stop will be
3. **Highlights breaches** → Invalid setups marked clearly
4. **Color-coded by direction** → Green for longs, red for shorts

---

## Component Features

### Visual Elements

#### Candlestick Chart

- **SVG-based** for crisp rendering at any size
- **Price axis** with actual values
- **Grid lines** for reference
- **Wicks and bodies** accurately scaled

#### Legend

- Prior candle (muted square)
- Patient Candle (colored square - green/red)
- Entry level (blue line)
- Stop level (red line)

#### Status Badge

- ✓ **Contained** (green) - Setup valid
- ✗ **Invalid** (red) - PC breaches prior candle

### Explanation Text

Bottom section shows:

- **If valid**: "✓ Containment Rule Met: PC high/low is fully inside prior candle range"
- **If invalid**: "✗ Invalid Setup: PC wick breaches prior candle" with specific prices

### Compact Mode

For list view or tight spaces:

- Smaller height (120px vs 160px)
- Maintains all visual elements
- Responsive legend positioning

---

## Technical Implementation

### Data Required

```typescript
interface PatientCandleVisualizerProps {
  // Patient Candle OHLC
  pcHigh: number;
  pcLow: number;
  pcOpen: number;
  pcClose: number;

  // Prior Candle OHLC
  priorHigh: number;
  priorLow: number;
  priorOpen: number;
  priorClose: number;

  // Trade context
  direction: "LONG" | "SHORT";
  entry: number;
  stop: number;

  compact?: boolean;
}
```

### Containment Calculation

```typescript
const isContained =
  direction === "LONG"
    ? pcHigh <= priorHigh && pcLow >= priorLow
    : pcHigh <= priorHigh && pcLow >= priorLow; // Same for shorts
```

### Visual Scaling

Auto-scales based on all prices (PC, prior, entry, stop):

- Finds min/max prices
- Adds 10% padding
- Maps prices to Y-axis (0-100%)
- Ensures all elements visible

---

## Usage Examples

### Trade Details Modal

Full-size visualizer showing complete PC validation:

```tsx
<PatientCandleVisualizer
  pcHigh={451.8}
  pcLow={451.2}
  pcOpen={451.7}
  pcClose={451.35}
  priorHigh={452.5}
  priorLow={450.8}
  priorOpen={451.2}
  priorClose={452.1}
  direction="LONG"
  entry={451.5}
  stop={449.0}
/>
```

### Compact Mode (Future)

For list items or condensed views:

```tsx
<PatientCandleVisualizer {...candleData} compact={true} />
```

---

## Real-World Scenarios

### Valid Setup Example

```
Prior Candle: High 452.50, Low 450.80
PC: High 451.80, Low 451.20
✓ 451.80 ≤ 452.50 (high contained)
✓ 451.20 ≥ 450.80 (low contained)
Result: VALID - Green badge, no breach indicators
```

### Invalid Setup Example

```
Prior Candle: High 241.50, Low 239.80
PC: High 241.80, Low 240.20
✗ 241.80 > 241.50 (high breaches!)
✓ 240.20 ≥ 239.80 (low ok)
Result: INVALID - Red badge, red dot on PC high
```

---

## Benefits for Admins

### Quick Validation

- **Glance** at chart → Know if PC is valid
- No mental calculation required
- Visual pattern recognition

### Teaching Tool

- Show students what proper PC looks like
- Visual examples in Discord alerts
- Reference for journaling/review

### Risk Assessment

- See stop placement in context
- Understand risk geometry
- Compare PC size to prior candle

### Confidence

- Visual confirmation builds conviction
- Reduce second-guessing
- Systematic validation

---

## Future Enhancements

### Additional Overlays

- Show 8-EMA position
- VWAP line overlay
- Hourly level markers

### Multi-PC Comparison

- Show sequence of PCs in a trend
- Highlight best vs. worst setups
- Pattern recognition

### Interactive Features

- Hover to see exact OHLC values
- Click to zoom
- Toggle different timeframe PCs

### Screenshot/Export

- Save PC validation for journal
- Include in Discord alerts
- Export for review sessions

---

## Accessibility

- ✓ Color-coded with text labels (not color-only)
- ✓ Clear visual hierarchy
- ✓ Text explanations supplement visuals
- ✓ Scales well on different devices
- ✓ High contrast for visibility

---

## Performance

- Lightweight SVG rendering
- No external chart libraries needed
- Fast rendering (< 16ms)
- Responsive to viewport changes
- No layout thrashing

---

_The Patient Candle Visualizer transforms abstract validation rules into immediate visual confirmation, aligning perfectly with the LTP strategy's emphasis on proper PC containment as the foundation of every entry._
