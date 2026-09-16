# BOM formulas from Excel — DRAFT (historical)

**Status:** Historical reverse-engineer. **Not the live product rules.**  
**Live rules:** [BOM_APPROVED.md](./BOM_APPROVED.md) (locked Sep 15–16, 2026). Implementation: `src/lib/bom/`.  
**Use this draft only where APPROVED points at Excel** (swing/slide gate hardware, temp tension-band multipliers `*3` CL6 / `*4` CL8). On conflict, APPROVED wins.

---

## How the sheet is wired (context)

### Input columns (row 2 headers)

| Col | Header | Role in BOM |
|-----|--------|-------------|
| H | JOBTYPE | **Not used by material formulas.** Inventory sheet uses INST vs PU for stock sign (PU − INST for reusable). Dropdown: PU, INST, SWLK, REP, RELOCATE |
| I | FENCE TYPE | Primary recipe switch. Dropdown codes: `CL6`, `CL8`, `6x10`, `6x12`, `8x10`, `8x12`, `BARRICADE` |
| J | TOP RAIL? | Chainlink top-rail package (`Yes`/`No`). Excel compares case-insensitively to `"YES"` |
| K | BOTTOM RAIL | Dropdown exists; **never referenced by any AS–CX formula**; no data found |
| L | QTY (LF) | Linear feet — main quantity driver |
| M | BFOOT/SBAG | `BFOOT` or `SBAG` → weights on T-stands |
| N | SCREEN? | Must be a **screen SKU code** (`BLACK6`, `BLACK8`, `GREEN6`, `GREEN8`, `ROYAL6`, `CUSTOM`) for screen BOM. Many historical rows say `Yes`/`No` and **do not** calculate screen |
| O / P | GATE / GATE QTY | Primary gate type + qty |
| Q / R | GATE2 / GATE QTY2 | Second gate type + qty |

### Output columns (AS–CX) — auto BOM

Panel: `6x10`, `6x12`, `8x10`, `8x12` → stands/weights/clamps/bolts → barricade → chainlink wire/posts/hardware → gates + gate hardware → screens + zip ties.

**Important:** Formulas run the same for INST and PU. They do **not** blank on pickup. Job type only affects inventory netting later.

---

## Notation

- `CEILING(x)` = Excel `ROUNDUP(x, 0)` (round away from zero toward +∞ for positives).
- `LF` = column L.
- Exact string match on fence type / screen / gate headers (as coded below).

---

## Recipe: Panel `6x10`

**When:** `FENCE TYPE = "6x10"`

| Material | Qty logic |
|----------|-----------|
| **6x10** (panels) | `CEILING(LF / 10)` |
| **T-STANDS** | If panel_count > 1 → `panel_count + 1`, else `0` |
| **SADDLE CLAMPS** | If panel_count > 1 → `panel_count`, else `0` |
| **CB5/16x2-1/2** | `= SADDLE CLAMPS` |
| **BIG FEET** | If `BFOOT/SBAG = "BFOOT"` → `T-STANDS * 2`, else `0` |
| **SAND BAG** | If `BFOOT/SBAG = "SBAG"` → `T-STANDS * 2`, else `0` |

**Excel (normalized):**
- `6x10 = IF(I="6x10", ROUNDUP(L/10,0), 0)`
- `T-STANDS = IF(MAX(6x10,6x12,8x10,8x12)>1, MAX(...)+1, 0)`
- `BIG FEET = IF(M="BFOOT", ROUNDUP(T-STANDS,0)*2, 0)` (same pattern for SBAG → SAND BAG)

**Sample (row 1268, PU, LF=400):** 40 panels, 41 T-stands, 40 saddle clamps, 40 CB5/16x2-1/2. No big feet (M blank).

**Edge case:** Exactly **1** panel → T-STANDS = **0** and clamps = **0** (condition is `>1`, not `>=1`). Confirm intent.

---

## Recipe: Panel `6x12`

