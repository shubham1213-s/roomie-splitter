export const DEFAULT_ROOMMATE_IDS = ['alice', 'bob', 'charlie'];

export function toPaise(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return 0;
  }

  return Math.round((amount + Number.EPSILON) * 100);
}

export function formatCurrency(paise) {
  const safePaise = Number.isFinite(Number(paise)) ? Number(paise) : 0;
  const amount = safePaise / 100;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function splitExpense(totalPaise, roommateIds = DEFAULT_ROOMMATE_IDS) {
  if (!Number.isInteger(totalPaise) || totalPaise < 0) {
    throw new Error('Total paise must be a non-negative integer.');
  }

  const count = roommateIds.length || 1;
  const base = Math.floor(totalPaise / count);
  const remainder = totalPaise % count;

  const shares = Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));

  return Object.fromEntries(roommateIds.map((id, index) => [id, shares[index] || 0]));
}

export function calculateBalances(expenses, roommateIds = DEFAULT_ROOMMATE_IDS) {
  const balances = Object.fromEntries(roommateIds.map((id) => [id, 0]));

  expenses.forEach((expense) => {
    if (!expense || !expense.payerId) {
      return;
    }

    const payerId = expense.payerId;
    balances[payerId] = (balances[payerId] || 0) + Number(expense.amountPaise || 0);

    const shares = splitExpense(Number(expense.amountPaise || 0), roommateIds);

    roommateIds.forEach((id) => {
      balances[id] -= shares[id] || 0;
    });
  });

  return balances;
}

export function buildSettlementSuggestions(balances, roommateIds = DEFAULT_ROOMMATE_IDS) {
  const debtors = roommateIds
    .filter((id) => balances[id] < 0)
    .map((id) => ({ id, amountPaise: Math.abs(Number(balances[id] || 0)) }))
    .filter((entry) => entry.amountPaise > 0);

  const creditors = roommateIds
    .filter((id) => balances[id] > 0)
    .map((id) => ({ id, amountPaise: Number(balances[id] || 0) }))
    .filter((entry) => entry.amountPaise > 0);

  const suggestions = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountPaise = Math.min(debtor.amountPaise, creditor.amountPaise);

    if (amountPaise > 0) {
      suggestions.push({
        fromId: debtor.id,
        toId: creditor.id,
        amountPaise,
      });
    }

    debtor.amountPaise -= amountPaise;
    creditor.amountPaise -= amountPaise;

    if (debtor.amountPaise === 0) {
      debtorIndex += 1;
    }

    if (creditor.amountPaise === 0) {
      creditorIndex += 1;
    }
  }

  return suggestions;
}

export function getCategoryTotals(expenses) {
  return expenses.reduce((accumulator, expense) => {
    const category = expense.category || 'Other';
    accumulator[category] = (accumulator[category] || 0) + Number(expense.amountPaise || 0);
    return accumulator;
  }, {});
}

export function getMonthlyTotals(expenses) {
  const totals = new Map();

  expenses.forEach((expense) => {
    const date = new Date(expense.date || Date.now());
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    totals.set(key, (totals.get(key) || 0) + Number(expense.amountPaise || 0));
  });

  return Array.from(totals.entries())
    .map(([key, value]) => ({
      key,
      label: new Date(`${key}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      totalPaise: value,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function getHighestExpense(expenses) {
  return [...expenses].sort((left, right) => Number(right.amountPaise || 0) - Number(left.amountPaise || 0))[0] || null;
}
