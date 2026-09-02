# Smart Invoice Import Contract

## Purpose

Smart Invoice Import converts supplier invoice files into validated product and stock records without allowing an unreviewed upload to mutate inventory.

## Pipeline

1. Authenticate the operator.
2. Upload a supported invoice.
3. Parse the file into normalized rows.
4. Validate every row without writing inventory.
5. Show the complete preview and validation result.
6. Select an active tenant branch.
7. Re-validate the submitted rows on the server.
8. Resolve an existing tenant product or create a new product.
9. Treat the product's configured UOM matrix as authoritative.
10. Convert received quantity to the product base unit.
11. Create the batch, increment product stock, and record a `PURCHASE` stock movement in one MongoDB transaction.
12. Record the invoice action in the audit trail.

## Safety invariants

- Tenant identity comes from the authenticated request, never from invoice data.
- Invoice size is limited to 10 MB and 1,000 rows.
- Product identity requires a brand or generic name.
- Batch number, positive quantity, valid non-expired expiry date, and positive UOM conversion are required.
- Existing product UOM configuration is authoritative; an invoice cannot silently redefine a configured conversion.
- Duplicate batch numbers are rejected within the target branch.
- A failed atomic commit must not leave partial product, batch, stock, or movement writes.
- Preview is read-only with respect to inventory.
- Secrets and passwords must remain outside Git; local/deployment environment configuration supplies authentication credentials.

## Supported input formats

CSV, TXT, XLSX, XLS, PDF, DOC, and DOCX.

## Normalized invoice fields

`brandName`, `genericName`, `dosageForm`, `category`, `strength`, `strengthUnit`, `manufacturer`, `barcode`, `batchNumber`, `quantity`, `uom`, `conversionToBase`, `expiryDate`, `costPrice`, `sellingPrice`.

## Verification matrix

Before production use, verify at minimum:

- valid CSV preview
- common supplier header aliases
- malformed rows
- expired stock rejection
- oversized file rejection
- more-than-1,000-row rejection
- existing product + configured UOM
- new product + new UOM
- invoice UOM conversion to base stock
- duplicate batch rejection
- multi-row failure rolls back earlier rows
- tenant isolation
- unauthorized upload/commit rejection
- audit trail after successful import
