import { describe, expect, it } from "vitest";
import {
  commitImportWrites,
  evaluateImportRows,
  importIdentityKey,
  importRowToFormValues,
  parseImportText,
  planImportCommit,
  summarizeImportPreview,
  type ImportLookupContext,
  type ParsedImportRow,
} from "./csv-import";
import { emptyJobFormValues, validateAndNormalize } from "./job-form";

const HEADER =
  "date,branch,orderNumber,customer,jobType,fenceType,qtyLf,revenue,labor,hours,ot,PANEL-6";

function csv(lines: string[]): string {
  return [HEADER, ...lines].join("\n");
}

function lookup(overrides?: Partial<ImportLookupContext>): ImportLookupContext {
  return {
    branchesByCode: new Map([
      ["MIA", { id: "branch-mia", code: "MIA" }],
      ["DAV", { id: "branch-dav", code: "DAV" }],
    ]),
    existingByKey: new Map(),
    employees: [{ id: "emp-1", name: "Carlos Rivera", nameKey: "carlos-rivera" }],
    items: [
      { id: "item-mia-panel", sku: "PANEL-6", branchId: "branch-mia", active: true },
      { id: "item-dav-panel", sku: "PANEL-6", branchId: "branch-dav", active: true },
    ],
    mode: "upsert",
    ...overrides,
  };
}

describe("parseImportText job-type map", () => {
  it("maps Install / Pickup / Drop and Daily Tracker aliases", () => {
    const parsed = parseImportText(
      csv([
        "2026-04-01,MIA,ORD-1,Acme,Install,6x10,100,100,,,,",
        "2026-04-02,MIA,ORD-2,Acme,Pickup,6x10,100,0,,,,",
        "2026-04-03,MIA,ORD-3,Acme,Drop,6x10,40,0,,,,",
        "2026-04-04,MIA,ORD-4,Acme,INST,6x10,100,100,,,,",
        "2026-04-05,MIA,ORD-5,Acme,PU,6x10,100,0,,,,",
        "2026-04-06,MIA,ORD-6,Acme,DELIVERY,6x10,40,0,,,,",
      ])
    );
    const mapped = parsed.rows.map((r) => [r.originalType, r.mappedType, r.status, r.jobType]);
    expect(mapped).toEqual([
      ["Install", "Install", "accept", "Install"],
      ["Pickup", "Pickup", "accept", "Pickup"],
      ["Drop", "Drop", "accept", "Drop"],
      ["INST", "Install", "accept", "Install"],
      ["PU", "Pickup", "accept", "Pickup"],
      ["DELIVERY", "Drop", "accept", "Drop"],
    ]);
  });

  it("maps SITE WALK / SITE-WALK / SITEWALK to Site Walk", () => {
    const parsed = parseImportText(
      csv([
        "2026-04-07,MIA,ORD-7,Acme,SITE WALK,,,0,,,,",
        "2026-04-08,MIA,ORD-8,Acme,SITE-WALK,,,0,,,,",
        "2026-04-09,MIA,ORD-9,Acme,SITEWALK,,,0,,,,",
        "2026-04-10,MIA,ORD-10,Acme,Site Walk,,,0,,,,",
      ])
    );
    const mapped = parsed.rows.map((r) => [r.originalType, r.mappedType, r.status, r.jobType]);
    expect(mapped).toEqual([
      ["SITE WALK", "Site Walk", "accept", "Site Walk"],
      ["SITE-WALK", "Site Walk", "accept", "Site Walk"],
      ["SITEWALK", "Site Walk", "accept", "Site Walk"],
      ["Site Walk", "Site Walk", "accept", "Site Walk"],
    ]);
  });

  it("rejects unknown codes and never stores Other for them", () => {
    const parsed = parseImportText(
      csv([
        "2026-04-01,MIA,ORD-1,Acme,SWLK,6x10,100,0,,,,",
        "2026-04-02,MIA,ORD-2,Acme,RELOCATE,6x10,100,0,,,,",
        "2026-04-03,MIA,ORD-3,Acme,REP,6x10,100,0,,,,",
      ])
    );
    expect(parsed.rows).toHaveLength(3);
    for (const row of parsed.rows) {
      expect(row.status).toBe("reject");
      expect(row.mappedType).toBeNull();
      expect(row.jobType).toBe("");
      expect(row.jobType).not.toBe("Other");
      expect(row.rejectReason).toMatch(/not coerced to Other/);
    }
  });

  it("maps explicit Other only when the cell says Other", () => {
    const parsed = parseImportText(csv(["2026-04-01,MIA,ORD-1,Acme,Other,6x10,0,0,,,,"]));
    expect(parsed.rows[0].status).toBe("accept");
    expect(parsed.rows[0].originalType).toBe("Other");
    expect(parsed.rows[0].mappedType).toBe("Other");
    expect(parsed.rows[0].jobType).toBe("Other");
  });

  it("rejects a blank job type instead of coercing to Other", () => {
    const parsed = parseImportText(csv(["2026-04-01,MIA,ORD-1,Acme,,6x10,100,0,,,,"]));
    expect(parsed.rows[0].status).toBe("reject");
    expect(parsed.rows[0].mappedType).toBeNull();
    expect(parsed.rows[0].jobType).not.toBe("Other");
    expect(parsed.rows[0].rejectReason).toMatch(/required/i);
  });
});

