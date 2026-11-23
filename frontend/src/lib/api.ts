export type User = { id: number; name: string; email: string };
export type AuthResponse = { access_token: string; token_type: string; user: User };
export type Tx = { id: number; kind: 'income' | 'expense'; amount: string; category: string; description: string; transaction_date: string; created_at: string };
export type TxInput = Omit<Tx, 'id' | 'created_at'>;
export type Budget = { id: number; category: string; month: string; limit_amount: string };
export type Summary = { month: string; income: string; expenses: string; balance: string; by_category: { category: string; amount: string }[] };
const base = import.meta.env.VITE_API_BASE_URL || '';
export const tokenStore = {
  get: () => sessionStorage.getItem('pet_token'),
  set: (token: string) => sessionStorage.setItem('pet_token', token),
  clear: () => sessionStorage.removeItem('pet_token')
};
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const response = await fetch(`${base}${path}`, { ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { const json = await response.json(); message = typeof json.detail === 'string' ? json.detail : message; } catch { /* keep fallback */ }
    if (response.status === 401 && !path.includes('/auth/login')) { tokenStore.clear(); window.dispatchEvent(new Event('pet:unauthorized')); }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export const api = {
  register: (name: string, email: string, password: string) => request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) => request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<User>('/api/auth/me'),
  transactions: (month: string) => request<Tx[]>(`/api/transactions?month=${month}`),
  createTx: (tx: TxInput) => request<Tx>('/api/transactions', { method: 'POST', body: JSON.stringify(tx) }),
  updateTx: (id: number, tx: TxInput) => request<Tx>(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(tx) }),
  deleteTx: (id: number) => request<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
  summary: (month: string) => request<Summary>(`/api/summary?month=${month}`),
  budgets: (month: string) => request<Budget[]>(`/api/budgets?month=${month}`),
  saveBudget: (category: string, month: string, limit_amount: string) => request<Budget>('/api/budgets', { method: 'PUT', body: JSON.stringify({ category, month, limit_amount }) }),
  deleteBudget: (id: number) => request<void>(`/api/budgets/${id}`, { method: 'DELETE' }),
  async csv() {
    const response = await fetch(`${base}/api/export/csv?expenses_only=true`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
    if (!response.ok) throw new Error('Could not export transactions');
    const blob = await response.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click(); URL.revokeObjectURL(url);
  }
};
export const money = (val: string | number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(val));
export const thisMonth = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; };
export const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };
export const categories = ['Food', 'Shopping', 'Transport', 'Bills', 'Rent', 'Health', 'Entertainment', 'Education', 'Travel', 'Salary', 'Freelance', 'Other'];
