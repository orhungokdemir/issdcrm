import React, { useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import { OrderItem, OrderStatus } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { getStatusBadge } from '../common/Badge';

export const OrdersView: React.FC = () => {
  const { orders, customers, proposals, currentUser, activeCompany, addOrder, updateOrder, deleteOrder, formatMoney } =
    useCrm();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  // Form State
  const [status, setStatus] = useState<OrderStatus>('Hazırlanıyor');
  const [orderNo, setOrderNo] = useState('');
  const [poNo, setPoNo] = useState('');
  const [proposalNo, setProposalNo] = useState(proposals[0]?.proposalNo || '');
  const [proposalId, setProposalId] = useState(proposals[0]?.id || '');
  const [requestId, setRequestId] = useState(proposals[0]?.requestId || '');
  const [company, setCompany] = useState(activeCompany);
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [subject, setSubject] = useState('');
  const [creator, setCreator] = useState(currentUser.fullName);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [grandTotal, setGrandTotal] = useState(0);
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [advancePayment, setAdvancePayment] = useState('%30 Peşin Alındı');
  const [deliveryStatus, setDeliveryStatus] = useState('Sahada Montaj Başladı');
  const [invoiceStatus, setInvoiceStatus] = useState('Kesildi');
  const [collectionStatus, setCollectionStatus] = useState('Kısmi Tahsilat');
  const [projectCode, setProjectCode] = useState('');

  const openAddModal = () => {
    setSelectedOrder(null);
    setStatus('Hazırlanıyor');
    setOrderNo('');
    setPoNo(`PO-KURUM-${Math.floor(100 + Math.random() * 900)}`);
    setProposalNo(proposals[0]?.proposalNo || 'TEK-2026-0089');
    setProposalId(proposals[0]?.id || '');
    setRequestId(proposals[0]?.requestId || '');
    setCompany(activeCompany);
    setCustomerId(customers[0]?.id || '');
    setSubject('');
    setCreator(currentUser.fullName);
    setOrderDate(new Date().toISOString().slice(0, 10));
    setGrandTotal(0);
    setCurrency('TRY');
    setAdvancePayment('%30 Peşin Alındı');
    setDeliveryStatus('Üretim Bandında');
    setInvoiceStatus('Bekliyor');
    setCollectionStatus('Vadesi Gelmedi');
    setProjectCode('');
    setIsAddEditOpen(true);
  };

  const openEditModal = (ord: OrderItem) => {
    setSelectedOrder(ord);
    setStatus(ord.status);
    setOrderNo(ord.orderNo);
    setPoNo(ord.poNo);
    setProposalNo(ord.proposalNo);
    setProposalId(ord.proposalId || proposals.find((proposal) => proposal.proposalNo === ord.proposalNo)?.id || '');
    setRequestId(ord.requestId || proposals.find((proposal) => proposal.id === ord.proposalId)?.requestId || '');
    setCompany(ord.company);
    setCustomerId(ord.customerId);
    setSubject(ord.subject);
    setCreator(ord.creator);
    setOrderDate(ord.orderDate);
    setGrandTotal(ord.grandTotal);
    setCurrency(ord.currency);
    setAdvancePayment(ord.advancePayment);
    setDeliveryStatus(ord.deliveryStatus);
    setInvoiceStatus(ord.invoiceStatus);
    setCollectionStatus(ord.collectionStatus);
    setProjectCode(ord.projectCode || '');
    setIsAddEditOpen(true);
  };

  const openDeleteModal = (ord: OrderItem) => {
    setSelectedOrder(ord);
    setIsDeleteOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const customerObj = customers.find((c) => c.id === customerId);
    const customerName = customerObj ? customerObj.company : 'Bilinmeyen Müşteri';

    if (selectedOrder) {
      updateOrder(selectedOrder.id, {
        status,
        poNo,
        proposalNo,
        proposalId: proposalId || undefined,
        requestId: requestId || undefined,
        company,
        customerId,
        customerName,
        subject,
        creator,
        orderDate,
        grandTotal: Number(grandTotal),
        currency,
        advancePayment,
        deliveryStatus,
        invoiceStatus,
        collectionStatus,
        projectCode,
      });
    } else {
      addOrder({
        status,
        poNo,
        proposalNo,
        proposalId: proposalId || undefined,
        requestId: requestId || undefined,
        company: company || activeCompany,
        customerId,
        customerName,
        subject,
        creator: creator || currentUser.fullName,
        orderDate,
        grandTotal: Number(grandTotal),
        currency,
        advancePayment,
        deliveryStatus,
        invoiceStatus,
        collectionStatus,
        projectCode,
      });
    }
    setIsAddEditOpen(false);
  };

  // Required table columns:
  // Durum, Sipariş No, PO No, Teklif No, Firma, Müşteri, Konu, Oluşturan, Sipariş Tarihi, Genel Toplam, Avans, Teslimat, Fatura, Tahsilat
  const columns: Column<OrderItem>[] = [
    {
      key: 'status',
      header: 'Durum',
      render: (item) => getStatusBadge(item.status),
    },
    {
      key: 'orderNo',
      header: 'Sipariş No',
      render: (item) => <span className="font-bold text-blue-700 font-mono">{item.orderNo}</span>,
    },
    {
      key: 'poNo',
      header: 'PO No',
      render: (item) => <span className="font-medium text-slate-700 text-xs font-mono">{item.poNo}</span>,
    },
    {
      key: 'proposalNo',
      header: 'Teklif No',
      render: (item) => <span className="text-slate-600 text-xs font-mono">{item.proposalNo}</span>,
    },
    {
      key: 'company',
      header: 'Firma',
      render: (item) => <span className="text-slate-600 text-xs">{item.company}</span>,
    },
    {
      key: 'customerName',
      header: 'Müşteri',
      render: (item) => (
        <div className="max-w-[180px]">
          <p className="font-bold text-slate-900 truncate" title={item.customerName}>
            {item.customerName}
          </p>
          {item.projectCode && (
            <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded-sm">
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
        <p className="font-medium text-slate-800 max-w-[200px] truncate" title={item.subject}>
          {item.subject}
        </p>
      ),
    },
    {
      key: 'creator',
      header: 'Oluşturan',
      render: (item) => <span className="text-slate-600 text-xs">{item.creator}</span>,
    },
    {
      key: 'orderDate',
      header: 'Sipariş Tarihi',
      render: (item) => <span className="text-slate-600 text-xs">{item.orderDate}</span>,
    },
    {
      key: 'grandTotal',
      header: 'Genel Toplam',
      render: (item) => (
        <span className="font-black text-slate-900 text-sm whitespace-nowrap">
          {formatMoney(item.grandTotal, item.currency)}
        </span>
      ),
    },
    {
      key: 'advancePayment',
      header: 'Avans',
      render: (item) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 block whitespace-nowrap">
          {item.advancePayment}
        </span>
      ),
    },
    {
      key: 'deliveryStatus',
      header: 'Teslimat',
      render: (item) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 block whitespace-nowrap">
          {item.deliveryStatus}
        </span>
      ),
    },
    {
      key: 'invoiceStatus',
      header: 'Fatura',
      render: (item) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 block whitespace-nowrap">
          {item.invoiceStatus}
        </span>
      ),
    },
    {
      key: 'collectionStatus',
      header: 'Tahsilat',
      render: (item) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 block whitespace-nowrap">
          {item.collectionStatus}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={orders}
        columns={columns}
        title="Siparişler"
        subtitle="Onaylanan tekliflerin PO takibi, avans ödemeleri, teslimat ve faturalandırma aşamaları"
        searchPlaceholder="Sipariş no, PO no veya müşteri ara..."
        onAddNew={openAddModal}
        addNewLabel="Yeni Sipariş Girişi"
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        rowKey={(item) => item.id}
        serverResource="orders"
      />

      {/* Add / Edit Order Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={selectedOrder ? 'Siparişi Düzenle' : 'Yeni Sipariş Kaydı'}
        subtitle="Satın alma siparişi, avans ve operasyon takibi"
        maxWidth="3xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sipariş Durumu *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="Hazırlanıyor">Hazırlanıyor</option>
                <option value="Onaylandı">Onaylandı</option>
                <option value="Sevk Edildi">Sevk Edildi</option>
                <option value="Teslim Edildi">Teslim Edildi</option>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="İptal">İptal</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sipariş No *</label>
              <input
                type="text"
                value={orderNo}
                readOnly
                placeholder="Sistem tarafından atanır"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Müşteri PO No</label>
              <input
                type="text"
                value={poNo}
                onChange={(e) => setPoNo(e.target.value)}
                placeholder="Satın alma sipariş numarası"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bağlı Teklif No</label>
              <select
                value={proposalId}
                onChange={(e) => {
                  const nextProposalId = e.target.value;
                  setProposalId(nextProposalId);
                  const proposal = proposals.find((item) => item.id === nextProposalId);
                  if (proposal) {
                    setProposalNo(proposal.proposalNo);
                    setRequestId(proposal.requestId || '');
                    setCustomerId(proposal.customerId);
                    setProjectCode(proposal.projectCode || '');
                    setSubject(proposal.subject);
                    setGrandTotal(proposal.grandTotal);
                    setCurrency(proposal.currency);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden font-mono"
              >
                <option value="">Teklif bağlantısı yok</option>
                {proposals.map((proposal) => (
                  <option key={proposal.id} value={proposal.id}>{proposal.proposalNo} - {proposal.subject}</option>
                ))}
              </select>
            </div>

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
              <label className="block font-semibold text-slate-700 mb-1">Sipariş Tarihi</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Sipariş Konusu *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Sipariş konusu"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Proje Kodu</label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="Proje kodu"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Genel Toplam Tutar</label>
              <input
                type="number"
                value={grandTotal}
                onChange={(e) => setGrandTotal(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Para Birimi</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'TRY' | 'USD' | 'EUR')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Operational Tracking Details: Avans, Teslimat, Fatura, Tahsilat */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Finans ve Sevkiyat Durumları
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Avans Durumu</label>
                <input
                  type="text"
                  value={advancePayment}
                  onChange={(e) => setAdvancePayment(e.target.value)}
                  placeholder="Örn: %40 Peşin Alındı / Teminat Mektubu"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teslimat Durumu</label>
                <input
                  type="text"
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value)}
                  placeholder="Örn: Sahada Montaj Başladı / Kısmi Teslimat"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fatura Durumu</label>
                <input
                  type="text"
                  value={invoiceStatus}
                  onChange={(e) => setInvoiceStatus(e.target.value)}
                  placeholder="Örn: Kesildi / Hakediş 1 Kesildi / Bekliyor"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahsilat Durumu</label>
                <input
                  type="text"
                  value={collectionStatus}
                  onChange={(e) => setCollectionStatus(e.target.value)}
                  placeholder="Örn: 1.400.000 ₺ Tahsil Edildi / Vadesi 15 Eylül"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                />
              </div>
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
              {selectedOrder ? 'Değişiklikleri Kaydet' : 'Siparişi Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => selectedOrder && deleteOrder(selectedOrder.id)}
        itemName={selectedOrder?.orderNo}
      />
    </div>
  );
};
