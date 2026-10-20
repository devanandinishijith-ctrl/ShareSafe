import React, { useState } from 'react';
import { ShareRecord } from '../../types';
import { apiShares } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  FileText,
  Trash2,
  Lock,
  Mail,
  KeyRound,
} from 'lucide-react';

interface Props {
  shares: ShareRecord[];
  onShareRevoked: (shareId: string) => void;
  onOpenRecipientPage: (token: string) => void;
  onOpenNewShare: () => void;
  onOpenMailbox?: (shareId?: string) => void;
  isLoading?: boolean;
}

export const MySharesTable: React.FC<Props> = ({
  shares,
  onShareRevoked,
  onOpenRecipientPage,
  onOpenNewShare,
  onOpenMailbox,
  isLoading,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleManualRevoke = async (share: ShareRecord) => {
    if (!user) return;
    const confirm = window.confirm(
      `Are you sure you want to revoke access to "${share.file?.file_name || 'this file'}" for ${share.recipient_email}? Access will terminate immediately.`
    );
    if (!confirm) return;

    try {
      setRevokingId(share.id);
      const res = await apiShares.revokeShare(share.id, user.id, false);
      if (res.success) {
        onShareRevoked(share.id);
      } else {
        alert(res.error || 'Failed to revoke share');
      }
    } catch (err) {
      console.error('Revoke error:', err);
      alert('Failed to revoke share');
    } finally {
      setRevokingId(null);
    }
  };

  const getComputedStatus = (share: ShareRecord) => {
    if (share.status === 'revoked') {
      return {
        label: 'Revoked',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      };
    }

    const now = Date.now();
    const exp = new Date(share.expires_at).getTime();
    if (share.status === 'expired' || exp <= now) {
      return {
        label: 'Expired',
        color: 'bg-slate-100 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
      };
    }

    const diffHrs = (exp - now) / (3600 * 1000);
    if (diffHrs <= 2) {
      return {
        label: 'Expiring Soon',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500 animate-pulse',
      };
    }

    return {
      label: 'Active',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    };
  };

  const formatRemaining = (expiresAt: string, status: string) => {
    if (status === 'revoked') return 'Revoked';
    const now = Date.now();
    const exp = new Date(expiresAt).getTime();
    const diff = exp - now;

    if (diff <= 0 || status === 'expired') return 'Expired';

    const diffMins = Math.floor(diff / (60 * 1000));
    if (diffMins < 60) return `${diffMins}m remaining`;

    const diffHrs = Math.floor(diff / (3600 * 1000));
    if (diffHrs < 24) return `${diffHrs}h ${Math.floor((diff % (3600 * 1000)) / 60000)}m left`;

    const diffDays = Math.floor(diff / (24 * 3600 * 1000));
    return `${diffDays}d left`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const filteredShares = shares.filter((s) => {
    const matchesSearch =
      s.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.file?.file_name && s.file.file_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === 'all') return true;
    const computed = getComputedStatus(s);
    return computed.label.toLowerCase().includes(filterStatus.toLowerCase());
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-5 sm:p-6 space-y-5">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Sharing Management</h2>
          <p className="text-xs text-slate-500">Track active tokens, expiration timers, and manually revoke access</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shares..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-blue outline-none transition"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-blue outline-none text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="expiring">Expiring Soon</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>

          <button
            onClick={onOpenNewShare}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark rounded-xl shadow-glow-blue transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>New Share</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="space-y-3 py-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center mx-auto mb-3">
            <Share2 className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h4 className="text-base font-semibold text-navy-900">
            {searchQuery || filterStatus !== 'all' ? 'No shares match your filters' : 'No active or historical shares yet'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            When you share a confidential file, you can manage access tokens and revoke recipient access at any time.
          </p>
          <button
            onClick={onOpenNewShare}
            className="mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-blue text-white text-xs font-semibold shadow-glow-blue hover:bg-brand-blue-dark transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Create Share</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">File</th>
                <th className="py-3 px-3">Recipient</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 hidden md:table-cell">Expires In</th>
                <th className="py-3 px-3 hidden lg:table-cell">Shared On</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredShares.map((share) => {
                const statusMeta = getComputedStatus(share);
                const isCopied = copiedToken === share.share_token;
                const canRevoke = share.status === 'active' && new Date(share.expires_at).getTime() > Date.now();

                return (
                  <tr key={share.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-blue-50 text-brand-blue">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-navy-900 text-xs sm:text-sm truncate max-w-[160px] sm:max-w-xs">
                            {share.file?.file_name || 'Document'}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {share.share_token.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-xs font-medium text-navy-800">
                      <div className="truncate max-w-[150px] sm:max-w-[200px]" title={share.recipient_email}>
                        {share.recipient_email}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {share.recipient_verified ? (
                          <span className="inline-flex items-center text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            <Lock className="w-2.5 h-2.5 mr-0.5 text-amber-600" />
                            OTP Protected
                          </span>
                        )}
                        {share.access_passcode && (
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 rounded">
                            {share.access_passcode}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusMeta.color}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                        <span>{statusMeta.label}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-xs text-slate-500 whitespace-nowrap hidden md:table-cell">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatRemaining(share.expires_at, share.status)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-xs text-slate-400 whitespace-nowrap hidden lg:table-cell">
                      {formatDate(share.created_at)}
                    </td>

                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5">
                        {/* View Outbox Email */}
                        {onOpenMailbox && (
                          <button
                            onClick={() => onOpenMailbox(share.id)}
                            title="View dispatched notification email"
                            className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}

                        {/* Copy Link */}
                        <button
                          onClick={() => handleCopyLink(share.share_token)}
                          title="Copy share link"
                          className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* Open Recipient View */}
                        <button
                          onClick={() => onOpenRecipientPage(share.share_token)}
                          title="Open recipient view"
                          className="p-1.5 text-slate-500 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        {/* Manual Revoke */}
                        {canRevoke && (
                          <button
                            onClick={() => handleManualRevoke(share)}
                            disabled={revokingId === share.id}
                            title="Revoke access immediately"
                            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg transition shadow-2xs"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Revoke</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
