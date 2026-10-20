import React, { useState, useEffect } from 'react';
import { DispatchedEmail } from '../../types';
import { apiEmails } from '../../lib/api';
import {
  Mail,
  X,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Send,
  Lock,
  KeyRound,
  FileText,
  Clock,
  Inbox,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenRecipientPage: (token: string) => void;
  highlightShareId?: string | null;
}

export const VirtualMailboxModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onOpenRecipientPage,
  highlightShareId,
}) => {
  const [emails, setEmails] = useState<DispatchedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<DispatchedEmail | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedBody, setCopiedBody] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const loadEmails = () => {
    const list = apiEmails.getEmails();
    setEmails(list);
    if (highlightShareId) {
      const match = list.find((e) => e.share_id === highlightShareId);
      if (match) setSelectedEmail(match);
      else if (list.length > 0) setSelectedEmail(list[0]);
    } else if (list.length > 0 && !selectedEmail) {
      setSelectedEmail(list[0]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEmails();
    }
  }, [isOpen, highlightShareId]);

  if (!isOpen) return null;

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyBody = (body: string) => {
    navigator.clipboard.writeText(body);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDelete = (id: string) => {
    apiEmails.deleteEmail(id);
    const updated = emails.filter((e) => e.id !== id);
    setEmails(updated);
    if (selectedEmail?.id === id) {
      setSelectedEmail(updated[0] || null);
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear all sent notifications from outbox history?')) {
      apiEmails.clearEmails();
      setEmails([]);
      setSelectedEmail(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-navy-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-cyan flex items-center justify-center text-white shadow-md shadow-brand-blue/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-navy-950 text-base">Outbox & Sent Email Dispatcher</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-brand-blue uppercase tracking-wider">
                  {emails.length} Dispatched
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Track notifications, open in Gmail/Outlook, and preview the recipient email experience
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {emails.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-slate-400 hover:text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition font-medium flex items-center space-x-1"
                title="Clear all outbox history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Outbox</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        {emails.length === 0 ? (
          <div className="p-12 text-center space-y-3 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-navy-900">No Sent Emails Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When you share a file with someone's email address, ShareSafe will generate a secure notification email with their direct link and 6-digit access code here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-[460px]">
            {/* Left Column: Email List */}
            <div className="md:col-span-5 border-r border-slate-200 overflow-y-auto max-h-[520px] divide-y divide-slate-100 bg-slate-50/50">
              {emails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-4 cursor-pointer transition text-left space-y-1 relative ${
                      isSelected
                        ? 'bg-white shadow-sm border-l-4 border-brand-blue'
                        : 'hover:bg-slate-100/80 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-navy-900 truncate max-w-[160px]">
                        To: {email.recipient_email}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-700 truncate">
                      {email.file_name}
                    </p>

                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-0.5">
                      <span className="font-mono bg-blue-50 text-brand-blue px-1.5 py-0.2 rounded text-[10px] font-bold">
                        OTP: {email.passcode}
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(email.file_size)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Email Preview & Actions */}
            {selectedEmail ? (
              <div className="md:col-span-7 flex flex-col justify-between overflow-y-auto max-h-[520px] bg-white p-6">
                <div className="space-y-4">
                  {/* Email Header Card */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-slate-500">
                          <strong>To:</strong> <span className="font-semibold text-brand-blue">{selectedEmail.recipient_email}</span>
                        </p>
                        <p className="text-slate-500">
                          <strong>From:</strong> <span className="text-slate-700">{selectedEmail.sender_name} ({selectedEmail.sender_email})</span>
                        </p>
                        <p className="text-slate-500">
                          <strong>Subject:</strong> <span className="font-semibold text-navy-900">{selectedEmail.subject}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => handleDelete(selectedEmail.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition"
                        title="Remove email from outbox"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Access Passcode Pill */}
                    <div className="mt-3 p-3 bg-white rounded-xl border border-blue-200 flex items-center justify-between shadow-xs">
                      <div className="flex items-center space-x-2">
                        <KeyRound className="w-4 h-4 text-brand-blue" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                            6-Digit Access Code
                          </p>
                          <p className="text-base font-extrabold font-mono text-navy-950 leading-tight">
                            {selectedEmail.passcode}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyCode(selectedEmail.passcode)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-brand-blue font-semibold rounded-lg text-xs transition flex items-center space-x-1"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Rendered Email Body Simulation */}
                  <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3 font-sans shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-lg bg-brand-blue text-white flex items-center justify-center font-bold text-xs">
                          S
                        </div>
                        <span className="font-bold text-xs text-navy-900">ShareSafe Secure Dispatch</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(selectedEmail.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                      {selectedEmail.body_text}
                    </div>
                  </div>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Send via Gmail */}
                    <a
                      href={apiEmails.generateGmailComposeUrl(selectedEmail)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[130px] py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Open in Gmail</span>
                    </a>

                    {/* Send via Default Email / mailto */}
                    <a
                      href={apiEmails.generateMailtoUrl(selectedEmail)}
                      className="flex-1 min-w-[130px] py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-brand-blue border border-blue-200 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-1.5 shadow-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Default Mail App</span>
                    </a>

                    {/* Copy Full Email Body */}
                    <button
                      onClick={() => handleCopyBody(selectedEmail.body_text)}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition flex items-center space-x-1.5"
                    >
                      {copiedBody ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedBody ? 'Email Copied!' : 'Copy Text'}</span>
                    </button>
                  </div>

                  {/* Recipient Test View Button */}
                  <button
                    onClick={() => {
                      const token = selectedEmail.share_url.split('/share/')[1];
                      if (token) {
                        onClose();
                        onOpenRecipientPage(token);
                      }
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-blue-600 hover:to-brand-blue text-white rounded-xl font-bold text-xs shadow-glow-blue transition flex items-center justify-center space-x-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Test as Recipient: Open {selectedEmail.recipient_email}'s Access Page</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
