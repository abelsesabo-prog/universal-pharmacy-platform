import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductIdentityKey } from '../server/services/invoiceProductResolver.js';

test('same generic with different brands remains a different product identity', () => {
  const panadol = buildProductIdentityKey({
    brandName: 'Panadol',
    genericName: 'Paracetamol',
    dosageForm: 'Tablet',
    strength: '500 mg'
  });
  const medipar = buildProductIdentityKey({
    brandName: 'Medipar',
    genericName: 'Paracetamol',
    dosageForm: 'Tablet',
    strength: '500 mg'
  });
  assert.notEqual(panadol, medipar);
});

test('same brand and generic with harmless formatting differences remain the same identity', () => {
  const a = buildProductIdentityKey({
    brandName: 'Panadol®',
    genericName: 'Paracetamol',
    dosageForm: 'Tablet',
    strength: '500 MG'
  });
  const b = buildProductIdentityKey({
    brandName: ' PANADOL ',
    genericName: 'paracetamol',
    dosageForm: 'tablet',
    strength: '500 mg'
  });
  assert.equal(a, b);
});

test('different prices do not create a new product identity', () => {
  const a = buildProductIdentityKey({
    brandName: 'Panadol', genericName: 'Paracetamol', dosageForm: 'Tablet', strength: '500 mg', sellingPrice: 1500
  });
  const b = buildProductIdentityKey({
    brandName: 'Panadol', genericName: 'Paracetamol', dosageForm: 'Tablet', strength: '500 mg', sellingPrice: 1700
  });
  assert.equal(a, b);
});
