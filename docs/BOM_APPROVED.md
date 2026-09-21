# BOM rules — approved decisions

**Status:** Locked through Alex updates 2026-09-15 → 2026-09-21 (ET). 6′ slide field recipe (ALE-30) locked 2026-09-21. Barb rolls, bottom rail, tension-wire defer confirmed AM Sep 16.  
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
terminals_total = (GATE_QTY + GATE_QTY2) * 2 + terminals_manual + extra_track_posts
```

Manual = corners + start/stop + extras.

**6′ slide extra track posts** (ALE-30; in addition to the gate rule ×2, not instead of it):

| Opening | Extra track-support terminals |
|---------|-------------------------------|
| 12′ | +2 |
| 15′ | +3 |
| 20′ | +4 |
| 24′ | +5 |

Swing and 8′ slides add **0** extras. Those extras use the same terminal SKU / tension-band stack (driven vs plate still follows section `postMount`).

From `terminals_total` (temp fence — **fewer bands than permanent/Hoover**):

| Material | Qty (Excel / temp) |
|----------|---------------------|
| Tension bar | `= terminals_total` (6′ bar on CL6, 8′ on CL8) |
| Brace band 2-1/2 | `= terminals_total` |
| Tension band 2-1/2 | CL6: `terminals_total * 3`; CL8: `terminals_total * 4` |
| CB5/16x1-1/4 | brace + tension bands + rail ends |
| Rail end | `terminals_total` per rail option (top and/or bottom) — see rail package |

These *3 / *4 band multipliers are the **temporary** counts from the ops workbook — intentionally lower than permanent install calculators.

### Post mount — Driven vs Plate (concrete) (approved)

`postMount` is a **per-section** chainlink option, not a job-wide toggle. **Not** for panels or barricade. The rest of that section’s fence BOM (wire, rails, ties, barb, tension bars/bands) is unchanged.

| Mode | Default | Use case | Posts |
|------|---------|----------|-------|
| **Driven** | Yes | Ground / bury (current path) | Existing line/terminal SKUs (8′ / 10′ bury lengths) |
| **Plate (concrete)** | No | Interior warehouse / concrete floor | Posts welded/bolted to **floor plates**; height = **fence height**, not bury length |

**Plate post SKUs** (1-5/8″ line OD, 2-1/2″ terminal OD):

| Fence | Line post w/ plate | Terminal post w/ plate |
|-------|--------------------|------------------------|
| CL6 / CL6+1 | `6' LINE POST W/ PLATE` | `6' TERMINAL POST W/ PLATE` |
| CL8 / CL8+1 | `8' LINE POST W/ PLATE` | `8' TERMINAL POST W/ PLATE` |

Counts are the same as driven, using **that section’s** LF and terminals:

```
line_posts      = CEILING(section_LF / 10)
terminals_total = (section GATE_QTY + GATE_QTY2) * 2 + section terminals_manual + extra_track_posts
```

**SCREW-BOLT+ (consumable)** — DeWalt SCREW-BOLT+ ⅜″×3″, PFM1411240. Canonical: `SCREW-BOLT+ 3/8x3` (aliases: DeWalt / PFM1411240). Plate sections only:

```
SCREW_BOLTS = (line_posts × 2) + (terminals_total × 4)
```

- Line plate: **2** bolts per post
- Terminal plate: **4** bolts per post (corners)

Driven sections emit bury-length posts and **no** SCREW-BOLT+.

**Inventory / reusable**

- Plate posts: **reusable** (restock on Pickup)
- `SCREW-BOLT+ 3/8x3`: **reusable: false** (consumable — never restock on Pickup)

---

## 4a. Multi-section jobs (approved)

A job has **one or more fence sections**. Generate BOM runs each section’s recipe and **merges** material lines (same SKU adds).

| Section type | Options | Notes |
|--------------|---------|-------|
| Chainlink driven | rails, gates, manual terminals | Default new job = **one** driven section |
| Chainlink plate | rails, gates, manual terminals | Warehouse / concrete; plate posts + SCREW-BOLT+ |
| Panel `6x10` / `6x12` / `8x10` / `8x12` | BFOOT / SBAG weights, gates | T-stands recipe; post mount ignored |
| Barricade | LF, gates | `CEILING(LF/7)` |

**Mixed driven + plate** = two (or more) chainlink sections with the LF split (Option A). Panels with T-stands can sit on the same job as chainlink.

**Gates are per-section** (panel and/or chainlink), not job-global only. Auto terminals (2 per gate) and manual terminals apply to **that section’s** terminal count (chainlink posts/bands only).

Screen SKU stays **job-level**: rolls = `CEILING(sum of section LF / 50)`.

Legacy jobs with no `fenceSections` JSON map to **one driven section** from the existing columns.

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

## 7. Gates — Excel swing + 6′ slide field recipe (ALE-30)

### Bodies

Match GATE / GATE2 + qtys to SKU columns. Dropdown includes `12x6 SLIDE` and `24x6 SLIDE` (new) plus existing `15x6 SLIDE` / `20x6 SLIDE` / `14x8 SLIDE` / `20x8 SLIDE`.

### Swing hardware

```
swing_count → 1× SWING GATE ROLLER WHEEL 6" each
MH2-1/2 = swing_count * 2; CB3/8x3 = same
FH1-3/8 = swing_count * 2; CB3/8x2-1/4 = same
```

### 6′ slide hardware (Alex field recipe, 2026-09-21)

Per gate (qty 1). Multiply by qty. **Do not** use the Excel 6-vs-8 mixed-size bracket branch for these sizes.

| Opening | Gate body | Track brackets | Rollers | Carrier | Gate-rule terminals | + Track support posts | Total terminals from this gate | Horizontal 1-3/8″ pipe LF (top+bottom) |
|---------|-----------|----------------|---------|---------|---------------------|-----------------------|--------------------------------|----------------------------------------|
| 12′ | `12x6 SLIDE` | 6 | 2 | 1 | 2 | **+2** | 4 (= 3 track + 1 latch) | 24′ (12′+12′) |
| 15′ | `15x6 SLIDE` | 8 | 2 | 1 | 2 | **+3** | 5 (= 4 track + 1 latch) | 30′ (15′+15′) |
| 20′ | `20x6 SLIDE` | 10 | 2 | 1 | 2 | **+4** | 6 (= 5 track + 1 latch) | 40′ (20′+20′) |
| 24′ | `24x6 SLIDE` | 12 | 2 | 1 | 2 | **+5** | 7 (= 6 track + 1 latch) | 48′ (24′+24′) |

```
carrier  = DBL WHEEL GATE CARRIER 8"
rollers  = GATE PIPE TRACK SAFETY ROLLER WHEEL 5" × 2
brackets = TRACK BRACKET 2-1/2 × table qty
```

**Horizontal gate pipe (locked):** 1-3/8″ **gate-frame** tube — top of the gate + bottom of the gate, each = opening. Table LF: `{12:24, 15:30, 20:40, 24:48}`. This is **not** fence-side overhead/cantilever track. Inventory emits existing `TOP RAIL` sticks as `CEILING(table_LF / 21)` (same 21′ stick as fence rail; storage conversion only). Open question for ops: dedicated SKU vs shared top-rail SKU.

**Extra track posts:** explicit map `{12:2, 15:3, 20:4, 24:5}` — not a guessed `W/5` formula. Feed the same terminal stack as `terminals_total`. Brackets `{12:6, 15:8, 20:10, 24:12}`. Rollers always 2; carrier always 1. Multiply table rows by qty.

### 8′ slide hardware (Excel — thin math until takeoff)

`14x8 SLIDE` / `20x8 SLIDE` stay on Excel-thin math. **TODO(Alex): 8′ slide rich recipe — takeoff pending.**

```
CJ = sum of 8′ (and unknown) slide qtys
DBL WHEEL GATE CARRIER 8"              = CJ
GATE PIPE TRACK SAFETY ROLLER WHEEL 5" = CJ * 2
TRACK BRACKET 2-1/2 =
  if any 14x8 slide → CJ * 6
  else if any 20x8 slide → CJ * 8
  else 0
```

(If mixed 14x8 and 20x8 present, Excel `*6` branch wins.) No extra track posts and no gate-frame pipe on this path.

---

## 8. Pickup

- BOM qtys: same recipes for Install and Pickup.
- Inventory: **Install** and **Drop** decrease on-hand; **Pickup** increases on-hand (warehouse return). Damage/missing → variance/write-off, not Pickup credit.

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
[x] Slide 6′ = ALE-30 field recipe; 8′ slides = Excel thin (takeoff pending)
[x] Pickup inventory up
[x] Barb terminal bands: 3 per terminal (one per strand)
[x] Rail ends on terminals for top and/or bottom (Excel-style + tension band)
[x] Tension wire: out of scope v1
[x] Bottom rail: same 1-3/8″ tube as top + boulevard clamp per line post
[x] Barb rolls: 1320′
[x] Post mount: Driven vs Plate (concrete) + SCREW-BOLT+ 3/8x3 (per chainlink section)
[x] Multi-section BOM (driven / plate / panel / barricade; gates per section; merge lines)
[ ] Weights default when blank; gate SKU gaps (12x8, 4x6)
```

