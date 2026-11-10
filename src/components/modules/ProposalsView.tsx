import React, { useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import { ProposalItem, ProposalStatus, ProposalLineItem } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { getStatusBadge } from '../common/Badge';
import { Plus, Trash2, Printer, CheckCircle, XCircle, FileText } from 'lucide-react';

export const ProposalsView: React.FC = () => {
  const {
    proposals,
    requests,
    customers,
    products,
    currentUser,
    activeCompany,
    addProposal,
    updateProposal,
    deleteProposal,
    formatMoney,
  } = useCrm();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewDocOpen, setIsViewDocOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalItem | null>(null);

  // Form State
  const [status, setStatus] = useState<ProposalStatus>('Açık');
  const [proposalNo, setProposalNo] = useState('');
  const [company, setCompany] = useState(activeCompany);
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [requestId, setRequestId] = useState('');
  const [customerRepresentative, setCustomerRepresentative] = useState('');
  const [subject, setSubject] = useState('');
  const [creator, setCreator] = useState(currentUser.fullName);
  const [createdAt, setCreatedAt] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [projectCode, setProjectCode] = useState('');
  const [notes, setNotes] = useState('');

  // Line items state
  const [lineItems, setLineItems] = useState<ProposalLineItem[]>([]);

  const calculateGrandTotal = (items: ProposalLineItem[]) => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const openAddModal = () => {
    setSelectedProposal(null);
    setStatus('Açık');
    setProposalNo('');
    setCompany(activeCompany);
    setCustomerId(customers[0]?.id || '');
    setRequestId(requests[0]?.id || '');
    setCustomerRepresentative(customers[0]?.name || '');
    setSubject('');
    setCreator(currentUser.fullName);
    setCreatedAt(new Date().toISOString().slice(0, 10));
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setValidUntil(d.toISOString().slice(0, 10));
    setCurrency('TRY');
    setProjectCode('');
    setNotes('Teklif bedeline donanım, montaj, devreye alma ve 2 yıl garantili SLA dahildir.');

    // Pre-populate with first product
    if (products.length > 0) {
      setLineItems([
        {
          productId: products[0].id,
          productCode: products[0].code,
          productName: products[0].name,
          quantity: 2,
          unitPrice: products[0].salePrice,
          unit: products[0].unit,
          total: products[0].salePrice * 2,
        },
      ]);
    } else {
      setLineItems([]);
    }
    setIsAddEditOpen(true);
  };

  const openEditModal = (prop: ProposalItem) => {
    setSelectedProposal(prop);
    setStatus(prop.status);
    setProposalNo(prop.proposalNo);
    setCompany(prop.company);
    setCustomerId(prop.customerId);
    setRequestId(prop.requestId || '');
    setCustomerRepresentative(prop.customerRepresentative);
    setSubject(prop.subject);
    setCreator(prop.creator);
    setCreatedAt(prop.createdAt);
    setValidUntil(prop.validUntil);
    setCurrency(prop.currency);
    setProjectCode(prop.projectCode || '');
    setNotes(prop.notes || '');
    setLineItems(
      prop.items || [
        {
          productId: 'custom',
          productCode: 'GENEL-01',
          productName: prop.subject,
          quantity: 1,
          unitPrice: prop.grandTotal,
          unit: 'Paket',
          total: prop.grandTotal,
        },
      ]
    );
    setIsAddEditOpen(true);
  };

  const openViewDocModal = (prop: ProposalItem) => {
    setSelectedProposal(prop);
    setIsViewDocOpen(true);
  };

  const openDeleteModal = (prop: ProposalItem) => {
    setSelectedProposal(prop);
    setIsDeleteOpen(true);
  };

  const handleAddLineItem = () => {
    const firstProd = products[0];
    if (firstProd) {
      setLineItems([
        ...lineItems,
        {
          productId: firstProd.id,
          productCode: firstProd.code,
          productName: firstProd.name,
          quantity: 1,
          unitPrice: firstProd.salePrice,
          unit: firstProd.unit,
          total: firstProd.salePrice,
        },
      ]);
    }
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      productId: prod.id,
      productCode: prod.code,
      productName: prod.name,
      unitPrice: prod.salePrice,
      unit: prod.unit,
      total: updated[index].quantity * prod.salePrice,
    };
    setLineItems(updated);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...lineItems];
    const qty = Math.max(1, quantity);
    updated[index] = {
      ...updated[index],
      quantity: qty,
      total: qty * updated[index].unitPrice,
    };
    setLineItems(updated);
  };

  const handleUnitPriceChange = (index: number, unitPrice: number) => {
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      unitPrice,
      total: updated[index].quantity * unitPrice,
    };
    setLineItems(updated);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const customerObj = customers.find((c) => c.id === customerId);
    const customerName = customerObj ? customerObj.company : 'Bilinmeyen Müşteri';
    const grandTotal = calculateGrandTotal(lineItems);

    if (selectedProposal) {
      updateProposal(selectedProposal.id, {
        status,
        proposalNo,
        company,
        customerId,
        requestId: requestId || undefined,
        customerName,
        customerRepresentative,
        subject,
        creator,
        createdAt,
        validUntil,
        grandTotal,
        currency,
        items: lineItems,
        projectCode,
        notes,
      });
    } else {
      addProposal({
        status,
        company: company || activeCompany,
        customerId,
        requestId: requestId || undefined,
        customerName,
        customerRepresentative: customerRepresentative || customerObj?.name || '-',
        subject,
        creator: creator || currentUser.fullName,
        createdAt,
        validUntil,
        grandTotal,
        currency,
        items: lineItems,
        projectCode,
        notes,
      });
    }
    setIsAddEditOpen(false);
  };

  // Required table columns:
  // Durum, Teklif No, Firma, Müşteri, Müşteri Temsilcisi, Konu, Oluşturan, Oluşturma Tarihi, Geçerlilik Tarihi, Genel Toplam
  const columns: Column<ProposalItem>[] = [
    {
      key: 'status',
      header: 'Durum',
      render: (item) => getStatusBadge(item.status),
    },
    {
      key: 'proposalNo',
      header: 'Teklif No',
      render: (item) => (
        <span className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer" onClick={() => openViewDocModal(item)}>
          {item.proposalNo}
        </span>
      ),
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
        <div className="max-w-[200px]">
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
      key: 'customerRepresentative',
      header: 'Müşteri Temsilcisi',
      render: (item) => <span className="text-slate-700 text-xs font-medium">{item.customerRepresentative || '-'}</span>,
    },
    {
      key: 'subject',
      header: 'Konu',
      render: (item) => (
        <p className="font-medium text-slate-800 max-w-[220px] truncate" title={item.subject}>
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
      key: 'createdAt',
      header: 'Oluşturma Tarihi',
      render: (item) => <span className="text-slate-600 text-xs">{item.createdAt}</span>,
    },
    {
      key: 'validUntil',
      header: 'Geçerlilik Tarihi',
      render: (item) => <span className="text-slate-600 text-xs">{item.validUntil}</span>,
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
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={proposals}
        columns={columns}
        title="Teklifler"
        subtitle="Akıllı ulaşım, EDS ihale ve doğrudan temin teklif dosyaları yönetimi"
        searchPlaceholder="Teklif no, müşteri veya konu ara..."
        onAddNew={openAddModal}
        addNewLabel="Yeni Teklif Hazırla"
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        onView={openViewDocModal}
        rowKey={(item) => item.id}
        serverResource="proposals"
      />

      {/* Add / Edit Proposal Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={selectedProposal ? 'Teklifi Düzenle' : 'Yeni Fiyat Teklifi Oluştur'}
        subtitle="Ürün kalemleri, birim fiyatlar ve teklif şartları"
        maxWidth="3xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
          {/* Header row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Teklif Durumu *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProposalStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="Açık">Açık</option>
                <option value="Onay">Onay</option>
                <option value="Red">Red</option>
                <option value="İptal">İptal</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Teklif No *</label>
              <input
                type="text"
                value={proposalNo}
                readOnly
                placeholder="Sistem tarafından atanır"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Teklif Veren Firma</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Müşteri / Kurum *</label>
              <select
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  const cust = customers.find((c) => c.id === e.target.value);
                  if (cust) setCustomerRepresentative(cust.name);
                }}
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
              <label className="block font-semibold text-slate-700 mb-1">Müşteri Temsilcisi / Muhatap</label>
              <input
                type="text"
                value={customerRepresentative}
                onChange={(e) => setCustomerRepresentative(e.target.value)}
                placeholder="Örn: Engin Alkan (Daire Başkanı)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Bağlı Talep</label>
            <select
              value={requestId}
              onChange={(e) => {
                const nextRequestId = e.target.value;
                setRequestId(nextRequestId);
                const request = requests.find((item) => item.id === nextRequestId);
                if (request) {
                  setCustomerId(request.customerId);
                  setProjectCode(request.projectCode || '');
                  setSubject(request.subject);
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
            >
              <option value="">Talep bağlantısı yok</option>
              {requests.map((request) => (
                <option key={request.id} value={request.id}>{request.requestNo} - {request.subject}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Teklif Konusu *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Teklif konusu ve kapsamı"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Proje Referansı</label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="Proje kodu"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Oluşturma Tarihi</label>
              <input
                type="date"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Geçerlilik Tarihi</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
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
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Line Items Builder */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block font-bold text-slate-800">Teklif Kalemleri (Ürün / Hizmet)</label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200/60"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kalem Ekle</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
              <div className="grid grid-cols-12 gap-2 bg-slate-50 p-2 text-[11px] font-bold text-slate-600 uppercase">
                <div className="col-span-5">Ürün / Hizmet</div>
                <div className="col-span-2">Miktar</div>
                <div className="col-span-2">Birim Fiyat</div>
                <div className="col-span-2 text-right">Toplam</div>
                <div className="col-span-1 text-center">İşlem</div>
              </div>

              {lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 p-2 items-center text-xs bg-white">
                  <div className="col-span-5">
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-600"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.code}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-center"
                    />
                    <span className="text-[10px] text-slate-500 shrink-0">{item.unit}</span>
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleUnitPriceChange(idx, Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-right"
                    />
                  </div>

                  <div className="col-span-2 text-right font-bold text-slate-800">
                    {formatMoney(item.total, currency)}
                  </div>

                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      disabled={lineItems.length <= 1}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end items-center gap-3 p-3 bg-slate-50 border border-t-0 border-slate-200 rounded-b-lg">
              <span className="text-xs font-semibold text-slate-600">Teklif Genel Toplamı:</span>
              <span className="text-base font-black text-indigo-700">
                {formatMoney(calculateGrandTotal(lineItems), currency)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Teklif Notları & Koşullar</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ödeme şartları, garanti süresi, teslimat terminleri..."
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
              {selectedProposal ? 'Değişiklikleri Kaydet' : 'Teklifi Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Proposal View / Print Modal */}
      {selectedProposal && (
        <Modal
          isOpen={isViewDocOpen}
          onClose={() => setIsViewDocOpen(false)}
          title={`Teklif Dosyası: ${selectedProposal.proposalNo}`}
          subtitle="ISSD Akıllı Ulaşım Sistemleri Resmi Teklif Belgesi"
          maxWidth="3xl"
        >
          <div className="space-y-6 text-slate-800">
            {/* Header & Logo */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-blue-600 text-white font-black flex items-center justify-center text-sm">
                    ISSD
                  </div>
                  <span className="text-lg font-black text-slate-900">ISSD BİLİŞİM A.Ş.</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Akıllı Ulaşım ve Trafik Yönetim Teknolojileri
                </p>
                <p className="text-[11px] text-slate-400">ODTÜ Teknokent / Çankaya / Ankara</p>
              </div>

              <div className="text-right">
                <div className="inline-block mb-1">{getStatusBadge(selectedProposal.status)}</div>
                <p className="text-sm font-bold text-slate-900 font-mono">{selectedProposal.proposalNo}</p>
                <p className="text-xs text-slate-500">Tarih: {selectedProposal.createdAt}</p>
                <p className="text-xs text-slate-500">Geçerlilik: {selectedProposal.validUntil}</p>
              </div>
            </div>

            {/* Customer & Subject info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
                  Müşteri / Kurum
                </span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedProposal.customerName}</p>
                <p className="text-slate-600 mt-0.5">Muhatap: {selectedProposal.customerRepresentative}</p>
                {selectedProposal.projectCode && (
                  <p className="text-blue-700 font-semibold mt-1">Proje: {selectedProposal.projectCode}</p>
                )}
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
                  Teklif Detayı
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{selectedProposal.subject}</p>
                <p className="text-slate-600 mt-0.5">Hazırlayan: {selectedProposal.creator}</p>
                <p className="text-slate-600">Firma: {selectedProposal.company}</p>
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Kod</th>
                    <th className="py-2.5 px-3">Açıklama / Ürün</th>
                    <th className="py-2.5 px-3 text-center">Miktar</th>
                    <th className="py-2.5 px-3 text-right">Birim Fiyat</th>
                    <th className="py-2.5 px-3 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedProposal.items && selectedProposal.items.length > 0 ? (
                    selectedProposal.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-500 font-semibold">
                          {item.productCode}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{item.productName}</td>
                        <td className="py-2.5 px-3 text-center">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatMoney(item.unitPrice, selectedProposal.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatMoney(item.total, selectedProposal.currency)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-center text-slate-500">
                        Genel Paket Bedeli
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col items-end gap-1 text-xs">
                <div className="flex justify-between w-64 text-slate-600">
                  <span>Teklif Toplamı:</span>
                  <span className="font-semibold">{formatMoney(selectedProposal.grandTotal, selectedProposal.currency)}</span>
                </div>
                <div className="flex justify-between w-64 pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                  <span>Genel Toplam:</span>
                  <span className="text-blue-700">
                    {formatMoney(selectedProposal.grandTotal, selectedProposal.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedProposal.notes && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                <strong className="block font-bold mb-0.5">Teklif Şartları ve Garanti:</strong>
                <p>{selectedProposal.notes}</p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateProposal(selectedProposal.id, { status: 'Onay' });
                    setIsViewDocOpen(false);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Onayla</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateProposal(selectedProposal.id, { status: 'Red' });
                    setIsViewDocOpen(false);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reddet</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Yazdır / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewDocOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => selectedProposal && deleteProposal(selectedProposal.id)}
        itemName={selectedProposal?.proposalNo}
      />
    </div>
  );
};
