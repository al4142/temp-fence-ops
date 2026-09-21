"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import type { ActionResult, JobFormValues } from "@/lib/job-form";
import { emptyJobFenceSectionForm, formSectionsToBom, resolveFormSections } from "@/lib/bom/sections";
import { VARIANCE_REASONS } from "@/lib/ops-constants";
import { bomLinesToMaterials, calculateBom, catalogMatchWarnings, type BomResult, type MatchedBomMaterial } from "@/lib/bom";
import { catalogItemsForJobPicker } from "@/lib/inventory-catalog";
import { JobFormDetails } from "@/components/JobFormDetails";
import { JobFormBomOptions } from "@/components/JobFormBomOptions";
import { JobFormMaterials } from "@/components/JobFormMaterials";
import { JobFormLabor } from "@/components/JobFormLabor";
import {
  JobFormCostLines,
  type FreightRow,
  type LodgingRow,
  type MiscRow,
} from "@/components/JobFormCostLines";
import { JobFormVariances, type VarianceRow } from "@/components/JobFormVariances";

export type BranchOption = { id: string; code: string; name: string };
export type EmployeeOption = {
  id: string;
  name: string;
  position: string;
  branchId: string;
  active: boolean;
};
export type InventoryOption = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  branchId: string;
  active?: boolean;
};

type Props = {
  mode: "create" | "edit";
  initial: JobFormValues;
  branches: BranchOption[];
  employees: EmployeeOption[];
  inventory: InventoryOption[];
  cancelHref: string;
  onSubmit: (values: JobFormValues) => Promise<ActionResult | void>;
  onDelete?: () => Promise<ActionResult | void>;
};

type MaterialRow = {
  key: string;
  inventoryItemId: string;
  itemName: string;
  quantity: string;
  notes: string;
};

