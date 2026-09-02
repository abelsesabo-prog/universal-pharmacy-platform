# Master POS Plan Coverage

## Purpose
This document maps the Master Plan/SRS cashier requirements to the current implementation without pretending that an adapter-backed feature is already complete.

## Implemented in the master cashier shell
- Dual-pane POS: fast sale entry on the left, transaction workspace on the right.
- Continuous cashier focus: barcode/name search, product selection and focus return after adding a line.
- Smallest canonical inventory unit with variable selling UOMs and independent UOM prices.
- UOM reset to the product base unit after adding a line.
- Zero-stock and expired batches excluded from the active sale selector.
- Live line intelligence for selling UOM, price, base conversion, stock impact and line total.
- Batch-aware cart reservations to prevent exceeding available stock inside a draft cart.
- Per-line removal requires a written reason.
- Payment workspace with cash/mobile-money/card/insurance/credit choices and multi-payment allocation.
- Local foreign-currency conversion preview for TZS, USD, KES, UGX and EUR.
- NHIF/insurance split preview with configurable patient copay percentage.
- Customer/patient and insurance identifier fields.
- Expiry watch banner for batches approaching expiry.
- Offline state banner and local browser draft/catalog support.
- Local expense ledger for shift review while accounting persistence is still awaiting its dedicated endpoint.

## Smart Invoice Import
- Authenticated admin/manager-only invoice upload workspace.
- CSV, TXT, XLSX, XLS, PDF, DOC and DOCX input support.
- 10 MB file limit and 1,000-row import ceiling.
- Header alias detection for product, batch, quantity, UOM, conversion, expiry, cost and selling-price fields.
- Preview-first workflow: parsing/validation does not mutate inventory.
- Validation rejects missing product identity, batch number, quantity, expiry, invalid conversion and invalid prices.
- Commit revalidates the submitted rows server-side before mutation.
- Existing products are matched within the authenticated tenant; new products can be created from valid invoice rows.
- Invoice quantities are converted to canonical base-unit stock before batch creation.
- Batch creation uses the existing transactional inventory service, which updates product stock and records the purchase movement.
- Invoice preview/import actions are written to the audit stream.

### Invoice safety boundary
The invoice importer is deliberately not an OCR/AI guessing engine. A scanned PDF with no extractable text, an ambiguous layout, or a row missing authoritative inventory fields must remain a review/error case rather than silently creating stock. Future OCR/AI assistance may enrich the preview, but it must never bypass server validation or tenant/role controls.

## Backend guarantees already present
- Server-side UOM resolution and configured UOM price authority.
- Canonical base-quantity calculation for sales.
- Stock movement consumption in the canonical base unit.
- Payment validation that rejects overpayment.
- Batch creation checks product existence and duplicate batch numbers.
- Batch deletion protects transaction and stock-movement history.
- Invoice import requires authenticated tenant context and manager/admin role.

## Still requires dedicated backend adapters/workflows
- Persistent expense ledger and reconciliation against payment wallets.
- Automated SMS/email shift reports.
- Digital signature/terminal lock workflow.
- Emergency delegated-action audit trail and identity verification.
- Full drug-drug interaction and allergy knowledge engine.
- NHIF eligibility, pre-authorization and claim-batch submission.
- EFD device/network integration.
- Predictive expiry relocation recommendations and inter-branch execution.
- Full offline event queue replay/synchronization (the current shell provides offline UX/draft state, not a complete cloud sync protocol).
- OCR/AI extraction for image-only/scanned invoices where normal text extraction cannot recover rows.

## Safety rule
The browser may preview a sale or invoice, but authoritative UOM pricing, conversion, tenant scope and stock mutation remain server-side. A UI feature must not be described as production-complete until its required persistence/integration endpoint exists and is verified.
