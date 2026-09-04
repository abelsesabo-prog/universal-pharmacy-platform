# Master POS Plan Coverage

## Purpose
This document maps the Master Plan/SRS cashier requirements to the current implementation without treating adapter-backed features as complete before their runtime evidence exists.

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
- Local expense ledger for shift review while persistent accounting integration remains a separate completion gate.

## Smart Invoice Import

- Authenticated admin/manager-only invoice upload workspace.
- CSV, TXT, XLSX, XLS, PDF, DOC and DOCX input support.
- 10 MB file limit and 1,000-row import ceiling.
- Header alias detection for product, batch, quantity, UOM, conversion, expiry, cost and selling-price fields.
- Preview-first workflow: parsing/validation does not mutate inventory.
- Validation rejects missing product identity, batch number, quantity, expiry, invalid conversion and invalid prices.
- Commit revalidates submitted rows server-side before mutation.
- Existing products are matched within the authenticated tenant; new products can be created from valid invoice rows.
- Invoice quantities are converted to canonical base-unit stock before batch creation.
- Batch creation uses the existing transactional inventory service, which updates product stock and records the purchase movement.
- Invoice preview/import actions are written to the audit stream.

### Invoice safety boundary
The invoice importer is deliberately not an OCR/AI guessing engine. A scanned PDF with no extractable text, an ambiguous layout, or a row missing authoritative inventory fields remains a review/error case rather than silently creating stock. Future OCR/AI assistance may enrich the preview, but it must never bypass server validation or tenant/role controls.

## Backend guarantees already present

- Server-side UOM resolution and configured UOM price authority.
- Canonical base-quantity calculation for sales.
- Stock movement consumption in the canonical base unit.
- Payment validation that rejects overpayment.
- Batch creation checks product existence and duplicate batch numbers.
- Batch deletion protects transaction and stock-movement history.
- Invoice import requires authenticated tenant context and manager/admin role.
- Offline synchronization enforces tenant/device identity, sequence ordering, duplicate rejection, deterministic fingerprints, conflict handling and bounded retry behavior.
- Live multi-device offline reconciliation acceptance has passed on the target integration branch.
- Controlled inter-branch relocation planning/execution and transfer movement evidence are present in the pharmacy completion layer.

## Still requires dedicated backend adapters/workflows/evidence

- Persistent expense ledger and full reconciliation against payment wallets and journal truth.
- Automated SMS/email shift reports with a configured delivery provider.
- Digital signature/terminal-lock workflow where required by the deployment policy.
- Emergency delegated-action audit trail and any required identity-verification workflow.
- Authoritative drug-drug interaction and allergy knowledge-source integration plus clinical governance.
- NHIF/insurer eligibility, preauthorization and claim-batch submission against the selected live provider.
- EFD device/network integration and acceptance evidence.
- Historical-data-backed predictive expiry/relocation recommendations with human confirmation.
- OCR/AI extraction for image-only/scanned invoices where normal text extraction cannot recover authoritative rows.
- Browser/device-level offline/service-worker acceptance on the actual target hardware and network-failure scenarios.

## Safety rule

The browser may preview a sale or invoice, but authoritative UOM pricing, conversion, tenant scope, authorization and stock mutation remain server-side. A UI feature must not be described as production-complete until its required persistence/integration endpoint exists and the required runtime evidence is verified.
