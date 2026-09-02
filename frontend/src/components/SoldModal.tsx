'use client';

import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';

export function SoldModal({
  leadId,
  onClose,
  onDone,
}: {
  leadId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [dealValue, setDealValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/leads/${leadId}/status`, {
        status: 'WON',
        dealValue: Number(dealValue),
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nepodařilo se uložit prodej');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Označit jako prodáno 🏆</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-none bg-red-950/40 text-red-400 text-sm px-3 py-2 border border-red-900">
              {error}
            </div>
          )}
          <div>
            <label className="label">Hodnota obchodu (Kč)</label>
            <input
              type="number"
              min={0}
              required
              className="input"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Zrušit
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Ukládám…' : 'Potvrdit prodej'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
