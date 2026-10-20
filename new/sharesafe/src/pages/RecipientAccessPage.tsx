import React, { useState, useEffect } from 'react';
import { apiRecipient } from '../lib/api';
import { RecipientAccessResult } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Download,
  AlertCircle,
  FileText,
  Lock,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';

interface Props {
  shareToken: string;
  onNavigateHome: () => void;
}

export const RecipientAccessPage: React.FC<Props> = ({
  shareToken,
  onNavigateHome,
}) => {
  const [accessResult, setAccessResult] = useState<RecipientAccessResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const checkAccess = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await apiRecipient.validateShare(shareToken);
      setAccessResult(res);
    } catch (err) {
      console.error('Error validating recipient share:', err);
      setAccessResult({ valid: false, reason: 'error' });
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    checkAccess(true);

    // Live polling every 2.5 seconds to instantly reflect sender Undo/Revocation!
    const pollInterval = setInterval(() => {
      checkAccess(false);
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [shareToken]);

  // Live Countdown Timer for Expiration
  useEffect(() => {
    if (!accessResult?.expires_at || !accessResult.valid) return;

    const updateTimer = () => {
      const exp = new Date(accessResult.expires_at!).getTime();
      const now = Date.now();
      const diff = exp - now;

      if (diff <= 0) {
        setTimeRemaining('00:00:00');
        // Trigger re-check so state flips to expired
        checkAccess(false);
        return;
      }

      const hours = Math.floor(diff / (3600 * 1000));
      const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
      const secs = Math.floor((diff % (60 * 1000)) / 1000);

      setTimeRemaining(
        `${hours.toString().padStart(2, '0')}:${mins
          .toString()
          .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [accessResult?.expires_at, accessResult?.valid]);

  const handleAccessFile = async () => {
    try {
      setDownloading(true);
      const res = await apiRecipient.recordAccessAndDownload(shareToken);

      if (res.downloadUrl) {
        const link = document.createElement('a');
        link.href = res.downloadUrl;
        link.download = accessResult?.file_name || 'confidential_document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloadSuccess(true);
        // Refresh access info (access count updated)
        checkAccess(false);
      } else {
        alert(res.error || 'Failed to download file.');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to retrieve secure file.');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 flex flex-col justify-between py-10 px-4 sm:px-6">
      {/* Header */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={onNavigateHome}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-cyan flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-bold text-navy-900 text-lg tracking-tight">ShareSafe</span>
        </div>

        <button
          onClick={onNavigateHome}
          className="flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-navy-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>
      </div>

      {/* Main Recipient Card */}
      <div className="max-w-xl w-full mx-auto my-8">
        {loading ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-brand-blue border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-semibold text-navy-900">Verifying secure access token...</p>
            <p className="text-xs text-slate-400">Validating cryptographic permissions and revocation status</p>
          </div>
        ) : !accessResult ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-navy-900">Access Check Failed</h3>
            <p className="text-xs text-slate-500">Unable to query security service.</p>
          </div>
        ) : accessResult.reason === 'revoked' ? (
          /* STATE: ACCESS REVOKED (hero differentiator) */
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-rose-200 shadow-2xl text-center space-y-6 animate-fade-in relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-rose-50 rounded-full blur-2xl pointer-events-none" />

            <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-9 h-9 stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wide">
                <span>Access Revoked</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-navy-950 tracking-tight">
                🔒 Access Revoked
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                This file is no longer available. The sender has revoked access to this document using ShareSafe's Undo Guard.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 text-xs text-left space-y-2 text-slate-700">
              <p className="flex items-center justify-between">
                <span className="text-slate-500">Document:</span>
                <span className="font-semibold text-navy-900">{accessResult.file_name || 'Protected File'}</span>
              </p>
              {accessResult.sender_email && (
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Shared by:</span>
                  <span className="font-semibold text-navy-900">{accessResult.sender_email}</span>
                </p>
              )}
              <p className="flex items-center justify-between">
                <span className="text-slate-500">Current Token Status:</span>
                <span className="font-bold text-rose-600">Revoked / Inactive</span>
              </p>
            </div>

            <p className="text-xs text-slate-400">
              If you believe this is an error, please contact the sender directly to request a new sharing link.
            </p>
          </div>
        ) : accessResult.reason === 'expired' ? (
          /* STATE: ACCESS EXPIRED */
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-2xl text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-9 h-9 stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wide">
                <span>Timer Expired</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-navy-950 tracking-tight">
                ⏱ Access Expired
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                The sharing period for this file has ended. Access has automatically expired according to the sender's security policy.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left space-y-2 text-slate-700">
              <p className="flex items-center justify-between">
                <span className="text-slate-500">Document:</span>
                <span className="font-semibold text-navy-900">{accessResult.file_name || 'Protected File'}</span>
              </p>
              {accessResult.sender_email && (
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Sender:</span>
                  <span className="font-semibold text-navy-900">{accessResult.sender_email}</span>
                </p>
              )}
              {accessResult.expires_at && (
                <p className="flex items-center justify-between">
                  <span className="text-slate-500">Expired At:</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(accessResult.expires_at).toLocaleString()}
                  </span>
                </p>
              )}
            </div>
          </div>
        ) : accessResult.reason === 'not_found' ? (
          /* STATE: LINK NOT FOUND */
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-2xl text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-navy-950">⚠️ Link Not Found</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                This share link does not exist or has been permanently removed.
              </p>
            </div>
          </div>
        ) : (
          /* STATE: VALID & ACTIVE SHARE */
          <div className="bg-white rounded-3xl p-6 sm:p-9 border border-slate-200/90 shadow-2xl space-y-6 animate-fade-in relative overflow-hidden">
            {/* Top Accent Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-blue via-brand-cyan to-indigo-500" />

            {/* Header */}
            <div className="text-center space-y-1.5 pt-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Confidential Share</span>
              </div>
              <h2 className="text-2xl font-bold text-navy-950 tracking-tight">
                File Shared With You
              </h2>
              <p className="text-xs text-slate-500">
                You have been authorized by <strong className="text-navy-900">{accessResult.sender_name || accessResult.sender_email}</strong> to access this file.
              </p>
            </div>

            {/* Optional Personal Note */}
            {accessResult.message && (
              <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs text-navy-800 italic">
                “{accessResult.message}”
              </div>
            )}

            {/* File Info Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-2xl bg-white border border-slate-200 text-brand-blue shadow-xs">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-navy-900 text-base truncate">
                    {accessResult.file_name}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                    <span>{formatFileSize(accessResult.file_size)}</span>
                    <span>•</span>
                    <span>{accessResult.file_type || 'Document'}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Shared by:</span>
                  <span className="font-semibold text-navy-900">{accessResult.sender_email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Intended Recipient:</span>
                  <span className="font-medium text-brand-blue">{accessResult.recipient_email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Access Expiration Timer:</span>
                  <div className="flex items-center space-x-1.5 font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{timeRemaining || 'Active'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Download Success Notice */}
            {downloadSuccess && (
              <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>File downloaded successfully! Access logged in audit trail.</span>
              </div>
            )}

            {/* Access CTA Button */}
            <button
              onClick={handleAccessFile}
              disabled={downloading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-brand-blue to-blue-600 hover:from-blue-600 hover:to-brand-blue text-white font-bold text-sm shadow-glow-blue transition active:scale-[0.99] flex items-center justify-center space-x-2.5"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{downloading ? 'Decrypting & Downloading...' : 'Access & Download File'}</span>
            </button>

            {/* Security Guarantee Pill */}
            <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Protected by ShareSafe Row-Level Security & Undo Guard</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="max-w-xl w-full mx-auto text-center text-xs text-slate-400">
        ShareSafe • Secure Confidential File Sharing Prototype
      </footer>
    </div>
  );
};
