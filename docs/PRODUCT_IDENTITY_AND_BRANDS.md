# Product Identity, Brand Variants, Inventory and Receipts

## Master-plan rule
A generic chemical description may have multiple legitimate brand marketing variants. Same generic does not mean same commercial product.

## Canonical identity
Product identity is tenant-scoped and includes the normalized brand name, generic name, dosage form and strength. Price is deliberately excluded from identity.

Therefore:
- Same generic + same strength/form + same brand => one product identity.
- Same generic + same strength/form + different brand => different product identities.
- Same product + different purchase price => same product, normally a different purchase batch/cost layer, not a duplicate product.
- Different tenant => separate product identity.

## Inventory model
One canonical product may own many batches. Each batch carries inventory-lot attributes such as batch number, expiry and purchase/cost information. UOM configuration belongs to the product and converts selling quantities into the base stock unit.

Example:

Paracetamol 500 mg
- Panadol: one product, many batches, its own pricing/cost history.
- Medipar: a separate product, many batches, its own pricing/cost history.

## Invoice import
Supplier invoice rows are normalized and resolved to an existing tenant product before a new product is created. A price difference alone must never create a duplicate product. A brand difference must not be collapsed merely because the generic is identical.

## Receipt / sale presentation
The commercial item actually sold must remain identifiable on the receipt: product/brand, selected UOM, quantity, unit price and line total. Generic identity remains available for search, clinical checks and grouping, but different brands must not be silently collapsed on the customer's receipt.

## Safety boundary
Duplicate-therapy/ingredient checks are a separate clinical concern from commercial product deduplication. Multiple brands containing the same active ingredient can legitimately exist in inventory while the POS clinical sentinel warns about ingredient duplication where required.