**When:** `FENCE TYPE = "6x12"`

| Material | Qty logic |
|----------|-----------|
| **6x12** | `CEILING(LF / 12)` |
| **T-STANDS / SADDLE CLAMPS / CB5/16x2-1/2 / BIG FEET / SAND BAG** | Same rules as 6x10 (driven by whichever panel column is nonzero) |

**Sample (row 1255, INST, LF=340):** 29 panels, 30 T-stands, 29 clamps/bolts.  
**Sample (row 1299, INST, LF=108, BFOOT, GATE 12x6×1):** 9 panels, 10 T-stands, **20 BIG FEET**, plus swing-gate hardware (see Gates).

---

## Recipe: Panel `8x10`

**When:** `FENCE TYPE = "8x10"`

| Material | Qty logic |
|----------|-----------|
| **8x10** | `CEILING(LF / 10)` |
| Stands / clamps / weights | Same shared panel rules |

No sampled row in the formula region had `8x10` **with LF > 0** (one INST row had LF=0 + gates/screen only). Logic is parallel to 6x10.

---

## Recipe: Panel `8x12`

**When:** `FENCE TYPE = "8x12"`

| Material | Qty logic |
|----------|-----------|
| **8x12** | `CEILING(LF / 12)` |
| Stands / clamps / weights | Same shared panel rules |

---

## Recipe: Barricade `BARRICADE`

**When:** `FENCE TYPE = "BARRICADE"` (exact; free-text `barricades` / `8 Ft Barricades` does **not** match)

| Material | Qty logic |
|----------|-----------|
| **BARRICADE** | `CEILING(LF / 7)` |

Inventory description: bike barricades ~43" × 7.2'; footage helper uses ×7.5 — **divider in BOM is 7**, not 7.5. Confirm.

**Sample (row 1473, INST, LF=275):** 40 barricades. No T-stands/weights from these formulas.

---

## Recipe: Chainlink `CL6` (6′)

**When:** `FENCE TYPE = "CL6"`

### Auto from LF / top rail

| Material | Qty logic |
|----------|-----------|
| **6' FENCE WIRE** | `CEILING(LF / 50)` (50′ rolls) |
| **8' LINE POST** | `CEILING(LF / 10)` |
| **ALUMINUM TIES** | `(LF/10)*8` + if TOP RAIL? Yes: `+(LF/10)*5` (**not** rounded) |
| **TOP RAIL** | If TOP RAIL? Yes → `CEILING(LF / 21)`, else `0` |
| **LOOP CAP** | If TOP RAIL? Yes → `8' LINE POST` count, else `0` |

### Manual terminals (corners / ends) — **not formula-driven**

| Material | Qty logic |
|----------|-----------|
| **8' x 2-1/2** (col BE) | **Manual entry** (defaults to 0). Acts as 6′ terminal/corner post count |
| **6' TENSION BAR** | `= BE` (1:1) if BE ≠ 0 |
| **2-1/2 BRACE BAND** | If CL6 or CL8 → `MAX(6' TENSION BAR, 8' TENSION BAR)` else 0 |
| **2-1/2 TENSION BAND** | If BE > 0 → `BE * 3`; else if BF > 0 → `BF * 4`; else 0 |
| **CB5/16x1-1/4** | `BRACE BAND + TENSION BAND + RAIL END` |
| **RAIL END** | If TOP RAIL? Yes → `BE + BF`, else 0 |

**Sample (row 1254, INST, CL6, LF=600, no top rail, BE=0):** 12 wire rolls, 60 line posts, 480 ties. **No** tension bars/bands/brace (terminals blank).  
**Sample (row 1315, CL6, LF=233, TOP=Yes, BE=0):** wire 5, line posts 24, ties 302.9, top rail 12, loop caps 24; still **no** rail ends/bands without BE.

**Ambiguity:** Free-text types like `6ft chainlink`, `6 FT chainlink`, `chainlink` appear in data but **do not** hit `CL6` formulas → BOM stays empty for those rows.

