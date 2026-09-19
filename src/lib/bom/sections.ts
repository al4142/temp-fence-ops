import {
  isChainlinkType,
  isPlusOneType,
  normalizeFenceType,
  type FenceType,
  type PostMount,
} from "./catalog";
import type { BomGateInput, BomSectionInput } from "./types";

/** Form-row shape for one fence section (strings match other job-form fields). */
export type JobFenceSectionForm = {
  fenceType: string;
  qtyLf: string;
  topRail: boolean;
  bottomRail: boolean;
  weightMode: string;
  postMount: string;
  gateType: string;
  gateQty: string;
  gateType2: string;
  gateQty2: string;
  terminalsManual: string;
};

/** Persisted JSON row on `Job.fenceSections`. */
export type StoredFenceSection = {
  fenceType: string | null;
  qtyLf: number | null;
  topRail: boolean;
  bottomRail: boolean;
  weightMode: string | null;
  postMount: string | null;
  gateType: string | null;
  gateQty: number;
  gateType2: string | null;
  gateQty2: number;
  terminalsManual: number;
};

export type SectionSummary = {
  fenceType: string | null;
  qtyLf: number | null;
  gates: number;
  gateType: string | null;
  gateQty: number;
  gateType2: string | null;
  gateQty2: number;
  topRail: boolean;
  bottomRail: boolean;
  weightMode: string | null;
  postMount: string | null;
  terminalsManual: number;
};

export function emptyJobFenceSectionForm(): JobFenceSectionForm {
  return {
    fenceType: "",
    qtyLf: "",
    topRail: false,
    bottomRail: false,
    weightMode: "",
    postMount: "driven",
    gateType: "",
    gateQty: "0",
    gateType2: "",
    gateQty2: "0",
    terminalsManual: "0",
  };
}

export function isBlankSectionForm(s: JobFenceSectionForm): boolean {
  const gateQty = Number(s.gateQty) || 0;
  const gateQty2 = Number(s.gateQty2) || 0;
  const terminals = Number(s.terminalsManual) || 0;
  return (
    !s.fenceType.trim() &&
    !s.qtyLf.trim() &&
    !s.gateType.trim() &&
    !s.gateType2.trim() &&
    gateQty === 0 &&
    gateQty2 === 0 &&
    terminals === 0 &&
    !s.topRail &&
    !s.bottomRail &&
    !s.weightMode.trim()
  );
}

export function legacyFieldsToSectionForm(input: {
  fenceType?: string;
  qtyLf?: string;
  topRail?: boolean;
  bottomRail?: boolean;
  weightMode?: string;
  postMount?: string;
  gateType?: string;
  gateQty?: string;
  gateType2?: string;
  gateQty2?: string;
  terminalsManual?: string;
}): JobFenceSectionForm {
  const fenceType = (input.fenceType ?? "").trim();
  const canonical = normalizeFenceType(fenceType);
  return {
    fenceType,
    qtyLf: input.qtyLf ?? "",
    topRail: input.topRail ?? (canonical ? isPlusOneType(canonical) : false),
    bottomRail: Boolean(input.bottomRail),
    weightMode: input.weightMode ?? "",
    postMount: input.postMount || "driven",
    gateType: input.gateType ?? "",
    gateQty: input.gateQty ?? "0",
    gateType2: input.gateType2 ?? "",
    gateQty2: input.gateQty2 ?? "0",
    terminalsManual: input.terminalsManual ?? "0",
  };
}

/** Prefer filled `sections[]`; overlay top-level fields onto a single blank section (legacy tests / old payloads). */
export function resolveFormSections(input: {
  sections?: JobFenceSectionForm[] | null;
  fenceType?: string;
  qtyLf?: string;
  topRail?: boolean;
  bottomRail?: boolean;
  weightMode?: string;
  postMount?: string;
  gateType?: string;
  gateQty?: string;
  gateType2?: string;
  gateQty2?: string;
  terminalsManual?: string;
}): JobFenceSectionForm[] {
  const raw = (input.sections ?? []).map((s) => ({ ...emptyJobFenceSectionForm(), ...s }));
  if (raw.length === 1 && isBlankSectionForm(raw[0])) {
    const overlay = legacyFieldsToSectionForm(input);
    if (!isBlankSectionForm(overlay) || (input.postMount && input.postMount !== raw[0].postMount)) {
      return [overlay];
    }
  }
  if (raw.length > 0) return raw;
  return [legacyFieldsToSectionForm(input)];
}

