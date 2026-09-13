import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/inventory", label: "Inventory" },
  { href: "/pnl", label: "P&L" },
  { href: "/analytics", label: "Analytics" },
];

const adminLinks = [
  { href: "/admin/branches", label: "Yards" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/inventory", label: "Inv. admin" },
  { href: "/admin/import", label: "Import" },
];

export async function Nav() {
  const session = await getSession();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Temp Fence Ops
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
            demo
          </span>
        </Link>
        {session ? (
          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex flex-wrap gap-1 text-sm">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                >
                  {l.label}
                </Link>
              ))}
              <span className="mx-1 hidden self-center text-slate-300 sm:inline" aria-hidden>
                |
              </span>
              <span className="self-center px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Admin
              </span>
              {adminLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3 text-sm text-slate-600">
              <span className="max-w-[10rem] truncate" title={session.email}>
                {session.name}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md px-2 py-1 text-slate-700 hover:bg-slate-100"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
