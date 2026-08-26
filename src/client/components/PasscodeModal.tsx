import React, { useState } from 'react';
import { Lock, KeyRound, Check } from 'lucide-react';

interface PasscodeModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({ isOpen, onSuccess }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    localStorage.setItem('dashboard_passcode', passcode.trim());
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl mb-4 text-indigo-400">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Access Protected</h2>
          <p className="text-xs text-slate-400 mb-6">
            Enter your dashboard passcode to view rental leads and perform actions.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError(false);
                }}
                placeholder="Enter Passcode..."
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center tracking-widest font-mono"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400">Invalid passcode. Please check your credentials.</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
