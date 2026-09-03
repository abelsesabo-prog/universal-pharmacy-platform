# Universal Pharmacy Platform

Universal multi-tenant pharmacy management platform with inventory, UOM-aware POS, purchasing/import, compliance, offline synchronization, finance foundations, and controlled paths toward broader business domains.

## Current architecture

```text
HTTP -> security middleware -> API routes -> authentication/tenant authorization
     -> controllers -> domain services -> MongoDB

Browser -> client shell -> authenticated API / offline outbox -> reconciliation
```

The browser client is served from `client/` by Express. Protected API requests use bearer JWT authentication. Tenant identity is established server-side and sensitive routes enforce authentication and role/scope rules.

## Implemented foundation

- Express API with security headers, explicit CORS policy, request correlation and bounded API/login throttling
- JWT authentication with bcrypt password verification
- Persistent users, tenants and tenant roles (`admin`, `manager`, `staff`)
- Tenant-scoped product, batch, stock, sales and audit operations
- Canonical product identity with generic + brand + dosage form + strength
- UOM matrix, base-unit invariants and server-authoritative UOM pricing/conversion
- Atomic batch receipt, stock movement recording and FEFO-style sale deduction
- Smart Invoice preview/import with CSV/TXT/XLSX/XLS/PDF/DOC/DOCX support and safety boundaries
- Offline IndexedDB outbox, authenticated synchronization, deterministic fingerprints, duplicate/conflict handling, bounded batches and retry policy
- Live multi-device offline reconciliation acceptance script
- TMDA quarantine/disposition lifecycle and clinical-safety evidence contracts
- Insurance eligibility/preauthorization/claim-batch workflow foundations
- Expiry watch and controlled inter-branch relocation workflow foundations
- Financial entries, payment reconciliation and immutable idempotent double-entry journals
- Accounting-policy and delegated-action enforcement foundations
- Provider-neutral EFD queue and integration boundaries
- Customer/supplier, complaint, notification, migration and recovery foundations
- Master POS and Smart Invoice workspaces
- Automated Node test suite and GitHub Actions CI

## Inventory rule

A catalog item is knowledge, not stock. Catalog installation creates product identities with zero stock. Real inventory enters through a validated batch receipt, which updates canonical stock and records the purchase movement. Stock reductions reject insufficient, expired or otherwise ineligible inventory.

## Development

Requirements: Node.js 20+

```bash
npm ci
npm test
npm start
```

Required production environment values are documented in `.env.example`. Live offline acceptance uses the credentials/token variables documented by `npm run acceptance:offline` and is intentionally separate from deterministic CI tests.

## Security

Never commit `.env` or production credentials. Product, batch, movement, finance, complaint, audit, offline and compliance operations must remain tenant-scoped. Sensitive delegated actions require a bounded scope and active authorization.

## Verification status

The integration branch is a validation branch for the UOM/main reconciliation. Its CI gate must remain green before promotion. Repository code is not treated as proof of a live external integration: NHIF/insurer, EFD, messaging, clinical knowledge sources and production recovery drills require real provider/device configuration and runtime evidence.

See:

- `docs/MASTER_PLAN_GAP_REGISTER.md` for the authoritative remaining-gap register.
- `docs/IMPLEMENTATION_AUDIT_V3.md` for the v3.0 implementation audit and definition of done.
- `docs/POS-MASTER-PLAN-COVERAGE.md` for cashier/POS coverage and explicit adapter gaps.
