import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Settings, Tags, List, ArrowDownLeft, ArrowUpRight, BarChart3, CalendarDays, Download, Eye, EyeOff, LayoutDashboard, LogOut, Plus, ReceiptText, Trash2, Wallet, Pencil, Target, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import LandingPage from './components/LandingPage';
import TransactionForm from './components/TransactionForm';
import { api, categories, money, thisMonth, tokenStore, type Budget, type Summary, type Tx, type TxInput, type User } from './lib/api';

type Screen = 'dashboard' | 'transactions' | 'budgets' | 'categories' | 'reports' | 'settings';
const CHART_COLORS = ['#0b9777', '#f5a623', '#2d89b8', '#e65d58', '#8769cf', '#598477', '#aa762a', '#8897ac'];
const NAV = [
  { screen: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { screen: 'transactions', label: 'Expenses', Icon: ReceiptText },
  { screen: 'categories', label: 'Categories', Icon: Tags },
  { screen: 'reports', label: 'Reports', Icon: BarChart3 },
  { screen: 'budgets', label: 'Budgets', Icon: Target },
  { screen: 'settings', label: 'Settings', Icon: Settings },
] as const;
const monthName = (value: string, format: 'short' | 'long') =>
  new Date(value + '-01T00:00:00').toLocaleDateString('en-IN', { month: format, ...(format === 'long' ? { year: 'numeric' } : {}) });

function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>(() => new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const result = mode === 'login' ? await api.login(email, password) : await api.register(name, email, password); tokenStore.set(result.access_token); window.location.replace('/dashboard'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not sign in'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><a className="auth-brand" href="/" aria-label="Spendwise home"><div className="logo-box"><Wallet size={22} /></div><span>spendwise<span className="brand-dot">.</span></span></a><div className="auth-card"><span className="eyebrow">YOUR MONEY, MADE CLEAR</span><h1>{mode === 'login' ? 'Welcome back' : 'Take control of your money'}</h1><p className="muted">{mode === 'login' ? 'Sign in to manage your personal finances.' : 'Create a free account to track every rupee.'}</p><form className="form-stack" onSubmit={submit}>{mode === 'register' && <label>Full name<input placeholder="Your name" required minLength={2} value={name} onChange={e => setName(e.target.value)} /></label>}<label>Email address<input type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></label><div className="auth-password"><label htmlFor="auth-password">Password</label><div className="auth-password-field">
  <input id="auth-password" type={passwordVisible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : undefined} required placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
  <button type="button" className="icon-button auth-password-toggle" aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-controls="auth-password" onClick={() => setPasswordVisible(visible => !visible)}>
    {passwordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
  </button>
</div></div>{error && <p className="error" role="alert">{error}</p>}<button className="primary wide" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form><p className="auth-switch">{mode === 'login' ? 'New here?' : 'Already have an account?'} <button className="link-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setPasswordVisible(false); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p></div><p className="auth-foot">Private, simple, and designed to help you save.</p></main>;
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/dashboard') return <Dashboard />;
  if (path === '/auth') return <AuthPage />;
  return <LandingPage />;
}

function Dashboard() {
  const [user, setUser] = useState<User | null>(null); const [checking, setChecking] = useState(true);
  const [screen, setScreen] = useState<Screen>('dashboard'); const [month, setMonth] = useState(thisMonth());
  const [transactions, setTransactions] = useState<Tx[]>([]); const [summary, setSummary] = useState<Summary | null>(null); const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false); const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<Tx | null>(null); const [showForm, setShowForm] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('Food'); const [budgetAmount, setBudgetAmount] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const logout = useCallback(() => { tokenStore.clear(); setUser(null); window.location.replace('/auth'); }, []);
  useEffect(() => { const handle = () => logout(); window.addEventListener('pet:unauthorized', handle); return () => window.removeEventListener('pet:unauthorized', handle); }, [logout]);
  useEffect(() => { if (tokenStore.get()) api.me().then(setUser).then(() => setChecking(false)).catch(logout); else logout(); }, [logout]);
  const reload = useCallback(async () => { if (!user) return; setLoading(true); try { const [t, s, b] = await Promise.all([api.transactions(month), api.summary(month), api.budgets(month)]); setTransactions(t); setSummary(s); setBudgets(b); setMessage(''); } catch (err) { setMessage(err instanceof Error ? err.message : 'Unable to load data'); } finally { setLoading(false); } }, [user, month]);
  useEffect(() => { void reload(); }, [reload]);
  const [toast, setToast] = useState<{ title: string; tx: Tx } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const [history, setHistory] = useState<{ month: string; rows: Summary[] } | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [historyRetry, setHistoryRetry] = useState(0);
  useEffect(() => {
    if (!summary || summary.month !== month) return;
    let ignore = false;
    setHistory(null);
    setHistoryError('');
    const [year, index] = month.split('-').map(Number);
    const months = Array.from({ length: 5 }, (_, i) => {
      const date = new Date(year, index - 6 + i, 1);
      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    });
    Promise.all(months.map(api.summary))
      .then(rows => { if (!ignore) setHistory({ month, rows: [...rows, summary] }); })
      .catch(() => { if (!ignore) setHistoryError('Could not load spending history.'); });
    return () => { ignore = true; };
  }, [month, summary, historyRetry]);
  const expenses = transactions.filter(tx => tx.kind === 'expense');
  const budgetTotal = budgets.reduce((total, budget) => total + Number(budget.limit_amount), 0);
  const spend = useMemo(() => Object.fromEntries((summary?.by_category ?? []).map(x => [x.category, Number(x.amount)])), [summary]);
  async function saveTx(tx: TxInput) {
    const saved = editing ? await api.updateTx(editing.id, tx) : await api.createTx(tx);
    setToast({ title: editing ? 'Transaction updated' : 'Expense added', tx: saved });
    setShowForm(false);
    setEditing(null);
    const savedMonth = saved.transaction_date.slice(0, 7);
    if (savedMonth === month) await reload();
    else setMonth(savedMonth);
  }
  async function deleteTx(id: number) { if (!window.confirm('Delete this transaction?')) return; try { await api.deleteTx(id); await reload(); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not delete'); } }
  async function saveBudget(e: React.FormEvent) { e.preventDefault(); setSavingBudget(true); try { await api.saveBudget(budgetCategory, month, budgetAmount); setBudgetAmount(''); await reload(); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not save budget'); } finally { setSavingBudget(false); } }
  async function deleteBudget(id: number) { try { await api.deleteBudget(id); await reload(); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not delete budget'); } }
  async function exportCsv() { try { await api.csv(); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not export'); } }
  if (checking) return <div className="loading-screen">Loading spendwise…</div>;
  if (!user) return null;
  return <div className="app-shell expense-workspace"><aside className="sidebar"><div className="brand"><div className="logo-box"><Wallet size={20}/></div><span>spendwise<span className="brand-dot">.</span></span></div><nav className="nav" aria-label="Dashboard sections">{NAV.map(({ screen: item, label, Icon }) => <button key={item} className={screen === item ? 'active' : ''} aria-current={screen === item ? 'page' : undefined} onClick={() => setScreen(item)}><Icon size={18}/> {label}</button>)}</nav><div className="sidebar-bottom"><button type="button" className="profile-avatar account-button" aria-label="My account" onClick={() => setScreen('settings')}>{user.name.charAt(0).toUpperCase()}</button><div className="profile-info"><strong>{user.name}</strong><span>Personal account</span></div><button title="Log out" aria-label="Log out" onClick={logout} className="icon-button"><LogOut size={17}/></button></div></aside>
  <main className="main"><header className="topbar"><div className="mobile-brand"><Wallet size={20}/> spendwise.</div><div className="topbar-actions"><button type="button" aria-label="Log out" title="Log out" onClick={logout} className="icon-button mobile-logout"><LogOut size={17}/></button><label className="month-select"><CalendarDays size={16}/><input type="month" aria-label="Select month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }} /></label><button className="primary add-btn" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={17}/> Add expense</button></div></header>
    <div className="content"><div className="page-head"><div><h1>{NAV.find(item => item.screen === screen)?.label}</h1>{screen === 'dashboard' && <p className="dashboard-greeting">Welcome back, {user.name}!</p>}<p className="muted">{screen === 'settings' ? 'Manage your session' : monthName(month, 'long')}</p></div>{screen === 'transactions' && <button className="secondary" onClick={exportCsv}><Download size={16}/> Export CSV</button>}</div>
    {message && <div role="alert" className="notice">{message} <button onClick={reload}>Retry</button></div>}
    {loading && <div className="small-loading">Refreshing data…</div>}
    {screen === 'dashboard' && <div className="stats-grid">
      <Stat title="Spent this month" value={money(summary?.expenses ?? 0)} icon={<Wallet size={19}/>} variant="mint" subtitle="Total expenses"/>
      <button className="stat stat-button" onClick={() => setScreen('budgets')}>
        <div className="stat-icon amber">₹</div><span className="stat-label">Monthly budget</span><strong>{money(budgetTotal)}</strong>
        {budgetTotal > 0 ? <div className="budget-meter"><progress aria-label="Monthly budget used" value={Math.min(Number(summary?.expenses ?? 0), budgetTotal)} max={budgetTotal}/><span>{Math.round(Number(summary?.expenses ?? 0) / budgetTotal * 100)}% used</span></div> : <span className="stat-subtitle">Set a monthly budget</span>}
      </button>
      <Stat title="Expenses" value={String(expenses.length)} icon={<List size={19}/>} variant="sky" subtitle="Entries this month"/>
    </div>}
    {(screen === 'dashboard' || screen === 'reports' || screen === 'categories') && <div className={screen === 'dashboard' ? 'dashboard-grid overview-charts' : 'report-charts'}>
      {screen !== 'categories' && <section className="panel">
        <div className="section-heading"><h2>Monthly spending</h2><span className="muted">Last 6 months</span></div>
        {historyError ? <div className="empty">{historyError}<button className="inline-link" onClick={() => setHistoryRetry(value => value + 1)}>Retry</button></div> :
          history?.month === month ? <div className="spending-chart"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={history.rows.map(row => ({ month: monthName(row.month, 'short'), amount: Number(row.expenses) }))} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e6efeb"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }}/><YAxis hide domain={[0, (max: number) => Math.max(max * 1.15, 1)]}/>
              <Tooltip formatter={value => [money(Number(value)), 'Spent']}/><Bar dataKey="amount" radius={[5, 5, 0, 0]} maxBarSize={52}><LabelList dataKey="amount" position="top" fontSize={10} fill="#203033" formatter={(value: number) => value > 0 ? new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : ''}/>
                {history.rows.map(row => <Cell key={row.month} fill={row.month === month ? '#f5a623' : '#0b9777'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer></div> : <div className="empty">Loading spending history…</div>}
      </section>}
      {screen !== 'reports' && <section className="panel">
        <div className="section-heading"><h2>By category</h2></div>
        {summary?.by_category.length ? <div className="chart-row"><div className="donut">
          <ResponsiveContainer width="100%" height="100%"><PieChart>
            <Pie data={summary.by_category.map(row => ({ ...row, amount: Number(row.amount) }))} nameKey="category" dataKey="amount" innerRadius="65%" outerRadius="93%" paddingAngle={2} stroke="none">
              {summary.by_category.map((row, index) => <Cell key={row.category} fill={CHART_COLORS[index % CHART_COLORS.length]}/>)}
            </Pie><Tooltip formatter={value => money(Number(value))}/>
          </PieChart></ResponsiveContainer><div className="donut-center"><strong>{monthName(month, 'short')}</strong></div>
        </div><div className="legend">{summary.by_category.map((row, index) => <div key={row.category}><span className="legend-dot" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}/><span>{row.category}</span><strong title={money(row.amount)}>{Math.round(Number(row.amount) / Number(summary.expenses) * 100)}%</strong></div>)}</div></div> : <div className="empty">No expenses in this month.</div>}
      </section>}
    </div>}
    {screen === 'dashboard' && <section className="panel recent-expenses"><div className="section-heading"><h2>Recent expenses</h2><button className="inline-link" onClick={() => setScreen('transactions')}>View all</button></div>
      <TxTable transactions={expenses.slice(0, 5)} onEdit={tx => { setEditing(tx); setShowForm(true); }} onDelete={deleteTx}/>
    </section>}

    {screen === 'settings' && <section className="panel"><h2>My account</h2><p>{user.name}</p><p className="muted">{user.email}</p><button className="secondary" onClick={logout}><LogOut size={16}/> Sign out</button></section>}
    {screen === 'transactions' && <section className="panel"><div className="section-heading"><div><h2>All expenses</h2><p className="muted">{expenses.length} entries in {month}</p></div><ReceiptText className="light-icon" size={20}/></div><TxTable transactions={expenses} onEdit={tx => { setEditing(tx); setShowForm(true); }} onDelete={deleteTx}/></section>}
    {screen === 'budgets' && <div className="dashboard-grid budget-layout"><section className="panel"><div className="section-heading"><div><h2>Set a budget</h2><p className="muted">Add or update monthly limits</p></div><Target className="light-icon" size={20}/></div><form className="form-stack" onSubmit={saveBudget}><label>Category<select value={budgetCategory} onChange={e => setBudgetCategory(e.target.value)}>{categories.filter(c => !['Salary', 'Freelance'].includes(c)).map(c => <option key={c}>{c}</option>)}</select></label><label>Monthly limit (₹)<input type="number" min="0.01" max="9999999999" step="0.01" placeholder="e.g. 5000" required value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)}/></label><button className="primary" disabled={savingBudget}>{savingBudget ? 'Saving...' : 'Save budget'}</button></form></section><section className="panel"><div className="section-heading"><div><h2>Your budgets</h2><p className="muted">For {month}</p></div><TrendingUp size={20} className="light-icon"/></div>{budgets.length ? <div className="budget-stack">{budgets.map(b => <div className="budget-entry" key={b.id}><BudgetProgress budget={b} spent={spend[b.category] || 0}/><button className="icon-button delete-small" title="Delete budget" aria-label={`Delete ${b.category} budget`} onClick={() => deleteBudget(b.id)}><Trash2 size={16}/></button></div>)}</div> : <div className="empty">No budgets created yet. Use the form to get started.</div>}</section></div>}
    </div></main><div className="toast-region" role="status">{toast && <div className="expense-toast"><span className="toast-check"><Check size={21}/></span><div><strong>{toast.title}</strong><small>{[toast.tx.description, toast.tx.category, money(toast.tx.amount)].filter(Boolean).join(' · ')}</small></div></div>}</div>{showForm && <TransactionForm initial={editing} onSave={saveTx} onCancel={() => { setShowForm(false); setEditing(null); }}/>}</div>;
}

function Stat({title, value, icon, variant, subtitle}: {title: string; value: string; icon: React.ReactNode; variant: string; subtitle: string}) { return <section className="stat"><div className={`stat-icon ${variant}`}>{icon}</div><span className="stat-label">{title}</span><strong>{value}</strong><span className="stat-subtitle">{subtitle}</span></section>; }
function BudgetProgress({budget, spent}: {budget: Budget; spent: number}) { const limit = Number(budget.limit_amount); const ratio = limit ? spent / limit : 0; return <div className="budget-progress"><div className="budget-progress-title"><strong>{budget.category}</strong><span>{money(spent)} <span className="muted">/ {money(limit)}</span></span></div><div className="progress-track"><div className={ratio > 1 ? 'progress-fill over' : 'progress-fill'} style={{width: `${Math.min(100, ratio * 100)}%`}}/></div><span className={ratio > 1 ? 'over-text' : 'progress-caption'}>{Math.round(ratio * 100)}% used{ratio > 1 ? ' · Over budget' : ''}</span></div>; }
function TxTable({transactions, onEdit, onDelete}: {transactions: Tx[]; onEdit: (tx: Tx) => void; onDelete: (id: number) => void}) { if (!transactions.length) return <div className="empty">No transactions found for the selected month.</div>; return <div className="table-wrap"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th>ACTIONS</th></tr></thead><tbody>{transactions.map(tx => <tr key={tx.id}><td><div className="transaction-name"><div className={`transaction-symbol ${tx.kind}`} >{tx.kind === 'income' ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}</div><div><strong>{tx.description || (tx.kind === 'income' ? 'Income' : 'Expense')}</strong><small>{tx.kind === 'income' ? 'Money in' : 'Money out'}</small></div></div></td><td><span className="category-tag">{tx.category}</span></td><td>{new Date(tx.transaction_date + 'T00:00:00').toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'})}</td><td><strong className={tx.kind === 'income' ? 'positive' : 'negative'}>{tx.kind === 'income' ? '+' : '−'}{money(tx.amount)}</strong></td><td><div className="actions"><button className="icon-button" title="Edit" aria-label="Edit transaction" onClick={() => onEdit(tx)}><Pencil size={16}/></button><button className="icon-button" title="Delete" aria-label="Delete transaction" onClick={() => onDelete(tx.id)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>; }
