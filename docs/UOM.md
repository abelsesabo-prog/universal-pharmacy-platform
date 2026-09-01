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
uom              = box
quantity         = 1
conversionToBase = 100
baseQuantity     = 100
unitPrice        = 10000
lineTotal        = 10000
```

The stock movement receives `baseQuantity`, so one box consumes 100 canonical pieces. Existing stock protections continue to operate on that canonical quantity.

## POS workflow

`client/uom-pos.html` provides the selling workflow:

1. Select a product.
2. Select a batch.
3. Select the selling UOM.
4. Enter a selling-unit quantity.
5. Review the calculated base-unit consumption and UOM price.
6. Add the line to the cart.
7. Add additional UOM lines for the same or different products.
8. Complete the cart sale through the existing transaction endpoint.

The browser uses UOM data for display and preview, but the server remains authoritative for conversion and price enforcement.

## Product setup workflow

`client/uom-product.html` provides a simple UOM product setup screen that creates products through the normal product endpoint. Each sellable UOM is entered with its conversion to the base unit and an independent selling price.

Example examination gloves:

```text
piece = 1 base unit = TZS 250
pair  = 2 base units = TZS 500
box   = 100 base units = TZS 10,000
```

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
