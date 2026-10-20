import React, { useState, useEffect } from 'react';
import { ShareRecord } from '../../types';
import { apiShares } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  Undo2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Lock,
  X,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  share: ShareRecord;
  onRevoked: (shareId: string) => void;
  onDismiss: () => void;
  onOpenRecipientPage: (token: string) => void;
}

export const UndoShareBanner: React.FC<Props> = ({
  share,
  onRevoked,
  onDismiss,
  onOpenRecipientPage,
}) => {
  const { user } = useAuth();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isGraceExpired, setIsGraceExpired] = useState<boolean>(false);
  const [isRevoked, setIsRevoked] = useState<boolean>(share.status === 'revoked');
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Recipient share link URL
  const shareUrl = `${window.location.origin}/share/${share.share_token}`;

  useEffect(() => {
    if (isRevoked) return;

    const calculateRemaining = () => {
      const expires = new Date(share.grace_period_expires_at).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((expires - now) / 1000));
      setSecondsRemaining(diffSec);

      if (diffSec <= 0) {
        setIsGraceExpired(true);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 500);
    return () => clearInterval(interval);
  }, [share.grace_period_expires_at, isRevoked]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteUndo = async () => {
    if (!user) return;
    try {
      setIsRevoking(true);
      const res = await apiShares.revokeShare(share.id, user.id, true);
      if (res.success) {
        setIsRevoked(true);
        setShowConfirmModal(false);
        onRevoked(share.id);
      } else {
        alert(res.error || 'Failed to revoke share.');
      }
    } catch (err) {
      console.error('Error undoing share:', err);
      alert('Error undoing share.');
    } finally {
      setIsRevoking(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl border-2 transition-all duration-300 shadow-xl bg-white mb-8">
        {/* Banner State: Revoked */}
        {isRevoked ? (
          <div className="p-6 bg-gradient-to-r from-rose-50 via-rose-100/40 to-slate-50 border-rose-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/20">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold mb-1">
                    <span>✓ Share Revoked Successfully</span>
                  </div>
                  <h3 className="text-lg font-bold text-navy-950">
                    The recipient can no longer access this file
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Access token <span className="font-mono font-medium">{share.share_token.substring(0, 8)}...</span> has been permanently invalidated across all servers and storage endpoints.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => onOpenRecipientPage(share.share_token)}
                  className="px-4 py-2 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition flex items-center space-x-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Verify Invalidation</span>
                </button>
                <button
                  onClick={onDismiss}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Banner State: Active with Undo Grace Period Countdown */
          <div className="p-6 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white border-brand-blue/40">
            {/* Top Success Pill */}
            <div className="flex items-center justify-between pb-4 border-b border-blue-100">
              <div className="flex items-center space-x-2 text-emerald-600 font-semibold text-xs tracking-wide">
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ File shared successfully</span>
              </div>
              <button
                onClick={onDismiss}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Content Layout */}
            <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* File & Recipient Info */}
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-navy-900 tracking-tight">
                    {share.file?.file_name || 'Confidential Document'}
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-brand-blue">
                    Active
                  </span>
                </div>
                <p className="text-sm text-slate-600 flex items-center gap-1.5">
                  <span>→ shared with</span>
                  <strong className="text-navy-900 underline font-semibold">
                    {share.recipient_email}
                  </strong>
                </p>
                <p className="text-xs text-slate-500">
                  Made a mistake? You can undo this share immediately within the grace period.
                </p>
              </div>

              {/* Countdown & Undo CTA Box */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Live Countdown Clock */}
                <div
                  className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl border transition-all ${
                    isGraceExpired
                      ? 'bg-slate-100 border-slate-200 text-slate-500'
                      : 'bg-white border-brand-blue/30 text-navy-900 shadow-sm'
                  }`}
                >
                  <Clock
                    className={`w-5 h-5 ${
                      isGraceExpired ? 'text-slate-400' : 'text-brand-blue animate-spin'
                    }`}
                    style={{ animationDuration: '6s' }}
                  />
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {isGraceExpired ? 'Safety Window' : 'Undo Available For'}
                    </p>
                    <p className="text-lg font-extrabold font-mono text-navy-900 leading-none mt-0.5">
                      {isGraceExpired ? 'Expired' : formatTime(secondsRemaining)}
                    </p>
                  </div>
                </div>

                {/* The Hero Undo Share Button */}
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isGraceExpired || isRevoking}
                  className={`flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] ${
                    isGraceExpired
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-glow-rose hover:scale-[1.02]'
                  }`}
                >
                  <Undo2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{isGraceExpired ? 'Grace Expired' : '↩ Undo Share'}</span>
                </button>
              </div>
            </div>

            {/* Quick Share Link Tools */}
            <div className="mt-4 pt-3 border-t border-blue-100/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-slate-500">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recipient Page:</span>
                <span className="font-mono text-navy-800 bg-white/80 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[200px] sm:max-w-xs">
                  {shareUrl}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-navy-900 rounded-xl border border-slate-200 font-semibold transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  onClick={() => onOpenRecipientPage(share.share_token)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl font-semibold transition shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Recipient View</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Undo Confirmation Dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-navy-900">Undo this Share?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to revoke access to <strong className="text-navy-900">{share.file?.file_name}</strong> for <strong className="text-navy-900">{share.recipient_email}</strong>?
              </p>
              <p className="text-xs text-rose-600 font-medium mt-2 bg-rose-50 p-2 rounded-xl">
                The recipient's access link will be immediately rendered invalid and cannot be accessed.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isRevoking}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteUndo}
                disabled={isRevoking}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-glow-rose transition active:scale-[0.98]"
              >
                {isRevoking ? 'Revoking Access...' : 'Yes, Undo Share'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
