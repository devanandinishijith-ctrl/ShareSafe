import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFiles, apiShares, apiActivity } from '../lib/api';
import { FileRecord, ShareRecord, ActivityLog } from '../types';
import { Navbar } from '../components/layout/Navbar';
import { OverviewCards } from '../components/dashboard/OverviewCards';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { FileUploadModal } from '../components/files/FileUploadModal';
import { MyFilesList } from '../components/files/MyFilesList';
import { ShareModal } from '../components/share/ShareModal';
import { UndoShareBanner } from '../components/share/UndoShareBanner';
import { MySharesTable } from '../components/share/MySharesTable';

interface Props {
  onOpenRecipientPage: (token: string) => void;
}

export const DashboardPage: React.FC<Props> = ({ onOpenRecipientPage }) => {
  const { user } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'shares' | 'activity'>('overview');

  // Data States
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active Undo Hero Banner State (most recent active share)
  const [activeUndoShare, setActiveUndoShare] = useState<ShareRecord | null>(null);

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [selectedFileForShare, setSelectedFileForShare] = useState<FileRecord | null>(null);

  // Fetch initial data
  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const [fetchedFiles, fetchedShares, fetchedLogs] = await Promise.all([
        apiFiles.getFiles(user.id),
        apiShares.getShares(user.id),
        apiActivity.getLogs(user.id),
      ]);

      setFiles(fetchedFiles);
      setShares(fetchedShares);
      setActivityLogs(fetchedLogs);

      // Check if there is an active share created very recently whose grace period has not expired yet
      const recentShare = fetchedShares.find((s) => {
        if (s.status !== 'active') return false;
        const graceEnd = new Date(s.grace_period_expires_at).getTime();
        return graceEnd > Date.now();
      });

      if (recentShare && !activeUndoShare) {
        setActiveUndoShare(recentShare);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Periodic polling for auto expirations & activity sync
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const [updatedShares, updatedLogs] = await Promise.all([
          apiShares.getShares(user.id),
          apiActivity.getLogs(user.id),
        ]);
        setShares(updatedShares);
        setActivityLogs(updatedLogs);
      } catch (err) {
        // silent fail on polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [user]);

  // Handler: When a new file is uploaded
  const handleFileUploaded = (file: FileRecord) => {
    setFiles((prev) => [file, ...prev]);
    // Refresh logs
    if (user) apiActivity.getLogs(user.id).then(setActivityLogs);
  };

  // Handler: When a file is deleted
  const handleFileDeleted = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (user) apiActivity.getLogs(user.id).then(setActivityLogs);
  };

  // Handler: Trigger share modal from file card
  const handleStartShare = (file: FileRecord) => {
    setSelectedFileForShare(file);
    setIsShareModalOpen(true);
  };

  // Handler: When a new share is created
  const handleShareCreated = (share: ShareRecord) => {
    setShares((prev) => [share, ...prev]);
    setActiveUndoShare(share); // Prominently trigger the Undo Share banner!
    if (user) apiActivity.getLogs(user.id).then(setActivityLogs);
  };

  // Handler: When a share is revoked (either via Undo or Table)
  const handleShareRevoked = (shareId: string) => {
    setShares((prev) =>
      prev.map((s) => (s.id === shareId ? { ...s, status: 'revoked', revoked_at: new Date().toISOString() } : s))
    );
    if (user) apiActivity.getLogs(user.id).then(setActivityLogs);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-navy-900 flex flex-col">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenShare={() => {
          setSelectedFileForShare(null);
          setIsShareModalOpen(true);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Prominent Hero Undo Share Banner (Immediately visible if a share was just performed) */}
        {activeUndoShare && (
          <UndoShareBanner
            share={activeUndoShare}
            onRevoked={handleShareRevoked}
            onDismiss={() => setActiveUndoShare(null)}
            onOpenRecipientPage={onOpenRecipientPage}
          />
        )}

        {/* Tab 1: Overview Dashboard */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            <OverviewCards
              files={files}
              shares={shares}
              onOpenUpload={() => setIsUploadModalOpen(true)}
              onOpenShare={() => {
                setSelectedFileForShare(null);
                setIsShareModalOpen(true);
              }}
              onNavigateFiles={() => setActiveTab('files')}
              onNavigateShares={() => setActiveTab('shares')}
            />

            {/* Split layout: Files Preview & Activity Log */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <MyFilesList
                  files={files}
                  onOpenUpload={() => setIsUploadModalOpen(true)}
                  onShareFile={handleStartShare}
                  onFileDeleted={handleFileDeleted}
                  isLoading={isLoading}
                />
              </div>

              <div className="lg:col-span-1">
                <RecentActivity logs={activityLogs} isLoading={isLoading} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: My Files */}
        {activeTab === 'files' && (
          <div className="animate-fade-in">
            <MyFilesList
              files={files}
              onOpenUpload={() => setIsUploadModalOpen(true)}
              onShareFile={handleStartShare}
              onFileDeleted={handleFileDeleted}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Tab 3: My Shares */}
        {activeTab === 'shares' && (
          <div className="animate-fade-in">
            <MySharesTable
              shares={shares}
              onShareRevoked={handleShareRevoked}
              onOpenRecipientPage={onOpenRecipientPage}
              onOpenNewShare={() => {
                setSelectedFileForShare(null);
                setIsShareModalOpen(true);
              }}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Tab 4: Activity Log */}
        {activeTab === 'activity' && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <RecentActivity logs={activityLogs} isLoading={isLoading} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ShareSafe • Confidential File Sharing Prototype</p>
          <div className="flex items-center space-x-4 font-medium">
            <span>Undo Guard Enabled</span>
            <span>•</span>
            <span>Row-Level Security</span>
            <span>•</span>
            <span>Zero-Trust Validation</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFileUploaded={handleFileUploaded}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSelectedFileForShare(null);
        }}
        files={files}
        initialFile={selectedFileForShare}
        onShareCreated={handleShareCreated}
      />
    </div>
  );
};
