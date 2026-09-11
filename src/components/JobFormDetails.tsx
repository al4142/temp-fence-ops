"use client";

import { FENCE_TYPES, JOB_CLASSES, JOB_TYPES } from "@/lib/job-constants";
import type { BranchOption } from "@/components/JobForm";

type Props = {
  branches: BranchOption[];
  inputClass: string;
  labelClass: string;
  date: string; setDate: (v: string) => void;
  branchId: string; setBranchId: (v: string) => void;
  jobClass: string; setJobClass: (v: string) => void;
  orderNumber: string; setOrderNumber: (v: string) => void;
  customer: string; setCustomer: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  city: string; setCity: (v: string) => void;
  jobType: string; setJobType: (v: string) => void;
  fenceType: string; setFenceType: (v: string) => void;
  qtyLf: string; setQtyLf: (v: string) => void;
  screen: boolean; setScreen: (v: boolean) => void;
  gates: string; setGates: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  accountExec: string; setAccountExec: (v: string) => void;
  revenue: string; setRevenue: (v: string) => void;
  lodging: string; setLodging: (v: string) => void;
  freight: string; setFreight: (v: string) => void;
  misc: string; setMisc: (v: string) => void;
};

export function JobFormDetails(p: Props) {
  const {
    branches, inputClass, labelClass,
    date, setDate, branchId, setBranchId, jobClass, setJobClass,
    orderNumber, setOrderNumber, customer, setCustomer, address, setAddress,
    city, setCity, jobType, setJobType, fenceType, setFenceType, qtyLf, setQtyLf,
    screen, setScreen, gates, setGates, notes, setNotes, accountExec, setAccountExec,
    revenue, setRevenue, lodging, setLodging, freight, setFreight, misc, setMisc,
  } = p;

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Job details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="orderNumber">Order # *</label>
            <input id="orderNumber" required className={inputClass} value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ORD-1001" />
          </div>
          <div>
            <label className={labelClass} htmlFor="date">Date *</label>
            <input id="date" type="date" required className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="branchId">Branch *</label>
            <select id="branchId" required className={inputClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="jobType">Job type *</label>
            <select id="jobType" required className={inputClass} value={jobType} onChange={(e) => setJobType(e.target.value)}>
              {JOB_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="jobClass">Class</label>
            <select id="jobClass" className={inputClass} value={jobClass} onChange={(e) => setJobClass(e.target.value)}>
              <option value="">-</option>
              {JOB_CLASSES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="customer">Customer</label>
            <input id="customer" className={inputClass} value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Demo Event Co" />
          </div>
          <div>
            <label className={labelClass} htmlFor="address">Address</label>
            <input id="address" className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="city">City</label>
            <input id="city" className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="fenceType">Fence type</label>
            <select id="fenceType" className={inputClass} value={fenceType} onChange={(e) => setFenceType(e.target.value)}>
              <option value="">-</option>
              {FENCE_TYPES.map((f) => (<option key={f} value={f}>{f}</option>))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="qtyLf">Qty (LF)</label>
            <input id="qtyLf" type="number" step="any" min="0" className={inputClass} value={qtyLf} onChange={(e) => setQtyLf(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="gates">Gates</label>
            <input id="gates" type="number" min="0" step="1" className={inputClass} value={gates} onChange={(e) => setGates(e.target.value)} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input type="checkbox" checked={screen} onChange={(e) => setScreen(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Screen / privacy wrap
            </label>
          </div>
          <div>
            <label className={labelClass} htmlFor="accountExec">Account exec</label>
            <input id="accountExec" className={inputClass} value={accountExec} onChange={(e) => setAccountExec(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass} htmlFor="notes">Notes</label>
          <textarea id="notes" rows={2} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Revenue &amp; costs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["revenue", "Revenue", revenue, setRevenue],
              ["lodging", "Lodging", lodging, setLodging],
              ["freight", "Freight", freight, setFreight],
              ["misc", "Misc", misc, setMisc],
            ] as const
          ).map(([id, label, value, setter]) => (
            <div key={id}>
              <label className={labelClass} htmlFor={id}>{label}</label>
              <input id={id} type="number" step="0.01" min="0" className={inputClass} value={value} onChange={(e) => setter(e.target.value)} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
