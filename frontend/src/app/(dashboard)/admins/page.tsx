'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { ResetPasswordModal } from '@/components/ResetPasswordModal';
import { api, ApiError } from '@/lib/api';
import { User } from '@/types';
import { useAuth } from '@/lib/auth-context';
import clsx from 'clsx';

const OWNER_EMAIL = 'admin@crm.cz';

export default function AdminsPage() {
  const { user } = useAuth();
  const isOwner = user?.email === OWNER_EMAIL;
  const [admins, setAdmins] = useState<User[]>([]);
  const [resetPasswordAdmin, setResetPasswordAdmin] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.get<User[]>('/users?role=ADMIN');
      setAdmins(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nepodařilo se načíst administrátory');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(admin: User) {
    try {
      await api.patch(`/users/${admin.id}/${admin.isActive ? 'deactivate' : 'activate'}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Akci se nepodařilo provést');
    }
  }

  return (
    <div>
      <Header title="Administrátoři" />
      <div className="p-4 md:p-6 space-y-4">
        {error && (
          <div className="rounded-none bg-red-950/40 text-red-400 text-sm px-3 py-2 border border-red-900">
            {error}
          </div>
        )}

        <div className="card overflow-auto max-h-[65vh]">
          <table className="w-full min-w-[640px] text-sm border-separate border-spacing-0">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Jméno</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Kontakt</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Stav</th>
                <th className="text-right px-4 py-3">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {admin.firstName} {admin.lastName}
                    {admin.id === user?.id && <span className="text-slate-400"> (já)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {admin.email}
                    <br />
                    {admin.phone}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'badge',
                        admin.isActive ? 'bg-emerald-950/40 text-emerald-400' : 'bg-slate-200 text-slate-600',
                      )}
                    >
                      {admin.isActive ? 'Aktivní' : 'Deaktivován'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end flex-wrap gap-2">
                      <button className="btn-secondary" onClick={() => setResetPasswordAdmin(admin)}>
                        🔑 Reset hesla
                      </button>
                      {isOwner && admin.id !== user?.id && (
                        <button className="btn-secondary" onClick={() => toggleActive(admin)}>
                          {admin.isActive ? 'Deaktivovat' : 'Aktivovat'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-500">
                    Zatím žádní další administrátoři
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {resetPasswordAdmin && (
        <ResetPasswordModal
          agent={resetPasswordAdmin}
          onClose={() => setResetPasswordAdmin(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
