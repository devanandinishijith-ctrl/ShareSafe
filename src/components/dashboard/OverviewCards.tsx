import React from 'react';
import { Files, Share2, ShieldAlert, Clock, ArrowUpRight, Upload, Plus, ShieldCheck } from 'lucide-react';
import { FileRecord, ShareRecord } from '../../types';

interface Props {
  files: FileRecord[];
  shares: ShareRecord[];
  onOpenUpload: () => void;
  onOpenShare: () => void;
  onNavigateShares: () => void;
  onNavigateFiles: () => void;
}

export const OverviewCards: React.FC<Props> = ({
  files,
  shares,
  onOpenUpload,
  onOpenShare,
  onNavigateShares,
  onNavigateFiles,
}) => {
  const totalFiles = files.length;
  const totalBytes = files.reduce((acc, f) => acc + (Number(f.file_size) || 0), 0);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const activeShares = shares.filter((s) => s.status === 'active').length;
  const revokedShares = shares.filter((s) => s.status === 'revoked').length;

  // Shares expiring within the next 2 hours
  const now = Date.now();
  const expiringShares = shares.filter((s) => {
    if (s.status !== 'active') return false;
    const diff = new Date(s.expires_at).getTime() - now;
    return diff > 0 && diff < 2 * 3600 * 1000;
  }).length;

  return (
    <div className="space-y-6">
      {/* Quick Action Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-900 via-slate-900 to-navy-950 text-white p-6 sm:p-8 shadow-card border border-slate-800">
        {/* Background glow decorations */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-brand-blue/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-10 w-48 h-48 bg-brand-cyan/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-blue/20 border border-brand-blue/30 text-brand-cyan text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Undo Share & Grace Guard Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Confidential File Sharing with Safety Undo
            </h1>
            <p className="mt-2 text-slate-300 text-sm leading-relaxed">
              Verify recipients before sending, enforce automatic expiration, and undo any accidental share instantly during the configurable grace period.
            </p>
          </div>

          {/* Quick Action Large Buttons */}
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <button
              onClick={onOpenUpload}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/15 transition backdrop-blur-md shadow-sm"
            >
              <Upload className="w-4 h-4 text-brand-cyan" />
              <span>Upload File</span>
            </button>
            <button
              onClick={onOpenShare}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-blue to-blue-600 hover:from-blue-600 hover:to-brand-blue text-white text-sm font-semibold shadow-glow-blue transition active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4" />
              <span>Share File</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Files */}
        <div
          onClick={onNavigateFiles}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-card hover:border-slate-300 cursor-pointer transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Files</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-brand-blue group-hover:scale-105 transition-transform">
              <Files className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-bold text-navy-900">{totalFiles}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
              <span>{formatBytes(totalBytes)} stored</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* Active Shares */}
        <div
          onClick={onNavigateShares}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-card hover:border-slate-300 cursor-pointer transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Shares</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <p className="text-2xl sm:text-3xl font-bold text-navy-900">{activeShares}</p>
              {activeShares > 0 && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-600 mt-1 font-medium">Currently accessible</p>
          </div>
        </div>

        {/* Revoked Shares */}
        <div
          onClick={onNavigateShares}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-card hover:border-slate-300 cursor-pointer transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Revoked Shares</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-bold text-navy-900">{revokedShares}</p>
            <p className="text-xs text-rose-600 mt-1 font-medium">Protected by Undo / Revoke</p>
          </div>
        </div>

        {/* Expiring Shares */}
        <div
          onClick={onNavigateShares}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-card hover:border-slate-300 cursor-pointer transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expiring Soon</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-bold text-navy-900">{expiringShares}</p>
            <p className="text-xs text-amber-600 mt-1 font-medium">Expires in &lt; 2 hours</p>
          </div>
        </div>
      </div>
    </div>
  );
};
