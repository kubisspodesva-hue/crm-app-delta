'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { ChangeIndicator } from '@/components/ChangeIndicator';
import { Money } from '@/components/Money';
import { TodayFocusSection } from '@/components/TodayFocusSection';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface MonthMetric {
  thisMonth: number;
  lastMonth: number;
  changePercent: number;
}

interface MonthComparison {
  sales: MonthMetric;
  revenue: MonthMetric;
  meetings: MonthMetric;
}

interface AdminDashboard {
  role: 'ADMIN';
  newLeadsToday: number;
  meetingsToday: number;
  meetingsThisWeek: number;
  salesTotal: number;
  inProgressTotal: number;
  teamPerformance: any[];
  topAgents: any[];
  salesChart: { week: string; sales: number; contacts: number; meetings: number }[];
  teamMonthComparison: MonthComparison;
}

interface AgentDashboard {
  role: 'AGENT';
  contactedCount: number;
  inProgressCount: number;
  meetingsCount: number;
  soldCount: number;
  rejectedCount: number;
  conversionRate: number;
  successRate: number;
  revenue: number;
  commission: number;
  careerLevel: string;
  careerLevelEmoji: string;
  careerLevelMinSales: number;
  nextLevelTitle: string | null;
  salesToNextLevel: number | null;
  weekComparison: {
    contacts: { thisWeek: number; lastWeek: number; changePercent: number };
    sales: { thisWeek: number; lastWeek: number; changePercent: number };
    trend: { week: string; contacts: number; sales: number; meetings: number }[];
  };
  monthComparison: MonthComparison;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminDashboard | AgentDashboard | null>(null);

  useEffect(() => {
    api.get('/stats/dashboard').then(setData).catch(() => setData(null));
  }, []);

  return (
    <div>
      <Header title={`Vítejte, ${user?.firstName ?? ''}`} />
      <div className="p-4 md:p-6 space-y-6">
        {!data && <p className="text-slate-500">Načítání statistik…</p>}

        {data && <TodayFocusSection />}

        {data?.role === 'ADMIN' && <AdminView data={data} />}
        {data?.role === 'AGENT' && <AgentView data={data} />}
      </div>
    </div>
  );
}

function MonthComparisonSection({ data, title }: { data: MonthComparison; title: string }) {
  return (
    <div>
      <h2 className="font-semibold text-slate-800 mb-3">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500 mb-1">Prodeje - tento měsíc vs. minulý</p>
          <p className="text-xl font-semibold">
            {data.sales.thisMonth} vs. {data.sales.lastMonth}{' '}
            <ChangeIndicator percent={data.sales.changePercent} />
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500 mb-1">Obrat - tento měsíc vs. minulý</p>
          <p className="text-xl font-semibold">
            <Money value={data.revenue.thisMonth} /> vs. <Money value={data.revenue.lastMonth} />{' '}
            <ChangeIndicator percent={data.revenue.changePercent} />
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500 mb-1">Schůzky - tento měsíc vs. minulý</p>
          <p className="text-xl font-semibold">
            {data.meetings.thisMonth} vs. {data.meetings.lastMonth}{' '}
            <ChangeIndicator percent={data.meetings.changePercent} />
          </p>
        </div>
      </div>
    </div>
  );
}

