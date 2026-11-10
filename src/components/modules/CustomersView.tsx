import React, { useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import { CustomerItem, CustomerType } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { Badge } from '../common/Badge';

export const CustomersView: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCrm();

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);

  // Form State
  const [type, setType] = useState<CustomerType>('Belediye');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [parentCustomerId, setParentCustomerId] = useState('');

  const openAddModal = () => {
    setSelectedCustomer(null);
    setType('Belediye');
    setName('');
    setCompany('');
    setEmail('');
    setPhone('+90 ');
    setAddress('');
    setReference('');
    setTaxOffice('');
    setTaxNumber('');
    setParentCustomerId('');
    setIsAddEditOpen(true);
  };

  const openEditModal = (c: CustomerItem) => {
    setSelectedCustomer(c);
    setType(c.type);
    setName(c.name);
    setCompany(c.company);
    setEmail(c.email);
    setPhone(c.phone);
    setAddress(c.address);
    setReference(c.reference);
    setTaxOffice(c.taxOffice || '');
    setTaxNumber(c.taxNumber || '');
    setParentCustomerId(c.parentCustomerId || '');
    setIsAddEditOpen(true);
  };

  const openDeleteModal = (c: CustomerItem) => {
    setSelectedCustomer(c);
    setIsDeleteOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer) {
      updateCustomer(selectedCustomer.id, {
        type,
        name,
        company,
        email,
        phone,
        address,
        reference,
        taxOffice,
        taxNumber,
        parentCustomerId: parentCustomerId || undefined,
      });
    } else {
      addCustomer({
        type,
        name,
        company,
        email,
        phone,
        address,
        reference,
        taxOffice,
        taxNumber,
        parentCustomerId: parentCustomerId || undefined,
        createdAt: new Date().toISOString().slice(0, 10),
      });
    }
    setIsAddEditOpen(false);
  };

  const getTypeBadge = (t: CustomerType) => {
    switch (t) {
      case 'Belediye':
        return <Badge variant="indigo">Belediye</Badge>;
      case 'Kamu':
        return <Badge variant="purple">Kamu</Badge>;
      case 'Yüklenici':
        return <Badge variant="blue">Yüklenici</Badge>;
      case 'Kurumsal':
        return <Badge variant="green">Kurumsal</Badge>;
      case 'Özel Sektör':
        return <Badge variant="yellow">Özel Sektör</Badge>;
    }
  };

  // Required table columns: Tür, Adı, Firma, E-Posta, Telefon, Adres, Referans
  const columns: Column<CustomerItem>[] = [
    {
      key: 'type',
      header: 'Tür',
      render: (item) => getTypeBadge(item.type),
    },
    {
      key: 'name',
      header: 'Adı',
      render: (item) => (
        <span className="font-semibold text-slate-900 text-xs">{item.name}</span>
      ),
    },
    {
      key: 'company',
      header: 'Firma',
      render: (item) => (
        <div className="max-w-[220px]">
          <p className="font-bold text-slate-900 truncate" title={item.company}>
            {item.company}
          </p>
          {item.taxOffice && item.taxNumber && (
            <p className="text-[10px] text-slate-400">
              {item.taxOffice} - {item.taxNumber}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'parentCustomerId',
      header: 'Üst Kurum',
      render: (item) => <span className="text-xs text-slate-600">{customers.find((customer) => customer.id === item.parentCustomerId)?.company || 'Ana kurum'}</span>,
    },
    {
      key: 'email',
      header: 'E-Posta',
      render: (item) => <span className="text-slate-600 text-xs">{item.email}</span>,
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (item) => <span className="text-slate-700 text-xs font-mono">{item.phone}</span>,
    },
    {
      key: 'address',
      header: 'Adres',
      render: (item) => (
        <span className="text-slate-600 text-xs max-w-[200px] truncate block" title={item.address}>
          {item.address}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Referans',
      render: (item) => (
        <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
          {item.reference || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={customers}
        columns={columns}
        title="Müşteriler"
        subtitle="Büyükşehir belediyeleri, kamu kurumları, emniyet ve kurumsal yükleniciler veri tabanı"
        searchPlaceholder="Firma, kontak kişi veya referans ara..."
        onAddNew={openAddModal}
        addNewLabel="Yeni Müşteri Ekle"
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        rowKey={(item) => item.id}
        serverResource="customers"
      />

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={selectedCustomer ? 'Müşteri Bilgilerini Düzenle' : 'Yeni Müşteri / Kurum Tanımla'}
        subtitle="Kurumsal iletişim, vergi dairesi ve proje referans bilgileri"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Müşteri Türü *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CustomerType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="Belediye">Belediye</option>
                <option value="Kamu">Kamu Kurumu</option>
                <option value="Yüklenici">Ana Yüklenici</option>
                <option value="Kurumsal">Kurumsal</option>
                <option value="Özel Sektör">Özel Sektör</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Referans / Proje Kodu</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Kurum veya proje referansı"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Üst Kurum / Bağlı Birim</label>
            <select
              value={parentCustomerId}
              onChange={(e) => setParentCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
            >
              <option value="">Ana kurum</option>
              {customers.filter((customer) => customer.id !== selectedCustomer?.id).map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.company}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Firma / Kurum Adı *</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Kurumun resmi adı"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Yetkili Kontak Kişi / Unvan *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Engin Alkan (Ulaşım Daire Bşk.)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">E-Posta Adresi</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ulasim@ankara.bel.tr"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telefon Numarası</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 312 507 1000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vergi Dairesi</label>
              <input
                type="text"
                value={taxOffice}
                onChange={(e) => setTaxOffice(e.target.value)}
                placeholder="Yenimahalle V.D."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vergi Numarası</label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="0680014521"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Adres Bilgisi</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Emniyet Mah. Hipodrom Cad. No:5 Yenimahalle / Ankara"
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
              {selectedCustomer ? 'Değişiklikleri Kaydet' : 'Müşteriyi Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => selectedCustomer && deleteCustomer(selectedCustomer.id)}
        itemName={selectedCustomer?.company}
      />
    </div>
  );
};