---

## Recipe: Chainlink `CL8` (8′)

**When:** `FENCE TYPE = "CL8"`

| Material | Qty logic |
|----------|-----------|
| **8' FENCE WIRE** | `CEILING(LF / 50)` |
| **10' LINE POST** | `CEILING(LF / 10)` |
| **ALUMINUM TIES** | `(LF/10)*10` + if top rail: `+(LF/10)*5` |
| **TOP RAIL / LOOP CAP** | Same as CL6 (loop cap = max of line-post columns) |
| **10' TERMINAL POST** (col BF) | **Manual entry** (defaults 0) |
| **8' TENSION BAR** | `= BF` |
| Tension bands | `BF * 4` when BF > 0 (and BE is 0) |
| Brace / bolts / rail end | Same shared chainlink rules |

**Sample (row 1272, PU, CL8, LF=216):** 5 wire, 22 line posts, 216 ties.  
**Sample (row 1300, INST, CL8, LF=400, TOP=Yes, BF=4 manual, GATE 14x8×2):** wire 8, terminals 4, tension bars 4, brace 4, tension bands 16, CB5/16x1-1/4 = 24, line posts 40, ties 600, top rail 20, loop caps 40, rail ends 4 + swing gate hardware.

---

## Screen / privacy rules

**Input:** `SCREEN?` (N) must equal the **header name** of a screen column (dropdown: `GREEN6`, `GREEN8`, `BLACK6`, `BLACK8`, `ROYAL6`, `CUSTOM`).

| Material | Qty logic |
|----------|-----------|
| **BLACK6 / BLACK8 / GREEN6 / GREEN8 / ROYAL6 / CUSTOM** | If `SCREEN?` equals that column’s header → `LF / 50` (**not** ROUNDUP — fractional rolls allowed) |
| **ZIP TIES** | If sum of those screen roll qtys **> 1** → `(sum rolls) * 110`, else `0` |

**Samples:**
- Row 1478: SCREEN?=BLACK6, LF=170 → BLACK6 = 3.4, ZIP TIES = 374 (= 3.4×110).
- Rows with SCREEN?= `Yes` / `No`: **no** screen or zip-tie qty (mismatch with formula).

**Inventory notes:**
- Tracker has **CUSTOM**; inventory has **no** CUSTOM screen SKU.
- Inventory has **NAVY6**; tracker has **no** NAVY6 column / dropdown value.
- Screen height is encoded in the SKU (6 vs 8), not inferred from fence type. A 6x12 panel job can still select GREEN8.

---

## Gate rules

### Gate body qty (columns BR–CI)

For each gate SKU header G in `{4x6, 5x6, 6x6, 7x6, 9x6, 12x6, 14x6, 15x6, 15x6 SLIDE, 20x6, 20x6 SLIDE, 4x8, 6x8, 10x8, 14x8, 14x8 SLIDE, 20x8, 20x8 SLIDE}`:

```
qty(G) = (GATE == G ? GATE QTY : 0) + (GATE2 == G ? GATE QTY2 : 0)
```

### Slide-gate hardware

Slide SKUs in formulas: `15x6 SLIDE`, `20x6 SLIDE`, `14x8 SLIDE`, `20x8 SLIDE`.

| Material | Qty logic |
|----------|-----------|
| **DBL WHEEL GATE CARRIER 8"** | Sum of those four slide qtys (`CJ`) |
| **GATE PIPE TRACK SAFETY ROLLER WHEEL 5"** | If CJ > 0 → `CJ * 2`, else 0 |
| **TRACK BRACKET 2-1/2** | If any `15x6 SLIDE` or `14x8 SLIDE` > 0 → `CJ * 6`; else if any `20x6 SLIDE` or `20x8 SLIDE` > 0 → `CJ * 8`; else 0 |

(Mixed slide sizes: the `*6` branch wins if any 15′/14′ slide is present.)

