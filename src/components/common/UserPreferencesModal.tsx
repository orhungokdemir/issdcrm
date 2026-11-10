import React, { useEffect, useState } from 'react';
import { Bell, Check, Settings2 } from 'lucide-react';
import { Modal } from './Modal';
import { UserItem } from '../../types';

export interface UserPreferences {
  defaultCurrency: 'TRY' | 'USD' | 'EUR';
  compactTables: boolean;
  notificationsEnabled: boolean;
}

interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserItem;
  onSaved: (preferences: UserPreferences) => void;
}

const getStorageKey = (user: UserItem) => `issd_crm_preferences_${user.email.toLowerCase()}`;

export const UserPreferencesModal: React.FC<UserPreferencesModalProps> = ({ isOpen, onClose, user, onSaved }) => {
  const [defaultCurrency, setDefaultCurrency] = useState<UserPreferences['defaultCurrency']>('TRY');
  const [compactTables, setCompactTables] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = localStorage.getItem(getStorageKey(user));
      const preferences = stored ? JSON.parse(stored) as Partial<UserPreferences> : {};
      setDefaultCurrency(preferences.defaultCurrency || 'TRY');
      setCompactTables(preferences.compactTables || false);
      setNotificationsEnabled(preferences.notificationsEnabled !== false);
    } catch {
      setDefaultCurrency('TRY');
      setCompactTables(false);
      setNotificationsEnabled(true);
    }
  }, [isOpen, user]);

  const handleSave = () => {
    const preferences: UserPreferences = { defaultCurrency, compactTables, notificationsEnabled };
    localStorage.setItem(getStorageKey(user), JSON.stringify(preferences));
    onSaved(preferences);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kullanıcı Tercihleri" subtitle={`${user.fullName} için kişisel uygulama ayarları`} maxWidth="md">
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
          <Settings2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <p className="text-xs leading-5 text-indigo-900">Bu ayarlar yalnızca aktif kullanıcı hesabınız için saklanır.</p>
        </div>
        <label className="block text-xs font-semibold text-slate-700">Varsayılan para birimi
          <select value={defaultCurrency} onChange={(event) => setDefaultCurrency(event.target.value as UserPreferences['defaultCurrency'])} className="mt-1.5 w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500">
            <option value="TRY">Türk Lirası (TRY)</option><option value="USD">Amerikan Doları (USD)</option><option value="EUR">Euro (EUR)</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-4 p-3 border border-slate-200 rounded-lg cursor-pointer">
          <span><span className="block text-xs font-semibold text-slate-700">Kompakt tablo görünümü</span><span className="block mt-1 text-[11px] text-slate-500">Tablo satırlarında daha fazla kayıt gösterir.</span></span>
          <input type="checkbox" checked={compactTables} onChange={(event) => setCompactTables(event.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
        </label>
        <label className="flex items-center justify-between gap-4 p-3 border border-slate-200 rounded-lg cursor-pointer">
          <span className="flex items-center gap-2"><Bell className="w-4 h-4 text-slate-400" /><span><span className="block text-xs font-semibold text-slate-700">Bildirimler</span><span className="block mt-1 text-[11px] text-slate-500">İşlem bildirimlerini göster.</span></span></span>
          <input type="checkbox" checked={notificationsEnabled} onChange={(event) => setNotificationsEnabled(event.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
        </label>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg">İptal</button>
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"><Check className="w-3.5 h-3.5" /> Kaydet</button>
        </div>
      </div>
    </Modal>
  );
};
