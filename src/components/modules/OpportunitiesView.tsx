import React, { useState } from 'react';
import {
  CalendarDays,
  CircleDollarSign,
  FileText,
  GitBranch,
  History,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import {
  OPPORTUNITY_STAGES,
  OpportunityItem,
  OpportunityStage,
} from '../../types';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { Modal } from '../common/Modal';

type OpportunityForm = Omit<OpportunityItem, 'id' | 'opportunityNo' | 'createdAt' | 'stageHistory'>;

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (ownerName: string): OpportunityForm => ({
  customerId: '',
  customerName: '',
  subject: '',
  tenderNo: '',
  tenderDate: '',
  productGroup: 'Akıllı Kavşak',
  region: '',
  estimatedValue: 0,
  currency: 'TRY',
  probability: 20,
  expectedDecisionDate: today(),
  stage: 'Şartname Bekleniyor',
  ownerName,
  competitors: [],
  lossReason: '',
  notes: '',
});

const stageTone: Record<OpportunityStage, string> = {
  'Şartname Bekleniyor': 'border-t-sky-600',
  'Teklif Hazırlanıyor': 'border-t-amber-500',
  'İhaleye Girildi': 'border-t-indigo-600',
  'İtiraz Sürecinde': 'border-t-orange-600',
  'Kazanıldı': 'border-t-emerald-600',
  'Kaybedildi': 'border-t-rose-600',
};

export const OpportunitiesView: React.FC = () => {
  const {
    opportunities,
    customers,
    currentUser,
    hasPermission,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    formatMoney,
    addToast,
  } = useCrm();
  const [query, setQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OpportunityItem | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [form, setForm] = useState<OpportunityForm>(() => emptyForm(currentUser.fullName));

  const openCreate = () => {
    setSelectedOpportunity(null);
    setForm({ ...emptyForm(currentUser.fullName), customerId: customers[0]?.id || '' });
    setIsFormOpen(true);
  };

  const openEdit = (item: OpportunityItem) => {
    setSelectedOpportunity(item);
    const { id: _id, opportunityNo: _opportunityNo, createdAt: _createdAt, stageHistory: _stageHistory, ...details } = item;
    setForm({ ...emptyForm(currentUser.fullName), ...details, competitors: item.competitors || [] });
    setIsFormOpen(true);
  };

  const saveOpportunity = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const customer = customers.find((item) => item.id === form.customerId);
    if (!customer) {
      addToast('warning', 'Kurum seçin', 'Fırsatı kaydetmek için geçerli bir kurum seçin.');
      return;
    }
    if (form.stage === 'Kaybedildi' && !form.lossReason.trim()) {
      addToast('warning', 'Kayıp nedeni gerekli', 'Kaybedilen fırsatlar için kayıp nedenini belirtin.');
      return;
    }
    const payload = { ...form, customerName: customer.company };
    if (selectedOpportunity) {
      updateOpportunity(selectedOpportunity.id, payload);
    } else {
      addOpportunity({ ...payload, createdAt: today() });
    }
    setIsFormOpen(false);
  };

  const moveOpportunity = (item: OpportunityItem, stage: OpportunityStage) => {
    if (stage === item.stage) return;
    if (stage === 'Kaybedildi' && !item.lossReason?.trim()) {
      addToast('warning', 'Kayıp nedeni gerekli', 'Önce fırsatı düzenleyip kayıp nedenini ekleyin.');
      return;
    }
    updateOpportunity(item.id, { stage, stageChangeReason: 'Kanban aşaması güncellendi' });
  };

  const matchingOpportunities = opportunities.filter((item) => {
    const searchText = [item.opportunityNo, item.subject, item.customerName, item.tenderNo, item.productGroup, item.region]
      .filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
    return searchText.includes(query.trim().toLocaleLowerCase('tr-TR'));
  });
  const openCount = opportunities.filter((item) => !['Kazanıldı', 'Kaybedildi'].includes(item.stage)).length;
  const wonCount = opportunities.filter((item) => item.stage === 'Kazanıldı').length;
  const lostCount = opportunities.filter((item) => item.stage === 'Kaybedildi').length;
  const canCreate = hasPermission('opportunities.create');
  const canEdit = hasPermission('opportunities.edit');
  const canDelete = hasPermission('opportunities.delete');

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-emerald-700">
            <GitBranch className="h-4 w-4" /> İş geliştirme
          </div>
          <h1 className="text-xl font-bold text-slate-900">İhale / Fırsatlar</h1>
          <p className="mt-1 text-sm text-slate-500">İhale aşamalarını, tahmini değerleri ve karar tarihlerini takip edin.</p>
        </div>
        {canCreate && (
          <button type="button" onClick={openCreate} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
            <Plus className="h-4 w-4" /> Yeni fırsat
          </button>
        )}
      </section>

      <section className="grid grid-cols-3 border-y border-slate-200 py-3">
        <div className="px-3 first:pl-0">
          <span className="block text-xs text-slate-500">Açık fırsat</span>
          <strong className="text-lg text-slate-900">{openCount}</strong>
        </div>
        <div className="border-l border-slate-200 px-4">
          <span className="block text-xs text-slate-500">Kazanıldı</span>
          <strong className="text-lg text-emerald-700">{wonCount}</strong>
        </div>
        <div className="border-l border-slate-200 px-4">
          <span className="block text-xs text-slate-500">Kaybedildi</span>
          <strong className="text-lg text-rose-700">{lostCount}</strong>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Fırsat, kurum, ihale no veya bölge ara"
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
          />
        </div>
        <span className="text-xs text-slate-500">{matchingOpportunities.length} kayıt</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1620px] grid-cols-6 gap-3">
          {OPPORTUNITY_STAGES.map((stage) => {
            const stageOpportunities = matchingOpportunities.filter((item) => item.stage === stage);
            return (
              <section key={stage} className={`min-h-[420px] rounded-md border border-slate-200 border-t-4 bg-slate-50/70 ${stageTone[stage]}`}>
                <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-3">
                  <h2 className="text-xs font-bold text-slate-800">{stage}</h2>
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1 text-xs font-semibold text-slate-600">{stageOpportunities.length}</span>
                </header>
                <div className="space-y-2 p-2">
                  {stageOpportunities.map((item) => (
                    <article key={item.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] font-semibold text-slate-500">{item.opportunityNo}</span>
                        {item.tenderNo && <span className="max-w-24 truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600" title={item.tenderNo}>{item.tenderNo}</span>}
                      </div>
                      <h3 className="mt-2 text-sm font-semibold leading-snug text-slate-900">{item.subject}</h3>
                      <p className="mt-1 truncate text-xs text-slate-600" title={item.customerName}>{item.customerName}</p>
                      <div className="mt-3 space-y-2 text-xs text-slate-600">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex min-w-0 items-center gap-1 truncate"><FileText className="h-3.5 w-3.5 shrink-0" />{item.productGroup}</span>
                          <span className="inline-flex shrink-0 items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.region}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800"><CircleDollarSign className="h-3.5 w-3.5 text-emerald-700" />{formatMoney(item.estimatedValue, item.currency)}</span>
                          <span>{item.probability}%</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500"><CalendarDays className="h-3.5 w-3.5" />Karar: {item.expectedDecisionDate}</div>
                        <div className="truncate text-slate-500" title={item.ownerName}>Sorumlu: {item.ownerName}</div>
                      </div>
                      {canEdit && (
                        <label className="mt-3 block text-[10px] font-semibold text-slate-500">
                          Aşamayı taşı
                          <select
                            value={item.stage}
                            onChange={(event) => moveOpportunity(item, event.target.value as OpportunityStage)}
                            className="mt-1 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-700"
                          >
                            {OPPORTUNITY_STAGES.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-2">
                        <button type="button" onClick={() => setHistoryId(historyId === item.id ? null : item.id)} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900" aria-expanded={historyId === item.id}>
                          <History className="h-3.5 w-3.5" /> Geçmiş ({item.stageHistory.length})
                        </button>
                        {canEdit && <button type="button" onClick={() => openEdit(item)} className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950"><Pencil className="h-3.5 w-3.5" /> Düzenle</button>}
                        {canDelete && <button type="button" onClick={() => setDeleteTarget(item)} className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 hover:text-rose-900"><Trash2 className="h-3.5 w-3.5" /> Sil</button>}
                      </div>
                      {historyId === item.id && (
                        <ol className="mt-2 space-y-2 border-l border-slate-200 pl-3">
                          {item.stageHistory.slice().reverse().map((change, index) => (
                            <li key={`${change.changedAt}-${index}`} className="text-[10px] leading-relaxed text-slate-600">
                              <strong className="block text-slate-800">{change.fromStage ? `${change.fromStage} → ` : ''}{change.toStage}</strong>
                              <span>{new Date(change.changedAt).toLocaleString('tr-TR')} · {change.changedBy}</span>
                              {change.note && <span className="block">{change.note}</span>}
                            </li>
                          ))}
                        </ol>
                      )}
                    </article>
                  ))}
                  {stageOpportunities.length === 0 && <p className="px-2 py-6 text-center text-xs text-slate-400">Bu aşamada fırsat yok</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={selectedOpportunity ? 'Fırsatı düzenle' : 'Yeni ihale / fırsat'} subtitle="İhale kapsamını ve satış öngörüsünü kaydedin" maxWidth="4xl">
        <form onSubmit={saveOpportunity} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">Kurum *
              <select required value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal">
                <option value="">Kurum seçin</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.company}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">Fırsat adı *
              <input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Örn. EDS sistemi yenileme ihalesi" className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-700">İhale / EKAP numarası
              <input value={form.tenderNo || ''} onChange={(event) => setForm({ ...form, tenderNo: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-700">İhale tarihi
              <input type="date" value={form.tenderDate || ''} onChange={(event) => setForm({ ...form, tenderDate: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-700">Ürün grubu *
              <input required list="opportunity-product-groups" value={form.productGroup} onChange={(event) => setForm({ ...form, productGroup: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" />
              <datalist id="opportunity-product-groups"><option value="EDS" /><option value="Akıllı Kavşak" /><option value="Plaka Tanıma" /><option value="Trafik Yönetim Yazılımı" /><option value="VMS" /></datalist>
            </label>
            <label className="text-xs font-semibold text-slate-700">Bölge *
              <input required value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} placeholder="İl / bölge" className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-700">Tahmini ihale bedeli *
              <input required type="number" min="0" step="0.01" value={form.estimatedValue} onChange={(event) => setForm({ ...form, estimatedValue: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-700">Para birimi
              <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as OpportunityForm['currency'] })} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal">
                <option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">Kazanma olasılığı (%)
              <input type="number" min="0" max="100" value={form.probability} onChange={(event) => setForm({ ...form, probability: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-700">Beklenen karar tarihi *
              <input required type="date" value={form.expectedDecisionDate} onChange={(event) => setForm({ ...form, expectedDecisionDate: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-700">Sorumlu *
              <input required value={form.ownerName} onChange={(event) => setForm({ ...form, ownerName: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-700">Aşama
              <select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as OpportunityStage })} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal">
                {OPPORTUNITY_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Rakipler
              <input value={(form.competitors || []).join(', ')} onChange={(event) => setForm({ ...form, competitors: event.target.value.split(',').map((name) => name.trim()).filter(Boolean) })} placeholder="Virgülle ayırın" className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" />
            </label>
            {form.stage === 'Kaybedildi' && <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Kayıp nedeni *
              <input required value={form.lossReason || ''} onChange={(event) => setForm({ ...form, lossReason: event.target.value })} placeholder="Fiyat, teknik kapsam, rakip, zamanlama..." className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" />
            </label>}
            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Notlar
              <textarea rows={3} value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => setIsFormOpen(false)} className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700">İptal</button>
            <button type="submit" className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">Kaydet</button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteOpportunity(deleteTarget.id)}
        itemName={deleteTarget?.subject}
      />
    </div>
  );
};