export function formSectionToBom(s: JobFenceSectionForm): BomSectionInput {
  return {
    fenceType: s.fenceType || null,
    qtyLf: s.qtyLf === "" ? null : Number(s.qtyLf),
    topRail: s.topRail,
    bottomRail: s.bottomRail,
    weightMode: s.weightMode || null,
    postMount: s.postMount || "driven",
    gate: { type: s.gateType || null, qty: Number(s.gateQty) || 0 },
    gate2: { type: s.gateType2 || null, qty: Number(s.gateQty2) || 0 },
    terminalsManual: Number(s.terminalsManual) || 0,
  };
}

export function formSectionsToBom(sections: JobFenceSectionForm[]): BomSectionInput[] {
  return sections.map(formSectionToBom);
}

export function storedToFormSection(s: StoredFenceSection): JobFenceSectionForm {
  return {
    fenceType: s.fenceType ?? "",
    qtyLf: s.qtyLf != null ? String(s.qtyLf) : "",
    topRail: Boolean(s.topRail),
    bottomRail: Boolean(s.bottomRail),
    weightMode: s.weightMode ?? "",
    postMount: s.postMount === "plate" ? "plate" : "driven",
    gateType: s.gateType ?? "",
    gateQty: String(s.gateQty ?? 0),
    gateType2: s.gateType2 ?? "",
    gateQty2: String(s.gateQty2 ?? 0),
    terminalsManual: String(s.terminalsManual ?? 0),
  };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function parseStoredSection(raw: unknown): StoredFenceSection | null {
  const o = asRecord(raw);
  if (!o) return null;
  const qty = o.qtyLf;
  const qtyLf = typeof qty === "number" && Number.isFinite(qty) ? qty : qty == null ? null : Number(qty);
  return {
    fenceType: typeof o.fenceType === "string" && o.fenceType.trim() ? o.fenceType.trim() : null,
    qtyLf: qtyLf != null && Number.isFinite(qtyLf) ? qtyLf : null,
    topRail: Boolean(o.topRail),
    bottomRail: Boolean(o.bottomRail),
    weightMode: typeof o.weightMode === "string" && o.weightMode.trim() ? o.weightMode.trim() : null,
    postMount: typeof o.postMount === "string" && o.postMount.trim() ? o.postMount.trim() : "driven",
    gateType: typeof o.gateType === "string" && o.gateType.trim() ? o.gateType.trim() : null,
    gateQty: Math.max(0, Math.floor(Number(o.gateQty) || 0)),
    gateType2: typeof o.gateType2 === "string" && o.gateType2.trim() ? o.gateType2.trim() : null,
    gateQty2: Math.max(0, Math.floor(Number(o.gateQty2) || 0)),
    terminalsManual: Math.max(0, Math.floor(Number(o.terminalsManual) || 0)),
  };
}

export function parseStoredSections(json: unknown): StoredFenceSection[] | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const rows: StoredFenceSection[] = [];
  for (const item of json) {
    const row = parseStoredSection(item);
    if (row) rows.push(row);
  }
  return rows.length > 0 ? rows : null;
}

/** Existing jobs with no `fenceSections` JSON → one section from current columns. */
export function jobColumnsToStoredSection(job: {
  fenceType: string | null;
  qtyLf: number | null;
  topRail: boolean;
  bottomRail: boolean;
  weightMode: string | null;
  postMount?: string | null;
  gateType: string | null;
  gateQty: number;
  gateType2: string | null;
  gateQty2: number;
  terminalsManual: number;
}): StoredFenceSection {
  return {
    fenceType: job.fenceType,
    qtyLf: job.qtyLf,
    topRail: job.topRail,
    bottomRail: job.bottomRail,
    weightMode: job.weightMode,
    postMount: job.postMount === "plate" ? "plate" : "driven",
    gateType: job.gateType,
    gateQty: job.gateQty,
    gateType2: job.gateType2,
    gateQty2: job.gateQty2,
    terminalsManual: job.terminalsManual,
  };
}

