'use client';

import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { User } from '@/types';

export function ResetPasswordModal({
  agent,
  onClose,
  onSaved,
}: {
  agent: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/users/${agent.id}/reset-password`, { newPassword });
      setDone(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nepodařilo se nastavit heslo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-1">Nastavit nové heslo</h2>
        <p className="text-sm text-slate-500 mb-4">
          {agent.firstName} {agent.lastName} ({agent.email})
        </p>

        {done ? (
          <div className="space-y-4">
            <div className="rounded-none bg-emerald-950/40 text-emerald-400 text-sm px-3 py-2 border border-emerald-900">
              Heslo bylo změněno. Předej obchodníkovi nové heslo ručně - appka
              ho nikam neodešle sama.
            </div>
            <p className="text-sm">
              Nové heslo: <span className="font-mono font-semibold">{newPassword}</span>
            </p>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={onClose}>
                Hotovo
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="rounded-none bg-red-950/40 text-red-400 text-sm px-3 py-2 border border-red-900">
                {error}
              </div>
            )}
            <div>
              <label className="label">Nové heslo (min. 8 znaků)</label>
              <input
                required
                minLength={8}
                type="text"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nové heslo"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Zrušit
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Nastavuji…' : 'Nastavit heslo'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
