import React, { useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Activity, PieChart as PieIcon, BarChart3, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';

type Currency = 'TRY' | 'USD' | 'EUR';
const currencies: Currency[] = ['TRY', 'USD', 'EUR'];

export const ActivityReportsView: React.FC = () => {
  const { activities, customers, formatMoney } = useCrm();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('TRY');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const availableYears = [...new Set([new Date().getFullYear(), ...activities.map((activity) => new Date(activity.date).getFullYear())])].sort((a, b) => b - a);
  const scopedActivities = activities.filter((activity) => new Date(activity.date).getFullYear() === reportYear
    && activity.currency === selectedCurrency
    && (!selectedCustomerId || activity.customerId === selectedCustomerId));

  // 1. Pie Chart: "Durum Dağılımı"
  const statusCounts = scopedActivities.reduce((acc, act) => {
    acc[act.status] = (acc[act.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusColors: Record<string, string> = {
    Tamamlandı: '#10b981',
    Planlandı: '#4f46e5',
    Ertelendi: '#f59e0b',
    'İptal Edildi': '#ef4444',
  };

  const durumDagilimiData = Object.keys(statusCounts).map((status) => ({
    name: status,
    value: statusCounts[status],
    color: statusColors[status] || '#94a3b8',
  }));

  // 2. Bar Chart: "Genel Portföy Satış Olasılığı"
  const probabilityBuckets = [
    { range: '%0-%40 (Düşük)', min: 0, max: 40.999, count: 0, budget: 0 },
    { range: '%41-%60 (Orta)', min: 41, max: 60.999, count: 0, budget: 0 },
    { range: '%61-%80 (Yüksek)', min: 61, max: 80.999, count: 0, budget: 0 },
    { range: '%81-%100 (Çok Yüksek)', min: 81, max: 100, count: 0, budget: 0 },
  ];

  scopedActivities.forEach((act) => {
    const prob = act.probability || 0;
    const bucket = probabilityBuckets.find((b) => prob >= b.min && prob <= b.max);
    if (bucket) {
      bucket.count += 1;
      bucket.budget += (act.estimatedBudget || 0) / 1000000; // in Million TL
    }
  });

  const genelPortfoySatisOlasiligiData = probabilityBuckets.map((b) => ({
    name: b.range,
    AktiviteSayisi: b.count,
    TahminiHacim: Number(b.budget.toFixed(2)),
  }));

  // Type Breakdown
  const typeCounts = scopedActivities.reduce((acc, act) => {
    acc[act.type] = (acc[act.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalEstimatedPipeline = scopedActivities.reduce((sum, a) => sum + (a.estimatedBudget || 0), 0);
  const weightedPipeline = scopedActivities.reduce((sum, activity) => sum + ((activity.estimatedBudget || 0) * (activity.probability || 0) / 100), 0);
  const avgProbability = Math.round(
    scopedActivities.reduce((sum, a) => sum + (a.probability || 0), 0) / (scopedActivities.length || 1)
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-indigo-600" />
            <span>Aktivite Raporları ve Görüşme Analitikleri</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Saha ziyaretleri, müşteri toplantıları, demo süreçleri ve potansiyel fırsat satış olasılıkları
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select value={reportYear} onChange={(event) => setReportYear(Number(event.target.value))} aria-label="Rapor yılı" className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
            {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} aria-label="Rapor müşterisi" className="max-w-52 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
            <option value="">Tüm müşteriler</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.company}</option>)}
          </select>
          <select value={selectedCurrency} onChange={(event) => setSelectedCurrency(event.target.value as Currency)} aria-label="Rapor para birimi" className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
            {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
          </select>
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900">
            <span className="text-[11px] text-indigo-700 font-medium block">Toplam Pipeline</span>
            <strong className="text-base font-black">{formatMoney(totalEstimatedPipeline, selectedCurrency)}</strong>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-900">
            <span className="text-[11px] text-emerald-700 font-medium block">Ağırlıklı Beklenen Değer</span>
            <strong className="text-base font-black">{formatMoney(weightedPipeline, selectedCurrency)}</strong>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-900">
            <span className="text-[11px] text-amber-700 font-medium block">Ort. Satış Olasılığı</span>
            <strong className="text-base font-black">%{avgProbability}</strong>
          </div>
        </div>
      </div>

      {/* Required Two Main Charts: "Durum Dağılımı" and "Genel Portföy Satış Olasılığı" */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart: Durum Dağılımı */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Durum Dağılımı</span>
            </h3>
            <p className="text-xs text-slate-500">
              Aktivitelerin sonuçlanma (Tamamlandı, Planlandı, Ertelendi) durumu
            </p>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={durumDagilimiData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {durumDagilimiData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} Aktivite`, 'Adet']}
                  contentStyle={{ borderRadius: '8px', borderColor: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-xs">
            {durumDagilimiData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate">{item.name}:</span>
                <strong className="text-slate-900">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart: Genel Portföy Satış Olasılığı */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Genel Portföy Satış Olasılığı</span>
            </h3>
            <p className="text-xs text-slate-500">
              Olasılık dilimlerine göre beklenen ihale/sipariş bütçesi (Milyon ₺)
            </p>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genelPortfoySatisOlasiligiData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'TahminiHacim' ? `${value} Milyon ₺` : `${value} Adet`,
                    name === 'TahminiHacim' ? 'Tahmini Hacim' : 'Aktivite Sayısı',
                  ]}
                  contentStyle={{ borderRadius: '8px', borderColor: '#e2e8f0' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="TahminiHacim" fill="#4f46e5" name="Tahmini Hacim (Milyon ₺)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="AktiviteSayisi" fill="#10b981" name="Aktivite Sayısı" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>En yüksek olasılıklı grup: <strong>%81-%100 (Çok Yüksek)</strong></span>
            <span className="text-emerald-700 font-bold">Kritik İhale Fırsatları</span>
          </div>
        </div>
      </div>

      {/* Activity Type Breakdown Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Aktivite Türlerine Göre Portföy Özeti</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Object.entries(typeCounts).map(([typeName, count]) => (
            <div key={typeName} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <span className="text-xs text-slate-500 font-medium block truncate">{typeName}</span>
              <strong className="text-xl font-bold text-slate-900 mt-1 block">{count}</strong>
              <span className="text-[10px] text-indigo-600 font-semibold">Görüşme</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
