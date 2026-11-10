import React, { useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, FileText, CheckCircle2, XCircle, Clock, AlertCircle, GitBranch } from 'lucide-react';

type Currency = 'TRY' | 'USD' | 'EUR';
type ProposalStatus = 'Açık' | 'Onay' | 'Red' | 'İptal';
const currencies: Currency[] = ['TRY', 'USD', 'EUR'];
const statuses: ProposalStatus[] = ['Açık', 'Onay', 'Red', 'İptal'];

export const ProposalReportsView: React.FC = () => {
  const { proposals, customers, products, formatMoney, getWorkflowSummary } = useCrm();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('TRY');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const availableYears = [...new Set([new Date().getFullYear(), ...proposals.map((proposal) => new Date(proposal.createdAt).getFullYear())])].sort((a, b) => b - a);
  const scopedProposals = proposals.filter((proposal) => {
    const createdYear = new Date(proposal.createdAt).getFullYear();
    return (!selectedCustomerId || proposal.customerId === selectedCustomerId) && createdYear === reportYear;
  });
  const workflowSummary = getWorkflowSummary(selectedCurrency, selectedCustomerId || undefined, reportYear);

  // Status Totals
  const statusSummary = statuses.reduce((summary, status) => {
    summary[status] = currencies.reduce((totals, currency) => {
      const matchingProposals = scopedProposals.filter((proposal) => proposal.status === status && proposal.currency === currency);
      totals[currency] = {
        count: matchingProposals.length,
        total: matchingProposals.reduce((sum, proposal) => sum + (proposal.grandTotal || 0), 0),
      };
      return totals;
    }, {} as Record<Currency, { count: number; total: number }>);
    return summary;
  }, {} as Record<ProposalStatus, Record<Currency, { count: number; total: number }>>);

  const selectedTotals = statuses.reduce((total, status) => total + statusSummary[status][selectedCurrency].total, 0);
  const selectedApprovedTotal = statusSummary['Onay'][selectedCurrency].total;

  // Chart Data: "Teklif Durum ve Finansal Değer Analizi"
  const teklifDurumFinansalAnaliziData = [
    {
      durum: 'Açık Teklifler',
      Adet: statusSummary['Açık'][selectedCurrency].count,
      FinansalDeger: Number((statusSummary['Açık'][selectedCurrency].total / 1000000).toFixed(2)),
      fill: '#4f46e5',
    },
    {
      durum: 'Onaylanan Teklifler',
      Adet: statusSummary['Onay'][selectedCurrency].count,
      FinansalDeger: Number((statusSummary['Onay'][selectedCurrency].total / 1000000).toFixed(2)),
      fill: '#10b981',
    },
    {
      durum: 'Reddedilen Teklifler',
      Adet: statusSummary['Red'][selectedCurrency].count,
      FinansalDeger: Number((statusSummary['Red'][selectedCurrency].total / 1000000).toFixed(2)),
      fill: '#ef4444',
    },
    {
      durum: 'İptal Edilenler',
      Adet: statusSummary['İptal'][selectedCurrency].count,
      FinansalDeger: Number((statusSummary['İptal'][selectedCurrency].total / 1000000).toFixed(2)),
      fill: '#94a3b8',
    },
  ];

  const timelineFinancialData = [1, 2, 3, 4].map((quarter) => {
    const quarterProposals = scopedProposals.filter((proposal) => {
      const createdDate = new Date(proposal.createdAt);
      return proposal.currency === selectedCurrency && Math.ceil((createdDate.getMonth() + 1) / 3) === quarter;
    });
    return {
      donem: `${reportYear} Q${quarter}`,
      ToplamDeger: Number((quarterProposals.reduce((sum, proposal) => sum + (proposal.grandTotal || 0), 0) / 1000000).toFixed(2)),
      OnaylananDeger: Number((quarterProposals.filter((proposal) => proposal.status === 'Onay').reduce((sum, proposal) => sum + (proposal.grandTotal || 0), 0) / 1000000).toFixed(2)),
    };
  });

  const winRate = selectedTotals > 0 ? Math.round((selectedApprovedTotal / selectedTotals) * 100) : 0;
  const selectedProposals = scopedProposals.filter((proposal) => proposal.currency === selectedCurrency);
  const selectedCost = selectedProposals.reduce((sum, proposal) => sum + (proposal.items || []).reduce((lineTotal, line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    return lineTotal + ((product?.costPrice || 0) * line.quantity);
  }, 0), 0);
  const selectedGrossProfit = selectedTotals - selectedCost;
  const grossMargin = selectedTotals > 0 ? Math.round((selectedGrossProfit / selectedTotals) * 100) : 0;

  const formatStatusTotals = (status: ProposalStatus) => (
    <div className="space-y-0.5">
      {currencies.map((currency) => (
        <div key={currency} className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold text-slate-500">{currency}</span>
          <span>{formatMoney(statusSummary[status][currency].total, currency)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <span>Teklif Raporları ve Finansal Değer Analizi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Teklif kabul oranları, onaylanan ihale bedelleri ve açık portföy büyüklüğü
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
            <span className="text-[11px] text-indigo-700 font-medium block">Toplam Portföy Hacmi</span>
            <strong className="text-base font-black">{formatMoney(selectedTotals, selectedCurrency)}</strong>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-900">
            <span className="text-[11px] text-emerald-700 font-medium block">Onaylanan İhale Tutarı</span>
            <strong className="text-base font-black">{formatMoney(selectedApprovedTotal, selectedCurrency)}</strong>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-purple-900">
            <span className="text-[11px] text-purple-700 font-medium block">Finansal Kazanım Oranı</span>
            <strong className="text-base font-black">%{winRate}</strong>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-900">
            <span className="text-[11px] text-amber-700 font-medium block">Tahmini Maliyet</span>
            <strong className="text-base font-black">{formatMoney(selectedCost, selectedCurrency)}</strong>
          </div>
          <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg text-teal-900">
            <span className="text-[11px] text-teal-700 font-medium block">Brüt Kâr / Marj</span>
            <strong className="text-base font-black">{formatMoney(selectedGrossProfit, selectedCurrency)} / %{grossMargin}</strong>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-5 rounded-xl text-white shadow-2xs">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-cyan-300" />
          <div>
            <h3 className="text-sm font-bold">İş Akışı Zinciri</h3>
            <p className="text-xs text-slate-300">Talep bağlantılı kayıtların uçtan uca durumu</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Talepler', workflowSummary.requestCount, 'text-cyan-300'],
            ['Teklifler', workflowSummary.proposalCount, 'text-indigo-300'],
            ['Siparişler', workflowSummary.orderCount, 'text-emerald-300'],
            ['Sözleşmeler', workflowSummary.contractCount, 'text-amber-300'],
            ['Teminatlar', workflowSummary.guaranteeLetterCount, 'text-rose-300'],
          ].map(([label, value, color]) => (
            <div key={String(label)} className="border border-slate-700 rounded-lg px-3 py-2">
              <span className="block text-[11px] text-slate-400">{label}</span>
              <strong className={`text-xl font-black ${color}`}>{value}</strong>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="border-t border-slate-700 pt-3">
            <span className="text-slate-400 block">Bağlı teklif hacmi</span>
            <strong>{formatMoney(workflowSummary.proposalValue, selectedCurrency)}</strong>
          </div>
          <div className="border-t border-slate-700 pt-3">
            <span className="text-slate-400 block">Bağlı sipariş hacmi</span>
            <strong>{formatMoney(workflowSummary.orderValue, selectedCurrency)}</strong>
          </div>
          <div className="border-t border-slate-700 pt-3">
            <span className="text-slate-400 block">Teklif → Sipariş / Sipariş → Sözleşme</span>
            <strong>%{workflowSummary.proposalToOrderRate} / %{workflowSummary.orderToContractRate}</strong>
          </div>
        </div>
      </div>

      {/* Main Chart: Teklif Durum ve Finansal Değer Analizi (Bar + Line) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Teklif Durum ve Finansal Değer Analizi</h3>
            <p className="text-xs text-slate-500">
              {selectedCurrency} bazında toplam parasal değer (Milyon) ve teklif adetleri
            </p>
          </div>

          <div className="h-72 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teklifDurumFinansalAnaliziData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="durum" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'FinansalDeger' ? `${value} Milyon ${selectedCurrency}` : `${value} Adet`,
                    name === 'FinansalDeger' ? 'Finansal Değer' : 'Teklif Adedi',
                  ]}
                  contentStyle={{ borderRadius: '8px', borderColor: '#e2e8f0' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="FinansalDeger" name={`Finansal Değer (Milyon ${selectedCurrency})`} fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Adet" name="Teklif Adedi" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="p-2 bg-indigo-50/60 rounded-md border border-indigo-100">
              <span className="text-slate-500 block">Açıkta Bekleyen:</span>
              <strong className="text-indigo-700 font-bold">{formatMoney(statusSummary['Açık'][selectedCurrency].total, selectedCurrency)}</strong>
            </div>
            <div className="p-2 bg-emerald-50/60 rounded-md border border-emerald-100">
              <span className="text-slate-500 block">Kabul Edilen:</span>
              <strong className="text-emerald-700 font-bold">{formatMoney(statusSummary['Onay'][selectedCurrency].total, selectedCurrency)}</strong>
            </div>
          </div>
        </div>

        {/* Financial Growth & Projections (Line / Area Chart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Çeyreklik Teklif & Gelir Projeksiyonu</h3>
            <p className="text-xs text-slate-500">
              Gerçek teklif tarihine göre finansal trend (Milyon {selectedCurrency})
            </p>
          </div>

          <div className="h-72 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineFinancialData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorToplam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOnay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="donem" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [`${value} Milyon ${selectedCurrency}`, '']}
                  contentStyle={{ borderRadius: '8px', borderColor: '#e2e8f0' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="ToplamDeger"
                  name={`Toplam Portföy (Milyon ${selectedCurrency})`}
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorToplam)"
                />
                <Area
                  type="monotone"
                  dataKey="OnaylananDeger"
                  name={`Onaylanan Teklifler (Milyon ${selectedCurrency})`}
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOnay)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>{reportYear} Gerçekleşen Teklif Hacmi: <strong>{formatMoney(selectedTotals, selectedCurrency)}</strong></span>
            <span className="text-indigo-700 font-bold">Onay oranı %{winRate}</span>
          </div>
        </div>
      </div>

      {/* Breakdown Details Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Teklif Durum Özet Tablosu</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase">
              <tr>
                <th className="py-2.5 px-3">Teklif Durumu</th>
                <th className="py-2.5 px-3 text-center">Teklif Sayısı</th>
                <th className="py-2.5 px-3 text-right">Toplam Finansal Değer</th>
                <th className="py-2.5 px-3 text-right">Portföy Payı</th>
                <th className="py-2.5 px-3">Durum Açıklaması</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-3 font-semibold text-indigo-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Açık Teklifler</span>
                </td>
                <td className="py-3 px-3 text-center font-bold">{statusSummary['Açık'][selectedCurrency].count}</td>
                <td className="py-3 px-3 text-right font-black">{formatStatusTotals('Açık')}</td>
                <td className="py-3 px-3 text-right text-slate-600">
                  %{selectedTotals > 0 ? ((statusSummary['Açık'][selectedCurrency].total / selectedTotals) * 100).toFixed(1) : 0}
                </td>
                <td className="py-3 px-3 text-slate-500">Müşteri ve ihale komisyon incelemesinde</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-3 font-semibold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Onaylanan Teklifler</span>
                </td>
                <td className="py-3 px-3 text-center font-bold">{statusSummary['Onay'][selectedCurrency].count}</td>
                <td className="py-3 px-3 text-right font-black text-emerald-700">
                  {formatStatusTotals('Onay')}
                </td>
                <td className="py-3 px-3 text-right text-slate-600">
                  %{selectedTotals > 0 ? ((statusSummary['Onay'][selectedCurrency].total / selectedTotals) * 100).toFixed(1) : 0}
                </td>
                <td className="py-3 px-3 text-slate-500">Sözleşme ve sipariş aşamasına aktarıldı</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-3 font-semibold text-rose-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  <span>Reddedilen Teklifler</span>
                </td>
                <td className="py-3 px-3 text-center font-bold">{statusSummary['Red'][selectedCurrency].count}</td>
                <td className="py-3 px-3 text-right font-black">{formatStatusTotals('Red')}</td>
                <td className="py-3 px-3 text-right text-slate-600">
                  %{selectedTotals > 0 ? ((statusSummary['Red'][selectedCurrency].total / selectedTotals) * 100).toFixed(1) : 0}
                </td>
                <td className="py-3 px-3 text-slate-500">Bütçe kısıtı veya ertelenen alımlar</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-3 font-semibold text-slate-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>İptal Edilen Teklifler</span>
                </td>
                <td className="py-3 px-3 text-center font-bold">{statusSummary['İptal'][selectedCurrency].count}</td>
                <td className="py-3 px-3 text-right font-black">{formatStatusTotals('İptal')}</td>
                <td className="py-3 px-3 text-right text-slate-600">
                  %{selectedTotals > 0 ? ((statusSummary['İptal'][selectedCurrency].total / selectedTotals) * 100).toFixed(1) : 0}
                </td>
                <td className="py-3 px-3 text-slate-500">Şartname revizyonu nedeniyle yenilenenler</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
