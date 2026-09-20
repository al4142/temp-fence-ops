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
import { emptyJobFenceSectionForm, type JobFenceSectionForm } from "@/lib/bom/sections";

type Props = {
  inputClass: string;
  labelClass: string;
  sections: JobFenceSectionForm[];
  setSections: (next: JobFenceSectionForm[]) => void;
  screenSku: string;
  setScreenSku: (v: string) => void;
};

function patch(
  sections: JobFenceSectionForm[],
  index: number,
  partial: Partial<JobFenceSectionForm>
): JobFenceSectionForm[] {
  return sections.map((s, i) => (i === index ? { ...s, ...partial } : s));
}

export function JobFormBomOptions(p: Props) {
  const gateList = (current: string) =>
    current && !(GATE_TYPES as readonly string[]).includes(current)
      ? [current, ...GATE_TYPES]
      : [...GATE_TYPES];

  function onFenceTypeChange(index: number, next: string) {
    const t = normalizeFenceType(next);
    const updates: Partial<JobFenceSectionForm> = { fenceType: next };
    if (t && isPlusOneType(t)) updates.topRail = true;
    p.setSections(patch(p.sections, index, updates));
  }

  function addSection() {
    p.setSections([...p.sections, emptyJobFenceSectionForm()]);
  }

  function removeSection(index: number) {
    if (p.sections.length <= 1) return;
    p.setSections(p.sections.filter((_, i) => i !== index));
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 font-semibold text-slate-900">Fence / BOM options</h2>
      <p className="mb-3 text-xs text-slate-500">
        A job can have one or more fence sections. Generate BOM runs each section and merges
        lines. Default is one driven chainlink section. Mixed driven + plate is two chainlink
        sections with the LF split. Gates and manual terminals are per section (auto terminals
        = gate qty × 2 on that section). Tension wire is not in v1.
      </p>

      <div className="space-y-4">
        {p.sections.map((s, index) => {
          const canonical = normalizeFenceType(s.fenceType);
          const showChainlink = !canonical || isChainlinkType(canonical);
          const showPanelWeights = !canonical || isPanelType(canonical);
          const fenceOptions =
            s.fenceType && !FENCE_TYPES.includes(s.fenceType as (typeof FENCE_TYPES)[number])
              ? [s.fenceType, ...FENCE_TYPES]
              : [...FENCE_TYPES];
          const id = (name: string) => `${name}-${index}`;

          return (
            <div
              key={index}
              className="rounded-md border border-slate-200 bg-slate-50/60 p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">
                  Section {index + 1}
                  {p.sections.length > 1 && s.fenceType ? (
                    <span className="ml-2 font-normal text-slate-500">{s.fenceType}</span>
                  ) : null}
                </h3>
                {p.sections.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    className="text-xs text-red-700 hover:underline"
                  >
                    Remove section
                  </button>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={p.labelClass} htmlFor={id("fenceType")}>
                    Fence type
                  </label>
                  <select
                    id={id("fenceType")}
                    className={p.inputClass}
                    value={s.fenceType}
                    onChange={(e) => onFenceTypeChange(index, e.target.value)}
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
                  <label className={p.labelClass} htmlFor={id("qtyLf")}>
                    Qty (LF)
                  </label>
                  <input
                    id={id("qtyLf")}
                    type="number"
                    step="any"
                    min="0"
                    className={p.inputClass}
                    value={s.qtyLf}
                    onChange={(e) => p.setSections(patch(p.sections, index, { qtyLf: e.target.value }))}
                  />
                </div>
                {showPanelWeights ? (
                  <div>
                    <label className={p.labelClass} htmlFor={id("weightMode")}>
                      Weights (panels)
                    </label>
                    <select
                      id={id("weightMode")}
                      className={p.inputClass}
                      value={s.weightMode}
                      onChange={(e) =>
                        p.setSections(patch(p.sections, index, { weightMode: e.target.value }))
                      }
                    >
                      <option value="">None</option>
                      {WEIGHT_MODES.map((m) => (
                        <option key={m} value={m}>
                          {m === "BFOOT"
                            ? "BFOOT — big feet (2× stands)"
                            : "SBAG — sand bags (2× stands)"}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {showChainlink ? (
                  <>
                    <div>
                      <label className={p.labelClass} htmlFor={id("postMount")}>
                        Post mount
                      </label>
                      <select
                        id={id("postMount")}
                        className={p.inputClass}
                        value={s.postMount || "driven"}
                        onChange={(e) =>
                          p.setSections(patch(p.sections, index, { postMount: e.target.value }))
                        }
                      >
                        {POST_MOUNTS.map((m) => (
                          <option key={m} value={m}>
                            {POST_MOUNT_LABELS[m]}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-500">
                        Driven (default, bury-length posts) or plate on concrete (fence-height
                        posts + SCREW-BOLT+ 3/8×3).
                      </p>
                    </div>
                    <div>
                      <label className={p.labelClass} htmlFor={id("terminalsManual")}>
                        Manual terminals
                      </label>
                      <input
                        id={id("terminalsManual")}
                        type="number"
                        min="0"
                        step="1"
                        className={p.inputClass}
                        value={s.terminalsManual}
                        onChange={(e) =>
                          p.setSections(
                            patch(p.sections, index, { terminalsManual: e.target.value })
                          )
                        }
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        This section only. Corners + start/stop + extras. Auto terminals = (this
                        section&apos;s gate qty × 2).
                      </p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2">
                        <label className="flex items-center gap-2 text-sm text-slate-800">
                          <input
                            type="checkbox"
                            checked={s.topRail}
                            onChange={(e) =>
                              p.setSections(patch(p.sections, index, { topRail: e.target.checked }))
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Top rail
                          {canonical && isPlusOneType(canonical) ? (
                            <span className="text-xs text-slate-500">(recommended for +1)</span>
                          ) : null}
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-800">
                          <input
                            type="checkbox"
                            checked={s.bottomRail}
                            onChange={(e) =>
                              p.setSections(
                                patch(p.sections, index, { bottomRail: e.target.checked })
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Bottom rail
                        </label>
                      </div>
                    </div>
                  </>
                ) : null}
                <div>
                  <label className={p.labelClass} htmlFor={id("gateType")}>
                    Gate
                  </label>
                  <select
                    id={id("gateType")}
                    className={p.inputClass}
                    value={s.gateType}
                    onChange={(e) =>
                      p.setSections(patch(p.sections, index, { gateType: e.target.value }))
                    }
                  >
                    <option value="">-</option>
                    {gateList(s.gateType).map((g) => (
                      <option key={g} value={g}>
                        {(GATE_TYPES as readonly string[]).includes(g)
                          ? g
                          : `${g} (removed — catalog gap)`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={p.labelClass} htmlFor={id("gateQty")}>
                    Gate qty
                  </label>
                  <input
                    id={id("gateQty")}
                    type="number"
                    min="0"
                    step="1"
                    className={p.inputClass}
                    value={s.gateQty}
                    onChange={(e) =>
                      p.setSections(patch(p.sections, index, { gateQty: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={p.labelClass} htmlFor={id("gateType2")}>
                    Gate 2
                  </label>
                  <select
                    id={id("gateType2")}
                    className={p.inputClass}
                    value={s.gateType2}
                    onChange={(e) =>
                      p.setSections(patch(p.sections, index, { gateType2: e.target.value }))
                    }
                  >
                    <option value="">-</option>
                    {gateList(s.gateType2).map((g) => (
                      <option key={g} value={g}>
                        {(GATE_TYPES as readonly string[]).includes(g)
                          ? g
                          : `${g} (removed — catalog gap)`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={p.labelClass} htmlFor={id("gateQty2")}>
                    Gate 2 qty
                  </label>
                  <input
                    id={id("gateQty2")}
                    type="number"
                    min="0"
                    step="1"
                    className={p.inputClass}
                    value={s.gateQty2}
                    onChange={(e) =>
                      p.setSections(patch(p.sections, index, { gateQty2: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addSection}
        className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
      >
        Add section
      </button>

      <div className="mt-4 max-w-sm">
        <label className={p.labelClass} htmlFor="screenSku">
          Screen SKU (job total LF)
        </label>
        <select
          id="screenSku"
          className={p.inputClass}
          value={p.screenSku}
          onChange={(e) => p.setScreenSku(e.target.value)}
        >
          <option value="">None</option>
          {SCREEN_SKUS.map((sku) => (
            <option key={sku} value={sku}>
              {sku}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Rolls = CEILING(sum of section LF / 50). Not per-section.
        </p>
      </div>
    </section>
  );
}
