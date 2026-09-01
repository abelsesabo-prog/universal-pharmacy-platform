# Universal Unit-of-Measure Contract

The Universal Pharmacy Platform stores inventory in one canonical base unit per product while allowing the same product to be sold through multiple UOMs.

## Product configuration

A UOM-enabled product has:

```json
{
  "baseUnit": "piece",
  "uomMatrix": [
    {
      "unit": "piece",
      "conversionToBase": 1,
      "sellingPrice": 250
    },
    {
      "unit": "pair",
      "conversionToBase": 2,
      "sellingPrice": 500
    },
    {
      "unit": "box",
      "conversionToBase": 100,
      "sellingPrice": 10000
    }
  ]
}
```

`conversionToBase` is the number of canonical inventory units consumed by one selected UOM.

`sellingPrice` is the selling price for one unit of the selected UOM. It is deliberately independent of `conversionToBase`; a box may be sold below or above the sum of its individual-unit prices.

## Transaction contract

A sale line may provide:

```json
{
  "productId": "...",
  "batchId": "...",
  "uom": "box",
  "quantity": 1
}
```

The server resolves the product UOM, calculates the canonical stock quantity, resolves the configured UOM price, and stores both commercial and inventory representations:

```text
uom            = box
quantity       = 1
conversionToBase = 100
baseQuantity   = 100
unitPrice      = 10000
lineTotal      = 10000
```

The stock movement receives `baseQuantity`, so one box consumes 100 canonical pieces. Existing stock protections continue to operate on that canonical quantity.

## Backward compatibility

Products without `baseUnit`/`uomMatrix` remain compatible with the legacy transaction contract. Their quantity is treated as the implicit base-unit quantity and the supplied transaction `unitPrice` remains authoritative.

## Validation rules

The UOM configuration must:

- define a non-empty `baseUnit` when UOM configuration is used;
- define at least one UOM entry;
- include the `baseUnit` in the matrix;
- give the `baseUnit` a `conversionToBase` of exactly `1`;
- use positive `conversionToBase` values;
- use non-negative `sellingPrice` values when a price is supplied;
- avoid duplicate UOM unit names.

When a configured UOM has a `sellingPrice`, the server treats that price as authoritative. A client-supplied price that differs is rejected instead of allowing a browser/client to alter the configured price.
