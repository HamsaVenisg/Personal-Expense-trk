import { useEffect, useState } from 'react';
import { categories, today, type Tx, type TxInput } from '../lib/api';

type Props = { initial?: Tx | null; onSave: (value: TxInput) => Promise<void>; onCancel: () => void };
export default function TransactionForm({ initial, onSave, onCancel }: Props) {
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'Food');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.transaction_date ?? today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setAmount(initial?.amount ?? ''); setCategory(initial?.category ?? 'Food'); setDescription(initial?.description ?? ''); setDate(initial?.transaction_date ?? today()); }, [initial]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) { setError('Enter a valid amount greater than zero.'); return; }
    setBusy(true);
    try { await onSave({ kind: 'expense', amount, category, description, transaction_date: date }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save transaction'); }
    finally { setBusy(false); }
  }
  return <div className="overlay" onClick={onCancel}><section className="dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Transaction editor">
    <div className="dialog-top"><h2>{initial ? 'Edit transaction' : 'Add expense'}</h2><button className="icon-button" type="button" onClick={onCancel} aria-label="Close">×</button></div>
    <form onSubmit={submit} className="form-stack">
      <label>Amount (₹)<input type="number" min="0.01" max="9999999999" step="0.01" required placeholder="e.g. 499" value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Date<input type="date" required value={date} onChange={e => setDate(e.target.value)} /></label>
      <label>Description<input maxLength={300} placeholder="What was this for?" value={description} onChange={e => setDescription(e.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary wide" disabled={busy}>{busy ? 'Saving...' : initial ? 'Save changes' : 'Add expense'}</button>
    </form>
  </section></div>;
}
