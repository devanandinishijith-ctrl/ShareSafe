import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFiles } from '../../lib/api';
import { FileRecord } from '../../types';
import {
  Upload,
  X,
  FileText,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  HardDrive,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onFileUploaded: (file: FileRecord) => void;
}

export const FileUploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onFileUploaded,
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setError(null);
    setIsSuccess(false);
    setUploadProgress(0);
    // Limit to 50MB for prototype demonstration
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds the 50MB prototype limit.');
      return;
    }
    setSelectedFile(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(15);

      const record = await apiFiles.uploadFile(selectedFile, user.id, (percent) => {
        setUploadProgress(percent);
      });

      setUploadProgress(100);
      setIsSuccess(true);
      onFileUploaded(record);

      setTimeout(() => {
        setIsSuccess(false);
        setSelectedFile(null);
        setUploadProgress(0);
        setIsUploading(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err.message || 'Failed to upload file. Please try again.');
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setUploadProgress(0);
    setError(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-brand-blue/10 rounded-xl text-brand-blue">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-900 text-lg">Upload Confidential File</h3>
              <p className="text-xs text-slate-500">Encrypted storage with owner-based access control</p>
            </div>
          </div>
          <button
            onClick={resetForm}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-brand-blue bg-blue-50/60 scale-[0.99]'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50/20'
                : 'border-slate-300 hover:border-brand-blue/60 hover:bg-slate-50/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-brand-blue mb-3">
              <HardDrive className="w-7 h-7 stroke-[1.8]" />
            </div>

            <p className="text-sm font-semibold text-navy-900">
              {selectedFile ? selectedFile.name : 'Click to select or drag & drop file'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports PDF, DOCX, XLSX, images, ZIP, and other documents up to 50MB
            </p>
          </div>

          {/* Selected File Details */}
          {selectedFile && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 truncate">
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-brand-blue shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate text-left">
                    <p className="text-sm font-semibold text-navy-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Binary Document'}
                    </p>
                  </div>
                </div>

                {!isUploading && !isSuccess && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-brand-blue">
                      {uploadProgress < 100 ? 'Encrypting & uploading...' : 'Upload complete!'}
                    </span>
                    <span className="text-slate-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-blue h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {isSuccess && (
                <div className="flex items-center space-x-2 text-emerald-600 text-xs font-semibold pt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>File stored securely and registered in database.</span>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Row-Level Security Protected</span>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={isUploading}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading || isSuccess}
                className="flex items-center space-x-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-50 rounded-xl shadow-glow-blue transition active:scale-[0.98]"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Uploading...' : 'Confirm Upload'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
