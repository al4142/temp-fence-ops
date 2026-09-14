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
| jobType | `jobType`, `Type`, `Txn` (`INST`, `PU`, …) |

## Optional columns

`class`, `customer`, `address`, `city`, `fenceType`, `qtyLf`, `screen`, `notes`, `accountExec`, `revenue`, `labor` / `assigned`, `hours`, `ot`.

Material columns whose header looks like a SKU (`PANEL-6`, `BASE-STD`) are treated as quantities for that SKU on the job’s branch.

## Dry-run and commit

1. Upload or paste CSV → **Dry-run / preview**.
2. Review mapped columns, create/update/error actions, and row messages.
3. Choose **Update (upsert)** or **Skip existing** for rows that already match `orderNumber + date`.
4. **Commit import**. Summary reports created / updated / skipped / errors.

## Sample

See [import-template.csv](import-template.csv).

## Limits (v1)

- Server-side parse only (no spreadsheet engine).
- Labor: at most one employee per row (matched by name or `nameKey`).
- Materials: only SKU-header columns that exist in that branch’s catalog are linked.
- Idempotency key: `orderNumber` + `date` (UTC date-only).
