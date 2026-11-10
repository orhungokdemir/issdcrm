import React, { useState } from 'react';
import { Landmark } from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { GuaranteeLetterItem, GuaranteeLetterStatus, GuaranteeLetterType } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { Badge, getStatusBadge } from '../common/Badge';

export const GuaranteeLettersView: React.FC = () => {
  const { guaranteeLetters, contracts, addGuaranteeLetter, updateGuaranteeLetter, deleteGuaranteeLetter, formatMoney } = useCrm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<GuaranteeLetterItem | null>(null);
  const [letterNo, setLetterNo] = useState('');
  const [type, setType] = useState<GuaranteeLetterType>('Kesin Teminat');
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [contractId, setContractId] = useState('');
  const [status, setStatus] = useState<GuaranteeLetterStatus>('Aktif');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setSelected(null); setLetterNo(''); setType('Kesin Teminat'); setBank(''); setAmount(0); setCurrency('TRY');
    setIssueDate(new Date().toISOString().slice(0, 10)); setExpiryDate(''); setBeneficiary('');
    setContractId(contracts[0]?.id || ''); setStatus('Aktif'); setNotes('');
  };

  const openAdd = () => { resetForm(); setIsModalOpen(true); };
  const openEdit = (letter: GuaranteeLetterItem) => {
    setSelected(letter); setLetterNo(letter.letterNo); setType(letter.type); setBank(letter.bank); setAmount(letter.amount);
    setCurrency(letter.currency); setIssueDate(letter.issueDate); setExpiryDate(letter.expiryDate); setBeneficiary(letter.beneficiary);
    setContractId(letter.contractId); setStatus(letter.status); setNotes(letter.notes || ''); setIsModalOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const contract = contracts.find((item) => item.id === contractId);
    if (!contract) return;
    const item = { type, bank, amount: Math.max(0, Number(amount) || 0), currency, issueDate, expiryDate, beneficiary, contractId, contractNo: contract.contractNo, status, notes };
    if (selected) updateGuaranteeLetter(selected.id, item);
    else addGuaranteeLetter(item);
    setIsModalOpen(false);
  };

  const columns: Column<GuaranteeLetterItem>[] = [
    { key: 'status', header: 'Durum', render: (item) => getStatusBadge(item.status) },
    { key: 'letterNo', header: 'Mektup No', render: (item) => <span className="font-bold text-indigo-700 font-mono">{item.letterNo}</span> },
    { key: 'type', header: 'Teminat Türü', render: (item) => <Badge variant="blue">{item.type}</Badge> },
    { key: 'bank', header: 'Banka', render: (item) => <span className="font-semibold text-slate-800">{item.bank}</span> },
    { key: 'amount', header: 'Tutar', render: (item) => <span className="font-black text-slate-900 whitespace-nowrap">{formatMoney(item.amount, item.currency)}</span> },
    { key: 'contractNo', header: 'Sözleşme No', render: (item) => <span className="font-semibold text-slate-700">{item.contractNo || 'Sözleşme bulunamadı'}</span> },
    { key: 'beneficiary', header: 'Lehtar', render: (item) => <span className="font-medium text-slate-700">{item.beneficiary}</span> },
    { key: 'issueDate', header: 'Düzenleme Tarihi' },
    { key: 'expiryDate', header: 'Vade Tarihi', render: (item) => <span className="font-semibold text-slate-700">{item.expiryDate}</span> },
  ];

  return <div className="space-y-6">
    <div className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
      <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center"><Landmark className="w-5 h-5" /></div>
      <div><h2 className="text-lg font-bold text-slate-900">Teminat Mektupları</h2><p className="text-xs text-slate-500 mt-1">Sözleşmelere bağlı banka teminatlarının tutar, vade ve iade durumlarını takip edin.</p></div>
    </div>
    <DataTable data={guaranteeLetters} columns={columns} title="Teminat Mektubu Takibi" subtitle="Aktif ve kapanmış teminat kayıtları" searchPlaceholder="Mektup no, banka veya sözleşme ara..." onAddNew={openAdd} addNewLabel="Yeni Teminat Mektubu" onEdit={openEdit} onDelete={(item) => { setSelected(item); setIsDeleteOpen(true); }} rowKey={(item) => item.id} settingsKey="guarantee-letters" serverResource="guaranteeLetters" />
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selected ? 'Teminat Mektubunu Düzenle' : 'Yeni Teminat Mektubu'} subtitle="Teminatı ilgili sözleşmeye bağlayın" maxWidth="2xl">
      <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="font-semibold text-slate-700">Mektup No<input value={letterNo} readOnly placeholder="Sistem tarafından atanır" className="mt-1 w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono" /></label>
          <label className="font-semibold text-slate-700">Teminat Türü<select value={type} onChange={(e) => setType(e.target.value as GuaranteeLetterType)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"><option>Geçici Teminat</option><option>Kesin Teminat</option><option>Avans Teminatı</option><option>Diğer</option></select></label>
          <label className="font-semibold text-slate-700">Banka *<input value={bank} onChange={(e) => setBank(e.target.value)} required className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" /></label>
          <label className="font-semibold text-slate-700">Sözleşme *<select value={contractId} onChange={(e) => setContractId(e.target.value)} required className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"><option value="">Sözleşme seçin</option>{contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.contractNo} - {contract.contractName}</option>)}</select></label>
          <label className="font-semibold text-slate-700">Teminat Tutarı *<input type="number" min="0" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" /></label>
          <label className="font-semibold text-slate-700">Para Birimi<select value={currency} onChange={(e) => setCurrency(e.target.value as 'TRY' | 'USD' | 'EUR')} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"><option>TRY</option><option>USD</option><option>EUR</option></select></label>
          <label className="font-semibold text-slate-700">Düzenleme Tarihi *<input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" /></label>
          <label className="font-semibold text-slate-700">Vade Tarihi *<input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" /></label>
          <label className="font-semibold text-slate-700">Lehtar *<input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} required className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" /></label>
          <label className="font-semibold text-slate-700">Durum<select value={status} onChange={(e) => setStatus(e.target.value as GuaranteeLetterStatus)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"><option>Aktif</option><option>İade Edildi</option><option>Paraya Çevrildi</option><option>Süresi Doldu</option></select></label>
        </div>
        <label className="block font-semibold text-slate-700">Notlar<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" /></label>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg">İptal</button><button type="submit" disabled={!contracts.length} className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg font-semibold">Kaydet</button></div>
      </form>
    </Modal>
    <DeleteConfirmModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={() => { if (selected) deleteGuaranteeLetter(selected.id); setIsDeleteOpen(false); }} itemName={selected?.letterNo} />
  </div>;
};
