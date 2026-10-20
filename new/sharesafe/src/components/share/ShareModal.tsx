import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { FileRecord, ShareRecord, ShareCreationConfig } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { apiShares } from '../../lib/api';
import {
  Share2,
  X,
  FileText,
  Mail,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  files: FileRecord[];
  initialFile?: FileRecord | null;
  onShareCreated: (share: ShareRecord) => void;
}

export const ShareModal: React.FC<Props> = ({
  isOpen,
  onClose,
  files,
  initialFile,
  onShareCreated,
}) => {
  const { user } = useAuth();

  // Wizard state: 1: Select File, 2: Enter & Verify Recipient, 3: Configure Timer & Grace, 4: Final Confirm
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [isRecipientVerified, setIsRecipientVerified] = useState<boolean>(false);
  const [gracePeriodSeconds, setGracePeriodSeconds] = useState<number>(30);
  const [expirationHours, setExpirationHours] = useState<number>(24);
  const [customGrace, setCustomGrace] = useState<string>('');
  const [customExpHours, setCustomExpHours] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialFile) {
      setSelectedFileId(initialFile.id);
      setStep(2); // Skip to recipient entry if file was pre-selected
    } else if (files.length > 0 && !selectedFileId) {
      setSelectedFileId(files[0].id);
    }
  }, [initialFile, files]);

  if (!isOpen) return null;

  const currentFile = files.find((f) => f.id === selectedFileId);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (!selectedFileId) {
        setError('Please select a file to share.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!validateEmail(recipientEmail)) {
        setError('Please enter a valid recipient email address.');
        return;
      }
      if (!isRecipientVerified) {
        setError('Please confirm and verify the recipient email address above.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      const grace = customGrace ? parseInt(customGrace, 10) : gracePeriodSeconds;
      const exp = customExpHours ? parseFloat(customExpHours) : expirationHours;

      if (isNaN(grace) || grace < 5) {
        setError('Grace period must be at least 5 seconds.');
        return;
      }
      if (isNaN(exp) || exp <= 0) {
        setError('Access expiration must be greater than 0.');
        return;
      }
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    setError(null);
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  const handleConfirmAndShare = async () => {
    if (!user || !selectedFileId) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const actualGrace = customGrace ? parseInt(customGrace, 10) : gracePeriodSeconds;
      const actualExp = customExpHours ? parseFloat(customExpHours) : expirationHours;

      const config: ShareCreationConfig = {
        fileId: selectedFileId,
        recipientEmail: recipientEmail.trim(),
        gracePeriodSeconds: actualGrace,
        expirationHours: actualExp,
        message: message.trim() || undefined,
      };

      const createdShare = await apiShares.createShare(config, user);

      // Trigger celebratory micro-animation confetti
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#2563EB', '#06B6D4', '#6366F1', '#10B981'],
        });
      } catch {}

      onShareCreated(createdShare);
      onClose();
    } catch (err: any) {
      console.error('Failed to create share:', err);
      setError(err.message || 'Failed to share file.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatExpLabel = (hrs: number) => {
    if (hrs === 0.0167 || hrs <= 0.03) return '1 Minute (Demo)';
    if (hrs === 1) return '1 Hour';
    if (hrs === 24) return '24 Hours (1 Day)';
    if (hrs === 168) return '7 Days (1 Week)';
    return `${hrs} Hours`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/65 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header & Stepper */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-brand-blue/10 rounded-xl text-brand-blue">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-900 text-lg">Secure File Share Wizard</h3>
                <p className="text-xs text-slate-500">Step {step} of 4: {
                  step === 1 ? 'Select File' :
                  step === 2 ? 'Recipient Verification' :
                  step === 3 ? 'Timers & Grace Period' : 'Confirmation'
                }</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-brand-blue' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Select File */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-navy-900 mb-1">
                  Choose a file from your repository
                </label>
                <p className="text-xs text-slate-500">
                  Select which document you wish to generate a protected share link for.
                </p>
              </div>

              {files.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-navy-800">No uploaded files available</p>
                  <p className="text-xs text-slate-500 mt-1">Please upload a file first before sharing.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {files.map((file) => {
                    const isSelected = file.id === selectedFileId;
                    return (
                      <div
                        key={file.id}
                        onClick={() => setSelectedFileId(file.id)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 border-brand-blue ring-1 ring-brand-blue shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <div className={`p-2 rounded-xl ${isSelected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-semibold text-navy-900 truncate">{file.file_name}</p>
                            <p className="text-xs text-slate-500">{file.file_type || 'Document'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'bg-brand-blue border-brand-blue text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Enter Recipient & Recipient Verification */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-navy-900 mb-1">
                  Recipient Information
                </label>
                <p className="text-xs text-slate-500">
                  Enter the intended recipient's email address.
                </p>
              </div>

              <div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="e.g. colleague@company.com or professor@college.edu"
                    value={recipientEmail}
                    onChange={(e) => {
                      setRecipientEmail(e.target.value);
                      setIsRecipientVerified(false); // Reset confirmation on edit
                    }}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-2xl focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition"
                  />
                </div>
              </div>

              {/* Recipient Verification Callout */}
              {recipientEmail && validateEmail(recipientEmail) && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-brand-blue/30 space-y-3 animate-fade-in">
                  <div className="flex items-start space-x-3">
                    <div className="p-1.5 bg-brand-blue text-white rounded-lg mt-0.5 shadow-xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
                        Recipient Verification Required
                      </p>
                      <p className="text-sm font-semibold text-navy-950 mt-1">
                        “You are about to share this file with: <span className="underline text-brand-blue font-bold">{recipientEmail}</span>”
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Please double check for typos or incorrect domain names to prevent confidential data leakage.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center space-x-2.5 pt-2 border-t border-brand-blue/20 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isRecipientVerified}
                      onChange={(e) => setIsRecipientVerified(e.target.checked)}
                      className="w-4 h-4 text-brand-blue rounded border-slate-300 focus:ring-brand-blue"
                    />
                    <span className="text-xs font-medium text-navy-900">
                      I have verified that <strong className="text-brand-blue">{recipientEmail}</strong> is the correct intended recipient.
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Configure Grace Period & Expiration Timer */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Grace Period Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-navy-900">
                    Undo Grace Period
                  </label>
                  <span className="text-[11px] font-semibold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Hero Feature
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  During this safety window, you can immediately cancel and revoke the share with one click.
                </p>

                <div className="grid grid-cols-3 gap-2.5">
                  {[10, 30, 60].map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => {
                        setGracePeriodSeconds(seconds);
                        setCustomGrace('');
                      }}
                      className={`p-3 rounded-2xl border text-center font-semibold text-sm transition-all ${
                        gracePeriodSeconds === seconds && !customGrace
                          ? 'bg-brand-blue text-white border-brand-blue shadow-glow-blue'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {seconds} Seconds
                    </button>
                  ))}
                </div>

                <div className="mt-2.5 flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Custom seconds:</span>
                  <input
                    type="number"
                    min="5"
                    max="600"
                    placeholder="e.g. 45"
                    value={customGrace}
                    onChange={(e) => setCustomGrace(e.target.value)}
                    className="w-24 px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              {/* Access Duration / Expiration Timer */}
              <div>
                <label className="block text-sm font-semibold text-navy-900 mb-1">
                  Access Duration (Expiration Timer)
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  The link will permanently expire once this duration elapses.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: '1 Min (Demo)', val: 0.0167 },
                    { label: '1 Hour', val: 1 },
                    { label: '24 Hours', val: 24 },
                    { label: '7 Days', val: 168 },
                  ].map((dur) => (
                    <button
                      key={dur.label}
                      type="button"
                      onClick={() => {
                        setExpirationHours(dur.val);
                        setCustomExpHours('');
                      }}
                      className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all ${
                        expirationHours === dur.val && !customExpHours
                          ? 'bg-navy-900 text-white border-navy-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Message */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Optional Note for Recipient
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Here is the Q3 project report for your review before Friday's meeting."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-blue outline-none transition"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Final Confirmation */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-bold text-navy-900">Confirm Share Details</h4>
                <p className="text-xs text-slate-500">
                  Review the security parameters before generating the share token.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                  <span className="text-slate-500 font-medium">Document</span>
                  <span className="font-bold text-navy-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-brand-blue" />
                    {currentFile?.file_name}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                  <span className="text-slate-500 font-medium">Verified Recipient</span>
                  <span className="font-bold text-brand-blue">{recipientEmail}</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                  <span className="text-slate-500 font-medium">Access Expiration</span>
                  <span className="font-semibold text-navy-800">
                    {formatExpLabel(customExpHours ? parseFloat(customExpHours) : expirationHours)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Undo Safety Window</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {customGrace || gracePeriodSeconds} Seconds
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-navy-900 flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                <p>
                  Immediately after clicking <strong>Confirm & Share</strong>, a live safety countdown banner will appear allowing you to undo this share.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900 px-3 py-2 rounded-xl hover:bg-slate-200/60 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400">Step 1 of 4</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
            >
              Cancel
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark rounded-xl shadow-glow-blue transition active:scale-[0.98]"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmAndShare}
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-blue to-blue-600 hover:from-blue-600 hover:to-brand-blue disabled:opacity-50 rounded-xl shadow-glow-blue transition active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Securing & Sharing...' : 'Confirm & Share'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
