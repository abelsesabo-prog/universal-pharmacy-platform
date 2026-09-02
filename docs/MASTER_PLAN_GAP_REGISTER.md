# Master Plan Gap Register

## Source reconciliation

The recovered Master Plan/SRS copies were reviewed as one requirement set because the canonical recovery document explicitly records that `Master plan app.doc`, `Master plan app(1).doc`, `Light speed services txt.txt`, `Light speed services txt(1).txt`, and `busines management architect.doc` contain the same core SRS and additional directives, with no conflicting requirement found. The canonical recovery text preserves the requirement to model the platform like a human body composed of systems, organs, tissues and cells.

## Implemented core

- Multi-tenant product, batch, stock movement and sales foundations.
- UOM matrix and base-unit invariants.
- Canonical product identity with generic + brand + dosage form + strength.
- Same generic/different brand as distinct commercial products.
- Batch-level cost and inventory lot tracking.
- Atomic invoice import with existing-product resolution and tenant-scoped identity protection.
- Invoice row/file safety boundaries and automated tests.
- Explainable product/invoice reasoning decision contract.
- Offline event ledger and replay validation contracts with idempotency/lifecycle protection.
- IndexedDB offline outbox with authenticated batch synchronization, bounded batches, tenant/device isolation, deterministic event fingerprints and explicit conflict acknowledgements.
- Offline background-sync orchestration with service-worker wake-up signaling, feature detection, exponential retry/backoff, bounded attempts, and transient-vs-permanent HTTP failure classification.
- Master POS and Smart Invoice workspaces.
- Audit and branch foundations.
- Human-system executable anatomy contract.
- TMDA quarantine/disposal organ with tenant-scoped batch linkage, explicit reasons, controlled disposition lifecycle and authorization evidence.

## Highest-priority gaps from the Master Plan

1. **Offline synchronization:** client background orchestration is now implemented; remaining work is live multi-device reconciliation verification and production browser/service-worker acceptance testing.
2. **Regulated pharmacy organs:** interaction/allergy safety, NHIF workflow, expiry relocation and EFD integration remain implementation gaps; TMDA quarantine/disposal is now represented by an executable organ contract.
3. **Universal business organs:** bookkeeping/expense reconciliation and customer complaint workflows need complete cross-business implementations and audit integration.
4. **Expansion organs:** EHR, laboratory, inpatient, enterprise wholesale, multi-warehouse logistics and migration remain future domain implementations.
5. **UI automation:** guided category-aware item entry, inline interaction and continuous focus need end-to-end browser verification and remaining adapters.
6. **Production integration:** cross-domain audit/event emission and database transaction boundaries need live integration verification, including quarantine stock movements and finalized dispositions.

## Human architecture rule

The analogy is an architectural dependency rule, not a naming exercise:

`body -> system -> organ -> tissue -> cell`

A lower-level component owns its local state and exposes contracts upward. Higher-level organs coordinate; they do not create competing copies of product, batch, sale or financial truth. Cross-domain facts are linked by stable IDs/events and remain auditable.

## Next implementation order

1. Complete live multi-device reconciliation verification and browser/service-worker acceptance tests.
2. Add interaction/allergy safety, NHIF, expiry relocation and EFD adapters around canonical domain truth.
3. Implement financial/complaint organs with cross-domain audit events.
4. Add production integration tests for regulated stock, audit and transactional boundaries.
5. Implement hospital, laboratory, enterprise and migration organs.
6. Perform browser-level acceptance verification of the complete Master Plan workflow.
