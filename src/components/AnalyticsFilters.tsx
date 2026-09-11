import Link from "next/link";
import type { JobTypeGroup } from "@/lib/analytics";

type BranchOpt = { id: string; code: string; name: string };

type Props = {
  year: number;
  years: number[];
  branchCode: string;
  branches: BranchOpt[];
  groupFilter: "all" | JobTypeGroup;
};

export function AnalyticsFilters({
  year,
  years,
  branchCode,
  branches,
  groupFilter,
}: Props) {
  const branch = branchCode === "ALL" ? null : branches.find((b) => b.code === branchCode) ?? null;

  const qs = (overrides: { year?: string; branch?: string; group?: string }) => {
    const params = new URLSearchParams();
    params.set("year", String(overrides.year ?? year));
    params.set("branch", (overrides.branch ?? branchCode).toLowerCase());
    params.set("group", overrides.group ?? groupFilter);
    return `/analytics?${params.toString()}`;
  };

  return (
    <>
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div>
          <label htmlFor="year" className="block text-xs font-medium text-slate-600">
            Year
          </label>
          <select
            id="year"
            name="year"
            defaultValue={year}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="branch" className="block text-xs font-medium text-slate-600">
            Branch
          </label>
          <select
            id="branch"
            name="branch"
            defaultValue={branch ? branch.code.toLowerCase() : "all"}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.code.toLowerCase()}>
                {b.code} - {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="group" className="block text-xs font-medium text-slate-600">
            Job type group
          </label>
          <select
            id="group"
            name="group"
            defaultValue={groupFilter}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="all">All groups</option>
            <option value="INST">INST / install / delivery</option>
            <option value="PU">PU / pickup / return</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Apply
        </button>
        <Link
          href="/analytics"
          className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Reset
        </Link>
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        {years.map((y) => (
          <Chip key={y} href={qs({ year: String(y) })} active={y === year} label={String(y)} />
        ))}
        <span className="mx-1 text-slate-300">|</span>
        <Chip href={qs({ branch: "all" })} active={!branch} label="All branches" />
        {branches.map((b) => (
          <Chip
            key={b.id}
            href={qs({ branch: b.code.toLowerCase() })}
            active={branch?.id === b.id}
            label={b.code}
          />
        ))}
      </div>
    </>
  );
}

function Chip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-slate-900 px-3 py-1 text-white"
          : "rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }
    >
      {label}
    </Link>
  );
}
