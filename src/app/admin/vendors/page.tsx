import { prisma } from "@/lib/prisma";
import { VendorAdminClient } from "@/components/VendorAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage() {
  const vendors = await prisma.vendor.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { yardExpenses: true } } },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Vendors</h1>
        <p className="mt-1 text-sm text-slate-600">
          CRUD list for suppliers used on yard expenses (and future purchases).
        </p>
      </div>
      <VendorAdminClient vendors={vendors} />
    </div>
  );
}
