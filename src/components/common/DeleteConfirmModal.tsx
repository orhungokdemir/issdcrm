import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  message?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Kaydı Silmek İstediğinize Emin Misiniz?',
  itemName,
  message = 'Bu işlem geri alınamaz. İlgili kayıt CRM sisteminden kalıcı olarak silinecektir.',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4 ring-8 ring-rose-50/50">
          <AlertTriangle className="w-6 h-6" />
        </div>
        {itemName && (
          <p className="font-semibold text-slate-800 text-sm mb-1 px-4 py-1.5 bg-slate-100 rounded-md inline-block max-w-full truncate">
            {itemName}
          </p>
        )}
        <p className="text-sm text-slate-600 mt-2">{message}</p>

        <div className="flex items-center justify-center gap-3 mt-6 w-full pt-4 border-t border-slate-100">
          <button
            id="btn-cancel-delete"
            type="button"
            onClick={onClose}
            className="w-1/2 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Vazgeç
          </button>
          <button
            id="btn-confirm-delete"
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-1/2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-xs"
          >
            Evet, Sil
          </button>
        </div>
      </div>
    </Modal>
  );
};
