'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { api, ApiError } from '@/lib/api';

interface CalendarStatus {
  connected: boolean;
  googleEmail?: string;
  workingHourStart?: number;
  workingHourEnd?: number;
  slotDurationMin?: number;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [hours, setHours] = useState({ workingHourStart: 8, workingHourEnd: 18, slotDurationMin: 30 });
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);

  async function load() {
    try {
      const data = await api.get<CalendarStatus>('/calendar/google/status');
      setStatus(data);
      if (data.connected) {
        setHours({
          workingHourStart: data.workingHourStart ?? 8,
          workingHourEnd: data.workingHourEnd ?? 18,
          slotDurationMin: data.slotDurationMin ?? 30,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nepodařilo se načíst stav propojení');
    }
  }

  async function saveHours() {
    setSavingHours(true);
    setError(null);
    setHoursSaved(false);
    try {
      const data = await api.patch<CalendarStatus>('/calendar/google/working-hours', hours);
      setStatus(data);
      setHoursSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Pracovní dobu se nepodařilo uložit');
    } finally {
      setSavingHours(false);
    }
  }

  // Načte se při vstupu na stránku - včetně návratu zpět z Google OAuth flow
  // (ten na tuto stránku přesměruje s ?calendar=connected).
  useEffect(() => {
    load();
  }, []);

  async function connect() {
    setConnecting(true);
    setError(null);
    try {
      const data = await api.get<{ url: string }>('/calendar/google/connect');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Propojení se nepodařilo spustit');
      setConnecting(false);
    }
  }

  return (
    <div>
      <Header title="Nastavení" />
      <div className="p-4 md:p-6 space-y-4 max-w-2xl">
        {error && (
          <div className="rounded-none bg-red-950/40 text-red-400 text-sm px-3 py-2 border border-red-900">
            {error}
          </div>
        )}

        <div className="card p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-slate-900">Google Kalendář</h2>
            <p className="text-sm text-slate-500 mt-1">
              Propojení umožňuje appce automaticky nabízet volné termíny a zapisovat domluvené
              schůzky přímo do sdíleného firemního kalendáře.
            </p>
          </div>

          {status === null ? (
            <p className="text-sm text-slate-500">Načítám stav…</p>
          ) : status.connected ? (
            <div className="flex items-center justify-between rounded-none bg-emerald-950/40 border border-emerald-900 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-emerald-400">Kalendář je propojen</p>
                <p className="text-sm text-emerald-400">{status.googleEmail}</p>
              </div>
              <button className="btn-secondary text-sm" onClick={connect} disabled={connecting}>
                {connecting ? 'Otevírám Google…' : 'Propojit jiný účet'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-none bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-sm text-slate-600">Kalendář zatím není propojen</p>
              <button className="btn-primary text-sm" onClick={connect} disabled={connecting}>
                {connecting ? 'Otevírám Google…' : 'Propojit Google Kalendář'}
              </button>
            </div>
          )}
        </div>

        {status?.connected && (
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-slate-900">Pracovní doba pro schůzky</h2>
              <p className="text-sm text-slate-500 mt-1">
                Appka bude nabízet volné termíny jen v tomto rozmezí. Sloty mezi 8:00–11:00 se
                navíc obchodníkům v booking okně zvýrazní jako preferované.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Od (hodina)</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  className="input"
                  value={hours.workingHourStart}
                  onChange={(e) =>
                    setHours({ ...hours, workingHourStart: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="label">Do (hodina)</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  className="input"
                  value={hours.workingHourEnd}
                  onChange={(e) => setHours({ ...hours, workingHourEnd: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Délka schůzky (min)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  className="input"
                  value={hours.slotDurationMin}
                  onChange={(e) =>
                    setHours({ ...hours, slotDurationMin: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="btn-primary text-sm" onClick={saveHours} disabled={savingHours}>
                {savingHours ? 'Ukládám…' : 'Uložit pracovní dobu'}
              </button>
              {hoursSaved && <span className="text-sm text-emerald-600">Uloženo</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
