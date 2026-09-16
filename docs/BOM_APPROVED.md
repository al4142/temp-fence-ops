# BOM rules — approved decisions

**Status:** Locked through Alex updates 2026-09-15 → 2026-09-16 (ET). Barb rolls, bottom rail, tension-wire defer confirmed AM Sep 16.  
**App:** Temp Fence Ops  
**Excel draft:** `BOM_FROM_EXCEL_DRAFT.md` = historical reverse-engineer; this file wins on conflicts.  
**Implementation:** `src/lib/bom/` (calculator + job create/edit Generate BOM).

---

## 1. Fence types (canonical only)

| Code | Meaning |
|------|---------|
| `CL6` | 6′ chainlink |
| `CL8` | 8′ chainlink |
| `CL6+1` | 6′ chainlink + 3-strand barb |
| `CL8+1` | 8′ chainlink + 3-strand barb |
| `6x10` / `6x12` / `8x10` / `8x12` | Panels |
| `BARRICADE` | Bike barricade |

No free-text / no legacy aliases. Import of bad labels → BOM empty + warning.

---

## 2. Panels

```
n = CEILING(LF / panel_width)   # 10 or 12
T_STANDS      = n + 1           # n≥1
SADDLE_CLAMPS = n - 1
CB5/16x2-1/2  = SADDLE_CLAMPS
BIG_FEET / SAND_BAG = T_STANDS * 2 when BFOOT / SBAG
```

---

## 3. Barricade

`BARRICADE = CEILING(LF / 7)`

---

## 4. Chainlink core (CL6 / CL8 / +1 base)

### Post sizes (ops standard)

| Role | OD |
|------|-----|
| Line post | **1-5/8″** |
| Terminal post | **2-1/2″** |

CL6 line posts use **8′** length SKU; CL8 uses **10′** (per Excel). Terminal SKUs: CL6 `8' x 2-1/2`; CL8 `10' TERMINAL POST`.

### Always (when LF > 0)

| Material | CL6 | CL8 |
|----------|-----|-----|
| Fence wire (rolls) | `CEILING(LF/50)` | same |
| Line posts 1-5/8″ | `CEILING(LF/10)` | same |
| Aluminum ties | `(LF/10)*8` [+`(LF/10)*5` if top rail] | `(LF/10)*10` [+same if top rail] |

### Optional toggles (independent)

| Option | Default | When Yes |
|--------|---------|----------|
| **Top rail** | Off for plain CL; **On recommended for +1** (ops: ~99%) | See rail package below |
| **Bottom rail** | Off | Same **1-3/8″** tube as top rail + boulevard clamps (below) |
| **Tension wire** | **Out of scope for now** | Do not show / do not BOM until reopened |

Top rail and bottom rail do **not** change wire, line posts, ties (except top-rail extra ties), tension bars, or terminal logic. Tension wire is omitted from v1.


### Top / bottom rail package (approved 2026-09-16)

Both rails use the **same 1-3/8″ tube**. Stick count:

```
rail_sticks = CEILING(LF / 21)   # same divisor as Excel top rail
```

| Option | Materials when Yes |
|--------|-------------------|
| **Top rail** | `rail_sticks` of 1-3/8″ tube; loop caps = line post count; **rail ends** = `terminals_total` |
| **Bottom rail** | `rail_sticks` of 1-3/8″ tube (same SKU); **boulevard clamps 1-5/8 × 1-3/8** = `line_posts`; **rail ends** = `terminals_total` (same terminal attachment as top) |

**Terminal attachment (Excel / ops):** each rail (top or bottom) meets the terminal with a **rail end**, and that rail end is secured to the terminal post with a **tension band**. Same assembly for top and bottom.

```
rail_ends = terminals_total * (1 if top_rail else 0) + terminals_total * (1 if bottom_rail else 0)
```

Fabric tension-band count stays the temp Excel multipliers (`*3` CL6 / `*4` CL8) — those bands are what the rail ends (and fabric) tie to at the terminal. Bolts follow Excel: `CB5/16x1-1/4 = brace_bands + tension_bands + rail_ends` (so more rail ends → more bolts).

If both rails Yes → **2 × rail_sticks** tube + top loop caps/rail ends + bottom boulevard clamps + bottom rail ends. No double-counting loop caps on bottom.

