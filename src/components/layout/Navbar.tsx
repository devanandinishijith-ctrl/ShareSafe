import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { SupabaseConfigModal } from './SupabaseConfigModal';
import {
  ShieldCheck,
  Files,
  Share2,
  Clock,
  LogOut,
  Database,
  Menu,
  X,
  LayoutDashboard,
  UserCheck,
  Mail,
} from 'lucide-react';

interface Props {
  activeTab: 'overview' | 'files' | 'shares' | 'activity';
  setActiveTab: (tab: 'overview' | 'files' | 'shares' | 'activity') => void;
  onOpenUpload: () => void;
  onOpenShare: () => void;
  onOpenMailbox?: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onOpenUpload,
  onOpenShare,
  onOpenMailbox,
}) => {
  const { user, signOut } = useAuth();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isConnected = isSupabaseConfigured();

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'files', label: 'My Files', icon: Files },
    { id: 'shares', label: 'My Shares', icon: Share2 },
    { id: 'activity', label: 'Activity Log', icon: Clock },
  ] as const;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-cyan flex items-center justify-center text-white shadow-md shadow-brand-blue/20">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-xl font-bold text-navy-900 tracking-tight flex items-center gap-1.5">
                  ShareSafe
                  <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                    Pro
                  </span>
                </span>
                <p className="text-[11px] text-slate-500 font-medium -mt-0.5">Secure Share + Undo Guard</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-blue text-white shadow-sm shadow-brand-blue/25'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Side: Backend Badge, User, Actions */}
            <div className="hidden lg:flex items-center space-x-3">
              {/* Outbox / Mailbox Button */}
              {onOpenMailbox && (
                <button
                  onClick={onOpenMailbox}
                  title="Open Outbox & Sent Email Dispatcher"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-brand-blue border border-blue-200 hover:bg-blue-100 transition shadow-xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Outbox</span>
                </button>
              )}

              {/* Backend Status Indicator */}
              <button
                onClick={() => setShowConfigModal(true)}
                title="View database & storage status"
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
                <Database className="w-3.5 h-3.5" />
                <span>{isConnected ? 'Supabase Cloud' : 'Storage Engine Active'}</span>
              </button>

              {/* User Avatar & Logout */}
              <div className="flex items-center pl-2 border-l border-slate-200 space-x-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-navy-800 border border-slate-300">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden xl:block">
                    <p className="text-xs font-semibold text-navy-900 leading-tight">{user?.name || 'User'}</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-[120px]">{user?.email}</p>
                  </div>
                </div>

                <button
                  onClick={signOut}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center space-x-2">
              <button
                onClick={() => setShowConfigModal(true)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                <Database className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 shadow-lg animate-slide-down">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2.5 w-full px-4 py-2.5 rounded-xl text-sm font-medium ${
                    isActive ? 'bg-brand-blue text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Signed in as <span className="font-semibold text-navy-900">{user?.email}</span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-1 text-xs font-medium text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <SupabaseConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} />
    </>
  );
};
