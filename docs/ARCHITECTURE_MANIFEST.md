# Universal Pharmacy Platform

# Architecture Manifest

Version: 0.1.0  
Status: Active  
Last Verified: 2026-08-09

---

## 1. Project Purpose

Universal Pharmacy Platform is a universal pharmacy management platform
designed to provide a modular foundation for pharmacy operations,
inventory, sales, purchasing, customers, suppliers, expenses,
auditability, and future business capabilities.

---

## 2. Architecture Principles

1. Modular domain-oriented architecture.
2. Clear separation between routes, controllers, services,
   validation, schemas, and persistence.
3. Shared definitions belong in `shared/`.
4. Database access belongs in the server/database layer.
5. Business logic belongs in services.
6. HTTP request/response handling belongs in controllers.
7. Routes expose API endpoints and delegate to controllers.
8. Validation occurs before persistence.
9. Production code must not depend on client-only code.
10. Architecture changes must be deliberate and documented.
11. Diagnostic systems may report problems but must not
    automatically rewrite production code.
12. Existing verified modules must remain stable when
    new modules are introduced.

---

## 3. Root Structure

```text
universal-pharmacy-platform/
├── client/
├── docker/
├── docs/
├── mobile/
├── server/
├── shared/
├── tests/
├── .env.example
├── .gitignore
├── LICENSE
├── package.json
└── README.md

---

## 4. Server Architecture

```text
server/
├── app.js
├── config/
├── controllers/
├── database/
├── middleware/
├── routes/
└── services/

---

## 5. Shared Architecture

```text
shared/
├── constants/
├── schemas/
├── types/
└── validators/

---

## 6. Current Database Collections

The current shared collection definitions include:

- `users`
- `branches`
- `products`
- `batches`
- `sales`
- `sale_items`
- `purchases`
- `purchase_items`
- `stock_movements`
- `customers`
- `suppliers`
- `expenses`
- `audit_logs`

---

## 7. Current Product Module

The Product module is the first verified business module.

### Product Request Flow

```text
POST /api/products
        ↓
Product Route
        ↓
Product Controller
        ↓
Product Service
        ↓
Product Validator
        ↓
Shared Product Schema
        ↓
MongoDB

---

## 8. Verified API

### Health API

```text
GET /api/health

---

## 9. Production Environment

Production platform:

`Render`

Production API:

`https://universal-pharmacy-platform.onrender.com`

Database:

`MongoDB`

---

## 10. Architecture Verification

The following have been verified in production:

- Express server starts successfully.
- Render detects the configured port.
- MongoDB connection succeeds.
- Health endpoint responds successfully.
- Product creation endpoint responds successfully.
- Product data persists in MongoDB.
- Product receives a generated database ID.
- Thunder Client successfully communicates with the API.

### Verified Product Test

A production Product API test successfully created:

- Brand name: `Panadol`
- Generic name: `Paracetamol`
- Dosage form: `Tablet`
- Category: `Analgesic`

The database returned a generated product ID.

---

## 11. Diagnostic System

A future Architecture Intelligence system will inspect:

- project structure
- files
- imports
- exports
- routes
- controllers
- services
- schemas
- validators
- database collections
- environment configuration
- dependency relationships

It will detect:

- broken imports
- missing exports
- orphaned modules
- route/controller mismatches
- controller/service mismatches
- service/database mismatches
- schema/validator inconsistencies
- missing required modules
- duplicate responsibilities
- invalid architectural relationships

The diagnostic system reports findings and recommended fixes.

It does not automatically modify production code.

---

## 12. Change Control

Before changing an existing verified module:

1. Identify the affected architecture.
2. Check dependencies.
3. Run relevant tests.
4. Make the smallest safe change.
5. Re-test the affected module.
6. Update this manifest if architecture changes.
7. Commit the change.
8. Deploy only after verification.

---

## 13. Current Development Position

### Completed

- project foundation
- server bootstrap
- configuration
- MongoDB connection
- API routing
- health controller
- shared schemas
- validators
- service foundation
- Product service
- Product controller
- Product routes
- production deployment
- Product API production verification

### Current Position

**Architecture Intelligence / Diagnostic Foundation**

### Next Business Module

**Batch / Inventory foundation**

---

## 14. Stability Rule

The existing verified architecture is the baseline.

New functionality must extend the architecture rather than
silently replace or duplicate existing architectural responsibilities.

Existing verified modules should not be refactored merely for
cosmetic reasons.

Architectural changes must have a documented reason and must
preserve previously verified functionality.