export function sectionsForJob(job: {
  fenceType: string | null;
  qtyLf: number | null;
  topRail: boolean;
  bottomRail: boolean;
  weightMode: string | null;
  postMount?: string | null;
  gateType: string | null;
  gateQty: number;
  gateType2: string | null;
  gateQty2: number;
  terminalsManual: number;
  fenceSections?: unknown;
}): StoredFenceSection[] {
  return parseStoredSections(job.fenceSections) ?? [jobColumnsToStoredSection(job)];
}

export function summarizeSections(sections: StoredFenceSection[]): SectionSummary {
  const first = sections[0];
  const qtyLf = sections.reduce((s, x) => s + (x.qtyLf ?? 0), 0);
  const gates = sections.reduce((s, x) => s + x.gateQty + x.gateQty2, 0);
  const firstCl = sections.find((x) => {
    const t = normalizeFenceType(x.fenceType);
    return t && isChainlinkType(t);
  });
  const types = sections.map((x) => x.fenceType?.trim()).filter((x): x is string => Boolean(x));
  const unique = [...new Set(types)];
  return {
    fenceType: unique.length === 1 ? unique[0] : first?.fenceType ?? null,
    qtyLf: qtyLf > 0 ? qtyLf : first?.qtyLf ?? null,
    gates,
    gateType: first?.gateType ?? null,
    gateQty: first?.gateQty ?? 0,
    gateType2: first?.gateType2 ?? null,
    gateQty2: first?.gateQty2 ?? 0,
    topRail: sections.some((x) => x.topRail),
    bottomRail: sections.some((x) => x.bottomRail),
    weightMode: sections.find((x) => x.weightMode)?.weightMode ?? first?.weightMode ?? null,
    postMount: firstCl?.postMount === "plate" ? "plate" : first?.postMount === "plate" ? "plate" : "driven",
    terminalsManual: sections.reduce((s, x) => s + x.terminalsManual, 0),
  };
}

export function formatSectionLabel(s: StoredFenceSection, index: number): string {
  const type = s.fenceType?.trim() || "unset";
  const lf = s.qtyLf != null ? `${s.qtyLf} LF` : "0 LF";
  const ft = normalizeFenceType(s.fenceType);
  const mount =
    ft && isChainlinkType(ft) ? (s.postMount === "plate" ? "plate" : "driven") : null;
  const gates = s.gateQty + s.gateQty2;
  const bits = [`Section ${index + 1}`, type, lf];
  if (mount) bits.push(mount);
  if (gates) bits.push(`${gates} gate${gates === 1 ? "" : "s"}`);
  return bits.join(" · ");
}

export function storedToBomSection(s: StoredFenceSection): BomSectionInput {
  return {
    fenceType: s.fenceType,
    qtyLf: s.qtyLf,
    topRail: s.topRail,
    bottomRail: s.bottomRail,
    weightMode: s.weightMode,
    postMount: s.postMount,
    gate: { type: s.gateType, qty: s.gateQty } satisfies BomGateInput,
    gate2: { type: s.gateType2, qty: s.gateQty2 } satisfies BomGateInput,
    terminalsManual: s.terminalsManual,
  };
}

export function resolveBomSections(input: {
  sections?: BomSectionInput[] | null;
  fenceType?: string | null;
  qtyLf?: number | null;
  topRail?: boolean | null;
  bottomRail?: boolean | null;
  weightMode?: string | null;
  postMount?: string | null;
  gate?: BomGateInput | null;
  gate2?: BomGateInput | null;
  terminalsManual?: number | null;
}): BomSectionInput[] {
  if (input.sections && input.sections.length > 0) return input.sections;
  return [
    {
      fenceType: input.fenceType,
      qtyLf: input.qtyLf,
      topRail: input.topRail,
      bottomRail: input.bottomRail,
      weightMode: input.weightMode,
      postMount: input.postMount,
      gate: input.gate,
      gate2: input.gate2,
      terminalsManual: input.terminalsManual,
    },
  ];
}

export function resultPostMount(sectionMounts: Array<PostMount | null>): PostMount | null {
  const mounts = sectionMounts.filter((m): m is PostMount => m != null);
  if (mounts.length === 0) return "driven";
  const uniq = new Set(mounts);
  if (uniq.size === 1) return mounts[0];
  return null;
}

export function resultFenceType(types: Array<FenceType | null>): FenceType | null {
  const known = types.filter((t): t is FenceType => t != null);
  if (known.length === 0) return types[0] ?? null;
  const uniq = new Set(known);
  return uniq.size === 1 ? known[0] : known[0];
}
