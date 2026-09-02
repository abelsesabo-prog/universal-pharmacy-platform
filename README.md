# Universal Pharmacy Platform

Universal Multi-Tenant Business Optimization Engine for pharmacy operations, with a modular path toward inventory, POS, finance, compliance and broader business domains.

## Current architecture

```text
HTTP -> security middleware -> API routes -> authentication/tenant authorization -> controllers -> domain services -> MongoDB
```

The browser client is served from `client/` by Express. Protected API requests use bearer JWT authentication.

## Implemented foundation

- Express API with security headers, explicit CORS policy and request limits
- JWT authentication with bcrypt password verification
- Persistent users and tenants
- Role authorization (`admin`, `manager`, `staff`)
- Tenant-scoped product CRUD
- Tenant-scoped audit logging for product mutations
- RxNorm/RxNav catalog discovery and catalog-family installation
- Atomic batch receipt and stock movement operations
- Tenant-aware MongoDB indexes
- Node test suite and GitHub Actions CI

## Inventory rule

A catalog item is knowledge, not stock. Catalog installation creates product identities with zero stock. Real inventory enters through a batch receipt, which atomically creates the batch, increments product stock and records a `PURCHASE` stock movement. Stock reductions reject insufficient inventory.

## Development

Requirements: Node.js 20+

```bash
npm ci
npm test
npm start
```

Required production environment values are documented in `.env.example`.

## Security

Never commit `.env` or production credentials. Product, batch, movement and audit operations must remain tenant-scoped. The legacy product backfill requires an explicit tenant identifier and must not be run blindly.

## Roadmap

1. Reconcile the canonical local POS frontend into `client/index.html`.
2. Complete browser authentication/session integration.
3. Add branches and branch-level stock ownership.
4. Add sales and atomic FEFO stock deduction.
5. Add purchases, customers, suppliers and expenses.
6. Add quarantine/recall and compliance workflows.
7. Add financial ledger and reconciliation.
8. Add offline IndexedDB/event synchronization after server contracts stabilize.
9. Expand automated integration and security tests.

The architecture manifest and master requirements document remain the product authority. Planned capabilities must not be reported as implemented capabilities.
