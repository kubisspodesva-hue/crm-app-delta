'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { Money } from '@/components/Money';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { User } from '@/types';

interface CommissionBreakdown {
  soldCount: number;
  revenue: number;
  commission: number;
}

interface CommissionSummary {
  config: { type: 'FIXED_PER_SALE' | 'PERCENTAGE'; fixedAmount?: string; percentage?: string } | null;
  day: CommissionBreakdown;
  week: CommissionBreakdown;
  month: CommissionBreakdown;
  total: CommissionBreakdown;
}

export default function CommissionsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [summary, setSummary] = useState<CommissionSummary | null>(null);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get<User[]>('/users?role=AGENT').then((data) => {
        setAgents(data);
        if (data.length > 0) setSelectedAgentId(data[0].id);
      });
    } else if (user) {
      setSelectedAgentId(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (!selectedAgentId) return;
    const path = selectedAgentId === user?.id ? '/commissions/me' : `/commissions/${selectedAgentId}`;
    api.get<CommissionSummary>(path).then(setSummary).catch(() => setSummary(null));
  }, [selectedAgentId, user]);

  return (
    <div>
      <Header title="Provize" />
      <div className="p-4 md:p-6 space-y-6">
        {user?.role === 'ADMIN' && (
          <select
            className="input max-w-xs"
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firstName} {a.lastName}
              </option>
            ))}
          </select>
        )}

        {summary && (
          <>
            <div className="card p-4 text-sm text-slate-600">
              Nastavení: {summary.config
                ? summary.config.type === 'PERCENTAGE'
                  ? `${summary.config.percentage}% z hodnoty obchodu`
                  : `${summary.config.fixedAmount} Kč fixně za prodej`
                : 'Provize zatím nenastavena administrátorem'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                label="Provize dnes"
                value={<Money value={summary.day.commission} />}
                sub={`${summary.day.soldCount} prodejů`}
              />
              <StatCard
                label="Provize tento týden"
                value={<Money value={summary.week.commission} />}
                sub={`${summary.week.soldCount} prodejů`}
              />
              <StatCard
                label="Provize tento měsíc"
                value={<Money value={summary.month.commission} />}
                sub={`${summary.month.soldCount} prodejů`}
              />
              <StatCard
                label="Celková provize"
                value={<Money value={summary.total.commission} />}
                accent="text-emerald-600"
                sub={`${summary.total.soldCount} prodejů, obrat `}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
