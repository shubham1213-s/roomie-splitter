import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  CheckCircle2,
  DollarSign,
  Grid2x2,
  House,
  IndianRupee,
  LogOut,
  Menu,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import {
  buildSettlementSuggestions,
  calculateBalances,
  formatCurrency,
  getCategoryTotals,
  getMonthlyTotals,
  splitExpense,
  toPaise,
} from './lib/financial';
import './style.css';

const STORAGE_KEY = 'roomiesplit-state-v1';
const AUTH_KEY = 'roomiesplit-auth-v1';

const DEMO_ROOMMATES = [
  { id: 'alice', name: 'Aanya' },
  { id: 'bob', name: 'Vihaan' },
  { id: 'charlie', name: 'Ishita' },
];

function createDemoExpenses() {
  return [
    { id: 'exp-1', description: 'Weekly groceries', amountPaise: 8540, payerId: 'alice', category: 'Groceries', date: '2026-10-02T12:00:00.000Z', notes: 'Veggies, snacks and pantry refill', createdAt: '2026-10-02T12:00:00.000Z', updatedAt: '2026-10-02T12:00:00.000Z' },
    { id: 'exp-2', description: 'Electricity bill', amountPaise: 5430, payerId: 'bob', category: 'Utilities', date: '2026-10-05T10:00:00.000Z', notes: 'Monthly electricity', createdAt: '2026-10-05T10:00:00.000Z', updatedAt: '2026-10-05T10:00:00.000Z' },
    { id: 'exp-3', description: 'Internet plan', amountPaise: 2299, payerId: 'charlie', category: 'Internet', date: '2026-10-07T18:30:00.000Z', notes: 'Home Wi-Fi', createdAt: '2026-10-07T18:30:00.000Z', updatedAt: '2026-10-07T18:30:00.000Z' },
    { id: 'exp-4', description: 'Shared dinner', amountPaise: 3245, payerId: 'alice', category: 'Dining', date: '2026-10-09T20:45:00.000Z', notes: 'Dinner out with dessert', createdAt: '2026-10-09T20:45:00.000Z', updatedAt: '2026-10-09T20:45:00.000Z' },
    { id: 'exp-5', description: 'Cleaning supplies', amountPaise: 1680, payerId: 'charlie', category: 'Household', date: '2026-10-10T16:15:00.000Z', notes: 'Soap and sponges', createdAt: '2026-10-10T16:15:00.000Z', updatedAt: '2026-10-10T16:15:00.000Z' },
  ];
}

function createDemoSettlements() {
  return [
    { id: 'sett-1', fromId: 'bob', toId: 'alice', amountPaise: 4500, status: 'pending', createdAt: '2026-10-11T10:00:00.000Z', updatedAt: '2026-10-11T10:00:00.000Z' },
    { id: 'sett-2', fromId: 'charlie', toId: 'alice', amountPaise: 2800, status: 'confirmed', createdAt: '2026-10-09T09:00:00.000Z', updatedAt: '2026-10-09T09:00:00.000Z' },
  ];
}

function createDemoState() {
  return {
    householdName: 'Saffron Residency',
    currentUserId: 'alice',
    roommates: DEMO_ROOMMATES,
    expenses: createDemoExpenses(),
    settlements: createDemoSettlements(),
    user: { id: 'demo-user', name: 'Aarav', email: 'demo@roomiesplit.app', isDemo: true },
  };
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: House },
  { id: 'expenses', label: 'Expenses', icon: ReceiptText },
  { id: 'balances', label: 'Balances', icon: DollarSign },
  { id: 'settlements', label: 'Settlements', icon: ArrowLeftRight },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'roommates', label: 'Roommates', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function readStoredState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDemoState();
    const parsed = JSON.parse(raw);
    return {
      ...createDemoState(),
      ...parsed,
      roommates: Array.isArray(parsed.roommates) && parsed.roommates.length ? parsed.roommates : DEMO_ROOMMATES,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : createDemoExpenses(),
      settlements: Array.isArray(parsed.settlements) ? parsed.settlements : createDemoSettlements(),
    };
  } catch {
    return createDemoState();
  }
}

function readStoredAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : { isAuthenticated: false, user: null };
  } catch {
    return { isAuthenticated: false, user: null };
  }
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getRoommateName(roommates, roommateId) {
  return roommates.find((roommate) => roommate.id === roommateId)?.name || 'Unknown';
}

function App() {
  const [state, setState] = useState(readStoredState);
  const [auth, setAuth] = useState(readStoredAuth);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: 'Aarav', email: 'demo@roomiesplit.app', password: 'demo123' });
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', payerId: 'alice', category: 'Groceries', notes: '', date: new Date().toISOString().slice(0, 10) });
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseError, setExpenseError] = useState('');
  const [filters, setFilters] = useState({ search: '', category: 'All', payer: 'All' });

  const roommateIds = useMemo(() => state.roommates.map((roommate) => roommate.id), [state.roommates]);
  const roomNameMap = useMemo(() => Object.fromEntries(state.roommates.map((roommate) => [roommate.id, roommate.name])), [state.roommates]);
  const balances = useMemo(() => calculateBalances(state.expenses, roommateIds), [state.expenses, roommateIds]);
  const settlementSuggestions = useMemo(() => buildSettlementSuggestions(balances, roommateIds), [balances, roommateIds]);
  const currentUserId = state.currentUserId || roommateIds[0];
  const currentUserBalance = balances[currentUserId] || 0;
  const totalSharedSpend = state.expenses.reduce((sum, expense) => sum + Number(expense.amountPaise || 0), 0);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }, [auth]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const categoryTotals = useMemo(() => getCategoryTotals(state.expenses), [state.expenses]);
  const monthlyTotals = useMemo(() => getMonthlyTotals(state.expenses), [state.expenses]);
  const recentExpenses = useMemo(() => [...state.expenses].sort((left, right) => new Date(right.date) - new Date(left.date)).slice(0, 4), [state.expenses]);

  const filteredExpenses = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return [...state.expenses]
      .filter((expense) => {
        const matchesSearch = !query || expense.description.toLowerCase().includes(query) || (expense.notes || '').toLowerCase().includes(query);
        const matchesCategory = filters.category === 'All' || expense.category === filters.category;
        const matchesPayer = filters.payer === 'All' || expense.payerId === filters.payer;
        return matchesSearch && matchesCategory && matchesPayer;
      })
      .sort((left, right) => new Date(right.date) - new Date(left.date));
  }, [filters, state.expenses]);

  const owedToUser = settlementSuggestions.filter((suggestion) => suggestion.toId === currentUserId).reduce((sum, suggestion) => sum + Number(suggestion.amountPaise || 0), 0);
  const userOwes = settlementSuggestions.filter((suggestion) => suggestion.fromId === currentUserId).reduce((sum, suggestion) => sum + Number(suggestion.amountPaise || 0), 0);

  function handleAuthSubmit(event) {
    event.preventDefault();
    setAuth({
      isAuthenticated: true,
      user: {
        id: 'demo-user',
        name: authForm.name.trim() || 'Demo User',
        email: authForm.email.trim() || 'demo@roomiesplit.app',
        isDemo: true,
      },
    });
    setToast('Signed in successfully');
    setActivePage('dashboard');
  }

  function handleLogout() {
    setAuth({ isAuthenticated: false, user: null });
    setToast('Logged out');
  }

  function handleExpenseSubmit(event) {
    event.preventDefault();
    const amount = Number(expenseForm.amount);

    if (!expenseForm.description.trim()) {
      setExpenseError('Description is required before saving.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setExpenseError('Enter a valid positive amount.');
      return;
    }

    const amountPaise = toPaise(amount);
    const nextExpense = {
      id: editingExpenseId || `expense-${Date.now()}`,
      description: expenseForm.description.trim(),
      amountPaise,
      payerId: expenseForm.payerId || currentUserId,
      category: expenseForm.category || 'Other',
      notes: expenseForm.notes.trim(),
      date: expenseForm.date ? new Date(`${expenseForm.date}T12:00:00`).toISOString() : new Date().toISOString(),
      createdAt: editingExpenseId ? state.expenses.find((expense) => expense.id === editingExpenseId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setState((previous) => {
      const withoutTarget = previous.expenses.filter((expense) => expense.id !== editingExpenseId);
      const nextExpenses = editingExpenseId ? [nextExpense, ...withoutTarget] : [nextExpense, ...previous.expenses];
      return { ...previous, expenses: nextExpenses.sort((left, right) => new Date(right.date) - new Date(left.date)) };
    });

    setExpenseForm({ description: '', amount: '', payerId: currentUserId, category: 'Groceries', notes: '', date: new Date().toISOString().slice(0, 10) });
    setEditingExpenseId(null);
    setExpenseError('');
    setToast(editingExpenseId ? 'Expense updated' : 'Expense added');
    setActivePage('expenses');
  }

  function handleEditExpense(expense) {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      description: expense.description,
      amount: (Number(expense.amountPaise || 0) / 100).toFixed(2),
      payerId: expense.payerId,
      category: expense.category,
      notes: expense.notes || '',
      date: new Date(expense.date).toISOString().slice(0, 10),
    });
    setExpenseError('');
    setActivePage('expenses');
  }

  function handleDeleteExpense(expenseId) {
    const target = state.expenses.find((expense) => expense.id === expenseId);
    if (!target) return;
    if (!window.confirm(`Delete “${target.description}”?`)) return;
    setState((previous) => ({ ...previous, expenses: previous.expenses.filter((expense) => expense.id !== expenseId) }));
    setToast('Expense deleted');
  }

  function handleRoommateSave() {
    const nextRoommates = state.roommates.map((roommate, index) => ({
      ...roommate,
      name: document.getElementById(`roommate-name-${index}`)?.value?.trim() || roommate.name,
    }));
    setState((previous) => ({ ...previous, roommates: nextRoommates }));
    setToast('Roommate names updated');
    setActivePage('roommates');
  }

  function handleResetDemoData() {
    setState(createDemoState());
    setToast('Demo data restored');
    setActivePage('dashboard');
  }

  function handleSettlementConfirm(settlementId) {
    setState((previous) => ({ ...previous, settlements: previous.settlements.map((settlement) => settlement.id === settlementId ? { ...settlement, status: 'confirmed', updatedAt: new Date().toISOString() } : settlement) }));
    setToast('Settlement marked as paid');
  }

  function renderDashboard() {
    const topCategory = Object.entries(categoryTotals).sort((left, right) => right[1] - left[1])[0];
    const maxMonthly = Math.max(...monthlyTotals.map((entry) => entry.totalPaise), 1);

    return (
      <>
        <section className="dashboard-hero panel">
          <div>
            <div className="section-kicker">HOUSEHOLD OVERVIEW</div>
            <h2>{state.householdName}</h2>
          </div>
          <div className="hero-meta">
            <span className="hero-badge">{state.expenses.length} expenses</span>
            <span className="hero-badge subtle">{state.roommates.length} roommates</span>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card primary-card">
            <div className="stat-head">
              <span className="eyebrow">Total shared spending</span>
              <span className="icon-wrap green"><IndianRupee size={16} /></span>
            </div>
            <div className="stat-value">{formatCurrency(totalSharedSpend)}</div>
            <div className="stat-meta">{state.expenses.length} recorded entries</div>
          </article>

          <article className="stat-card">
            <div className="stat-head">
              <span className="eyebrow">Current net balance</span>
              <span className="icon-wrap purple"><Wallet size={16} /></span>
            </div>
            <div className={'stat-value ' + (currentUserBalance > 0 ? 'positive' : currentUserBalance < 0 ? 'negative' : '')}>{currentUserBalance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(currentUserBalance))}</div>
            <div className="stat-meta">{currentUserBalance >= 0 ? 'You are owed' : 'You owe'} </div>
          </article>

          <article className="stat-card">
            <div className="stat-head">
              <span className="eyebrow">Amount owed to you</span>
              <span className="icon-wrap yellow"><CheckCircle2 size={16} /></span>
            </div>
            <div className="stat-value positive">+{formatCurrency(owedToUser)}</div>
            <div className="stat-meta">Across the household</div>
          </article>

          <article className="stat-card">
            <div className="stat-head">
              <span className="eyebrow">Amount you owe</span>
              <span className="icon-wrap red"><ArrowLeftRight size={16} /></span>
            </div>
            <div className="stat-value negative">-{formatCurrency(userOwes)}</div>
            <div className="stat-meta">Based on current balances</div>
          </article>
        </section>

        <section className="dashboard-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <div className="section-kicker">RECENT ACTIVITY</div>
                <h2>Latest expenses</h2>
              </div>
              <button className="ghost-button" onClick={() => setActivePage('expenses')}>View all</button>
            </div>
            <div className="recent-list">
              {recentExpenses.map((expense) => (
                <div className="recent-item" key={expense.id}>
                  <div className="badge-icon">{expense.category.slice(0, 1)}</div>
                  <div className="recent-content">
                    <div className="recent-title">{expense.description}</div>
                    <div className="recent-meta">{roomNameMap[expense.payerId]} • {formatDate(expense.date)}</div>
                  </div>
                  <div className="recent-amount">{formatCurrency(expense.amountPaise)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <div className="section-kicker">CATEGORIES</div>
                <h2>Spending breakdown</h2>
              </div>
            </div>
            {Object.entries(categoryTotals).length === 0 ? <div className="empty-state">No category data yet.</div> : (
              <div className="category-list">
                {Object.entries(categoryTotals).sort((left, right) => right[1] - left[1]).map(([category, totalPaise]) => (
                  <div key={category} className="category-item">
                    <div className="category-row"><span>{category}</span><strong>{formatCurrency(totalPaise)}</strong></div>
                    <div className="bar-track"><span className="bar-fill" style={{ width: `${(totalPaise / Math.max(...Object.values(categoryTotals), 1)) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
            {topCategory ? <div className="chip-box">Top category: {topCategory[0]}</div> : null}
          </div>
        </section>

        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">MONTHLY VIEW</div>
              <h2>Spending over time</h2>
            </div>
          </div>
          <div className="chart-grid">
            {monthlyTotals.length === 0 ? <div className="empty-state">No monthly data yet.</div> : monthlyTotals.map((entry) => (
              <div className="chart-column" key={entry.key}>
                <div className="bar-container"><span className="chart-bar" style={{ height: `${(entry.totalPaise / maxMonthly) * 100}%` }} /></div>
                <div className="chart-label">{entry.label}</div>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderExpenses() {
    return (
      <>
        <div className="toolbar">
          <div className="toolbar-search">
            <Search size={16} />
            <input type="text" placeholder="Search expenses" value={filters.search} onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))} />
          </div>
          <div className="toolbar-actions">
            <select value={filters.category} onChange={(event) => setFilters((previous) => ({ ...previous, category: event.target.value }))}>
              <option value="All">All categories</option>
              {['Groceries', 'Utilities', 'Internet', 'Dining', 'Household', 'Other'].map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select value={filters.payer} onChange={(event) => setFilters((previous) => ({ ...previous, payer: event.target.value }))}>
              <option value="All">All payers</option>
              {state.roommates.map((roommate) => <option key={roommate.id} value={roommate.id}>{roommate.name}</option>)}
            </select>
            <button className="primary-button" type="button" onClick={() => { setEditingExpenseId(null); setExpenseError(''); setExpenseForm({ description: '', amount: '', payerId: currentUserId, category: 'Groceries', notes: '', date: new Date().toISOString().slice(0, 10) }); }}>
              <Plus size={16} /> Add Expense
            </button>
          </div>
        </div>

        <div className="panel expense-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">SHARED BILLS</div>
              <h2>Expense ledger</h2>
            </div>
          </div>

          <form className="expense-form" onSubmit={handleExpenseSubmit}>
            <div className="form-grid">
              <label>
                <span>Description</span>
                <input type="text" value={expenseForm.description} onChange={(event) => setExpenseForm((previous) => ({ ...previous, description: event.target.value }))} placeholder="Weekly groceries" />
              </label>
              <label>
                <span>Amount</span>
                <input type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm((previous) => ({ ...previous, amount: event.target.value }))} placeholder="0.00" />
              </label>
              <label>
                <span>Payer</span>
                <select value={expenseForm.payerId} onChange={(event) => setExpenseForm((previous) => ({ ...previous, payerId: event.target.value }))}>
                  {state.roommates.map((roommate) => <option key={roommate.id} value={roommate.id}>{roommate.name}</option>)}
                </select>
              </label>
              <label>
                <span>Category</span>
                <select value={expenseForm.category} onChange={(event) => setExpenseForm((previous) => ({ ...previous, category: event.target.value }))}>
                  {['Groceries', 'Utilities', 'Internet', 'Dining', 'Household', 'Transport', 'Other'].map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label>
                <span>Date</span>
                <input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm((previous) => ({ ...previous, date: event.target.value }))} />
              </label>
              <label className="notes-field">
                <span>Notes</span>
                <input type="text" value={expenseForm.notes} onChange={(event) => setExpenseForm((previous) => ({ ...previous, notes: event.target.value }))} placeholder="Optional context" />
              </label>
            </div>

            {expenseError ? <div className="error-box">{expenseError}</div> : null}
            <div className="form-actions">
              <button type="submit" className="primary-button">{editingExpenseId ? 'Update expense' : 'Save expense'}</button>
              {editingExpenseId ? <button type="button" className="ghost-button" onClick={() => { setEditingExpenseId(null); setExpenseError(''); setExpenseForm({ description: '', amount: '', payerId: currentUserId, category: 'Groceries', notes: '', date: new Date().toISOString().slice(0, 10) }); }}>Cancel</button> : null}
            </div>
          </form>

          <div className="expense-list-table">
            {filteredExpenses.length === 0 ? <div className="empty-state">No matching expenses found.</div> : filteredExpenses.map((expense) => (
              <div className="expense-row" key={expense.id}>
                <div className="expense-main">
                  <div className="badge-icon">{expense.category.slice(0, 1)}</div>
                  <div>
                    <div className="expense-name">{expense.description}</div>
                    <div className="expense-subtext">{roomNameMap[expense.payerId]} • {formatDate(expense.date)}</div>
                  </div>
                </div>
                <div className="expense-meta">{expense.category}</div>
                <div className="expense-amount">{formatCurrency(expense.amountPaise)}</div>
                <div className="expense-actions">
                  <button className="small-button" type="button" onClick={() => handleEditExpense(expense)}><Pencil size={14} /></button>
                  <button className="small-button danger" type="button" onClick={() => handleDeleteExpense(expense.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  function renderBalances() {
    return (
      <div className="balances-layout">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">WHO OWES WHAT</div>
              <h2>Balance sheet</h2>
            </div>
          </div>
          <div className="roommate-grid">
            {state.roommates.map((roommate) => (
              <div key={roommate.id} className={`roommate-card roommate-${roommate.id}`}>
                <div className="roommate-topline">
                  <div className={`mini-avatar avatar-${roommate.id}`}>{roommate.name.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div className="roommate-name">{roommate.name}</div>
                    <div className="roommate-subtext">{balances[roommate.id] >= 0 ? 'Should receive' : 'Owes'} </div>
                  </div>
                </div>
                <div className={'roommate-balance ' + (balances[roommate.id] > 0 ? 'positive' : balances[roommate.id] < 0 ? 'negative' : '')}>{balances[roommate.id] >= 0 ? '+' : '-'}{formatCurrency(Math.abs(balances[roommate.id]))}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">SETTLEMENT PLAN</div>
              <h2>Suggested transfers</h2>
            </div>
          </div>
          {settlementSuggestions.length === 0 ? <div className="empty-state">No outstanding balances to settle.</div> : (
            <div className="settlement-list">
              {settlementSuggestions.map((suggestion) => (
                <div className="settlement-item" key={`${suggestion.fromId}-${suggestion.toId}-${suggestion.amountPaise}`}>
                  <div className="settlement-stripe" />
                  <div className="settlement-copy">
                    <strong>{getRoommateName(state.roommates, suggestion.fromId)}</strong>
                    <span>pays</span>
                    <strong>{getRoommateName(state.roommates, suggestion.toId)}</strong>
                  </div>
                  <div className="settlement-value">{formatCurrency(suggestion.amountPaise)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderSettlements() {
    const liveSuggestions = settlementSuggestions.map((suggestion, index) => ({
      id: `suggestion-${suggestion.fromId}-${suggestion.toId}-${index}`,
      fromId: suggestion.fromId,
      toId: suggestion.toId,
      amountPaise: suggestion.amountPaise,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const visibleSettlements = [
      ...state.settlements,
      ...liveSuggestions.filter((suggestion) => !state.settlements.some((existing) => existing.fromId === suggestion.fromId && existing.toId === suggestion.toId && existing.amountPaise === suggestion.amountPaise)),
    ];

    return (
      <div className="panel">
        <div className="panel-heading">
          <div>
            <div className="section-kicker">PAYMENTS</div>
            <h2>Settlement history</h2>
          </div>
        </div>
        <div className="settlement-history">
          {visibleSettlements.length === 0 ? <div className="empty-state">No settlement records yet.</div> : visibleSettlements.map((settlement) => (
            <div key={settlement.id} className="history-item">
              <div className="history-copy">
                <strong>{getRoommateName(state.roommates, settlement.fromId)}</strong>
                <span>→</span>
                <strong>{getRoommateName(state.roommates, settlement.toId)}</strong>
                <small>{formatCurrency(settlement.amountPaise)}</small>
              </div>
              <div className="history-actions">
                <span className={`status-pill ${settlement.status === 'confirmed' ? 'confirmed' : 'pending'}`}>{settlement.status}</span>
                {settlement.status !== 'confirmed' ? <button className="primary-button small" type="button" onClick={() => handleSettlementConfirm(settlement.id)}>Mark paid</button> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderAnalytics() {
    const categoryEntries = Object.entries(categoryTotals).sort((left, right) => right[1] - left[1]);
    const totalSpent = state.expenses.reduce((sum, expense) => sum + Number(expense.amountPaise || 0), 0);
    const averageExpense = state.expenses.length ? totalSpent / state.expenses.length : 0;
    const largestExpense = [...state.expenses].sort((left, right) => Number(right.amountPaise) - Number(left.amountPaise))[0];

    return (
      <div className="analytics-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">AT A GLANCE</div>
              <h2>Key metrics</h2>
            </div>
          </div>
          <div className="metric-grid">
            <div className="metric-box"><span>Total spending</span><strong>{formatCurrency(totalSpent)}</strong></div>
            <div className="metric-box"><span>Average bill</span><strong>{formatCurrency(averageExpense)}</strong></div>
            <div className="metric-box"><span>Largest bill</span><strong>{largestExpense ? formatCurrency(largestExpense.amountPaise) : '₹0.00'}</strong></div>
            <div className="metric-box"><span>Categories</span><strong>{categoryEntries.length}</strong></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">CATEGORIES</div>
              <h2>Category totals</h2>
            </div>
          </div>
          <div className="analytics-list">
            {categoryEntries.length === 0 ? <div className="empty-state">No analytics available yet.</div> : categoryEntries.map(([category, totalPaise]) => (
              <div key={category} className="analytics-row">
                <span>{category}</span>
                <strong>{formatCurrency(totalPaise)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderRoommates() {
    return (
      <div className="panel">
        <div className="panel-heading">
          <div>
            <div className="section-kicker">HOUSEHOLD</div>
            <h2>Roommates</h2>
          </div>
        </div>
        <div className="roommate-form-list">
          {state.roommates.map((roommate, index) => (
            <div key={roommate.id} className="roommate-field">
              <label>{index + 1}. {roommate.id === currentUserId ? 'Current user' : 'Roommate'}</label>
              <input id={`roommate-name-${index}`} defaultValue={roommate.name} />
            </div>
          ))}
          <button className="primary-button" type="button" onClick={handleRoommateSave}>Save names</button>
        </div>
      </div>
    );
  }

  function renderSettings() {
    return (
      <div className="panel">
        <div className="panel-heading">
          <div>
            <div className="section-kicker">APP SETTINGS</div>
            <h2>Household preferences</h2>
          </div>
        </div>
        <div className="settings-list">
          <label>
            <span>Household name</span>
            <input type="text" value={state.householdName} onChange={(event) => setState((previous) => ({ ...previous, householdName: event.target.value }))} />
          </label>
          <label>
            <span>Currency</span>
            <input type="text" readOnly value="INR (₹)" />
          </label>
          <button className="primary-button" type="button" onClick={handleResetDemoData}>Restore demo data</button>
        </div>
      </div>
    );
  }

  const pageContent = (() => {
    switch (activePage) {
      case 'expenses': return renderExpenses();
      case 'balances': return renderBalances();
      case 'settlements': return renderSettlements();
      case 'analytics': return renderAnalytics();
      case 'roommates': return renderRoommates();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  })();

  if (!auth.isAuthenticated) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-badge"><ShieldCheck size={18} /></div>
          <div className="auth-header">
            <div className="auth-logo"><Wallet size={24} /></div>
            <div>
              <div className="section-kicker">ROOMIESPLIT</div>
              <h1>Shared living, simplified.</h1>
            </div>
          </div>

          <div className="auth-tabs">
            <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Sign in</button>
            <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Create account</button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' ? <label><span>Full name</span><input type="text" value={authForm.name} onChange={(event) => setAuthForm((previous) => ({ ...previous, name: event.target.value }))} /></label> : null}
            <label><span>Email</span><input type="email" value={authForm.email} onChange={(event) => setAuthForm((previous) => ({ ...previous, email: event.target.value }))} /></label>
            <label><span>Password</span><input type="password" value={authForm.password} onChange={(event) => setAuthForm((previous) => ({ ...previous, password: event.target.value }))} /></label>
            <button type="submit" className="primary-button wide">{authMode === 'login' ? 'Continue to demo household' : 'Create household'}</button>
          </form>

          <button type="button" className="secondary-button wide" onClick={() => { setAuth({ isAuthenticated: true, user: { id: 'demo-user', name: 'Aarav', email: 'demo@roomiesplit.app', isDemo: true } }); setToast('Demo mode enabled'); }}>Use demo mode</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (sidebarOpen ? 'open' : '')}>
        <div className="brand-block">
          <div className="brand-mark"><Wallet size={20} /></div>
          <div>
            <div className="brand-name">RoomieSplit</div>
            <div className="brand-subname">{state.householdName}</div>
          </div>
        </div>

        <nav className="nav-list">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} className={'nav-item ' + (activePage === id ? 'active' : '')} onClick={() => { setActivePage(id); setSidebarOpen(false); }}>
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="mini-avatar avatar-alice">{auth.user?.name?.slice(0, 2).toUpperCase() || 'DE'}</div>
            <div>
              <div className="user-name">{auth.user?.name || 'Demo user'}</div>
              <div className="user-type">{auth.user?.isDemo ? 'Demo mode' : 'Household owner'}</div>
            </div>
          </div>
          <button type="button" className="ghost-button danger" onClick={handleLogout}><LogOut size={15} /> Logout</button>
        </div>
      </aside>

      <main className="page-shell">
        <header className="topbar">
          <div className="mobile-toggle" onClick={() => setSidebarOpen((previous) => !previous)}><Menu size={18} /></div>
          <div className="topbar-title">
            <div className="section-kicker">HOUSEHOLD</div>
            <h1>{state.householdName}</h1>
          </div>
          <div className="topbar-tools">
            <button type="button" className="tool-button"><Bell size={16} /></button>
            <button type="button" className="primary-button" onClick={() => setActivePage('expenses')}><Plus size={16} /> Add Expense</button>
          </div>
        </header>

        <div className="content-area">{pageContent}</div>
      </main>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
