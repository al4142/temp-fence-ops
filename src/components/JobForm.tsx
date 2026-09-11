"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import type { ActionResult, JobFormValues } from "@/lib/job-form";
import { JobFormDetails } from "@/components/JobFormDetails";
import { JobFormMaterials } from "@/components/JobFormMaterials";
import { JobFormLabor } from "@/components/JobFormLabor";

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
  const [fenceType, setFenceType] = useState(initial.fenceType);
  const [qtyLf, setQtyLf] = useState(initial.qtyLf);
  const [screen, setScreen] = useState(initial.screen);
  const [gates, setGates] = useState(initial.gates);
  const [notes, setNotes] = useState(initial.notes);
  const [accountExec, setAccountExec] = useState(initial.accountExec);
  const [revenue, setRevenue] = useState(initial.revenue);
  const [lodging, setLodging] = useState(initial.lodging);
  const [freight, setFreight] = useState(initial.freight);
  const [misc, setMisc] = useState(initial.misc);

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

  const filteredInventory = useMemo(() => {
    if (!branchId) return inventory;
    const forBranch = inventory.filter((i) => i.branchId === branchId);
    return forBranch.length > 0 ? forBranch : inventory;
  }, [branchId, inventory]);

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
      fenceType,
      qtyLf,
      screen,
      gates,
      notes,
      accountExec,
      revenue,
      lodging,
      freight,
      misc,
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
    };
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
        "Delete this job and its material/labor lines? This cannot be undone."
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
        fenceType={fenceType}
        setFenceType={setFenceType}
        qtyLf={qtyLf}
        setQtyLf={setQtyLf}
        screen={screen}
        setScreen={setScreen}
        gates={gates}
        setGates={setGates}
        notes={notes}
        setNotes={setNotes}
        accountExec={accountExec}
        setAccountExec={setAccountExec}
        revenue={revenue}
        setRevenue={setRevenue}
        lodging={lodging}
        setLodging={setLodging}
        freight={freight}
        setFreight={setFreight}
        misc={misc}
        setMisc={setMisc}
      />

      <JobFormMaterials
        materials={materials}
        setMaterials={setMaterials}
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
