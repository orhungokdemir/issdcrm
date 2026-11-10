import React, { useEffect, useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import {
  Users,
  Cpu,
  Building2,
  FileText,
  PackageCheck,
  ScrollText,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Activity,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Briefcase,
} from 'lucide-react';
import { getStatusBadge } from '../common/Badge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type Currency = 'TRY' | 'USD' | 'EUR';
const currencies: Currency[] = ['TRY', 'USD', 'EUR'];
const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const getDateParts = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? { year: Number(match[1]), month: Number(match[2]) - 1 } : null;
};

export const DashboardView: React.FC = () => {
  const {
    users,
    products,
    customers,
    proposals,
    orders,
    contracts,
    activities,
    currentUser,
    setCurrentModule,
    formatMoney,
  } = useCrm();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(() => {
    try {
      const stored = localStorage.getItem(`issd_crm_preferences_${currentUser.email.toLowerCase()}`);
      const preferences = stored ? JSON.parse(stored) as { defaultCurrency?: Currency } : {};
      return preferences.defaultCurrency || 'TRY';
    } catch {
      return 'TRY';
    }
  });

  useEffect(() => {
    const applyPreferences = () => {
      try {
        const stored = localStorage.getItem(`issd_crm_preferences_${currentUser.email.toLowerCase()}`);
        const preferences = stored ? JSON.parse(stored) as { defaultCurrency?: Currency } : {};
        setSelectedCurrency(preferences.defaultCurrency || 'TRY');
      } catch {
        setSelectedCurrency('TRY');
      }
    };
    window.addEventListener('crm-preferences-changed', applyPreferences);
    return () => window.removeEventListener('crm-preferences-changed', applyPreferences);
  }, [currentUser.email]);

  // Summary Metrics as required:
  // (Kullanıcı Sayısı, Ürün Sayısı, Müşteri Sayısı, Teklif Sayısı, Sipariş Sayısı, Sözleşme Sayısı)
  const summaryCards = [
    {
      id: 'users',
      title: 'Kullanıcı Sayısı',
      count: users.length,
      unit: 'Aktif Personel',
      icon: Users,
      bgLight: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      module: 'users' as const,
    },
    {
      id: 'products',
      title: 'Ürün Sayısı',
      count: products.length,
      unit: 'Donanım / Yazılım',
      icon: Cpu,
      bgLight: 'bg-sky-50 text-sky-600 border-sky-100',
      module: 'products' as const,
    },
    {
      id: 'customers',
      title: 'Müşteri Sayısı',
      count: customers.length,
      unit: 'Kurum & Belediye',
      icon: Building2,
      bgLight: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      module: 'customers' as const,
    },
    {
      id: 'proposals',
      title: 'Teklif Sayısı',
      count: proposals.length,
      unit: 'Toplam Portföy',
      icon: FileText,
      bgLight: 'bg-amber-50 text-amber-600 border-amber-100',
      module: 'proposals' as const,
    },
    {
      id: 'orders',
      title: 'Sipariş Sayısı',
      count: orders.length,
      unit: 'İşleme Alınan',
      icon: PackageCheck,
      bgLight: 'bg-violet-50 text-violet-600 border-violet-100',
      module: 'orders' as const,
    },
    {
      id: 'contracts',
      title: 'Sözleşme Sayısı',
      count: contracts.length,
      unit: 'Yürürlükteki',
      icon: ScrollText,
      bgLight: 'bg-rose-50 text-rose-600 border-rose-100',
      module: 'contracts' as const,
    },
  ];

  const sumByCurrency = <T extends { currency: Currency; grandTotal: number }>(items: T[]) =>
    currencies.reduce((totals, currency) => {
      totals[currency] = items
        .filter((item) => item.currency === currency)
        .reduce((sum, item) => sum + (item.grandTotal || 0), 0);
      return totals;
    }, {} as Record<Currency, number>);

  const proposalTotals = sumByCurrency(proposals);
  const orderTotals = sumByCurrency(orders);
  const contractTotals: Record<Currency, number> = {
    TRY: contracts.reduce((sum, contract) => sum + (contract.price || 0), 0),
    USD: 0,
    EUR: 0,
  };

  // Proposal status distribution data
  const proposalStatusData = [
    {
      name: 'Onay',
      value: proposals.filter((p) => p.status === 'Onay').length,
      color: '#10b981',
    },
    {
      name: 'Açık',
      value: proposals.filter((p) => p.status === 'Açık').length,
      color: '#6366f1',
    },
    {
      name: 'Red',
      value: proposals.filter((p) => p.status === 'Red').length,
      color: '#f43f5e',
    },
    {
      name: 'İptal',
      value: proposals.filter((p) => p.status === 'İptal').length,
      color: '#94a3b8',
    },
  ].filter((item) => item.value > 0);

  const currentDate = new Date();
  const monthlyPipelineData = Array.from({ length: 6 }, (_, index) => {
    const monthOffset = 5 - index;
    const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - monthOffset, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const matchesMonth = (date: string) => {
      const parts = getDateParts(date);
      return parts?.year === year && parts.month === month;
    };
    return {
      ay: `${monthNames[month]} ${String(year).slice(-2)}`,
      Teklif: proposals
        .filter((proposal) => proposal.currency === selectedCurrency && matchesMonth(proposal.createdAt))
        .reduce((sum, proposal) => sum + (proposal.grandTotal || 0), 0) / 1000000,
      Siparis: orders
        .filter((order) => order.currency === selectedCurrency && matchesMonth(order.orderDate))
        .reduce((sum, order) => sum + (order.grandTotal || 0), 0) / 1000000,
      Sozlesme: selectedCurrency === 'TRY'
        ? contracts.filter((contract) => matchesMonth(contract.startDate)).reduce((sum, contract) => sum + (contract.price || 0), 0) / 1000000
        : 0,
    };
  });

  const financialRows = (totals: Record<Currency, number>) => (
    <div className="mt-2 space-y-1.5">
      {currencies.map((currency) => (
        <div key={currency} className="flex items-center justify-between text-sm">
          <span className="text-[11px] font-semibold text-slate-500">{currency}</span>
          <span className="font-bold text-slate-900">{formatMoney(totals[currency], currency)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Banner with Clean Minimalist Styling */}
      <div className="bg-white rounded-xl p-6 shadow-2xs border border-slate-200/90 relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2 border border-indigo-200/60">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            ISSD Akıllı Ulaşım Sistemleri CRM Paneli
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Kurumsal B2B Müşteri ve Proje Yönetimi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            EDS hız koridorları, dinamik kavşak kontrol sensörleri ve akıllı şehir altyapı projelerinizin teklif, sipariş ve sözleşme süreçlerini anlık olarak takip edin.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => setCurrentModule('proposals')}
            className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Yeni Teklif Oluştur</span>
          </button>
          <button
            onClick={() => setCurrentModule('proposal-reports')}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Raporları İncele</span>
          </button>
        </div>
      </div>

      {/* Required 6 Summary Metric Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Temel Sistem Metrikleri
          </h2>
          <span className="text-xs text-slate-400">Canlı Veri Özeti</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => setCurrentModule(card.module)}
                className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all text-left group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border ${card.bgLight}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </div>

                <div>
                  <span className="text-2xl font-bold text-slate-900 tracking-tight block">
                    {card.count}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 line-clamp-1">
                    {card.title}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{card.unit}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Financial Pipeline Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Toplam Teklif Portföyü</span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200/60">
              {proposals.length} Teklif
            </span>
          </div>
          {financialRows(proposalTotals)}
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Aktif belediye ve kamu ihaleleri</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Toplam Sipariş Hacmi</span>
            <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[10px] font-semibold border border-violet-200/60">
              {orders.length} Sipariş
            </span>
          </div>
          {financialRows(orderTotals)}
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sevkiyat ve montaj aşamasında</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Sözleşme Toplam Değeri</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200/60">
              {contracts.length} Sözleşme
            </span>
          </div>
          {financialRows(contractTotals)}
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
            <span>Çok yıllı SLA & Anahtar teslim</span>
          </p>
        </div>
      </div>

      {/* Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Aylık Finansal Akış (Milyon {selectedCurrency})</h3>
              <p className="text-xs text-slate-500">Kayıt tarihleri üzerinden gerçek veriler</p>
            </div>
            <select
              value={selectedCurrency}
              onChange={(event) => setSelectedCurrency(event.target.value as Currency)}
              aria-label="Grafik para birimi"
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
            >
              {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
            <button
              onClick={() => setCurrentModule('proposal-reports')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1"
            >
              <span>Detaylı Rapor</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="ay" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [`${value} Milyon ${selectedCurrency}`, '']}
                  contentStyle={{
                    borderRadius: '8px',
                    borderColor: '#e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Teklif" fill="#6366f1" name="Teklifler" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Siparis" fill="#10b981" name="Siparişler" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Sozlesme" fill="#f59e0b" name="Sözleşmeler" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Proposal Distribution Pie */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Teklif Durum Dağılımı</h3>
            <p className="text-xs text-slate-500">Mevcut tekliflerin sonuçlanma durumu</p>
          </div>

          <div className="h-48 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={proposalStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {proposalStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} Adet`, 'Adet']}
                  contentStyle={{ borderRadius: '8px', borderColor: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {proposalStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600">{item.name}:</span>
                <strong className="text-slate-900">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Proposals & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Proposals */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Son Teklifler</h3>
            </div>
            <button
              onClick={() => setCurrentModule('proposals')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Tümünü Gör ({proposals.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {proposals.slice(0, 4).map((prop) => (
              <div key={prop.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{prop.proposalNo}</span>
                    {getStatusBadge(prop.status)}
                    {prop.projectCode && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm">
                        {prop.projectCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate mt-0.5">{prop.customerName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{prop.subject}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-900 block">
                    {formatMoney(prop.grandTotal, prop.currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">{prop.createdAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">Son Aktiviteler & Görüşmeler</h3>
            </div>
            <button
              onClick={() => setCurrentModule('activities')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Tümünü Gör ({activities.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {activities.slice(0, 4).map((act) => (
              <div key={act.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      {act.type}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">{act.customerName}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate mt-1">{act.subject}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{act.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-500 block font-medium">{act.date}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">%{act.probability} Olasılık</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
