'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { User } from '@/types';

const METRIC_LABELS: Record<string, string> = {
  CONTACTS: 'hovorů',
  MEETINGS: 'schůzek',
  SALES: 'prodejů',
};

interface Progress {
  id: string;
  period: 'WEEKLY' | 'MONTHLY';
  metric: 'CONTACTS' | 'MEETINGS' | 'SALES';
  target: number;
  current: number;
  percentage: number;
}

interface Prediction {
  hasSalesTarget: boolean;
  message?: string;
  period?: string;
  salesTarget?: number;
  currentSales?: number;
  remainingSales?: number;
  successRatePercent?: number;
  neededContacts?: number | null;
  note?: string | null;
}

export default function TargetsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [progress, setProgress] = useState<Progress[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

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
    const isMe = selectedAgentId === user?.id;
    const progressPath = isMe ? '/targets/me/progress' : `/targets/${selectedAgentId}/progress`;
    const predictionPath = isMe ? '/targets/me/prediction' : `/targets/${selectedAgentId}/prediction`;
    api.get<Progress[]>(progressPath).then(setProgress).catch(() => setProgress([]));
    api.get<Prediction>(predictionPath).then(setPrediction).catch(() => setPrediction(null));
  }, [selectedAgentId, user]);

  return (
    <div>
      <Header title="Cíle a predikce" />
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {progress.map((p) => (
            <div key={p.id} className="card p-5">
              <p className="text-sm text-slate-500">
                {METRIC_LABELS[p.metric]} ({p.period === 'WEEKLY' ? 'týdně' : 'měsíčně'})
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {p.current} / {p.target}
              </p>
              <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-brand-600 rounded-full"
                  style={{ width: `${Math.min(p.percentage, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-slate-500">{p.percentage}%</p>
            </div>
          ))}
          {progress.length === 0 && (
            <p className="text-sm text-slate-500 col-span-3">Obchodníkovi zatím nejsou nastaveny žádné cíle</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Predikce potřebných kontaktů</h2>
          {!prediction || !prediction.hasSalesTarget ? (
            <p className="text-sm text-slate-500">
              {prediction?.message ?? 'Nejsou k dispozici dostatečná data'}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Cíl prodejů" value={prediction.salesTarget} />
              <StatCard label="Aktuálně prodáno" value={prediction.currentSales} />
              <StatCard label="Zbývá prodat" value={prediction.remainingSales} />
              <StatCard label="Aktuální úspěšnost" value={`${prediction.successRatePercent}%`} />
              <StatCard
                label="Potřebný počet kontaktů"
                value={prediction.neededContacts ?? '—'}
                accent="text-brand-700"
                sub={
                  prediction.neededContacts != null && prediction.successRatePercent
                    ? `${prediction.remainingSales} / ${(prediction.successRatePercent / 100).toFixed(2)} = ${prediction.neededContacts}`
                    : prediction.note ?? undefined
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
