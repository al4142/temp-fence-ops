import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { buildProjectWorkbook, exportFilename } from "@/lib/export-project";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  await requireSession();
  const { id } = await ctx.params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      branch: true,
      materials: { include: { inventoryItem: true } },
      labor: { include: { employee: true } },
      lodgingLines: true,
      freightLines: true,
      miscLines: true,
      variances: { include: { inventoryItem: true } },
    },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const buffer = await buildProjectWorkbook(job);
  const filename = exportFilename(job);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
