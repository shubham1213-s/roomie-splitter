import { describe, expect, test } from 'vitest';
import {
  buildSettlementSuggestions,
  calculateBalances,
  splitExpense,
  toPaise,
} from './financial';

describe('RoomieSplit financial engine', () => {
  test('equal split of ₹900.00', () => {
    expect(splitExpense(90000, ['alice', 'bob', 'charlie'])).toEqual({
      alice: 30000,
      bob: 30000,
      charlie: 30000,
    });
  });

  test('split of ₹100.00 with leftover paise', () => {
    expect(splitExpense(10000, ['alice', 'bob', 'charlie'])).toEqual({
      alice: 3334,
      bob: 3333,
      charlie: 3333,
    });
  });

  test('split of ₹0.01', () => {
    expect(splitExpense(1, ['alice', 'bob', 'charlie'])).toEqual({
      alice: 1,
      bob: 0,
      charlie: 0,
    });
  });

  test('split of ₹0.02', () => {
    expect(splitExpense(2, ['alice', 'bob', 'charlie'])).toEqual({
      alice: 1,
      bob: 1,
      charlie: 0,
    });
  });

  test('recalculates balances after edits', () => {
    const expenses = [
      { payerId: 'alice', amountPaise: 90000 },
      { payerId: 'bob', amountPaise: 120000 },
    ];

    const balances = calculateBalances(expenses, ['alice', 'bob', 'charlie']);
    expect(balances).toEqual({
      alice: 20000,
      bob: 50000,
      charlie: -70000,
    });
  });

  test('identifies debtors and creditors correctly', () => {
    const balances = { alice: 15000, bob: -10000, charlie: -5000 };
    expect(buildSettlementSuggestions(balances, ['alice', 'bob', 'charlie'])).toEqual([
      { fromId: 'bob', toId: 'alice', amountPaise: 10000 },
      { fromId: 'charlie', toId: 'alice', amountPaise: 5000 },
    ]);
  });

  test('rejects invalid amounts', () => {
    expect(toPaise(0)).toBe(0);
    expect(toPaise(10.555)).toBe(1056);
  });
});
