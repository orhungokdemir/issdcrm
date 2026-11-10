import React, { useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import { ContractItem, ContractStatus, ContractType } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { getStatusBadge } from '../common/Badge';

export const ContractsView: React.FC = () => {
  const { contracts, customers, orders, proposals, currentUser, addContract, updateContract, deleteContract, formatMoney } =
    useCrm();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);

  // Form State
  const [status, setStatus] = useState<ContractStatus>('Yürürlükte');
  const [contractNo, setContractNo] = useState('');
  const [contractName, setContractName] = useState('');
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [orderId, setOrderId] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [requestId, setRequestId] = useState('');
  const [type, setType] = useState<ContractType>('Anahtar Teslim Proje');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [autoRenewal, setAutoRenewal] = useState<'Evet' | 'Hayır'>('Evet');
  const [price, setPrice] = useState(0);
  const [vat, setVat] = useState(20);
  const [responsiblePerson, setResponsiblePerson] = useState(currentUser.fullName);
  const [projectCode, setProjectCode] = useState('');

  const openAddModal = () => {
    setSelectedContract(null);
    setStatus('Yürürlükte');
    setContractNo('');
    setContractName('');
    setCustomerId(customers[0]?.id || '');
    setOrderId(orders[0]?.id || '');
    setProposalId(orders[0]?.proposalId || '');
    setRequestId(orders[0]?.requestId || '');
    setType('Anahtar Teslim Proje');
    setStartDate(new Date().toISOString().slice(0, 10));
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    setEndDate(d.toISOString().slice(0, 10));
    setAutoRenewal('Evet');
    setPrice(0);
    setVat(20);
    setResponsiblePerson(currentUser.fullName);
    setProjectCode('');
    setIsAddEditOpen(true);
  };

  const openEditModal = (ctr: ContractItem) => {
    setSelectedContract(ctr);
    setStatus(ctr.status);
    setContractNo(ctr.contractNo);
    setContractName(ctr.contractName);
    setCustomerId(ctr.customerId);
    setOrderId(ctr.orderId || '');
    setProposalId(ctr.proposalId || '');
    setRequestId(ctr.requestId || '');
    setType(ctr.type);
    setStartDate(ctr.startDate);
    setEndDate(ctr.endDate);
    setAutoRenewal(ctr.autoRenewal);
    setPrice(ctr.price);
    setVat(ctr.vat);
    setResponsiblePerson(ctr.responsiblePerson);
    setProjectCode(ctr.projectCode || '');
    setIsAddEditOpen(true);
  };

  const openDeleteModal = (ctr: ContractItem) => {
    setSelectedContract(ctr);
    setIsDeleteOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const customerObj = customers.find((c) => c.id === customerId);
    const customerName = customerObj ? customerObj.company : 'Bilinmeyen Müşteri';

    if (selectedContract) {
      updateContract(selectedContract.id, {
        status,
        contractName,
        customerId,
        orderId: orderId || undefined,
        proposalId: proposalId || undefined,
        requestId: requestId || undefined,
        customerName,
        type,
        startDate,
        endDate,
        autoRenewal,
        price: Number(price),
        vat: Number(vat),
        responsiblePerson,
        projectCode,
      });
    } else {
      addContract({
        status,
        contractName,
        customerId,
        orderId: orderId || undefined,
        proposalId: proposalId || undefined,
        requestId: requestId || undefined,
        customerName,
        type,
        startDate,
        endDate,
        autoRenewal,
        price: Number(price),
        vat: Number(vat),
        responsiblePerson: responsiblePerson || currentUser.fullName,
        projectCode,
      });
    }
    setIsAddEditOpen(false);
  };

  // Required table columns:
  // Durum, Sözleşme No, Sözleşme Adı, Müşteri, Tür, Başlangıç, Bitiş, Otomatik Yenileme, Bedel, KDV, Sorumlu
  const columns: Column<ContractItem>[] = [
    {
      key: 'status',
      header: 'Durum',
      render: (item) => getStatusBadge(item.status),
    },
    {
      key: 'contractNo',
      header: 'Sözleşme No',
      render: (item) => <span className="font-bold text-indigo-600 font-mono">{item.contractNo}</span>,
    },
    {
      key: 'contractName',
      header: 'Sözleşme Adı',
      render: (item) => (
        <div className="max-w-[240px]">
          <p className="font-semibold text-slate-900 line-clamp-2" title={item.contractName}>
            {item.contractName}
          </p>
          {item.projectCode && (
            <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-sm inline-block mt-0.5 border border-indigo-100">
              {item.projectCode}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Müşteri',
      render: (item) => (
        <p className="font-bold text-slate-900 max-w-[180px] truncate" title={item.customerName}>
          {item.customerName}
        </p>
      ),
    },
    {
      key: 'type',
      header: 'Tür',
      render: (item) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
          {item.type}
        </span>
      ),
    },
    {
      key: 'startDate',
      header: 'Başlangıç',
      render: (item) => <span className="text-slate-600 text-xs">{item.startDate}</span>,
    },
    {
      key: 'endDate',
      header: 'Bitiş',
      render: (item) => <span className="text-slate-600 text-xs font-medium">{item.endDate}</span>,
    },
    {
      key: 'autoRenewal',
      header: 'Otomatik Yenileme',
      render: (item) => (
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
            item.autoRenewal === 'Evet'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {item.autoRenewal}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Bedel',
      render: (item) => (
        <span className="font-black text-slate-900 text-sm whitespace-nowrap">
          {formatMoney(item.price)}
        </span>
      ),
    },
    {
      key: 'vat',
      header: 'KDV',
      render: (item) => <span className="text-slate-500 text-xs font-medium">%{item.vat}</span>,
    },
    {
      key: 'responsiblePerson',
      header: 'Sorumlu',
      render: (item) => <span className="text-slate-700 text-xs font-medium">{item.responsiblePerson}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={contracts}
        columns={columns}
        title="Sözleşmeler"
        subtitle="Anahtar teslim sistem kurulum, SLA bakım anlaşmaları ve lisans protokolleri"
        searchPlaceholder="Sözleşme no, müşteri veya proje ara..."
        onAddNew={openAddModal}
        addNewLabel="Yeni Sözleşme Ekle"
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        rowKey={(item) => item.id}
        serverResource="contracts"
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={selectedContract ? 'Sözleşmeyi Düzenle' : 'Yeni Sözleşme Tanımla'}
        subtitle="Kurumsal taahhüt, süre ve bedel parametreleri"
        maxWidth="3xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sözleşme Durumu *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContractStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="Yürürlükte">Yürürlükte</option>
                <option value="Yenileme Bekliyor">Yenileme Bekliyor</option>
                <option value="Süresi Doldu">Süresi Doldu</option>
                <option value="Feshedildi">Feshedildi</option>
                <option value="Taslak">Taslak</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sözleşme No *</label>
              <input
                type="text"
                value={contractNo}
                readOnly
                placeholder="Sistem tarafından atanır"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sözleşme Türü</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ContractType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="Anahtar Teslim Proje">Anahtar Teslim Proje</option>
                <option value="Bakım ve Destek">Bakım ve Destek</option>
                <option value="Lisans & SLA">Lisans & SLA</option>
                <option value="Donanım Tedarik">Donanım Tedarik</option>
                <option value="Servis">Servis</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Sözleşme Adı *</label>
            <input
              type="text"
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
              placeholder="Sözleşme adı ve proje kapsamı"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    {c.company}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Proje Kodu / Referansı</label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="Proje kodu"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Bağlı Sipariş</label>
            <select
              value={orderId}
              onChange={(e) => {
                const nextOrderId = e.target.value;
                setOrderId(nextOrderId);
                const order = orders.find((item) => item.id === nextOrderId);
                if (order) {
                  setCustomerId(order.customerId);
                  setProposalId(order.proposalId || proposals.find((proposal) => proposal.proposalNo === order.proposalNo)?.id || '');
                  setRequestId(order.requestId || '');
                  setProjectCode(order.projectCode || '');
                  setPrice(order.grandTotal);
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
            >
              <option value="">Sipariş bağlantısı yok</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>{order.orderNo} - {order.subject}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Başlangıç Tarihi</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bitiş Tarihi</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Otomatik Yenileme</label>
              <select
                value={autoRenewal}
                onChange={(e) => setAutoRenewal(e.target.value as 'Evet' | 'Hayır')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="Evet">Evet</option>
                <option value="Hayır">Hayır</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sözleşme Bedeli (₺) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">KDV Oranı (%)</label>
              <input
                type="number"
                value={vat}
                onChange={(e) => setVat(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sorumlu Yönetici</label>
              <input
                type="text"
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
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
              {selectedContract ? 'Değişiklikleri Kaydet' : 'Sözleşmeyi Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => selectedContract && deleteContract(selectedContract.id)}
        itemName={selectedContract?.contractName}
      />
    </div>
  );
};