function AdminView({ data }: { data: AdminDashboard }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Nové leady dnes" value={data.newLeadsToday} />
        <StatCard label="Schůzky dnes" value={data.meetingsToday} />
        <StatCard label="Schůzky tento týden" value={data.meetingsThisWeek} />
        <StatCard label="Prodáno celkem" value={data.salesTotal} accent="text-emerald-600" />
        <StatCard label="Leady v procesu" value={data.inProgressTotal} accent="text-amber-600" />
      </div>

      <MonthComparisonSection data={data.teamMonthComparison} title="Celý tým - měsíční srovnání" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Vývoj prodejů a kontaktů (8 týdnů)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.salesChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ color: '#b7bac1', fontSize: 12 }} />
              <Line type="monotone" dataKey="contacts" name="Kontakty" stroke="#2563eb" strokeWidth={2} />
              <Line type="monotone" dataKey="sales" name="Prodeje" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="meetings" name="Schůzky" stroke="#7c3aed" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Nejlepší obchodníci (podle obratu)</h2>
          <div className="space-y-3">
            {data.topAgents.map((a, idx) => (
              <div key={a.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-slate-400 font-medium">#{idx + 1}</span>
                  <span className="font-medium text-slate-800">
                    {a.firstName} {a.lastName}
                  </span>
                </div>
                <span className="font-semibold text-slate-900">
                  <Money value={a.revenue} />
                </span>
              </div>
            ))}
            {data.topAgents.length === 0 && (
              <p className="text-sm text-slate-500">Zatím žádná data</p>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Výkon týmu</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.teamPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2c30" />
            <XAxis dataKey="lastName" tick={{ fontSize: 12, fill: '#8b8f98' }} axisLine={{ stroke: '#2a2c30' }} tickLine={{ stroke: '#2a2c30' }} />
            <YAxis tick={{ fontSize: 12, fill: '#8b8f98' }} allowDecimals={false} axisLine={{ stroke: '#2a2c30' }} tickLine={{ stroke: '#2a2c30' }} />
            <Tooltip contentStyle={{ backgroundColor: '#17181c', border: '1px solid #2a2c30', borderRadius: 0, color: '#fff' }} labelStyle={{ color: '#fff' }} />
            <Legend wrapperStyle={{ color: '#b7bac1', fontSize: 12 }} />
            <Bar dataKey="soldCount" name="Prodeje" fill="#22c55e" radius={[0, 0, 0, 0]} />
            <Bar dataKey="meetingsCount" name="Schůzky" fill="#2563eb" radius={[0, 0, 0, 0]} />
            <Bar dataKey="rejectedCount" name="Odmítnutí" fill="#ef4444" radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function CareerLevelCard({ data }: { data: AgentDashboard }) {
  const progress = data.nextLevelTitle
    ? Math.min(
        100,
        Math.max(
          0,
          ((data.soldCount - data.careerLevelMinSales) /
            (data.soldCount + (data.salesToNextLevel ?? 0) - data.careerLevelMinSales || 1)) *
            100,
        ),
      )
    : 100;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{data.careerLevelEmoji}</span>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Kariérní úroveň</p>
            <p className="font-semibold text-slate-900">{data.careerLevel}</p>
          </div>
        </div>
        {data.nextLevelTitle ? (
          <p className="text-sm text-slate-500">
            Ještě <span className="font-semibold text-slate-700">{data.salesToNextLevel}</span>{' '}
            {data.salesToNextLevel === 1 ? 'prodej' : 'prodejů'} do úrovně{' '}
            <span className="font-semibold text-slate-700">{data.nextLevelTitle}</span>
          </p>
        ) : (
          <p className="text-sm font-semibold text-brand-600">Nejvyšší úroveň dosažena 👑</p>
        )}
      </div>
      <div className="h-2 w-full bg-slate-200 overflow-hidden">
        <div className="h-full bg-brand-600" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function AgentView({ data }: { data: AgentDashboard }) {
  return (
    <>
      <CareerLevelCard data={data} />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard label="Kontaktováno" value={data.contactedCount} />
        <StatCard label="V procesu" value={data.inProgressCount} accent="text-amber-600" />
        <StatCard label="Domluvené schůzky" value={data.meetingsCount} accent="text-blue-600" />
        <StatCard label="Prodáno" value={data.soldCount} accent="text-emerald-600" />
        <StatCard label="Odmítnuto" value={data.rejectedCount} accent="text-red-600" />
        <StatCard label="Konverzní poměr" value={`${data.conversionRate}%`} />
        <StatCard label="Úspěšnost" value={`${data.successRate}%`} />
        <StatCard label="Aktuální provize" value={<Money value={data.commission} />} accent="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500 mb-1">Kontakty - tento týden vs. minulý</p>
          <p className="text-xl font-semibold">
            {data.weekComparison.contacts.thisWeek} vs. {data.weekComparison.contacts.lastWeek}{' '}
            <ChangeIndicator percent={data.weekComparison.contacts.changePercent} />
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500 mb-1">Prodeje - tento týden vs. minulý</p>
          <p className="text-xl font-semibold">
            {data.weekComparison.sales.thisWeek} vs. {data.weekComparison.sales.lastWeek}{' '}
            <ChangeIndicator percent={data.weekComparison.sales.changePercent} />
          </p>
        </div>
      </div>

      <MonthComparisonSection data={data.monthComparison} title="Moje měsíční srovnání" />

      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Vývoj výkonu (8 týdnů)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.weekComparison.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2c30" />
            <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#8b8f98' }} axisLine={{ stroke: '#2a2c30' }} tickLine={{ stroke: '#2a2c30' }} />
            <YAxis tick={{ fontSize: 12, fill: '#8b8f98' }} allowDecimals={false} axisLine={{ stroke: '#2a2c30' }} tickLine={{ stroke: '#2a2c30' }} />
            <Tooltip contentStyle={{ backgroundColor: '#17181c', border: '1px solid #2a2c30', borderRadius: 0, color: '#fff' }} labelStyle={{ color: '#fff' }} />
            <Legend wrapperStyle={{ color: '#b7bac1', fontSize: 12 }} />
            <Line type="monotone" dataKey="contacts" name="Kontakty" stroke="#2563eb" strokeWidth={2} />
            <Line type="monotone" dataKey="sales" name="Prodeje" stroke="#22c55e" strokeWidth={2} />
            <Line type="monotone" dataKey="meetings" name="Schůzky" stroke="#7c3aed" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