describe("evaluateImportRows + validator parity", () => {
  it("accepts a mapped INST row that the form would accept as Install", () => {
    const parsed = parseImportText(
      csv(["2026-04-01,MIA,ORD-1,Acme,INST,6x10,100,1850,Carlos Rivera,8,0,40"])
    );
    const [evaluated] = evaluateImportRows(parsed.rows, lookup());
    expect(evaluated.row.status).toBe("accept");
    expect(evaluated.row.mappedType).toBe("Install");
    expect(evaluated.payload?.jobType).toBe("Install");
    expect(evaluated.payload?.status).toBe("Active");
    expect(evaluated.payload?.qtyLf).toBe(100);
    expect(evaluated.materialData[0]?.quantity).toBe(40);

    const form = validateAndNormalize({
      ...emptyJobFormValues({ branchId: "branch-mia", date: "2026-04-01" }),
      orderNumber: "ORD-1",
      customer: "Acme",
      jobType: "Install",
      fenceType: "6x10",
      qtyLf: "100",
      revenue: "1850",
      labor: [{ employeeId: "emp-1", regularHours: 8, overtimeHours: 0 }],
      materials: [
        { inventoryItemId: "item-mia-panel", itemName: null, quantity: 40, notes: null },
      ],
    });
    expect(form.ok).toBe(true);
    if (form.ok && evaluated.payload) {
      expect(evaluated.payload.jobType).toBe(form.data.jobType);
      expect(evaluated.payload.qtyLf).toBe(form.data.qtyLf);
      expect(evaluated.payload.materials).toEqual(form.data.materials);
      expect(evaluated.payload.labor).toEqual(form.data.labor);
    }
  });

  it("rejects negative qtyLf with the same LF error as the job form", () => {
    const parsed = parseImportText(
      csv(["2026-04-01,MIA,ORD-1,Acme,Install,6x10,-5,100,,,,"])
    );
    const formValues = importRowToFormValues(parsed.rows[0], { branchId: "branch-mia" });
    const form = validateAndNormalize(formValues);
    expect(form.ok).toBe(false);
    if (!form.ok) expect(form.error).toMatch(/LF cannot be negative/i);

    const [evaluated] = evaluateImportRows(parsed.rows, lookup());
    expect(evaluated.row.status).toBe("reject");
    expect(evaluated.row.rejectReason).toBe(!form.ok ? form.error : "");
    expect(evaluated.row.message).toMatch(/LF cannot be negative/i);
    expect(evaluated.payload).toBeNull();

    const plan = planImportCommit(evaluateImportRows(parsed.rows, lookup()));
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.error).toMatch(/rejected row/);
  });

  it("still accepts blank, zero, and positive qtyLf when the form does", () => {
    const parsed = parseImportText(
      csv([
        "2026-04-01,MIA,ORD-BLANK,Acme,Other,,,0,,,,",
        "2026-04-02,MIA,ORD-ZERO,Acme,Other,6x10,0,0,,,,",
        "2026-04-03,MIA,ORD-POS,Acme,Install,6x10,100,10,,,,",
      ])
    );
    const evaluated = evaluateImportRows(parsed.rows, lookup());
    expect(evaluated.map((e) => e.row.status)).toEqual(["accept", "accept", "accept"]);
    expect(evaluated.map((e) => e.payload?.qtyLf)).toEqual([null, 0, 100]);
    expect(planImportCommit(evaluated).ok).toBe(true);
  });

  it("accepts Site Walk with empty fence/materials and 0-hour labor", () => {
    const parsed = parseImportText(
      csv(["2026-04-11,MIA,ORD-SW,Acme,SITE WALK,,,0,Carlos Rivera,0,0,"])
    );
    const [evaluated] = evaluateImportRows(parsed.rows, lookup());
    expect(evaluated.row.status).toBe("accept");
    expect(evaluated.payload?.jobType).toBe("Site Walk");
    expect(evaluated.payload?.fenceType).toBeNull();
    expect(evaluated.payload?.materials).toEqual([]);
    expect(evaluated.payload?.labor).toEqual([
      { employeeId: "emp-1", regularHours: 0, overtimeHours: 0 },
    ]);
    expect(evaluated.laborData).toEqual([
      { employeeId: "emp-1", regularHours: 0, overtimeHours: 0 },
    ]);
    expect(planImportCommit([evaluated]).ok).toBe(true);

    const formValues = importRowToFormValues(parsed.rows[0], {
      branchId: "branch-mia",
      laborEmployeeId: "emp-1",
    });
    const form = validateAndNormalize(formValues);
    expect(form.ok).toBe(true);
    if (form.ok) {
      expect(form.data.jobType).toBe("Site Walk");
      expect(form.data.labor).toHaveLength(1);
      expect(form.data.labor[0].regularHours).toBe(0);
    }
  });

  it("still drops 0-hour import labor on Install", () => {
    const parsed = parseImportText(
      csv(["2026-04-01,MIA,ORD-1,Acme,Install,6x10,100,0,Carlos Rivera,0,0,"])
    );
    const [evaluated] = evaluateImportRows(parsed.rows, lookup());
    expect(evaluated.row.status).toBe("accept");
    expect(evaluated.payload?.labor).toEqual([]);
    expect(evaluated.laborData).toEqual([]);
  });

  it("rejects the same bad qty the job form rejects", () => {
    const parsed = parseImportText(
      csv(["2026-04-01,MIA,ORD-1,Acme,Install,6x10,100,0,,,," + "-12"])
    );
    const formValues = importRowToFormValues(parsed.rows[0], {
      branchId: "branch-mia",
      materials: [
        { inventoryItemId: "item-mia-panel", itemName: null, quantity: -12, notes: null },
      ],
    });
    const form = validateAndNormalize(formValues);
    expect(form.ok).toBe(false);
    if (!form.ok) expect(form.error).toMatch(/negative/i);

    const [evaluated] = evaluateImportRows(parsed.rows, lookup());
    expect(evaluated.row.status).toBe("reject");
    expect(evaluated.row.rejectReason).toBe(!form.ok ? form.error : "");
    expect(evaluated.payload).toBeNull();
  });

  it("rejects unknown branch before commit", () => {
    const parsed = parseImportText(csv(["2026-04-01,XYZ,ORD-1,Acme,Install,6x10,100,0,,,,"]));
    const [evaluated] = evaluateImportRows(parsed.rows, lookup());
    expect(evaluated.row.status).toBe("reject");
    expect(evaluated.row.rejectReason).toMatch(/Unknown branch/);
  });

  it("rejects a second row with the same orderNumber + date", () => {
    const parsed = parseImportText(
      csv([
        "2026-04-01,MIA,ORD-1,Acme,Install,6x10,100,10,,,,",
        "2026-04-01,MIA,ORD-1,Acme,Pickup,6x10,100,0,,,,",
      ])
    );
    const evaluated = evaluateImportRows(parsed.rows, lookup());
    expect(evaluated[0].row.status).toBe("accept");
    expect(evaluated[1].row.status).toBe("reject");
    expect(evaluated[1].row.rejectReason).toMatch(/Duplicate orderNumber \+ date/);
  });

  it("marks existing jobs as update (or skip in skip_existing mode)", () => {
    const parsed = parseImportText(csv(["2026-04-01,MIA,ORD-1,Acme,Install,6x10,100,10,,,,"]));
    const existingByKey = new Map([
      [importIdentityKey("ORD-1", "2026-04-01"), { id: "job-1" }],
    ]);
    const upserted = evaluateImportRows(parsed.rows, lookup({ existingByKey }));
    expect(upserted[0].row.action).toBe("update");
    const skipped = evaluateImportRows(
      parsed.rows,
      lookup({ existingByKey, mode: "skip_existing" })
    );
    expect(skipped[0].row.status).toBe("accept");
    expect(skipped[0].row.action).toBe("skip");
  });
});

