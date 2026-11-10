import React, { useState } from 'react';
import { useCrm } from '../../context/CrmContext';
import { UserItem, Role, UserStatus, UserPermission } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { getStatusBadge, Badge } from '../common/Badge';

export const UsersView: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, activeCompany, currentUser } = useCrm();
  const canManageUsers = currentUser.role === 'Admin';
  const permissionGroups: { label: string; permissions: { key: UserPermission; label: string }[] }[] = [
    { label: 'Genel', permissions: [{ key: 'dashboard.view', label: 'Dashboard görüntüleme' }] },
    { label: 'Aktiviteler', permissions: [
      { key: 'activities.view', label: 'Görüntüleme' }, { key: 'activities.create', label: 'Ekleme' }, { key: 'activities.edit', label: 'Düzenleme' }, { key: 'activities.delete', label: 'Silme' },
    ] },
    { label: 'İhale / Fırsatlar', permissions: [
      { key: 'opportunities.view', label: 'Görüntüleme' }, { key: 'opportunities.create', label: 'Ekleme' }, { key: 'opportunities.edit', label: 'Düzenleme' }, { key: 'opportunities.delete', label: 'Silme' },
    ] },
    { label: 'Kurum Paydaşları', permissions: [
      { key: 'stakeholders.view', label: 'Görüntüleme' }, { key: 'stakeholders.create', label: 'Ekleme' }, { key: 'stakeholders.edit', label: 'Düzenleme' }, { key: 'stakeholders.delete', label: 'Silme' },
    ] },
    { label: 'Talepler', permissions: [
      { key: 'requests.view', label: 'Görüntüleme' }, { key: 'requests.create', label: 'Ekleme' }, { key: 'requests.edit', label: 'Düzenleme' }, { key: 'requests.delete', label: 'Silme' },
    ] },
    { label: 'Teklifler', permissions: [
      { key: 'proposals.view', label: 'Görüntüleme' }, { key: 'proposals.create', label: 'Ekleme' }, { key: 'proposals.edit', label: 'Düzenleme' }, { key: 'proposals.delete', label: 'Silme' },
    ] },
    { label: 'Siparişler', permissions: [
      { key: 'orders.view', label: 'Görüntüleme' }, { key: 'orders.create', label: 'Ekleme' }, { key: 'orders.edit', label: 'Düzenleme' }, { key: 'orders.delete', label: 'Silme' },
    ] },
    { label: 'Sözleşmeler', permissions: [
      { key: 'contracts.view', label: 'Görüntüleme' }, { key: 'contracts.create', label: 'Ekleme' }, { key: 'contracts.edit', label: 'Düzenleme' }, { key: 'contracts.delete', label: 'Silme' },
    ] },
    { label: 'Teminat Mektupları', permissions: [
      { key: 'guaranteeLetters.view', label: 'Görüntüleme' }, { key: 'guaranteeLetters.create', label: 'Ekleme' }, { key: 'guaranteeLetters.edit', label: 'Düzenleme' }, { key: 'guaranteeLetters.delete', label: 'Silme' },
    ] },
    { label: 'Sistem', permissions: [
      { key: 'reports.view', label: 'Raporları görüntüleme' }, { key: 'customers.manage', label: 'Müşteri yönetimi' }, { key: 'products.manage', label: 'Ürün yönetimi' }, { key: 'products.cost.view', label: 'Ürün maliyetlerini görüntüleme' },
    ] },
  ];
  const defaultPermissions: Record<Role, UserPermission[]> = {
    Admin: permissionGroups.flatMap((group) => group.permissions.map((permission) => permission.key)),
    Manager: ['dashboard.view', 'activities.view', 'activities.create', 'activities.edit', 'opportunities.view', 'opportunities.create', 'opportunities.edit', 'opportunities.delete', 'stakeholders.view', 'stakeholders.create', 'stakeholders.edit', 'stakeholders.delete', 'requests.view', 'requests.create', 'requests.edit', 'proposals.view', 'proposals.create', 'proposals.edit', 'orders.view', 'orders.create', 'orders.edit', 'contracts.view', 'contracts.create', 'contracts.edit', 'guaranteeLetters.view', 'reports.view', 'customers.manage', 'products.manage', 'products.cost.view'],
    Sales: ['dashboard.view', 'activities.view', 'activities.create', 'activities.edit', 'opportunities.view', 'opportunities.create', 'opportunities.edit', 'stakeholders.view', 'stakeholders.create', 'stakeholders.edit', 'requests.view', 'requests.create', 'proposals.view', 'proposals.create', 'proposals.edit', 'orders.view', 'customers.manage'],
    Engineer: ['dashboard.view', 'activities.view', 'activities.create', 'stakeholders.view', 'requests.view', 'requests.edit', 'orders.view', 'contracts.view', 'guaranteeLetters.view', 'products.manage'],
    Support: ['dashboard.view', 'activities.view', 'stakeholders.view', 'requests.view', 'requests.create', 'requests.edit'],
  };

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [duty, setDuty] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('Manager');
  const [companies, setCompanies] = useState<string[]>([activeCompany]);
  const [status, setStatus] = useState<UserStatus>('Aktif');
  const [permissions, setPermissions] = useState<UserPermission[]>(defaultPermissions.Sales);

  const openAddModal = () => {
    setSelectedUser(null);
    setFullName('');
    setEmail('');
    setDuty('Proje ve Satış Sorumlusu');
    setPhone('+90 532 ');
    setRole('Sales');
    setCompanies([activeCompany]);
    setStatus('Aktif');
    setPermissions(defaultPermissions.Sales);
    setIsAddEditOpen(true);
  };

  const openEditModal = (u: UserItem) => {
    setSelectedUser(u);
    setFullName(u.fullName);
    setEmail(u.email);
    setDuty(u.duty);
    setPhone(u.phone);
    setRole(u.role);
    setCompanies(u.companies || [activeCompany]);
    setStatus(u.status);
    setPermissions(u.permissions || defaultPermissions[u.role]);
    setIsAddEditOpen(true);
  };

  const openDeleteModal = (u: UserItem) => {
    setSelectedUser(u);
    setIsDeleteOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      updateUser(selectedUser.id, {
        fullName,
        email,
        duty,
        phone,
        role,
        companies,
        status,
        permissions,
      });
    } else {
      addUser({
        fullName,
        email,
        duty,
        phone,
        role,
        companies: companies.length > 0 ? companies : [activeCompany],
        status,
        permissions,
      });
    }
    setIsAddEditOpen(false);
  };

  // Required table columns: ID, Ad Soyad, E-Posta, Görev, Telefon, Rol, Firmalar, Durum
  const columns: Column<UserItem>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (item) => <span className="font-mono text-slate-500 text-xs font-semibold">{item.id}</span>,
    },
    {
      key: 'fullName',
      header: 'Ad Soyad',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
            {item.avatar ? (
              <img src={item.avatar} alt={item.fullName} className="w-full h-full object-cover" />
            ) : (
              item.fullName.charAt(0)
            )}
          </div>
          <div>
            <p className="font-bold text-slate-900 leading-tight">{item.fullName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'E-Posta',
      render: (item) => <span className="text-slate-600 text-xs">{item.email}</span>,
    },
    {
      key: 'duty',
      header: 'Görev',
      render: (item) => <span className="text-slate-800 text-xs font-medium">{item.duty}</span>,
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (item) => <span className="text-slate-600 text-xs font-mono">{item.phone}</span>,
    },
    {
      key: 'role',
      header: 'Rol',
      render: (item) => {
        const roleColors: Record<Role, 'purple' | 'blue' | 'indigo' | 'green' | 'gray'> = {
          Admin: 'indigo',
          Manager: 'blue',
          Sales: 'green',
          Engineer: 'indigo',
          Support: 'gray',
        };
        return <Badge variant={roleColors[item.role] || 'indigo'}>{item.role}</Badge>;
      },
    },
    {
      key: 'companies',
      header: 'Firmalar',
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.companies?.map((comp, i) => (
            <span
              key={i}
              className="text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 px-2 py-0.5 rounded-md"
            >
              {comp}
            </span>
          )) || <span className="text-[11px] text-slate-400">ISSD</span>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (item) => getStatusBadge(item.status),
    },
  ];

  return (
    !canManageUsers ? <div className="bg-white border border-slate-200 rounded-xl p-8 text-center"><h2 className="text-lg font-bold text-slate-900">Yetkisiz Erişim</h2><p className="text-sm text-slate-500 mt-2">Kullanıcı ve yetki yönetimi yalnızca Admin tarafından yapılabilir.</p></div> :
    <div className="space-y-6">
      <DataTable
        data={users}
        columns={columns}
        title="Kullanıcılar"
        subtitle="ISSD sistem personelleri, kullanıcı rolleri ve erişim yetkileri yönetimi"
        searchPlaceholder="Personel adı, e-posta veya görev ara..."
        onAddNew={canManageUsers ? openAddModal : undefined}
        addNewLabel="Yeni Kullanıcı Ekle"
        onEdit={canManageUsers ? openEditModal : undefined}
        onDelete={canManageUsers ? openDeleteModal : undefined}
        rowKey={(item) => item.id}
        serverResource="users"
      />

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={selectedUser ? 'Kullanıcıyı Düzenle' : 'Yeni Personel Tanımla'}
        subtitle="Kullanıcı kimlik bilgileri, görev tanımı ve sistem rolü"
        maxWidth="xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ad Soyad *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Örn: Orhun Gökdemir"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">E-Posta Adresi *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orhun.gokdemir@issd.com.tr"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telefon Numarası</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 532 555 1001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Görev / Unvan *</label>
              <input
                type="text"
                value={duty}
                onChange={(e) => setDuty(e.target.value)}
                placeholder="Örn: Kurumsal Satış Direktörü"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rol (Yetki)</label>
              <select
                value={role}
                onChange={(e) => {
                  const nextRole = e.target.value as Role;
                  setRole(nextRole);
                  setPermissions(defaultPermissions[nextRole]);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="Admin">Admin (Yönetici)</option>
                <option value="Manager">Manager (Birim Yöneticisi)</option>
                <option value="Sales">Sales (Satış Temsilcisi)</option>
                <option value="Engineer">Engineer (Sistem Mühendisi)</option>
                <option value="Support">Support (Teknik Destek)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bağlı Firma</label>
              <input
                type="text"
                value={companies.join(', ')}
                onChange={(e) => setCompanies(e.target.value.split(',').map((s) => s.trim()))}
                placeholder="ISSD Bilişim A.Ş."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Durum</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="Aktif">Aktif</option>
                <option value="Pasif">Pasif</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div><label className="block font-semibold text-slate-700">Sistem Yetkileri</label><p className="text-[11px] text-slate-500 mt-1">Rol için önerilen yetkiler otomatik seçilir, Admin değiştirebilir.</p></div>
              <button type="button" onClick={() => setPermissions(defaultPermissions[role])} className="text-xs text-indigo-600 font-semibold hover:underline">Role göre ayarla</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-3">
              {permissionGroups.map((group) => <fieldset key={group.label}><legend className="text-xs font-bold text-slate-600 mb-1">{group.label}</legend>{group.permissions.map((permission) => <label key={permission.key} className="flex items-center gap-2 py-1 text-xs text-slate-700"><input type="checkbox" checked={permissions.includes(permission.key)} onChange={() => setPermissions((current) => current.includes(permission.key) ? current.filter((key) => key !== permission.key) : [...current, permission.key])} className="rounded border-slate-300 text-indigo-600" />{permission.label}</label>)}</fieldset>)}
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
              {selectedUser ? 'Değişiklikleri Kaydet' : 'Kullanıcıyı Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => selectedUser && deleteUser(selectedUser.id)}
        itemName={selectedUser?.fullName}
      />
    </div>
  );
};
