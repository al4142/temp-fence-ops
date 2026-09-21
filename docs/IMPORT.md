# CSV import guide

Import daily work tickets from the Excel Daily Tracker (or any spreadsheet) into Jobs.

## Excel → CSV

1. Open the Daily Tracker workbook in Excel (or Google Sheets).
2. Select the sheet with one job per row.
3. **File → Save As → CSV UTF-8 (Comma delimited) (*.csv)**  
   (Google Sheets: **File → Download → Comma Separated Values**.)
4. Upload that file on **Admin → Import** (`/admin/import`).

Wide material grids from Excel are difficult to map automatically. For v1, import **core job fields**; optional SKU-named columns (e.g. `PANEL-6`) are linked when they match the branch inventory catalog. Otherwise materials stay empty for manual follow-up.

## Required columns

At least one header alias for each:

| Field | Example headers |
|-------|-----------------|
| date | `date`, `Job Date` |
| branch | `branch`, `yard` (use branch **code**: `MIA`, `DAV`) |
| orderNumber | `orderNumber`, `Order #`, `WO` |
| jobType | `jobType`, `Type`, `Txn` (values: `Install`, `Pickup`, `Drop`, `Other`, `Site Walk`; known aliases such as `INST` / `PU` / `DELIVERY` / `SITEWALK` map; **unknown codes reject the row** — never coerced to Other) |

## Optional columns

`class`, `customer`, `address`, `city`, `fenceType`, `qtyLf`, `screen` (Yes/No **or** a screen SKU such as `BLACK6`), `notes`, `accountExec`, `revenue`, `labor` / `assigned`, `hours`, `ot`.

Material columns whose header looks like a SKU (`PANEL-6`, `BASE-STD`) are treated as quantities for that SKU on the job’s branch.

## Dry-run and commit

1. Upload or paste CSV → **Dry-run / preview**.
2. Review mapped columns, per-row **original type / mapped type / accept|reject**, and create/update/skip.
3. Choose **Update (upsert)** or **Skip existing** for rows that already match `orderNumber + date`.
4. **Commit import** is one Postgres transaction: every accepted row is written, or the whole batch rolls back. Commit is refused while any row is rejected.

## Job-type map (import only)

The job **form** still accepts only Title Case `Install` / `Pickup` / `Drop` / `Other` / `Site Walk`. Import applies this alias table, then runs the same `validateAndNormalize` as the form:

| CSV / Excel value | Stored type | Inventory sign |
|-------------------|-------------|----------------|
| Install, INST, INSTALL | Install | outbound |
| Pickup, PU, PICK-UP, RETURN, RET | Pickup | inbound |
| Drop, DELIVERY, DEL | Drop | outbound |
| Other | Other | none |
| Site Walk, SITE WALK, SITE-WALK, SITEWALK | Site Walk | none |
| SWLK, RELOCATE, REP, MOVE, blank, anything else | **reject** | — |

## API shape for Dutch (preview)

`previewCsvImport` returns `{ ok: true, rows, summary, … }`:

```ts
rows[]: {
  rowNumber: number
  originalType: string          // raw CSV cell
  mappedType: "Install" | "Pickup" | "Drop" | "Other" | "Site Walk" | null
  status: "accept" | "reject"
  rejectReason: string | null
  action?: "create" | "update" | "skip" | "error"
  message?: string
  // plus parsed job fields (date, branchCode, orderNumber, …)
}

summary: {
  total: number
  accepted: number
  rejected: number
  create: number
  update: number
  skip: number
}
```

Commit (`commitCsvImport`) returns `{ ok: false, error }` if any row is rejected or the transaction rolls back. On success: `{ created, updated, skipped, errors: [], materialsNote }`.

## Sample

See [import-template.csv](import-template.csv).

## Limits (v1)

- Server-side parse only (no spreadsheet engine).
- Labor: at most one employee per row (matched by name or `nameKey`).
- Materials: only SKU-header columns that exist in that branch’s catalog are linked.
- Idempotency key: `orderNumber` + `date` (UTC date-only).
