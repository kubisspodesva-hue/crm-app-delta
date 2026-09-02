'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { api, ApiError } from '@/lib/api';
import { TimeSlot } from '@/types';

// Preferovaný čas pro schůzky - sloty v tomto rozmezí se v seznamu zvýrazní,
// ať obchodníci vědí, které termíny mají klientům nabízet přednostně.
const PRIORITY_START_HOUR = 8;
const PRIORITY_END_HOUR = 11;

function isPrioritySlot(slot: TimeSlot): boolean {
  const hour = new Date(slot.start).getHours();
  return hour >= PRIORITY_START_HOUR && hour < PRIORITY_END_HOUR;
}

export function MeetingBookerModal({
  leadId,
  leadName,
  onClose,
  onBooked,
}: {
  leadId: string;
  leadName: string;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selected, setSelected] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingSlots(true);
    setError(null);
    setSelected(null);
    api
      .get<TimeSlot[]>(`/meetings/available-slots?date=${date}`)
      .then(setSlots)
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Nepodařilo se načíst volné termíny. Je propojen Google Kalendář?',
        );
        setSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [date]);

  async function confirmBooking() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/meetings', {
        leadId,
        start: selected.start,
        end: selected.end,
        notes: notes || undefined,
      });
      onBooked();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Rezervace se nezdařila, zkuste jiný termín');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-1">Domluvit schůzku</h2>
        <p className="text-sm text-slate-500 mb-4">Klient: {leadName}</p>

        {error && (
          <div className="rounded-none bg-red-950/40 text-red-400 text-sm px-3 py-2 border border-red-900 mb-3">
            {error}
          </div>
        )}

        <label className="label">Datum</label>
        <input
          type="date"
          className="input mb-4"
          value={date}
          min={format(new Date(), 'yyyy-MM-dd')}
          onChange={(e) => setDate(e.target.value)}
        />

        <label className="label">Volné termíny</label>
        <p className="text-xs text-amber-400 bg-amber-950/40 border border-amber-900 rounded-none px-3 py-2 mb-3">
          Přednostně nabízejte klientům čas <strong>{PRIORITY_START_HOUR}:00–{PRIORITY_END_HOUR}:00</strong> (označeno hvězdičkou) - tyto termíny preferujeme.
        </p>
        {loadingSlots && <p className="text-sm text-slate-500">Načítám dostupné termíny…</p>}
        {!loadingSlots && slots.length === 0 && !error && (
          <p className="text-sm text-slate-500">Pro tento den nejsou žádné volné termíny</p>
        )}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {slots.map((slot) => {
            const isSelected = selected?.start === slot.start;
            const priority = isPrioritySlot(slot);
            return (
              <button
                key={slot.start}
                onClick={() => setSelected(slot)}
                title={priority ? 'Preferovaný čas' : undefined}
                className={`relative rounded-none border px-2 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : priority
                      ? 'border-amber-800 bg-amber-950/40 hover:bg-amber-950/60'
                      : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                {format(new Date(slot.start), 'HH:mm')}
                {priority && <span className="ml-1">★</span>}
              </button>
            );
          })}
        </div>

        <label className="label">Poznámka ke schůzce (volitelné)</label>
        <textarea
          className="input mb-4"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Zrušit
          </button>
          <button
            className="btn-primary"
            disabled={!selected || saving}
            onClick={confirmBooking}
          >
            {saving ? 'Rezervuji…' : 'Potvrdit rezervaci'}
          </button>
        </div>
      </div>
    </div>
  );
}
