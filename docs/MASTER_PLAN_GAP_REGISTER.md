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
- Master POS and Smart Invoice workspaces.
- Audit and branch foundations.

## Highest-priority gaps from the Master Plan

1. **Reasoning layer:** invoice/product decisions need an explicit, explainable decision contract rather than scattered heuristics.
2. **Offline synchronization:** IndexedDB/event-ledger synchronization is required by the plan and is not yet a complete universal sync subsystem.
3. **Human-system architecture:** the system/organ/tissue/cell model was previously conceptual; it is now represented by an executable architecture contract so domain boundaries can be tested and extended without creating duplicate state registries.
4. **Regulated pharmacy organs:** TMDA quarantine/disposal, interaction/allergy safety, NHIF workflow, expiry relocation and EFD integration remain implementation gaps.
5. **Universal business organs:** bookkeeping/expense reconciliation and customer complaint workflows need complete cross-business implementations and audit integration.
6. **Expansion organs:** EHR, laboratory, inpatient, enterprise wholesale, multi-warehouse logistics and migration remain future domain implementations.
7. **UI automation:** guided category-aware item entry, inline interaction and continuous focus need end-to-end browser verification and remaining adapters.

## Human architecture rule

The analogy is an architectural dependency rule, not a naming exercise:

`body -> system -> organ -> tissue -> cell`

A lower-level component owns its local state and exposes contracts upward. Higher-level organs coordinate; they do not create competing copies of product, batch, sale or financial truth. Cross-domain facts are linked by stable IDs/events and remain auditable.

## Next implementation order

1. Reasoning decision contract and invoice decision explanations.
2. Offline event ledger/synchronization contract.
3. TMDA quarantine and disposal organ.
4. Financial/complaint organs and cross-domain audit events.
5. Clinical safety/NHIF/EFD adapters.
6. Hospital, laboratory, enterprise and migration organs.
7. Browser-level acceptance verification of the complete Master Plan workflow.
