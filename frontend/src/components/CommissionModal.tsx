'use client';

import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { User } from '@/types';

export function CommissionModal({
  agent,
  onClose,
  onSaved,
}: {
  agent: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState(agent.commissionConfig?.type ?? 'PERCENTAGE');
  const [fixedAmount, setFixedAmount] = useState(agent.commissionConfig?.fixedAmount ?? '');
  const [percentage, setPercentage] = useState(agent.commissionConfig?.percentage ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post(`/users/${agent.id}/commission`, {
        type,
        fixedAmount: type === 'FIXED_PER_SALE' ? Number(fixedAmount) : undefined,
        percentage: type === 'PERCENTAGE' ? Number(percentage) : undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nepodařilo se uložit provizi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-1">Nastavit provizi</h2>
        <p className="text-sm text-slate-500 mb-4">
          {agent.firstName} {agent.lastName}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-none bg-red-950/40 text-red-400 text-sm px-3 py-2 border border-red-900">
              {error}
            </div>
          )}
          <div>
            <label className="label">Typ provize</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="PERCENTAGE">Procento z hodnoty obchodu</option>
              <option value="FIXED_PER_SALE">Fixní částka za prodej</option>
            </select>
          </div>
          {type === 'PERCENTAGE' ? (
            <div>
              <label className="label">Procento (%)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={100}
                required
                className="input"
                value={percentage ?? ''}
                onChange={(e) => setPercentage(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="label">Fixní částka za prodej (Kč)</label>
              <input
                type="number"
                min={0}
                required
                className="input"
                value={fixedAmount ?? ''}
                onChange={(e) => setFixedAmount(e.target.value)}
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Zrušit
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Ukládám…' : 'Uložit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
