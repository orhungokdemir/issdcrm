import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react';
import { UserItem } from '../../types';

interface ChangePasswordPageProps {
  user: UserItem;
  onChanged: (password: string) => Promise<void>;
}

export const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({ user, onChanged }) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      setError('Yeni parola en az 8 karakter olmalıdır.');
      return;
    }
    if (password !== confirmation) {
      setError('Parola tekrarı eşleşmiyor.');
      return;
    }
    await onChanged(password);
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-7 sm:p-10">
        <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-6">
          <KeyRound className="w-5 h-5" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">İlk giriş</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Parolanızı yenileyin</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Güvenliğiniz için geçici parolanızı kişisel bir parola ile değiştirmeniz gerekiyor.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="new-password" className="block text-xs font-bold text-slate-700 mb-2">Yeni parola</label>
            <div className="relative">
              <input id="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} autoComplete="new-password" className="w-full px-3.5 py-3 pr-11 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" required />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label="Parolayı göster veya gizle" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-700 mb-2">Yeni parola tekrarı</label>
            <input id="confirm-password" type="password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(''); }} autoComplete="new-password" className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" required />
          </div>
          {error && <p role="alert" className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2.5">{error}</p>}
          <button type="submit" className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl">
            Yeni parolayı kaydet <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </section>
    </main>
  );
};