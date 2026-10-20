import React, { useState } from 'react';
import { FileRecord } from '../../types';
import { apiFiles } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Image,
  Share2,
  Download,
  Trash2,
  Search,
  Upload,
  ExternalLink,
  Shield,
  Clock,
  HardDrive,
} from 'lucide-react';

interface Props {
  files: FileRecord[];
  onOpenUpload: () => void;
  onShareFile: (file: FileRecord) => void;
  onFileDeleted: (fileId: string) => void;
  isLoading?: boolean;
}

export const MyFilesList: React.FC<Props> = ({
  files,
  onOpenUpload,
  onShareFile,
  onFileDeleted,
  isLoading,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const getFileIcon = (fileType: string, fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (fileType.includes('pdf') || ext === 'pdf') {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (fileType.includes('image') || ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="w-5 h-5 text-blue-500" />;
    }
    if (fileType.includes('sheet') || ['xls', 'xlsx', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (fileType.includes('zip') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css'].includes(ext || '')) {
      return <FileCode className="w-5 h-5 text-purple-500" />;
    }
    return <FileText className="w-5 h-5 text-brand-blue" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const handleDelete = async (file: FileRecord) => {
    if (!user) return;
    const confirm = window.confirm(`Are you sure you want to delete "${file.file_name}"? Senders and active shares linked to this file will lose access.`);
    if (!confirm) return;

    try {
      setDeletingId(file.id);
      await apiFiles.deleteFile(file.id, user.id);
      onFileDeleted(file.id);
    } catch (err) {
      console.error('Failed to delete file:', err);
      alert('Failed to delete file.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      setDownloadingId(file.id);
      const url = await apiFiles.downloadFile(file.storage_path, file.file_name);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredFiles = files.filter((f) =>
    f.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-5 sm:p-6 space-y-5">
      {/* Top Search & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">My Files</h2>
          <p className="text-xs text-slate-500">Encrypted personal storage ready for secure sharing</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition"
            />
          </div>

          <button
            onClick={onOpenUpload}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark rounded-xl shadow-glow-blue transition active:scale-[0.98]"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>

      {/* Content Table / Cards */}
      {isLoading ? (
        <div className="space-y-3 py-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center mx-auto mb-3">
            <HardDrive className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h4 className="text-base font-semibold text-navy-900">
            {searchQuery ? 'No matching files found' : 'No files uploaded yet'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? 'Try adjusting your search terms.'
              : 'Upload your first document or report to experience safe confidential sharing.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onOpenUpload}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-blue text-white text-xs font-semibold shadow-glow-blue hover:bg-brand-blue-dark transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Now</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">File Name</th>
                <th className="py-3 px-3">Size</th>
                <th className="py-3 px-3 hidden sm:table-cell">Uploaded On</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredFiles.map((file) => (
                <tr
                  key={file.id}
                  className="hover:bg-slate-50/80 transition group"
                >
                  <td className="py-3.5 px-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-slate-100 group-hover:bg-white border border-transparent group-hover:border-slate-200 transition shadow-2xs">
                        {getFileIcon(file.file_type, file.file_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-navy-900 truncate max-w-[220px] sm:max-w-md">
                          {file.file_name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {file.file_type || 'Unknown Type'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-slate-600 text-xs whitespace-nowrap font-medium">
                    {formatFileSize(file.file_size)}
                  </td>

                  <td className="py-3.5 px-3 text-slate-500 text-xs whitespace-nowrap hidden sm:table-cell">
                    {formatDate(file.created_at)}
                  </td>

                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center space-x-1.5">
                      {/* Share Button */}
                      <button
                        onClick={() => onShareFile(file)}
                        title="Share this file securely"
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-brand-blue/10 hover:bg-brand-blue text-brand-blue hover:text-white text-xs font-semibold transition shadow-2xs"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </button>

                      {/* Download */}
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={downloadingId === file.id}
                        title="Download file"
                        className="p-1.5 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(file)}
                        disabled={deletingId === file.id}
                        title="Delete file"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