describe("preview summary + commit plan (all-or-nothing)", () => {
  it("counts accept / reject / create for Dutch's preview", () => {
    const parsed = parseImportText(
      csv([
        "2026-04-01,MIA,ORD-1,Acme,INST,6x10,100,10,,,,",
        "2026-04-02,MIA,ORD-2,Acme,SWLK,6x10,100,0,,,,",
      ])
    );
    const evaluated = evaluateImportRows(parsed.rows, lookup());
    const summary = summarizeImportPreview(evaluated.map((e) => e.row));
    expect(summary).toEqual({
      total: 2,
      accepted: 1,
      rejected: 1,
      create: 1,
      update: 0,
      skip: 0,
    });
  });

  it("refuses to plan a commit when any row is rejected", () => {
    const parsed = parseImportText(
      csv([
        "2026-04-01,MIA,ORD-1,Acme,Install,6x10,100,10,,,,",
        "2026-04-02,MIA,ORD-2,Acme,SWLK,6x10,100,0,,,,",
      ])
    );
    const evaluated = evaluateImportRows(parsed.rows, lookup());
    const plan = planImportCommit(evaluated);
    expect(plan.ok).toBe(false);
    if (!plan.ok) {
      expect(plan.error).toMatch(/rejected row/);
      expect(plan.error).toMatch(/Nothing was written/);
      expect(plan.rejected).toHaveLength(1);
      expect(plan.rejected[0].rowNumber).toBe(3);
    }
  });

  it("plans one write per accepted row when the batch is clean", () => {
    const parsed = parseImportText(
      csv([
        "2026-04-01,MIA,ORD-1,Acme,Install,6x10,100,10,,,,",
        "2026-04-02,MIA,ORD-2,Acme,PU,6x10,100,0,,,,",
      ])
    );
    const plan = planImportCommit(evaluateImportRows(parsed.rows, lookup()));
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.writes).toHaveLength(2);
      expect(plan.writes.map((w) => w.payload.jobType)).toEqual(["Install", "Pickup"]);
    }
  });
});

