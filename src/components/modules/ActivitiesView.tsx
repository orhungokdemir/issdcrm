import React, { useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import { ActivityItem, ActivityType, ActivityStatus } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { getStatusBadge } from '../common/Badge';
import { Calendar, DollarSign, User, Building, FileText, CheckCircle2 } from 'lucide-react';

export const ActivitiesView: React.FC = () => {
  const { activities, customers, stakeholders, currentUser, addActivity, updateActivity, deleteActivity, formatMoney } =
    useCrm();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  // Form State
  const [type, setType] = useState<ActivityType>('Toplantı');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [subTypeReason, setSubTypeReason] = useState('');
  const [subTypeDate, setSubTypeDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [stakeholderIds, setStakeholderIds] = useState<string[]>([]);
  const [estimatedBudget, setEstimatedBudget] = useState(0);
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [creator, setCreator] = useState(currentUser.fullName);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ActivityStatus>('Planlandı');
  const [probability, setProbability] = useState(0);

  const openAddModal = () => {
    setSelectedActivity(null);
    setType('Toplantı');
    setDate(new Date().toISOString().slice(0, 10));
    setSubTypeReason('');
    setSubTypeDate(new Date().toISOString().slice(0, 10));
    setCustomerId(customers[0]?.id || '');
    setStakeholderIds([]);
    setEstimatedBudget(0);
    setCurrency('TRY');
    setCreator(currentUser.fullName);
    setSubject('');
    setDescription('');
    setStatus('Planlandı');
    setProbability(0);
    setIsAddEditOpen(true);
  };

  const openEditModal = (act: ActivityItem) => {
    setSelectedActivity(act);
    setType(act.type);
    setDate(act.date);
    setSubTypeReason(act.subTypeReason);
    setSubTypeDate(act.subTypeDate);
    setCustomerId(act.customerId);
    setStakeholderIds(act.stakeholderIds || []);
    setEstimatedBudget(act.estimatedBudget);
    setCurrency(act.currency || 'TRY');
    setCreator(act.creator);
    setSubject(act.subject);
    setDescription(act.description);
    setStatus(act.status);
    setProbability(act.probability);
    setIsAddEditOpen(true);
  };

  const openDeleteModal = (act: ActivityItem) => {
    setSelectedActivity(act);
    setIsDeleteOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    const customerObj = customers.find((c) => c.id === customerId);
    const customerName = customerObj ? customerObj.company : 'Bilinmeyen Müşteri';
    const normalizedBudget = Math.max(0, Number(estimatedBudget) || 0);
    const normalizedProbability = Math.min(100, Math.max(0, Number(probability) || 0));

    if (selectedActivity) {
      updateActivity(selectedActivity.id, {
        type,
        date,
        subTypeReason,
        subTypeDate,
        customerId,
        customerName,
        stakeholderIds,
        estimatedBudget: normalizedBudget,
        currency,
        creator,
        subject,
        description,
        status,
        probability: normalizedProbability,
      });
    } else {
      addActivity({
        type,
        date,
        subTypeReason: subTypeReason || 'Genel Görüşme / Talep',
        subTypeDate,
        customerId,
        customerName,
        stakeholderIds,
        estimatedBudget: normalizedBudget,
        currency,
        creator: creator || currentUser.fullName,
        subject,
        description,
        status,
        probability: normalizedProbability,
      });
    }
    setIsAddEditOpen(false);
  };

  // Required table columns: Türü, Tarih, Alt Tür / Neden, Alt Tür Tarih, Müşteri, Tahmini Bütçe, Oluşturan, Konu, Açıklama
  const columns: Column<ActivityItem>[] = [
    {
      key: 'type',
      header: 'Türü',
      render: (item) => (
        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md text-xs border border-indigo-100">
          {item.type}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Tarih',
      render: (item) => <span className="font-medium text-slate-700">{item.date}</span>,
    },
    {
      key: 'subTypeReason',
      header: 'Alt Tür / Neden',
      render: (item) => (
        <span className="text-slate-800 font-medium max-w-[140px] truncate block" title={item.subTypeReason}>
          {item.subTypeReason || '-'}
        </span>
      ),
    },
    {
      key: 'subTypeDate',
      header: 'Alt Tür Tarih',
      render: (item) => <span className="text-slate-500 text-xs">{item.subTypeDate || '-'}</span>,
    },
    {
      key: 'customerName',
      header: 'Müşteri',
      render: (item) => (
        <div className="max-w-[200px]">
          <p className="font-bold text-slate-900 truncate" title={item.customerName}>
            {item.customerName}
          </p>
        </div>
      ),
    },
    {
      key: 'stakeholderIds',
      header: 'Görüşülen Paydaşlar',
      render: (item) => <span className="block max-w-[180px] truncate text-xs text-slate-600" title={(item.stakeholderIds || []).map((id) => stakeholders.find((stakeholder) => stakeholder.id === id)?.fullName).filter(Boolean).join(', ')}>{(item.stakeholderIds || []).map((id) => stakeholders.find((stakeholder) => stakeholder.id === id)?.fullName).filter(Boolean).join(', ') || '-'}</span>,
    },
    {
      key: 'estimatedBudget',
      header: 'Tahmini Bütçe',
      render: (item) => (
        <div className="font-bold text-slate-900">
          {formatMoney(item.estimatedBudget, item.currency || 'TRY')}
          <span className="block text-[10px] text-emerald-600 font-normal">%{item.probability} Olasılık</span>
        </div>
      ),
    },
    {
      key: 'creator',
      header: 'Oluşturan',
      render: (item) => <span className="text-slate-700 text-xs font-medium">{item.creator}</span>,
    },
    {
      key: 'subject',
      header: 'Konu',
      render: (item) => (
        <div className="max-w-[220px]">
          <p className="font-semibold text-slate-900 truncate" title={item.subject}>
            {item.subject}
          </p>
          <div className="mt-0.5">{getStatusBadge(item.status)}</div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Açıklama',
      render: (item) => (
        <p className="text-xs text-slate-500 max-w-[240px] truncate" title={item.description}>
          {item.description}
        </p>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={activities}
        columns={columns}
        title="Aktiviteler"
        subtitle="Müşteri ziyaretleri, saha demoları, toplantılar ve fırsat görüşmeleri takibi"
        searchPlaceholder="Aktivite, müşteri veya konu ara..."
        onAddNew={openAddModal}
        addNewLabel="Yeni Aktivite Ekle"
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        rowKey={(item) => item.id}
        serverResource="activities"
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={selectedActivity ? 'Aktivite Düzenle' : 'Yeni Aktivite Ekle'}
        subtitle="Müşteri görüşmesi veya saha aktivitesi detaylarını giriniz"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Aktivite Türü *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ActivityType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                required
              >
                <option value="Toplantı">Toplantı</option>
                <option value="Saha Ziyareti">Saha Ziyareti</option>
                <option value="Telefon Görüşmesi">Telefon Görüşmesi</option>
                <option value="Demo / Sunum">Demo / Sunum</option>
                <option value="Keşif">Keşif</option>
                <option value="E-Posta">E-Posta</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tarih *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alt Tür / Neden</label>
              <input
                type="text"
                value={subTypeReason}
                onChange={(e) => setSubTypeReason(e.target.value)}
                placeholder="Örn: Proje Başlatma Toplantısı / Canlı Demo"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alt Tür Tarih</label>
              <input
                type="date"
                value={subTypeDate}
                onChange={(e) => setSubTypeDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Müşteri / Kurum *</label>
            <select
              value={customerId}
              onChange={(e) => { setCustomerId(e.target.value); setStakeholderIds([]); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              required
            >
              {customers.length === 0 && <option value="">Önce müşteri tanımlayın</option>}
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} ({c.name})
                </option>
              ))}
            </select>
          </div>

          <fieldset className="rounded-md border border-slate-200 p-3">
            <legend className="px-1 text-xs font-semibold text-slate-700">Görüşülen kurum paydaşları</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {stakeholders.filter((stakeholder) => stakeholder.customerId === customerId && stakeholder.status === 'Aktif').map((stakeholder) => (
                <label key={stakeholder.id} className="flex min-h-8 items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={stakeholderIds.includes(stakeholder.id)}
                    onChange={(event) => setStakeholderIds((current) => event.target.checked ? [...current, stakeholder.id] : current.filter((id) => id !== stakeholder.id))}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                  />
                  <span className="truncate">{stakeholder.fullName}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-slate-500">{stakeholder.role}</span>
                </label>
              ))}
              {stakeholders.filter((stakeholder) => stakeholder.customerId === customerId && stakeholder.status === 'Aktif').length === 0 && <p className="text-xs text-slate-500">Bu kurum için aktif paydaş yok. Önce Kurum Paydaşları ekranından kontak ekleyin.</p>}
            </div>
          </fieldset>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Konu *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Görüşme konusu veya proje adı"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tahmini Bütçe ({currency})</label>
              <input
                type="number"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Para Birimi</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'TRY' | 'USD' | 'EUR')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="TRY">Türk Lirası (TRY)</option>
                <option value="USD">Amerikan Doları (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Satış Olasılığı (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Durum</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ActivityStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="Planlandı">Planlandı</option>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="Ertelendi">Ertelendi</option>
                <option value="İptal Edildi">İptal Edildi</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Oluşturan Personel</label>
            <input
              type="text"
              value={creator}
              readOnly
              aria-readonly="true"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Görüşme / Saha Açıklaması</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Toplantıda konuşulan detaylar, ihtiyaçlar ve teknik notlar..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors font-medium text-xs sm:text-sm"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-semibold shadow-xs text-xs sm:text-sm"
            >
              {selectedActivity ? 'Değişiklikleri Kaydet' : 'Aktiviteyi Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => selectedActivity && deleteActivity(selectedActivity.id)}
        itemName={selectedActivity?.subject}
      />
    </div>
  );
};
