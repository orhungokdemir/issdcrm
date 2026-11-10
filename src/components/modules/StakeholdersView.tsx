import React, { useMemo, useState } from 'react';
import { Building2, Mail, MapPin, Pencil, Phone, Plus, Trash2, UserRound } from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { StakeholderItem, StakeholderRole } from '../../types';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { Modal } from '../common/Modal';

type StakeholderForm = Omit<StakeholderItem, 'id' | 'customerName' | 'createdAt'>;

const roles: StakeholderRole[] = ['Karar Verici', 'Teknik Ekip', 'İdari / Satın Alma', 'Etkileyici', 'Kullanıcı', 'Diğer'];

const roleTone: Record<StakeholderRole, string> = {
  'Karar Verici': 'bg-emerald-50 text-emerald-800',
  'Teknik Ekip': 'bg-sky-50 text-sky-800',
  'İdari / Satın Alma': 'bg-amber-50 text-amber-800',
  'Etkileyici': 'bg-violet-50 text-violet-800',
  'Kullanıcı': 'bg-slate-100 text-slate-700',
  'Diğer': 'bg-slate-100 text-slate-700',
};

export const StakeholdersView: React.FC = () => {
  const {
    customers,
    stakeholders,
    activities,
    hasPermission,
    addStakeholder,
    updateStakeholder,
    deleteStakeholder,
  } = useCrm();
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<StakeholderItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StakeholderItem | null>(null);
  const [form, setForm] = useState<StakeholderForm>(() => ({
    customerId: customers[0]?.id || '', fullName: '', title: '', department: '', role: 'Teknik Ekip', email: '', phone: '', status: 'Aktif', notes: '',
  }));

  const institutionTree = useMemo(() => {
    const childrenByParent = new Map<string, typeof customers>();
    for (const customer of customers) {
      const parentId = customer.parentCustomerId || '';
      childrenByParent.set(parentId, [...(childrenByParent.get(parentId) || []), customer]);
    }
    const rows: Array<{ customerId: string; name: string; depth: number }> = [];
    const visited = new Set<string>();
    const walk = (parentId: string, depth: number) => {
      for (const customer of childrenByParent.get(parentId) || []) {
        if (visited.has(customer.id)) continue;
        visited.add(customer.id);
        rows.push({ customerId: customer.id, name: customer.company, depth });
        walk(customer.id, depth + 1);
      }
    };
    walk('', 0);
    for (const customer of customers) {
      if (!visited.has(customer.id)) {
        rows.push({ customerId: customer.id, name: customer.company, depth: 0 });
        walk(customer.id, 1);
      }
    }
    return rows;
  }, [customers]);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const institutionStakeholders = stakeholders.filter((stakeholder) => stakeholder.customerId === selectedCustomerId);
  const institutionActivities = activities
    .filter((activity) => activity.customerId === selectedCustomerId)
    .sort((left, right) => right.date.localeCompare(left.date));
  const canCreate = hasPermission('stakeholders.create');
  const canEdit = hasPermission('stakeholders.edit');
  const canDelete = hasPermission('stakeholders.delete');

  const openCreate = () => {
    setSelectedStakeholder(null);
    setForm({
      customerId: selectedCustomerId,
      fullName: '',
      title: '',
      department: '',
      role: 'Teknik Ekip',
      email: '',
      phone: '',
      status: 'Aktif',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const openEdit = (stakeholder: StakeholderItem) => {
    setSelectedStakeholder(stakeholder);
    const { id: _id, customerName: _customerName, createdAt: _createdAt, ...details } = stakeholder;
    setForm(details);
    setIsFormOpen(true);
  };

  const saveStakeholder = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const customer = customers.find((entry) => entry.id === form.customerId);
    if (!customer) return;
    if (selectedStakeholder) updateStakeholder(selectedStakeholder.id, form);
    else addStakeholder({ ...form, customerName: customer.company, createdAt: new Date().toISOString().slice(0, 10) });
    setSelectedCustomerId(form.customerId);
    setIsFormOpen(false);
  };

  const inputClass = 'mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15';

  return (
    <div className="space-y-5">
      <header className="border-b border-slate-200 pb-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-emerald-700"><Building2 className="h-4 w-4" /> Kurum ilişkileri</div>
        <h1 className="text-xl font-bold text-slate-900">Kurum Paydaşları</h1>
        <p className="mt-1 text-sm text-slate-500">Kurum hiyerarşisini, karar rollerini ve görüşme geçmişini tek yerde inceleyin.</p>
      </header>

      <div className="grid min-h-[620px] grid-cols-1 border-y border-slate-200 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 py-4 lg:border-b-0 lg:border-r lg:pr-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase text-slate-500">Kurum ağacı</h2>
            <span className="text-xs text-slate-400">{customers.length}</span>
          </div>
          <nav aria-label="Kurum hiyerarşisi" className="space-y-1">
            {institutionTree.map((row) => (
              <button
                type="button"
                key={row.customerId}
                onClick={() => setSelectedCustomerId(row.customerId)}
                aria-current={selectedCustomerId === row.customerId ? 'true' : undefined}
                className={`flex min-h-9 w-full items-center gap-2 rounded px-2 text-left text-xs ${selectedCustomerId === row.customerId ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-slate-700 hover:bg-slate-100'}`}
                style={{ paddingLeft: `${8 + row.depth * 16}px` }}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{row.name}</span>
              </button>
            ))}
            {customers.length === 0 && <p className="px-2 py-4 text-xs text-slate-500">Önce kurum kaydı oluşturun.</p>}
          </nav>
        </aside>

        <main className="min-w-0 py-4 lg:pl-6">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Seçili kurum</p>
              <h2 className="mt-1 truncate text-lg font-bold text-slate-900">{selectedCustomer?.company || 'Kurum seçin'}</h2>
              {selectedCustomer?.parentCustomerId && <p className="mt-1 text-xs text-slate-500">Üst kurum: {customers.find((customer) => customer.id === selectedCustomer.parentCustomerId)?.company}</p>}
            </div>
            {canCreate && selectedCustomer && <button type="button" onClick={openCreate} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"><Plus className="h-4 w-4" /> Paydaş ekle</button>}
          </div>

          <section className="py-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Paydaşlar</h3><span className="text-xs text-slate-500">{institutionStakeholders.length} kontak</span></div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {institutionStakeholders.map((stakeholder) => (
                <article key={stakeholder.id} className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600"><UserRound className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-slate-900">{stakeholder.fullName}</h4>
                        <p className="mt-0.5 truncate text-xs text-slate-600">{stakeholder.title || 'Unvan belirtilmemiş'}{stakeholder.department ? ` · ${stakeholder.department}` : ''}</p>
                      </div>
                    </div>
                    {(canEdit || canDelete) && <div className="flex shrink-0 gap-1">
                      {canEdit && <button type="button" title="Paydaşı düzenle" aria-label={`${stakeholder.fullName} paydaşını düzenle`} onClick={() => openEdit(stakeholder)} className="grid h-8 w-8 place-items-center rounded text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>}
                      {canDelete && <button type="button" title="Paydaşı sil" aria-label={`${stakeholder.fullName} paydaşını sil`} onClick={() => setDeleteTarget(stakeholder)} className="grid h-8 w-8 place-items-center rounded text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
                    </div>}
                  </div>
                  <div className="ml-12 mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-1 text-[10px] font-semibold ${roleTone[stakeholder.role]}`}>{stakeholder.role}</span>
                    {stakeholder.status === 'Pasif' && <span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-500">Pasif</span>}
                  </div>
                  <div className="ml-12 mt-3 space-y-1 text-xs text-slate-600">
                    {stakeholder.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" />{stakeholder.email}</p>}
                    {stakeholder.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" />{stakeholder.phone}</p>}
                    {stakeholder.notes && <p className="pt-1 text-slate-500">{stakeholder.notes}</p>}
                  </div>
                </article>
              ))}
              {selectedCustomer && institutionStakeholders.length === 0 && <p className="col-span-full border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">Bu kurum için henüz paydaş kaydı yok.</p>}
            </div>
          </section>

          <section className="border-t border-slate-200 pt-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Görüşme geçmişi</h3><span className="text-xs text-slate-500">{institutionActivities.length} aktivite</span></div>
            <ol className="space-y-3">
              {institutionActivities.map((activity) => {
                const linkedPeople = stakeholders.filter((stakeholder) => activity.stakeholderIds?.includes(stakeholder.id));
                return <li key={activity.id} className="border-l-2 border-emerald-600 pl-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><strong className="text-xs text-slate-900">{activity.subject}</strong><time className="text-[11px] text-slate-500">{activity.date}</time></div>
                  <p className="mt-1 text-xs text-slate-600">{activity.type} · {activity.creator}{linkedPeople.length > 0 ? ` · ${linkedPeople.map((person) => person.fullName).join(', ')}` : ''}</p>
                  {activity.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{activity.description}</p>}
                </li>;
              })}
              {selectedCustomer && institutionActivities.length === 0 && <li className="py-4 text-xs text-slate-500">Bu kurum için kayıtlı görüşme yok.</li>}
            </ol>
          </section>
        </main>
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={selectedStakeholder ? 'Paydaşı düzenle' : 'Yeni paydaş'} subtitle="Kurumdaki karar ve etki rolünü kaydedin" maxWidth="2xl">
        <form onSubmit={saveStakeholder} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Kurum *
              <select required value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })} className={inputClass}>
                <option value="">Kurum seçin</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.company}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">Ad soyad *<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className={inputClass} /></label>
            <label className="text-xs font-semibold text-slate-700">Unvan<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} /></label>
            <label className="text-xs font-semibold text-slate-700">Birim<input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} className={inputClass} /></label>
            <label className="text-xs font-semibold text-slate-700">Karar rolü
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as StakeholderRole })} className={inputClass}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select>
            </label>
            <label className="text-xs font-semibold text-slate-700">E-posta<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass} /></label>
            <label className="text-xs font-semibold text-slate-700">Telefon<input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={inputClass} /></label>
            <label className="text-xs font-semibold text-slate-700">Durum
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as StakeholderForm['status'] })} className={inputClass}><option value="Aktif">Aktif</option><option value="Pasif">Pasif</option></select>
            </label>
            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Notlar<textarea rows={3} value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" onClick={() => setIsFormOpen(false)} className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700">İptal</button><button type="submit" className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white">Kaydet</button></div>
        </form>
      </Modal>
      <DeleteConfirmModal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteStakeholder(deleteTarget.id)} itemName={deleteTarget?.fullName} />
    </div>
  );
};
