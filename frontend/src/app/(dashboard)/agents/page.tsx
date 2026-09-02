'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { CreateAgentModal } from '@/components/CreateAgentModal';
import { CommissionModal } from '@/components/CommissionModal';
import { TargetsModal } from '@/components/TargetsModal';
import { api, ApiError } from '@/lib/api';
import { User } from '@/types';
import { useAuth } from '@/lib/auth-context';
import clsx from 'clsx';

const OWNER_EMAIL = 'admin@crm.cz';

export default function AgentsPage() {
  const { user } = useAuth();
  const isOwner = user?.email === OWNER_EMAIL;
  const [agents, setAgents] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [commissionAgent, setCommissionAgent] = useState<User | null>(null);
  const [targetsAgent, setTargetsAgent] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.get<User[]>('/users?role=AGENT');
      setAgents(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nepodařilo se načíst obchodníky');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(agent: User) {
    try {
      await api.patch(`/users/${agent.id}/${agent.isActive ? 'deactivate' : 'activate'}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Akci se nepodařilo provést');
    }
  }

  async function removeAgent(agent: User) {
    if (
      !confirm(
        `Opravdu smazat obchodníka ${agent.firstName} ${agent.lastName}? Jeho leady zůstanou zachovány a přejdou do stavu "Nepřiřazeno".`,
      )
    )
      return;
    try {
      await api.delete(`/users/${agent.id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Obchodníka se nepodařilo smazat');
    }
  }

  function commissionLabel(agent: User): string {
    const c = agent.commissionConfig;
    if (!c) return 'Nenastaveno';
    return c.type === 'PERCENTAGE' ? `${c.percentage ?? 0} %` : `${c.fixedAmount ?? 0} Kč / prodej`;
  }

  return (
    <div>
      <Header title="Správa obchodníků" />
      <div className="p-4 md:p-6 space-y-4">
        {error && (
          <div className="rounded-none bg-red-950/40 text-red-400 text-sm px-3 py-2 border border-red-900">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            + Nový obchodník
          </button>
        </div>

        <div className="card overflow-auto max-h-[65vh]">
          <table className="w-full min-w-[720px] text-sm border-separate border-spacing-0">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Jméno</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Kontakt</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Provize</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Stav</th>
                <th className="text-right px-4 py-3">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {agent.firstName} {agent.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {agent.email}
                    <br />
                    {agent.phone}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{commissionLabel(agent)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'badge',
                        agent.isActive ? 'bg-emerald-950/40 text-emerald-400' : 'bg-slate-200 text-slate-600',
                      )}
                    >
                      {agent.isActive ? 'Aktivní' : 'Deaktivován'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end flex-wrap gap-2">
                      <button className="btn-secondary" onClick={() => setCommissionAgent(agent)}>
                        Provize
                      </button>
                      <button className="btn-secondary" onClick={() => setTargetsAgent(agent)}>
                        Cíle
                      </button>
                      <button className="btn-secondary" onClick={() => toggleActive(agent)}>
                        {agent.isActive ? 'Deaktivovat' : 'Aktivovat'}
                      </button>
                      {isOwner && (
                        <button className="btn-danger" onClick={() => removeAgent(agent)}>
                          Smazat
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    Zatím žádní obchodníci
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateAgentModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {commissionAgent && (
        <CommissionModal
          agent={commissionAgent}
          onClose={() => setCommissionAgent(null)}
          onSaved={load}
        />
      )}
      {targetsAgent && (
        <TargetsModal agent={targetsAgent} onClose={() => setTargetsAgent(null)} onSaved={load} />
      )}
    </div>
  );
}
