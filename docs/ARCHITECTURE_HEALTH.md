# Architecture Health Gate

Last engineering review: 2026-09-03.

## Repaired and verified in the repository

- Security headers, explicit CORS and bounded API/login throttling
- Request correlation IDs on API responses and errors
- Persistent users/tenants with JWT identity verification
- Tenant-scoped product, batch, stock, sales, finance, complaint and audit operations
- Canonical MongoDB connection path
- Tenant-aware branch foundation with a default `MAIN` branch
- Atomic batch receipt with stock movement creation
- Branch-scoped inventory records
- FEFO-style sale deduction from eligible batches
- Split-tender payment validation
- Sale, sale-item, stock-movement and audit indexes
- Idempotent immutable double-entry journal foundation and trial-balance checks
- Accounting-policy validation and closed-period guards
- Bounded delegated-action authorization, including financial posting and delegation administration controls
- Smart Invoice import validation, safety boundaries and audit events
- Offline IndexedDB/event synchronization contracts, retry policy, deterministic fingerprints and conflict handling
- Live multi-device offline reconciliation acceptance on the integration branch
- TMDA quarantine/disposition lifecycle and clinical-safety evidence contracts
- Insurance workflow foundations, expiry watch and inter-branch relocation controls
- Express app factory for deterministic Node tests
- Static serving of the canonical `client/` browser shell
- Node test suite and GitHub Actions CI

## Documentation consistency repairs

Older architecture notes described `client/index.html` as empty and described the project as still being at the early Product/Batch foundation stage. Those statements no longer match the integration branch and have been removed from the active release guidance.

## Remaining production evidence gates

The following are intentionally not marked complete merely because repository contracts exist:

1. Browser/device-level authentication and offline/service-worker acceptance on target hardware.
2. Cross-tenant isolation and batch-receipt -> stock-movement -> FEFO-sale integration evidence against the production MongoDB deployment.
3. Live NHIF/insurer adapters and current provider acceptance evidence.
4. Live Tanzanian EFD device/network adapter and acceptance/certification evidence.
5. Production SMS/email provider configuration and delivery evidence.
6. Backup schedule, retention, restore drill, RPO/RTO and portable-export evidence.
7. Full statutory accounting policy: selected chart of accounts, current tax rules, approved periods and financial statements reconciled to journal truth.
8. Authoritative drug-interaction/allergy knowledge-source integration and clinical governance.
9. Historical-data-backed predictive expiry/relocation scoring with human confirmation.
10. Current statutory document templates and validation.

Later hospital, laboratory and enterprise domains remain roadmap phases rather than missing pharmacy-core modules.

## Release gate

A production release may be called complete only when the applicable repository tests are green **and** every external/evidence gate required by the selected deployment scope has a recorded runtime result. CI green means the repository contracts pass; it does not substitute for provider, device or operational acceptance.