### Swing-gate hardware

Swing = all gate body columns **except** the four SLIDE types.

| Material | Qty logic |
|----------|-----------|
| **SWING GATE ROLLER WHEEL 6"** | Count of swing gates |
| **MH2-1/2** | swing_count × 2 |
| **CB3/8x3** | `= MH2-1/2` |
| **FH1-3/8** | swing_count × 2 |
| **CB3/8x2-1/4** | `= FH1-3/8` |

**Samples:**
- Row 1299: GATE `12x6`×1 → BW=1, swing roller 1, MH/FH/bolts = 2 each.
- Row 1298: GATE `10x8`×2 (LF=0) → CE=2, swing hardware ×2 / ×4.

### Gate dropdown gaps

- Column O list includes **`12x8`**, but there is **no** `12x8` material column → selecting 12x8 produces **no** gate body or hardware from formulas.
- **`4x6`** has a tracker column + dropdown entry; **no** matching INVENTORY NAME (gates start at 5x6).

---

## Shared panel accessory rules (all panel types)

Applies whenever any of `6x10`/`6x12`/`8x10`/`8x12` panel counts are computed:

```
panel_count = MAX(6x10, 6x12, 8x10, 8x12)

T-STANDS       = panel_count + 1   if panel_count > 1 else 0
SADDLE CLAMPS  = panel_count       if panel_count > 1 else 0
CB5/16x2-1/2   = SADDLE CLAMPS
BIG FEET       = T-STANDS * 2      if M = "BFOOT" else 0
SAND BAG       = T-STANDS * 2      if M = "SBAG"  else 0
```

No sample row used `SBAG` in the formula region (only `BFOOT` ×2). Logic is symmetric in Excel.

---

## JOBTYPE behavior (INST vs PU vs other)

| Observation | Detail |
|-------------|--------|
| Material formulas | **Ignore** JOBTYPE — same CEILING math for INST and PU |
| Inventory netting | For reusable items (`REUSABLE=YES`): `CHANGE = sum(PU qtys) − sum(INST qtys)` per branch/item |
| Other job types | REP / RELOCATE / MOVE / SWLK / DELIVERY / PICKUP appear in data; material formulas still fire if fence-type codes match; inventory SUMIFS only credit **PU** and **INST** |

---

## INVENTORY ↔ tracker column mapping

Almost all AS–CX headers match INVENTORY `NAME` (per branch). Exceptions / near-misses:

| Tracker header | Inventory | Notes |
|----------------|-----------|-------|
| SADDLE CLAMPS | **SADDLE CLAMP** (singular) | Name mismatch → inventory MATCH on tracker headers may **miss** this item |
| 10' TERMINAL  POST | **10' TERMINAL POST** | Extra space in tracker header |
| 8x12 | **8X12** | Case difference; Excel MATCH is usually ok |
| 4x6 (gate) | *(missing)* | No inventory SKU |
| CUSTOM (screen) | *(missing)* | No inventory SKU |
| *(none)* | **NAVY6** | In inventory, not in tracker BOM columns |
| *(none)* | PANEL EXTENSIONS 2', various hinges/clamps | Not in daily BOM grid |

Inventory `CHANGE IN QTY` matches item NAME to `'DAILY TRACKER'!$AS$2:$CX$2` then SUMIFS by branch + job type.

---

## When formulas are blank / zero (summary)

1. Rows **before ~1252** — no AS–CX formulas at all (legacy / different entry style).
2. `FENCE TYPE` free-text not in `{CL6,CL8,6x10,6x12,8x10,8x12,BARRICADE}` — e.g. `6 Ft Panels`, `chainlink`, `4x12`, `6FT SCREEN`.
3. `SCREEN?` = Yes/No/email/blank instead of a color SKU.
4. Chainlink **corners/terminals** left at 0 → no tension bars/bands/brace/rail ends.
5. `BFOOT/SBAG` blank → no weights (stands still calculate for panels).
6. Panel count 0 or 1 → T-STANDS and clamps forced to 0.
7. Zip ties require screen rolls sum **> 1** (exactly 1.0 roll → 0 zip ties).

