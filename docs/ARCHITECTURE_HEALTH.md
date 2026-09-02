# Architecture Health Gate

Last engineering review: 2026-09-02.

## Repaired in the repository

- Security headers, explicit CORS and API throttling
- Dedicated login throttling
- Persistent users/tenants with JWT identity verification
- Tenant-scoped product operations
- Tenant-scoped audit logging
- Canonical MongoDB connection path; obsolete duplicate config connectors removed
- Tenant-aware branch foundation with a default `MAIN` branch
- Atomic batch receipt with stock movement creation
- Branch-scoped inventory records
- FEFO-style sale deduction from unexpired batches
- Split-tender payment totals validated server-side
- Sale, sale-item, stock-movement and audit indexes
- Node tests and GitHub Actions CI
- Express app factory for testability
- Static serving of the client directory
- Central product normalization reused by catalog installation
- Catalog client bearer-token support

## Important unresolved integration

The GitHub `client/index.html` was empty while a September 1 local development capture contained the larger POS/inventory frontend. That local capture was inspected independently. Its embedded JavaScript currently contains a syntax defect in the batch-response block: `const data =` is followed immediately by `if (!response.ok)`. Therefore the local frontend must be repaired before being promoted as the canonical repository frontend.

Do not overwrite the repository with an older frontend snapshot merely because it is available in historical conversation material. The canonical local file should be reconciled and syntax-checked first.

## Master-plan alignment

The master requirements specify offline IndexedDB/event synchronization, product/UOM intelligence, inventory and batch tracking, POS split tender, shift reconciliation, TMDA quarantine, interaction/allergy safety, insurance batching, expiry relocation, EFD integration, and future hospital/lab/enterprise domains. The repository now has stronger foundations for inventory and sales, but these advanced capabilities remain future implementation work.

## Release gate

A production release should not be called complete until:

1. the canonical frontend is reconciled into Git;
2. browser authentication is verified against protected API calls;
3. cross-tenant isolation is integration-tested with two tenants;
4. batch receipt -> stock movement -> FEFO sale is integration-tested against MongoDB;
5. expired/quarantined stock is blocked from sale;
6. CI is green;
7. production environment validation is confirmed.
