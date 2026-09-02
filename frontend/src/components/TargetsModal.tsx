'use client';

import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Target, User } from '@/types';

const METRIC_LABELS: Record<string, string> = {
  CONTACTS: 'Hovory / kontakty',
  MEETINGS: 'Schůzky',
  SALES: 'Prodeje',
};

export function TargetsModal({
  agent,
  onClose,
  onSaved,
}: {
  agent: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [metric, setMetric] = useState<'CONTACTS' | 'MEETINGS' | 'SALES'>('CONTACTS');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [existing, setExisting] = useState<Target[]>(agent.targets ?? []);

  async function refreshTargets() {
    const refreshed = await api.get<Target[]>(`/users/${agent.id}/targets`);
    setExisting(refreshed);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Uložení se stejnou periodou+metrikou jako existující cíl ho nahradí -
      // tímhle formulářem tedy jde cíl i upravit, ne jen zakládat nový.
      await api.post(`/users/${agent.id}/targets`, { period, metric, value: Number(value) });
      await refreshTargets();
      setValue('');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nepodařilo se uložit cíl');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(t: Target) {
    setPeriod(t.period);
    setMetric(t.metric);
    setValue(String(t.value));
  }

  async function handleDelete(t: Target) {
    if (!confirm(`Smazat cíl "${METRIC_LABELS[t.metric]}" (${t.period === 'WEEKLY' ? 'týdně' : 'měsíčně'})?`)) {
      return;
    }
    setError(null);
    setDeletingId(t.id);
    try {
      await api.delete(`/users/${agent.id}/targets/${t.id}`);
      await refreshTargets();
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nepodařilo se smazat cíl');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-1">Cíle obchodníka</h2>
        <p className="text-sm text-slate-500 mb-4">
          {agent.firstName} {agent.lastName}
        </p>

        {existing.length > 0 && (
          <div className="mb-4 space-y-1">
            {existing.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b border-hairline py-1.5 gap-2">
                <span>
                  {METRIC_LABELS[t.metric]} ({t.period === 'WEEKLY' ? 'týdně' : 'měsíčně'})
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.value}</span>
                  <button
                    type="button"
                    className="text-xs text-brand-500 hover:underline"
                    onClick={() => handleEdit(t)}
                  >
                    Upravit
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === t.id}
                    className="text-xs text-red-400 hover:underline disabled:opacity-50"
                    onClick={() => handleDelete(t)}
                  >
                    {deletingId === t.id ? 'Mažu…' : 'Smazat'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-none bg-red-950/40 text-red-400 text-sm px-3 py-2 border border-red-900">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Metrika</label>
              <select className="input" value={metric} onChange={(e) => setMetric(e.target.value as any)}>
                <option value="CONTACTS">Hovory / kontakty</option>
                <option value="MEETINGS">Schůzky</option>
                <option value="SALES">Prodeje</option>
              </select>
            </div>
            <div>
              <label className="label">Perioda</label>
              <select className="input" value={period} onChange={(e) => setPeriod(e.target.value as any)}>
                <option value="WEEKLY">Týdně</option>
                <option value="MONTHLY">Měsíčně</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Cílová hodnota</label>
            <input
              type="number"
              min={1}
              required
              className="input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Zavřít
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Ukládám…' : 'Uložit cíl'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
