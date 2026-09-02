'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { User } from '@/types';
import { useAuth } from '@/lib/auth-context';

export function CreateLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const OWNER_EMAIL = 'admin@crm.cz';
  const isOwner = user?.email === OWNER_EMAIL;
  const [agents, setAgents] = useState<User[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    company: '',
    notes: '',
    oldWebsiteUrl: '',
    assignedAgentId: '',
  });
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get<User[]>('/users?role=AGENT').then(setAgents).catch(() => {});
    } else if (user) {
      setForm((f) => ({ ...f, assignedAgentId: user.id }));
    }
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/leads', {
        ...form,
        assignedAgentId: isPrivate ? undefined : form.assignedAgentId || user?.id,
        isPrivate: isOwner && isPrivate,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nepodařilo se vytvořit lead');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Nový lead</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-none bg-red-950/40 text-red-400 text-sm px-3 py-2 border border-red-900">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Jméno</label>
              <input
                required
                className="input"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Příjmení</label>
              <input
                required
                className="input"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Telefon</label>
              <input
                required
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input
                required
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Firma (volitelné)</label>
            <input
              className="input"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Odkaz na starý web (volitelné)</label>
            <input
              type="url"
              placeholder="https://..."
              className="input"
              value={form.oldWebsiteUrl}
              onChange={(e) => setForm({ ...form, oldWebsiteUrl: e.target.value })}
            />
          </div>
          {isOwner && (
            <label className="flex items-center gap-2 text-sm text-slate-300 border border-hairline px-3 py-2">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              🔒 Soukromý kontakt (uvidím jen já, obchodníci ho neuvidí)
            </label>
          )}
          {user?.role === 'ADMIN' && !isPrivate && (
            <div>
              <label className="label">Přiřazený obchodník</label>
              <select
                required
                className="input"
                value={form.assignedAgentId}
                onChange={(e) => setForm({ ...form, assignedAgentId: e.target.value })}
              >
                <option value="">Vyberte obchodníka</option>
                {user && (
                  <option value={user.id}>
                    {user.firstName} {user.lastName} (já)
                  </option>
                )}
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Interní poznámka (volitelné)</label>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Zrušit
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Ukládám…' : 'Vytvořit lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