### Terminals

```
terminals_total = (GATE_QTY + GATE_QTY2) * 2 + terminals_manual
```

Manual = corners + start/stop + extras.

From `terminals_total` (temp fence — **fewer bands than permanent/Hoover**):

| Material | Qty (Excel / temp) |
|----------|---------------------|
| Tension bar | `= terminals_total` (6′ bar on CL6, 8′ on CL8) |
| Brace band 2-1/2 | `= terminals_total` |
| Tension band 2-1/2 | CL6: `terminals_total * 3`; CL8: `terminals_total * 4` |
| CB5/16x1-1/4 | brace + tension bands + rail ends |
| Rail end | `terminals_total` per rail option (top and/or bottom) — see rail package |

These *3 / *4 band multipliers are the **temporary** counts from the ops workbook — intentionally lower than permanent install calculators.

---

## 5. Barb pack — `CL6+1` / `CL8+1` (approved)

Run full CL6 or CL8 base first, then add:

```
line_posts = CEILING(LF / 10)

BARB_ARM_45     = line_posts          # one 45° arm per line post
BARB_WIRE_LF    = LF * 3              # three strands along the run
BARB_WIRE_ROLLS = CEILING(BARB_WIRE_LF / 1320)   # rolls are 1,320′
TENSION_BAND_BARB = terminals_total * 3   # one band per strand at each terminal
```

**Notes**

- Barb arms go on **line posts** (1-5/8″). Wire attaches to arms and is secured at **each terminal** with a tension band (in addition to fabric tension bands).
- Default UI: **top rail = Yes** on +1 jobs (still overridable).
- Barb wire rolls are **1,320′** → `CEILING((LF×3)/1320)`.
- Barb termination: **3 tension bands per terminal** (one per strand), added on top of fabric tension bands.

---

## 6. Screens

```
screen_rolls = CEILING(LF / 50)
ZIP_TIES     = screen_rolls * 110
```

SKU pick required (BLACK6, …), not Yes/No.

---

## 7. Gates — Excel math (locked)

### Bodies

Match GATE / GATE2 + qtys to SKU columns (Excel list).

### Swing hardware

```
swing_count → 1× SWING GATE ROLLER WHEEL 6" each
MH2-1/2 = swing_count * 2; CB3/8x3 = same
FH1-3/8 = swing_count * 2; CB3/8x2-1/4 = same
```

### Slide hardware (Excel — do **not** use Hoover permanent)

Slide SKUs: `15x6 SLIDE`, `20x6 SLIDE`, `14x8 SLIDE`, `20x8 SLIDE`.

```
CJ = sum of those slide qtys
DBL WHEEL GATE CARRIER 8"              = CJ
GATE PIPE TRACK SAFETY ROLLER WHEEL 5" = CJ * 2
TRACK BRACKET 2-1/2 =
  if any 15x6 or 14x8 slide → CJ * 6
  else if any 20x6 or 20x8 slide → CJ * 8
  else 0
```

(If mixed 15/14 and 20 present, Excel `*6` branch wins.)

---

## 8. Pickup

- BOM qtys: same recipes for INST and PU.
- Inventory: **INST decreases** on-hand; **PU increases** on-hand (warehouse return). Damage/missing → variance/write-off, not PU credit.

---

## Locked checklist

```
[x] Fence types incl. CL6+1 / CL8+1
[x] Panels stands/clamps
[x] Barricade /7
[x] Terminals 2/gate + manual
[x] CL options: top rail, bottom rail, tension wire (optional)
[x] Post OD: line 1-5/8, terminal 2-1/2
[x] Temp tension-band multipliers (*3 CL6 / *4 CL8)
[x] Barb: arm per line post; 3 strands; terminal secure
[x] Screens CEIL/50; zip 110/roll
[x] Slide + swing = Excel
[x] PU inventory up
[x] Barb terminal bands: 3 per terminal (one per strand)
[x] Rail ends on terminals for top and/or bottom (Excel-style + tension band)
[x] Tension wire: out of scope v1
[x] Bottom rail: same 1-3/8″ tube as top + boulevard clamp per line post
[x] Barb rolls: 1320′
[ ] Weights default when blank; gate SKU gaps (12x8, 4x6)
```

