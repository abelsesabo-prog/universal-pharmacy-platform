# Master Plan Gap Register

## Baseline

The implementation target is `Universal_Multi_Tenant_Business_Optimization_Engine_Complete_Master_SRS_v3.0`. The body/system/organ/tissue/cell model is treated as an architectural dependency rule, not as a requirement to create literal body-part modules. Therefore names such as mouth, nose or blood are not missing modules unless a future domain specification explicitly requires them.

## Implemented core

- Multi-tenant product, batch, stock movement and sales foundations.
- UOM matrix and base-unit invariants.
- Canonical product identity with generic + brand + dosage form + strength.
- Batch-level cost and inventory lot tracking.
- Atomic invoice import with existing-product resolution and tenant-scoped identity protection.
- Invoice safety boundaries and automated tests.
- Explainable product/invoice reasoning contracts.
- IndexedDB offline outbox, authenticated synchronization, bounded batches, tenant/device isolation, deterministic fingerprints, conflicts and retry policy.
- Live multi-device offline reconciliation acceptance now passes on the target branch.
- Master POS and Smart Invoice workspaces.
- Audit and branch foundations.
- Human-system executable anatomy contract.
- TMDA quarantine/disposal lifecycle with controlled disposition evidence.
- Clinical safety contract for canonical-ingredient allergy and authoritative interaction evidence.
- Customer/supplier and complaint foundations.
- Financial entries, payment reconciliation and immutable journal posting foundation.
- Tenant provisioning/lifecycle, tenant-scoped export, notifications and migration/recovery planning foundations.
- Pharmacy completion workflows for insurance eligibility, preauthorization and claim batches.
- Expiry watch plus controlled inter-branch relocation planning/execution with transfer movement evidence.
- Provider-neutral EFD document queue with idempotency protection; vendor/network submission remains adapter work.
- Time-bound, scope-bound delegated-action records with optional value caps and revocation.
- Accounting policy hardening: supported currency/tax policy validation, exact minor-unit tax calculation, exchange-rate provenance fields and closed-period guards.
- Delegated-action route enforcement for financial posting, with explicit scopes and manager/system-admin delegation administration.

## Remaining gaps

### A. Production-grade integrations and evidence
- Real NHIF/insurer eligibility, authorization and claim submission adapters must be connected to the selected provider and validated against current official requirements.
- Real EFD device/network adapter must be connected and tested against the current Tanzanian fiscal-device requirements.
- SMS/email delivery adapters and automated shift-report dispatch need provider configuration and live acceptance evidence.
- Browser-level service-worker/offline acceptance still needs verification on the target devices and network failure modes.

### B. Financial and control hardening
- Full accounting policy remains: chart of accounts, complete statutory tax rules, approved financial period workflow and financial statements generated/reconciled from journal truth.
- Atomic cross-domain posting for sales/refunds/expenses/claims/quarantine write-offs still needs end-to-end wiring where database transaction support is required.
- Delegation enforcement still needs to be wired into every sensitive business action that permits delegation; the reusable enforcement boundary and financial routes are now implemented.
- Backup scheduling, retention, restore drills, RPO/RTO and portable export need production operational evidence.

### C. Pharmacy intelligence and regulatory depth
- A production knowledge-source integration for drug-drug interactions/allergies is still required; the current implementation deliberately refuses to invent clinical truth.
- Predictive expiry/relocation recommendations require historical demand data, a transparent scoring model and human confirmation.
- Statutory/regulatory document generation requires authoritative templates and current validation.
- OCR/AI assistance for image-only invoices remains optional enrichment and must never bypass server validation.

### D. Universal expansion roadmap
- Hospital: patient/EHR, triage/vitals, consultation, prescribing, lab/radiology dispatch, wards/beds, discharge and clinical insurance workflows.
- Laboratory: barcode specimen intake, chain of custody, test catalog/panels, analyzer adapters, result validation and authorized delivery.
- Retail/wholesale: parent/variant SKU, tiered pricing, credit/aging/repayment, multi-warehouse logistics, pick/pack and consignment.
- Enterprise analytics and forecasting remain future-phase capabilities.

## Definition-of-done rule

A requirement is not marked complete merely because a route or UI exists. Completion requires the canonical contract, correct architectural layer, normal/invalid/boundary tests, tenant isolation, auditability, failure/recovery behavior, target-device UX evidence and—where an external dependency exists—live adapter evidence. This follows the v3.0 SRS rule that repository implementation, automated verification and runtime evidence must agree.

## Current assessment

The branch has moved beyond the earlier ~95% pharmacy-core estimate. This pass closes concrete accounting-policy and delegation-control gaps without pretending that external provider integrations or production operational evidence exist. The remaining work is concentrated in provider adapters, complete accounting integration, comprehensive delegation wiring, production recovery evidence, clinical knowledge governance, and later hospital/laboratory/enterprise phases.
