/**
 * ShareSafe Local Storage & Binary Database Engine
 * Implements full IndexedDB blob storage for real uploaded files
 * plus localStorage relational store for profiles, files, shares, and activity logs.
 */

import { FileRecord, ShareRecord, ActivityLog, Profile } from '../types';

const DB_NAME = 'ShareSafe_BlobStore';
const DB_VERSION = 1;
const STORE_NAME = 'file_blobs';

// Open IndexedDB database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const storeBlob = async (key: string, blob: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getBlob = async (key: string): Promise<Blob | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error fetching blob from IndexedDB:', err);
    return null;
  }
};

export const deleteBlob = async (key: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error deleting blob from IndexedDB:', err);
  }
};

// ==========================================
// Local Database Stores (LocalStorage)
// ==========================================

export const KEYS = {
  PROFILES: 'sharesafe_db_profiles',
  FILES: 'sharesafe_db_files',
  SHARES: 'sharesafe_db_shares',
  LOGS: 'sharesafe_db_activity_logs',
  SESSION: 'sharesafe_session_user',
  EMAILS: 'sharesafe_db_emails',
};

// Helper getters and setters
export const getLocalCollection = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`Failed to parse collection ${key}:`, err);
    return [];
  }
};

export const setLocalCollection = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save collection ${key}:`, err);
  }
};

// Seed initial default demo data if completely empty
export const seedInitialLocalData = (currentUserId?: string) => {
  const existingFiles = getLocalCollection<FileRecord>(KEYS.FILES);
  if (existingFiles.length === 0 && currentUserId) {
    const sampleFiles: FileRecord[] = [
      {
        id: 'file-demo-1',
        owner_id: currentUserId,
        file_name: 'Q3_Financial_Summary.pdf',
        file_type: 'application/pdf',
        file_size: 2450000,
        storage_path: `${currentUserId}/file-demo-1.pdf`,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: 'file-demo-2',
        owner_id: currentUserId,
        file_name: 'Product_Architecture_v2.docx',
        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_size: 890000,
        storage_path: `${currentUserId}/file-demo-2.docx`,
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      },
      {
        id: 'file-demo-3',
        owner_id: currentUserId,
        file_name: 'Security_Audit_Report.pdf',
        file_type: 'application/pdf',
        file_size: 1540000,
        storage_path: `${currentUserId}/file-demo-3.pdf`,
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ];
    setLocalCollection(KEYS.FILES, sampleFiles);

    // Create a real mock blob for the sample files so they can be downloaded/viewed
    const sampleBlob = new Blob(['Sample ShareSafe confidential document content. Secure and verified.'], {
      type: 'application/pdf',
    });
    sampleFiles.forEach(f => {
      storeBlob(f.storage_path, sampleBlob).catch(() => {});
    });

    // Seed activity log
    const initialLogs: ActivityLog[] = [
      {
        id: 'log-demo-1',
        user_id: currentUserId,
        action: 'File uploaded',
        metadata: { file_name: 'Security_Audit_Report.pdf', file_size: 1540000 },
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 'log-demo-2',
        user_id: currentUserId,
        action: 'File uploaded',
        metadata: { file_name: 'Product_Architecture_v2.docx', file_size: 890000 },
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      },
      {
        id: 'log-demo-3',
        user_id: currentUserId,
        action: 'File uploaded',
        metadata: { file_name: 'Q3_Financial_Summary.pdf', file_size: 2450000 },
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
    ];
    setLocalCollection(KEYS.LOGS, initialLogs);
  }
};
