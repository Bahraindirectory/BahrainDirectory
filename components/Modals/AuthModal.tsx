import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { members, setCurrentUser } = useAuth();
  const { lang, t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = members.find(m => m.username === username && m.password === password);
    if (found) {
      setCurrentUser(found);
      onClose();
      setUsername('');
      setPassword('');
      setError('');
    } else {
      setError(lang === 'ar' ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'Invalid username or password');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700 relative">

        {/* Modal Header */}
        <div className="flex border-b border-gray-100 dark:border-slate-700 relative">
          <div className="flex-1 py-4 text-center font-bold text-sm text-red-600 border-b-2 border-red-600 bg-red-50/10">
            {t.login}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-4 ${lang === 'ar' ? 'left-4' : 'right-4'} text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300`}
            aria-label="Close Authentication dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{t.username}</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-red-500"
              placeholder={t.username}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-slate-500">{t.password}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-red-500"
              placeholder={t.password}
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors text-sm mt-2 flex items-center justify-center gap-2"
          >
            <Users className="h-4 w-4" />
            <span>{t.login}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
