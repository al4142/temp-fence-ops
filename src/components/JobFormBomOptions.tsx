"use client";

import {
  FENCE_TYPE_LABELS,
  FENCE_TYPES,
  GATE_TYPES,
  SCREEN_SKUS,
  WEIGHT_MODES,
  POST_MOUNTS,
  POST_MOUNT_LABELS,
  isChainlinkType,
  isPanelType,
  isPlusOneType,
  normalizeFenceType,
} from "@/lib/bom/catalog";

type Props = {
  inputClass: string;
  labelClass: string;
  fenceType: string;
  setFenceType: (v: string) => void;
  qtyLf: string;
  setQtyLf: (v: string) => void;
  topRail: boolean;
  setTopRail: (v: boolean) => void;
  bottomRail: boolean;
  setBottomRail: (v: boolean) => void;
  weightMode: string;
  setWeightMode: (v: string) => void;
  postMount: string;
  setPostMount: (v: string) => void;
  screenSku: string;
  setScreenSku: (v: string) => void;
  gateType: string;
  setGateType: (v: string) => void;
  gateQty: string;
  setGateQty: (v: string) => void;
  gateType2: string;
  setGateType2: (v: string) => void;
  gateQty2: string;
  setGateQty2: (v: string) => void;
  terminalsManual: string;
  setTerminalsManual: (v: string) => void;
};

export function JobFormBomOptions(p: Props) {
  const canonical = normalizeFenceType(p.fenceType);
  const showChainlink = !canonical || isChainlinkType(canonical);
  const showPanelWeights = !canonical || isPanelType(canonical);
  const fenceOptions =
    p.fenceType && !FENCE_TYPES.includes(p.fenceType as (typeof FENCE_TYPES)[number])
      ? [p.fenceType, ...FENCE_TYPES]
      : [...FENCE_TYPES];
  const gateList = (current: string) =>
    current && !(GATE_TYPES as readonly string[]).includes(current)
      ? [current, ...GATE_TYPES]
      : [...GATE_TYPES];

  function onFenceTypeChange(next: string) {
    p.setFenceType(next);
    const t = normalizeFenceType(next);
    if (t && isPlusOneType(t)) p.setTopRail(true);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 font-semibold text-slate-900">Fence / BOM options</h2>
      <p className="mb-3 text-xs text-slate-500">
        Canonical fence types only. Use <strong>Generate BOM</strong> on the materials
        section to preview suggested lines from LF + type + options. Tension wire is not in
        v1. Install and Pickup use the same quantities.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={p.labelClass} htmlFor="fenceType">
            Fence type
          </label>
          <select
            id="fenceType"
            className={p.inputClass}
            value={p.fenceType}
            onChange={(e) => onFenceTypeChange(e.target.value)}
          >
            <option value="">-</option>
            {fenceOptions.map((f) => (
              <option key={f} value={f}>
                {f in FENCE_TYPE_LABELS
                  ? `${f} — ${FENCE_TYPE_LABELS[f as keyof typeof FENCE_TYPE_LABELS]}`
                  : `${f} (legacy — BOM will warn)`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={p.labelClass} htmlFor="qtyLf">
            Qty (LF)
          </label>
          <input
            id="qtyLf"
            type="number"
            step="any"
            min="0"
            className={p.inputClass}
            value={p.qtyLf}
            onChange={(e) => p.setQtyLf(e.target.value)}
          />
        </div>
        {showPanelWeights ? (
          <div>
            <label className={p.labelClass} htmlFor="weightMode">
              Weights (panels)
            </label>
            <select
              id="weightMode"
              className={p.inputClass}
              value={p.weightMode}
              onChange={(e) => p.setWeightMode(e.target.value)}
            >
              <option value="">None</option>
              {WEIGHT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m === "BFOOT" ? "BFOOT — big feet (2× stands)" : "SBAG — sand bags (2× stands)"}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {showChainlink ? (
          <>
            <div>
              <label className={p.labelClass} htmlFor="postMount">
                Post mount
              </label>
              <select
                id="postMount"
                className={p.inputClass}
                value={p.postMount || "driven"}
                onChange={(e) => p.setPostMount(e.target.value)}
              >
                {POST_MOUNTS.map((m) => (
                  <option key={m} value={m}>
                    {POST_MOUNT_LABELS[m]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Driven (default) or plate on concrete. Plate posts = fence height; SCREW-BOLT+
                3/8×3 anchors the plates.
              </p>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={p.topRail}
                  onChange={(e) => p.setTopRail(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Top rail
                {canonical && isPlusOneType(canonical) ? (
                  <span className="text-xs text-slate-500">(recommended for +1)</span>
                ) : null}
              </label>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={p.bottomRail}
                  onChange={(e) => p.setBottomRail(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Bottom rail
              </label>
            </div>
            <div>
              <label className={p.labelClass} htmlFor="terminalsManual">
                Manual terminals
              </label>
              <input
                id="terminalsManual"
                type="number"
                min="0"
                step="1"
                className={p.inputClass}
                value={p.terminalsManual}
                onChange={(e) => p.setTerminalsManual(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Corners + start/stop + extras. Auto terminals = (gate qty × 2).
              </p>
            </div>
          </>
        ) : null}
        <div>
          <label className={p.labelClass} htmlFor="screenSku">
            Screen SKU
          </label>
          <select
            id="screenSku"
            className={p.inputClass}
            value={p.screenSku}
            onChange={(e) => p.setScreenSku(e.target.value)}
          >
            <option value="">None</option>
            {SCREEN_SKUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={p.labelClass} htmlFor="gateType">
            Gate
          </label>
          <select
            id="gateType"
            className={p.inputClass}
            value={p.gateType}
            onChange={(e) => p.setGateType(e.target.value)}
          >
            <option value="">-</option>
            {gateList(p.gateType).map((g) => (
              <option key={g} value={g}>
                {(GATE_TYPES as readonly string[]).includes(g)
                  ? g
                  : `${g} (removed — catalog gap)`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={p.labelClass} htmlFor="gateQty">
            Gate qty
          </label>
          <input
            id="gateQty"
            type="number"
            min="0"
            step="1"
            className={p.inputClass}
            value={p.gateQty}
            onChange={(e) => p.setGateQty(e.target.value)}
          />
        </div>
        <div>
          <label className={p.labelClass} htmlFor="gateType2">
            Gate 2
          </label>
          <select
            id="gateType2"
            className={p.inputClass}
            value={p.gateType2}
            onChange={(e) => p.setGateType2(e.target.value)}
          >
            <option value="">-</option>
            {gateList(p.gateType2).map((g) => (
              <option key={g} value={g}>
                {(GATE_TYPES as readonly string[]).includes(g)
                  ? g
                  : `${g} (removed — catalog gap)`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={p.labelClass} htmlFor="gateQty2">
            Gate 2 qty
          </label>
          <input
            id="gateQty2"
            type="number"
            min="0"
            step="1"
            className={p.inputClass}
            value={p.gateQty2}
            onChange={(e) => p.setGateQty2(e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}