describe("commitImportWrites transaction", () => {
  it("applies every write inside the provided transaction", async () => {
    const parsed = parseImportText(
      csv([
        "2026-04-01,MIA,ORD-1,Acme,Install,6x10,100,10,,,,",
        "2026-04-02,MIA,ORD-2,Acme,Pickup,6x10,100,0,,,,",
      ])
    );
    const plan = planImportCommit(evaluateImportRows(parsed.rows, lookup()));
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    let inTxn = false;
    const applied: string[] = [];
    const result = await (async () => {
      inTxn = true;
      try {
        return await commitImportWrites(plan.writes, async () => {
          expect(inTxn).toBe(true);
          applied.push("ok");
          return "created";
        });
      } finally {
        inTxn = false;
      }
    })();
    expect(applied).toHaveLength(2);
    expect(result).toEqual({ created: 2, updated: 0, skipped: 0 });
  });

  it("propagates a hard failure so the caller transaction can roll back", async () => {
    const parsed = parseImportText(
      csv([
        "2026-04-01,MIA,ORD-1,Acme,Install,6x10,100,10,,,,",
        "2026-04-02,MIA,ORD-2,Acme,Pickup,6x10,100,0,,,,",
      ])
    );
    const plan = planImportCommit(evaluateImportRows(parsed.rows, lookup()));
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    const applied: number[] = [];
    let rolledBack = false;
    await expect(
      (async () => {
        try {
          return await commitImportWrites(plan.writes, async (write) => {
            applied.push(write.rowNumber);
            if (write.rowNumber === 3) throw new Error("hard fail");
            return "created";
          });
        } catch (e) {
          rolledBack = true;
          throw e;
        }
      })()
    ).rejects.toThrow("hard fail");
    expect(applied).toEqual([2, 3]);
    expect(rolledBack).toBe(true);
  });
});

describe("importRowToFormValues", () => {
  it("feeds the shared validator the mapped type, not the raw alias", () => {
    const row: ParsedImportRow = {
      rowNumber: 2,
      date: "2026-04-01",
      branchCode: "MIA",
      class: "EVENT",
      orderNumber: "ORD-1",
      customer: "Acme",
      address: null,
      city: null,
      jobType: "Install",
      originalType: "INST",
      mappedType: "Install",
      status: "accept",
      rejectReason: null,
      fenceType: "CL6",
      qtyLf: 50,
      screen: false,
      screenSku: null,
      notes: null,
      accountExec: null,
      revenue: 0,
      laborName: null,
      laborHours: 0,
      laborOt: 0,
      materials: [],
    };
    const values = importRowToFormValues(row, { branchId: "branch-mia" });
    expect(values.jobType).toBe("Install");
    expect(validateAndNormalize(values).ok).toBe(true);
    expect(
      validateAndNormalize({ ...values, jobType: row.originalType }).ok
    ).toBe(false);
  });
});
