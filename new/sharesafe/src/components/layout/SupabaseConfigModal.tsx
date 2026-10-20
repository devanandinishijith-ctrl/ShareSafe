import React, { useState } from 'react';
import {
  isSupabaseConfigured,
  supabaseUrl,
  supabaseAnonKey,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
} from '../../lib/supabase';
import { Database, ShieldCheck, ExternalLink, X, CheckCircle2, AlertCircle, KeyRound, Server } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(supabaseUrl);
  const [anonKey, setAnonKey] = useState(supabaseAnonKey);
  const [isSaved, setIsSaved] = useState(false);
  const isConnected = isSupabaseConfigured();

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && anonKey) {
      saveSupabaseCredentials(url, anonKey);
      setIsSaved(true);
    }
  };

  const handleDisconnect = () => {
    clearSupabaseCredentials();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-brand-blue/10 rounded-xl text-brand-blue">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-900 text-lg">Backend & Database Status</h3>
              <p className="text-xs text-slate-500">Supabase Cloud & Local Persistence Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status Badge */}
          <div
            className={`p-4 rounded-xl border flex items-start space-x-3 ${
              isConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : (
              <Server className="w-5 h-5 text-brand-blue mt-0.5 flex-shrink-0" />
            )}
            <div className="text-sm">
              <p className="font-medium">
                {isConnected ? 'Connected to Supabase Cloud' : 'Self-Contained Persistence Engine Active'}
              </p>
              <p className="text-xs mt-1 opacity-90">
                {isConnected
                  ? 'All authentication, PostgreSQL tables, Row-Level Security, and storage buckets are actively executing against your cloud Supabase instance.'
                  : 'Zero configuration mode: Real IndexedDB file blob storage and relational persistence are active. All features (Undo Share, countdown, file downloads, recipient verification) work 100% end-to-end!'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy-800 uppercase tracking-wider mb-1.5">
                Supabase Project URL
              </label>
              <input
                type="url"
                placeholder="https://your-project-ref.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 text-sm outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-800 uppercase tracking-wider mb-1.5">
                Supabase Anon / Public Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 text-sm outline-none transition"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              {isConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium underline"
                >
                  Disconnect Supabase
                </button>
              ) : (
                <span className="text-xs text-slate-400">SQL Schema included in /supabase/schema.sql</span>
              )}

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!url || !anonKey}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-50 rounded-xl shadow-sm transition"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
