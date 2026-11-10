import React, { useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import { RequestItem, RequestPriority, RequestStatus } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { Badge, getStatusBadge } from '../common/Badge';

export const RequestsView: React.FC = () => {
  const { requests, customers, users, currentUser, addRequest, updateRequest, deleteRequest } =
    useCrm();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [subject, setSubject] = useState('');
  const [creator, setCreator] = useState(currentUser.fullName);
  const [createdAt, setCreatedAt] = useState(new Date().toISOString().slice(0, 10));
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(
    users[0]?.fullName ? [users[0].fullName] : []
  );
  const [priority, setPriority] = useState<RequestPriority>('Yüksek');
  const [status, setStatus] = useState<RequestStatus>('Yeni');
  const [projectCode, setProjectCode] = useState('');
  const [details, setDetails] = useState('');

  const openAddModal = () => {
    setSelectedRequest(null);
    setCustomerId(customers[0]?.id || '');
    setSubject('');
    setCreator(currentUser.fullName);
    setCreatedAt(new Date().toISOString().slice(0, 10));
    const defaultAssignee = users[1]?.fullName || users[0]?.fullName;
    setSelectedAssignees(defaultAssignee ? [defaultAssignee] : []);
    setPriority('Yüksek');
    setStatus('Yeni');
    setProjectCode('');
    setDetails('');
    setIsAddEditOpen(true);
  };

  const openEditModal = (req: RequestItem) => {
    setSelectedRequest(req);
    setCustomerId(req.customerId);
    setSubject(req.subject);
    setCreator(req.creator);
    setCreatedAt(req.createdAt);
    setSelectedAssignees(req.assignees || []);
    setPriority(req.priority);
    setStatus(req.status);
    setProjectCode(req.projectCode || '');
    setDetails(req.details || '');
    setIsAddEditOpen(true);
  };

  const openDeleteModal = (req: RequestItem) => {
    setSelectedRequest(req);
    setIsDeleteOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const customerObj = customers.find((c) => c.id === customerId);
    const customerName = customerObj ? customerObj.company : 'Bilinmeyen Müşteri';

    if (selectedRequest) {
      updateRequest(selectedRequest.id, {
        customerId,
        customerName,
        subject,
        creator,
        createdAt,
        assignees: selectedAssignees,
        priority,
        status,
        projectCode,
        details,
      });
    } else {
      addRequest({
        customerId,
        customerName,
        subject,
        creator: creator || currentUser.fullName,
        createdAt,
        assignees: selectedAssignees.length > 0 ? selectedAssignees : [currentUser.fullName],
        priority,
        status,
        projectCode,
        details,
      });
    }
    setIsAddEditOpen(false);
  };

  const getPriorityBadge = (p: RequestPriority) => {
    switch (p) {
      case 'Kritik':
        return <Badge variant="red">Kritik Öncelik</Badge>;
      case 'Yüksek':
        return <Badge variant="amber">Yüksek</Badge>;
      case 'Orta':
        return <Badge variant="blue">Orta</Badge>;
      case 'Düşük':
        return <Badge variant="gray">Düşük</Badge>;
    }
  };

  // Required table columns: Müşteri, Konu, Oluşturan, Oluşturma Tarihi, Sorumlular
  const columns: Column<RequestItem>[] = [
    { key: 'requestNo', header: 'Talep No', render: (item) => <span className="font-bold text-indigo-700 font-mono">{item.requestNo}</span> },
    {
      key: 'customerName',
      header: 'Müşteri',
      render: (item) => (
        <div className="max-w-[200px]">
          <p className="font-bold text-slate-900 truncate" title={item.customerName}>
            {item.customerName}
          </p>
          {item.projectCode && (
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-sm inline-block mt-0.5">
              {item.projectCode}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Konu',
      render: (item) => (
        <div className="max-w-[280px]">
          <div className="flex items-center gap-2 mb-1">
            {getPriorityBadge(item.priority)}
            {getStatusBadge(item.status)}
          </div>
          <p className="font-semibold text-slate-900 line-clamp-2" title={item.subject}>
            {item.subject}
          </p>
          {item.details && (
            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5" title={item.details}>
              {item.details}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'creator',
      header: 'Oluşturan',
      render: (item) => <span className="font-medium text-slate-700 text-xs">{item.creator}</span>,
    },
    {
      key: 'createdAt',
      header: 'Oluşturma Tarihi',
      render: (item) => <span className="text-slate-600 text-xs font-medium">{item.createdAt}</span>,
    },
    {
      key: 'assignees',
      header: 'Sorumlular',
      render: (item) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {item.assignees?.map((person, idx) => (
            <span
              key={idx}
              className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
            >
              {person}
            </span>
          )) || '-'}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={requests}
        columns={columns}
        title="Talepler"
        subtitle="Belediye, karayolları ve kurumlardan gelen teknik şartname, numune ve destek talepleri"
        searchPlaceholder="Talep konusu, müşteri veya proje ara..."
        onAddNew={openAddModal}
        addNewLabel="Yeni Talep Ekle"
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        rowKey={(item) => item.id}
        serverResource="requests"
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={selectedRequest ? 'Talep Düzenle' : 'Yeni Müşteri Talebi Oluştur'}
        subtitle="Teknik analiz, fizibilite veya numune talep formu"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">Talep numarası sistem tarafından otomatik atanır: TLP-{new Date().getFullYear()}-0001</p>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Müşteri / Kurum *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} ({c.name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Proje Kodu / Referansı</label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="Kurumun proje kodu veya referansı"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Oluşturma Tarihi</label>
              <input
                type="date"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Talep Konusu *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Talep konusu ve kapsamı"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Öncelik Seviyesi</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as RequestPriority)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="Kritik">Kritik</option>
                <option value="Yüksek">Yüksek</option>
                <option value="Orta">Orta</option>
                <option value="Düşük">Düşük</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Durum</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RequestStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="Yeni">Yeni</option>
                <option value="İnceleniyor">İnceleniyor</option>
                <option value="İşleme Alındı">İşleme Alındı</option>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="Reddedildi">Reddedildi</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Oluşturan Personel</label>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Sorumlu Mühendisler / Ekip</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              {users.map((u) => {
                const isChecked = selectedAssignees.includes(u.fullName);
                return (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAssignees([...selectedAssignees, u.fullName]);
                        } else {
                          setSelectedAssignees(selectedAssignees.filter((name) => name !== u.fullName));
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="truncate">{u.fullName}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Talep Detayları ve Saha Notları</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Teknik isterler, gerekli saha keşfi veya entegrasyon parametreleri..."
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
              {selectedRequest ? 'Değişiklikleri Kaydet' : 'Talebi Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => selectedRequest && deleteRequest(selectedRequest.id)}
        itemName={selectedRequest?.subject}
      />
    </div>
  );
};