type LaborRow = {
  key: string;
  employeeId: string;
  regularHours: string;
  overtimeHours: string;
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function JobForm({
  mode,
  initial,
  branches,
  employees,
  inventory,
  cancelHref,
  onSubmit,
  onDelete,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(initial.date);
  const [branchId, setBranchId] = useState(initial.branchId);
  const [jobClass, setJobClass] = useState(initial.class);
  const [orderNumber, setOrderNumber] = useState(initial.orderNumber);
  const [customer, setCustomer] = useState(initial.customer);
  const [address, setAddress] = useState(initial.address);
  const [city, setCity] = useState(initial.city);
  const [jobType, setJobType] = useState(initial.jobType);
  const [status, setStatus] = useState(initial.status);
  const [screenSku, setScreenSku] = useState(initial.screenSku ?? "");
  const [sections, setSections] = useState(() => {
    const resolved = resolveFormSections(initial);
    return resolved.length > 0 ? resolved : [emptyJobFenceSectionForm()];
  });
  const [notes, setNotes] = useState(initial.notes);
  const [accountExec, setAccountExec] = useState(initial.accountExec);
  const [revenue, setRevenue] = useState(initial.revenue);

  const [lodging, setLodging] = useState<LodgingRow[]>(() =>
    (initial.lodgingLines ?? []).map((l) => ({
      key: newKey(),
      amount: String(l.amount ?? ""),
      facility: l.facility ?? "",
      notes: l.notes ?? "",
    }))
  );
  const [freight, setFreight] = useState<FreightRow[]>(() =>
    (initial.freightLines ?? []).map((l) => ({
      key: newKey(),
      company: l.company ?? "",
      cost: String(l.cost ?? ""),
      notes: l.notes ?? "",
    }))
  );
  const [misc, setMisc] = useState<MiscRow[]>(() =>
    (initial.miscLines ?? []).map((l) => ({
      key: newKey(),
      amount: String(l.amount ?? ""),
      category: l.category ?? "",
      notes: l.notes ?? "",
    }))
  );

  const [materials, setMaterials] = useState<MaterialRow[]>(() =>
    (initial.materials.length > 0
      ? initial.materials
      : [{ inventoryItemId: "", itemName: "", quantity: "1", notes: "" }]
    ).map((m) => ({
      key: newKey(),
      inventoryItemId: m.inventoryItemId ?? "",
      itemName: m.itemName ?? "",
      quantity: String(m.quantity ?? ""),
      notes: m.notes ?? "",
    }))
  );

  const [labor, setLabor] = useState<LaborRow[]>(() =>
    (initial.labor.length > 0
      ? initial.labor
      : [{ employeeId: "", regularHours: "8", overtimeHours: "0" }]
    ).map((l) => ({
      key: newKey(),
      employeeId: l.employeeId,
      regularHours: String(l.regularHours ?? ""),
      overtimeHours: String(l.overtimeHours ?? ""),
    }))
  );

  const [variances, setVariances] = useState<VarianceRow[]>(() =>
    (initial.variances ?? []).map((v) => ({
      key: newKey(),
      inventoryItemId: v.inventoryItemId ?? "",
      itemName: v.itemName ?? "",
      quantity: String(v.quantity ?? ""),
      reason: v.reason || VARIANCE_REASONS[0],
      notes: v.notes ?? "",
    }))
  );

  const [bomPreview, setBomPreview] = useState<{
    result: BomResult;
    materials: MatchedBomMaterial[];
  } | null>(null);

  const filteredInventory = useMemo(() => {
    const attachedIds = [
      ...materials.map((m) => m.inventoryItemId),
      ...variances.map((v) => v.inventoryItemId),
    ].filter(Boolean);
    const selectable = catalogItemsForJobPicker(inventory, attachedIds);
    if (!branchId) return selectable;
    const forBranch = selectable.filter((i) => i.branchId === branchId);
    return forBranch.length > 0 ? forBranch : selectable;
  }, [branchId, inventory, materials, variances]);

  const filteredEmployees = useMemo(() => {
    const active = employees.filter((e) => e.active);
    if (!branchId) return active;
    const preferred = active.filter((e) => e.branchId === branchId);
    const others = active.filter((e) => e.branchId !== branchId);
    return [...preferred, ...others];
  }, [branchId, employees]);

  function buildValues(): JobFormValues {
    return {
      date,
      branchId,
      class: jobClass,
      orderNumber,
      customer,
      address,
      city,
      jobType,
      status,
      fenceType: sections[0]?.fenceType ?? "",
      qtyLf: sections[0]?.qtyLf ?? "",
      screen: Boolean(screenSku),
      screenSku,
      gates: String(
        sections.reduce((n, s) => n + (Number(s.gateQty) || 0) + (Number(s.gateQty2) || 0), 0)
      ),
      gateType: sections[0]?.gateType ?? "",
      gateQty: sections[0]?.gateQty ?? "0",
      gateType2: sections[0]?.gateType2 ?? "",
      gateQty2: sections[0]?.gateQty2 ?? "0",
      topRail: sections[0]?.topRail ?? false,
      bottomRail: sections[0]?.bottomRail ?? false,
      weightMode: sections[0]?.weightMode ?? "",
      postMount: sections[0]?.postMount || "driven",
      terminalsManual: sections[0]?.terminalsManual ?? "0",
      sections,
      notes,
      accountExec,
      revenue,
      lodgingLines: lodging.map((l) => ({
        amount: Number(l.amount) || 0,
        facility: l.facility || null,
        notes: l.notes || null,
      })),
      freightLines: freight.map((l) => ({
        company: l.company || null,
        cost: Number(l.cost) || 0,
        notes: l.notes || null,
      })),
      miscLines: misc.map((l) => ({
        amount: Number(l.amount) || 0,
        category: l.category || null,
        notes: l.notes || null,
      })),
      materials: materials.map((m) => ({
        inventoryItemId: m.inventoryItemId || null,
        itemName: m.itemName || null,
        quantity: Number(m.quantity) || 0,
        notes: m.notes || null,
      })),
      labor: labor.map((l) => ({
        employeeId: l.employeeId,
        regularHours: Number(l.regularHours) || 0,
        overtimeHours: Number(l.overtimeHours) || 0,
      })),
      variances: variances.map((v) => ({
        inventoryItemId: v.inventoryItemId || null,
        itemName: v.itemName || null,
        quantity: Number(v.quantity) || 0,
        reason: v.reason,
        notes: v.notes || null,
      })),
    };
  }

  function handleGenerateBom() {
    const result = calculateBom({
      sections: formSectionsToBom(sections),
      screenSku: screenSku || null,
      jobType,
    });
    const matched = bomLinesToMaterials(result.lines, filteredInventory);
    const warnings = [...result.warnings, ...catalogMatchWarnings(matched, result.warnings)];
    setBomPreview({ result: { ...result, warnings }, materials: matched });
  }

  function handleApplyBom() {
    if (!bomPreview) return;
    if (bomPreview.materials.length === 0) {
      window.alert("Nothing to apply. Check fence type, LF, and options — see warnings in the preview.");
      return;
    }
    const existing = materials.some(
      (m) =>
        (Number(m.quantity) || 0) !== 0 &&
        (m.inventoryItemId || m.itemName.trim())
    );
    if (existing) {
      const ok = window.confirm(
        "Replace existing material lines with the generated BOM? Manually edited rows will be removed."
      );
      if (!ok) return;
    }
    setMaterials(
      bomPreview.materials.map((m) => ({
        key: newKey(),
        inventoryItemId: m.inventoryItemId ?? "",
        itemName: m.itemName ?? "",
        quantity: String(m.quantity),
        notes: m.notes ?? "",
      }))
    );
    setBomPreview(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const values = buildValues();
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result && result.ok === false) setError(result.error);
    });
  }

  function handleDelete() {
    if (!onDelete) return;
    if (
      !window.confirm(
        "Delete this job and its material/labor/cost lines? This cannot be undone."
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onDelete();
      if (result && result.ok === false) setError(result.error);
    });
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelClass = "block text-xs font-medium uppercase tracking-wide text-slate-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <JobFormDetails
        branches={branches}
        inputClass={inputClass}
        labelClass={labelClass}
        showStatus={mode === "edit"}
        date={date}
        setDate={setDate}
        branchId={branchId}
        setBranchId={setBranchId}
        jobClass={jobClass}
        setJobClass={setJobClass}
        orderNumber={orderNumber}
        setOrderNumber={setOrderNumber}
        customer={customer}
        setCustomer={setCustomer}
        address={address}
        setAddress={setAddress}
        city={city}
        setCity={setCity}
        jobType={jobType}
        setJobType={setJobType}
        status={status}
        setStatus={setStatus}
        notes={notes}
        setNotes={setNotes}
        accountExec={accountExec}
        setAccountExec={setAccountExec}
        revenue={revenue}
        setRevenue={setRevenue}
      />

      <JobFormBomOptions
        inputClass={inputClass}
        labelClass={labelClass}
        sections={sections}
        setSections={setSections}
        screenSku={screenSku}
        setScreenSku={setScreenSku}
      />

      <JobFormCostLines
        lodging={lodging}
        setLodging={setLodging}
        freight={freight}
        setFreight={setFreight}
        misc={misc}
        setMisc={setMisc}
        inputClass={inputClass}
        labelClass={labelClass}
        newKey={newKey}
      />

      <JobFormMaterials
        materials={materials}
        setMaterials={setMaterials}
        filteredInventory={filteredInventory}
        inputClass={inputClass}
        labelClass={labelClass}
        newKey={newKey}
        bomPreview={bomPreview}
        onGenerateBom={handleGenerateBom}
        onApplyBom={handleApplyBom}
        onDismissBom={() => setBomPreview(null)}
      />

      <JobFormVariances
        variances={variances}
        setVariances={setVariances}
        filteredInventory={filteredInventory}
        inputClass={inputClass}
        labelClass={labelClass}
        newKey={newKey}
      />

      <JobFormLabor
        labor={labor}
        setLabor={setLabor}
        filteredEmployees={filteredEmployees}
        inputClass={inputClass}
        labelClass={labelClass}
        newKey={newKey}
        jobType={jobType}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? "Saving..." : mode === "create" ? "Create job" : "Save changes"}
          </button>
          <Link
            href={cancelHref}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
        {onDelete ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleDelete}
            className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Delete job
          </button>
        ) : null}
      </div>
    </form>
  );
}