---

## Open questions for Alex

1. **Canonical fence-type codes** — Confirm app should only allow dropdown codes (`CL6`/`CL8`/`6x10`/…/`BARRICADE`), and map/alias historical labels (`6 Ft Panels` → which panel? `6ft chainlink` → CL6?).
2. **T-STANDS for 1 panel** — Should 1 panel yield 2 stands (`n+1`), or keep Excel’s `>1` quirk (0 stands)?
3. **Barricade divisor** — BOM uses `/7`; inventory footage uses `×7.5`. Which is correct for ops?
4. **Chainlink corners** — How should terminal/corner count be derived (manual only? corners = ? from LF? ends+corners rule of thumb)? BE/BF are the only major **manual** BOM inputs today.
5. **Screen entry** — Should UI require color/height SKU (BLACK6…) and drop Yes/No? Add **NAVY6**? What is **CUSTOM** (SKU + zip-tie behavior)?
6. **Screen rounding** — Keep fractional `LF/50`, or CEILING like wire rolls?
7. **Zip ties threshold** — Confirm `>1` roll (not `>=1`) and **110 ties per roll**.
8. **Weights default** — If M blank on panel jobs, should app default BFOOT or SBAG by branch, or leave 0?
9. **Gate `12x8` / `4x6`** — Add columns/SKUs or remove from dropdown?
10. **SADDLE CLAMPS vs SADDLE CLAMP** — Rename for inventory MATCH?
11. **BOTTOM RAIL** — Unused; remove, or is there missing formula?
12. **TOP RAIL aluminum ties** — Extra `(LF/10)*5` not rounded; OK?
13. **Slide track brackets** — Confirm 6 vs 8 multiplier by gate length (15/14 → ×6, 20 → ×8), including mixed-gate priority.
14. **REP / RELOCATE / SWLK** — Should BOM still auto-calc? Should inventory netting treat them like INST, PU, or ignore?
15. **Pickup sign** — Confirm PU should still generate positive material lines (for stock return) with opposite inventory effect vs INST.

---

## Suggested recipe-block checklist (for Alex to tick/edit)

Copy/adapt when confirming:

```
[ ] 6x10: panels=CEIL(LF/10); stands=panels+1 if panels>1 else 0; clamps=panels; weights=2*stands if BFOOT|SBAG
[ ] 6x12: panels=CEIL(LF/12); same stands/clamps/weights
[ ] 8x10: panels=CEIL(LF/10); same stands/clamps/weights
[ ] 8x12: panels=CEIL(LF/12); same stands/clamps/weights
[ ] BARRICADE: CEIL(LF/7)
[ ] CL6: wire=CEIL(LF/50); line posts=CEIL(LF/10); ties=(LF/10)*8 [+5*(LF/10) if top rail];
         terminals MANUAL → tension bar=terminals; brace=terminals; tension bands=terminals*3;
         top rail package if Yes: rail=CEIL(LF/21), loop caps=line posts, rail ends=terminals
[ ] CL8: wire=CEIL(LF/50); line posts=CEIL(LF/10); ties=(LF/10)*10 [+5*(LF/10) if top rail];
         terminals MANUAL → tension bar=terminals; bands=terminals*4; same top-rail package
[ ] Screen: rolls=LF/50 for matching SKU; zip ties = rolls*110 if rolls>1
[ ] Gates: body from GATE/GATE2 match; swing hardware 1 roller + 2 MH + 2 FH + matching bolts per swing;
         slide: 1 carrier + 2 safety rollers + 6 or 8 track brackets per slide (by size)
```

---

## Explicit disclaimer

**This document is a reverse-engineered DRAFT for review.** It is not app code, not a committed product rule set, and should not be implemented until Alex confirms or corrects the recipes and open questions above.
