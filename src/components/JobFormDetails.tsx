"use client";

import {
  CANCEL_JOB_CONFIRM,
  classesForJobType,
  isJobType,
  JOB_STATUSES,
  JOB_STATUS_ACTIVE,
  JOB_STATUS_CANCELLED,
  JOB_TYPES,
} from "@/lib/job-constants";
import type { BranchOption } from "@/components/JobForm";

type Props = {
  branches: BranchOption[];
  inputClass: string;
  labelClass: string;
  showStatus?: boolean;
  date: string; setDate: (v: string) => void;
  branchId: string; setBranchId: (v: string) => void;
  jobClass: string; setJobClass: (v: string) => void;
  orderNumber: string; setOrderNumber: (v: string) => void;
  customer: string; setCustomer: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  city: string; setCity: (v: string) => void;
  jobType: string; setJobType: (v: string) => void;
  status: string; setStatus: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  accountExec: string; setAccountExec: (v: string) => void;
  contact1: string; setContact1: (v: string) => void;
  contact2: string; setContact2: (v: string) => void;
  revenue: string; setRevenue: (v: string) => void;
};

export function JobFormDetails(p: Props) {
  const {
    branches, inputClass, labelClass, showStatus,
    date, setDate, branchId, setBranchId, jobClass, setJobClass,
    orderNumber, setOrderNumber, customer, setCustomer, address, setAddress,
    city, setCity, jobType, setJobType, status, setStatus,
    notes, setNotes, accountExec, setAccountExec,
    contact1, setContact1, contact2, setContact2,
    revenue, setRevenue,
  } = p;

  const classOptions = classesForJobType(jobType);

  function handleJobTypeChange(next: string) {
    setJobType(next);
    const nextClasses = classesForJobType(next);
    if (jobClass && !nextClasses.includes(jobClass)) {
      setJobClass(nextClasses[0] ?? "");
    }
  }

  function handleStatusChange(next: string) {
    if (status === JOB_STATUS_ACTIVE && next === JOB_STATUS_CANCELLED) {
      if (!window.confirm(CANCEL_JOB_CONFIRM)) return;
    }
    setStatus(next);
  }

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
            <select id="jobType" required className={inputClass} value={jobType} onChange={(e) => handleJobTypeChange(e.target.value)}>
              {JOB_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
              {jobType && !isJobType(jobType) ? (
                <option value={jobType}>{jobType}</option>
              ) : null}
            </select>
          </div>
          {showStatus ? (
            <div>
              <label className={labelClass} htmlFor="jobStatus">Status</label>
              <select
                id="jobStatus"
                className={inputClass}
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className={labelClass} htmlFor="jobClass">Class</label>
            <select id="jobClass" className={inputClass} value={jobClass} onChange={(e) => setJobClass(e.target.value)}>
              <option value="">-</option>
              {classOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
              {jobClass && !classOptions.includes(jobClass) ? (
                <option value={jobClass}>{jobClass}</option>
              ) : null}
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
            <label className={labelClass} htmlFor="accountExec">Account exec</label>
            <input id="accountExec" className={inputClass} value={accountExec} onChange={(e) => setAccountExec(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="revenue">Revenue</label>
            <input id="revenue" type="number" step="0.01" min="0" className={inputClass} value={revenue} onChange={(e) => setRevenue(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="contact1">Contact 1</label>
            <input id="contact1" className={inputClass} value={contact1} onChange={(e) => setContact1(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="contact2">Contact 2</label>
            <input id="contact2" className={inputClass} value={contact2} onChange={(e) => setContact2(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass} htmlFor="notes">Notes</label>
          <textarea id="notes" rows={2} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </section>
    </>
  );
}
