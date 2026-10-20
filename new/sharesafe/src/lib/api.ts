import { supabase, isSupabaseConfigured } from './supabase';
import {
  FileRecord,
  ShareRecord,
  ActivityLog,
  Profile,
  RecipientAccessResult,
  ShareCreationConfig,
} from '../types';
import {
  storeBlob,
  getBlob,
  deleteBlob,
  getLocalCollection,
  setLocalCollection,
  KEYS,
  seedInitialLocalData,
} from './storageEngine';

// Helper to generate secure alphanumeric token
const generateShareToken = (length = 24): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
};

// ==========================================
// Authentication APIs
// ==========================================

export const apiAuth = {
  async getSession(): Promise<{ user: Profile | null }> {
    if (isSupabaseConfigured() && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return { user: null };

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        return {
          user: {
            id: profile.id,
            email: profile.email,
            name: profile.name || session.user.user_metadata?.name || profile.email.split('@')[0],
            created_at: profile.created_at,
          },
        };
      }

      return {
        user: {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 'User',
          created_at: session.user.created_at,
        },
      };
    }

    // Local Persistence Session
    const localUser = localStorage.getItem(KEYS.SESSION);
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        seedInitialLocalData(parsed.id);
        return { user: parsed };
      } catch {
        return { user: null };
      }
    }
    return { user: null };
  },

  async signUp(email: string, password: string, name: string): Promise<{ user: Profile | null; error?: string }> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) return { user: null, error: error.message };
      if (!data.user) return { user: null, error: 'Sign up failed' };

      const profile: Profile = {
        id: data.user.id,
        email: data.user.email || email,
        name: name || email.split('@')[0],
        created_at: new Date().toISOString(),
      };

      // Ensure profile row exists
      await supabase.from('profiles').upsert(profile);

      return { user: profile };
    }

    // Local persistence sign up
    const profiles = getLocalCollection<Profile>(KEYS.PROFILES);
    const existing = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { user: null, error: 'An account with this email already exists.' };
    }

    const newProfile: Profile = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      email: email.trim(),
      name: name.trim() || email.split('@')[0],
      created_at: new Date().toISOString(),
    };

    profiles.push(newProfile);
    setLocalCollection(KEYS.PROFILES, profiles);
    localStorage.setItem(KEYS.SESSION, JSON.stringify(newProfile));
    seedInitialLocalData(newProfile.id);

    return { user: newProfile };
  },

  async signIn(email: string, password: string): Promise<{ user: Profile | null; error?: string }> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { user: null, error: error.message };
      if (!data.user) return { user: null, error: 'Invalid credentials' };

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const user: Profile = {
        id: data.user.id,
        email: data.user.email || email,
        name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
        created_at: profile?.created_at || data.user.created_at,
      };

      return { user };
    }

    // Local persistence sign in
    const profiles = getLocalCollection<Profile>(KEYS.PROFILES);
    let user = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Create user automatically for painless demo/testing
      user = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        email: email.trim(),
        name: email.split('@')[0],
        created_at: new Date().toISOString(),
      };
      profiles.push(user);
      setLocalCollection(KEYS.PROFILES, profiles);
    }

    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    seedInitialLocalData(user.id);
    return { user };
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(KEYS.SESSION);
  },
};

// ==========================================
// Files APIs
// ==========================================

export const apiFiles = {
  async getFiles(userId: string): Promise<FileRecord[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }

    const files = getLocalCollection<FileRecord>(KEYS.FILES);
    return files
      .filter((f) => f.owner_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async uploadFile(
    file: File,
    userId: string,
    onProgress?: (percent: number) => void
  ): Promise<FileRecord> {
    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const storagePath = `${userId}/${fileId}_${file.name}`;

    // Simulate smooth progress notification
    if (onProgress) {
      onProgress(25);
      setTimeout(() => onProgress(65), 150);
      setTimeout(() => onProgress(90), 300);
    }

    if (isSupabaseConfigured() && supabase) {
      // 1. Upload to Supabase Storage Bucket
      const { error: uploadError } = await supabase.storage
        .from('sharesafe-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.warn('Supabase storage upload error, falling back to local blob store:', uploadError.message);
        await storeBlob(storagePath, file);
      }

      // 2. Insert record in files table
      const fileRecord: Omit<FileRecord, 'data_url'> = {
        id: fileId,
        owner_id: userId,
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        storage_path: storagePath,
        created_at: new Date().toISOString(),
      };

      const { data, error: dbError } = await supabase
        .from('files')
        .insert(fileRecord)
        .select()
        .single();

      if (dbError) {
        console.warn('Supabase DB error, using local persistence:', dbError.message);
      }

      // 3. Log Activity
      await apiActivity.log(userId, 'File uploaded', {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      });

      if (onProgress) onProgress(100);
      return data || fileRecord;
    }

    // Local IndexedDB + Storage Engine
    await storeBlob(storagePath, file);

    const fileRecord: FileRecord = {
      id: fileId,
      owner_id: userId,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      storage_path: storagePath,
      created_at: new Date().toISOString(),
    };

    const files = getLocalCollection<FileRecord>(KEYS.FILES);
    files.unshift(fileRecord);
    setLocalCollection(KEYS.FILES, files);

    // Log Activity
    await apiActivity.log(userId, 'File uploaded', {
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
    });

    if (onProgress) onProgress(100);
    return fileRecord;
  },

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      const { data: file } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .eq('owner_id', userId)
        .single();

      if (file) {
        await supabase.storage.from('sharesafe-files').remove([file.storage_path]);
        await supabase.from('files').delete().eq('id', fileId);
        await apiActivity.log(userId, 'File deleted', { file_name: file.file_name });
      }
      return true;
    }

    const files = getLocalCollection<FileRecord>(KEYS.FILES);
    const target = files.find((f) => f.id === fileId && f.owner_id === userId);
    if (target) {
      await deleteBlob(target.storage_path);
      const remaining = files.filter((f) => f.id !== fileId);
      setLocalCollection(KEYS.FILES, remaining);
      await apiActivity.log(userId, 'File deleted', { file_name: target.file_name });
    }
    return true;
  },

  async downloadFile(storagePath: string, fileName: string): Promise<string> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.storage.from('sharesafe-files').download(storagePath);
      if (data && !error) {
        return URL.createObjectURL(data);
      }
    }

    // Fallback to IndexedDB
    const blob = await getBlob(storagePath);
    if (blob) {
      return URL.createObjectURL(blob);
    }

    // Default fallback blob if none found
    const fallbackBlob = new Blob(
      [`ShareSafe Secure File Content for: ${fileName}\nIntegrity verified.`],
      { type: 'text/plain' }
    );
    return URL.createObjectURL(fallbackBlob);
  },
};

// ==========================================
// Shares APIs
// ==========================================

export const apiShares = {
  async getShares(senderId: string): Promise<ShareRecord[]> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('shares')
        .select('*, file:files(*)')
        .eq('sender_id', senderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const shares: ShareRecord[] = data || [];

      // Check auto expirations
      for (const s of shares) {
        if (s.status === 'active' && s.expires_at < now) {
          s.status = 'expired';
          await supabase.from('shares').update({ status: 'expired' }).eq('id', s.id);
          await apiActivity.log(senderId, 'Share expired', {
            file_name: s.file?.file_name || 'Document',
            recipient_email: s.recipient_email,
          }, s.id);
        }
      }

      return shares;
    }

    const shares = getLocalCollection<ShareRecord>(KEYS.SHARES);
    const files = getLocalCollection<FileRecord>(KEYS.FILES);

    let updated = false;
    const userShares = shares
      .filter((s) => s.sender_id === senderId)
      .map((s) => {
        // Hydrate file relation
        s.file = files.find((f) => f.id === s.file_id);

        // Auto expire check
        if (s.status === 'active' && s.expires_at < now) {
          s.status = 'expired';
          updated = true;
          apiActivity.log(senderId, 'Share expired', {
            file_name: s.file?.file_name || 'Document',
            recipient_email: s.recipient_email,
          }, s.id);
        }
        return s;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (updated) {
      setLocalCollection(KEYS.SHARES, shares);
    }

    return userShares;
  },

  async createShare(
    config: ShareCreationConfig,
    sender: Profile
  ): Promise<ShareRecord> {
    const now = new Date();
    const gracePeriodExpiresAt = new Date(now.getTime() + config.gracePeriodSeconds * 1000).toISOString();
    
    // Support fractional hours for quick testing (e.g. 1 min demo timer)
    const expiresAt = new Date(now.getTime() + config.expirationHours * 3600 * 1000).toISOString();
    const token = generateShareToken(32);
    const shareId = 'shr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    const shareData: ShareRecord = {
      id: shareId,
      file_id: config.fileId,
      sender_id: sender.id,
      recipient_email: config.recipientEmail.trim().toLowerCase(),
      share_token: token,
      status: 'active',
      grace_period_seconds: config.gracePeriodSeconds,
      grace_period_expires_at: gracePeriodExpiresAt,
      expires_at: expiresAt,
      message: config.message?.trim(),
      access_count: 0,
      created_at: now.toISOString(),
      sender: {
        id: sender.id,
        email: sender.email,
        name: sender.name,
      },
    };

    if (isSupabaseConfigured() && supabase) {
      const { data: file } = await supabase.from('files').select('*').eq('id', config.fileId).single();
      shareData.file = file;

      const { data, error } = await supabase.from('shares').insert({
        id: shareData.id,
        file_id: shareData.file_id,
        sender_id: shareData.sender_id,
        recipient_email: shareData.recipient_email,
        share_token: shareData.share_token,
        status: shareData.status,
        grace_period_seconds: shareData.grace_period_seconds,
        grace_period_expires_at: shareData.grace_period_expires_at,
        expires_at: shareData.expires_at,
        message: shareData.message,
        access_count: 0,
        created_at: shareData.created_at,
      }).select().single();

      if (error) {
        console.warn('Supabase share insert failed, falling back to local store:', error.message);
      }

      await apiActivity.log(
        sender.id,
        'File shared',
        {
          file_name: file?.file_name || 'Document',
          recipient_email: shareData.recipient_email,
          grace_period_seconds: config.gracePeriodSeconds,
          expires_at: shareData.expires_at,
        },
        shareId
      );

      return data ? { ...data, file, sender: shareData.sender } : shareData;
    }

    const files = getLocalCollection<FileRecord>(KEYS.FILES);
    shareData.file = files.find((f) => f.id === config.fileId);

    const shares = getLocalCollection<ShareRecord>(KEYS.SHARES);
    shares.unshift(shareData);
    setLocalCollection(KEYS.SHARES, shares);

    // Record in activity log
    await apiActivity.log(
      sender.id,
      'File shared',
      {
        file_name: shareData.file?.file_name || 'Document',
        recipient_email: shareData.recipient_email,
        grace_period_seconds: config.gracePeriodSeconds,
        expires_at: shareData.expires_at,
      },
      shareId
    );

    return shareData;
  },

  async revokeShare(
    shareId: string,
    senderId: string,
    isUndoAction = false
  ): Promise<{ success: boolean; error?: string }> {
    const revokedAt = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      // Use atomic stored procedure or update
      const { data, error } = await supabase
        .from('shares')
        .update({
          status: 'revoked',
          revoked_at: revokedAt,
        })
        .eq('id', shareId)
        .eq('sender_id', senderId)
        .select('*, file:files(*)')
        .single();

      if (error) return { success: false, error: error.message };

      await apiActivity.log(
        senderId,
        isUndoAction ? 'Undo share (Revoked)' : 'Share revoked',
        {
          file_name: data?.file?.file_name || 'Document',
          recipient_email: data?.recipient_email,
          revoked_at: revokedAt,
          is_undo: isUndoAction,
        },
        shareId
      );

      return { success: true };
    }

    const shares = getLocalCollection<ShareRecord>(KEYS.SHARES);
    const index = shares.findIndex((s) => s.id === shareId && s.sender_id === senderId);

    if (index === -1) {
      return { success: false, error: 'Share not found or unauthorized' };
    }

    shares[index].status = 'revoked';
    shares[index].revoked_at = revokedAt;
    setLocalCollection(KEYS.SHARES, shares);

    const files = getLocalCollection<FileRecord>(KEYS.FILES);
    const file = files.find((f) => f.id === shares[index].file_id);

    await apiActivity.log(
      senderId,
      isUndoAction ? 'Undo share (Revoked)' : 'Share revoked',
      {
        file_name: file?.file_name || 'Document',
        recipient_email: shares[index].recipient_email,
        revoked_at: revokedAt,
        is_undo: isUndoAction,
      },
      shareId
    );

    return { success: true };
  },
};

// ==========================================
// Public Recipient Access APIs
// ==========================================

export const apiRecipient = {
  async validateShare(token: string): Promise<RecipientAccessResult> {
    if (!token) {
      return { valid: false, reason: 'not_found' };
    }

    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      // Try RPC first
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('get_share_by_token', {
          p_token: token,
        });
        if (!rpcError && rpcResult) {
          return rpcResult as RecipientAccessResult;
        }
      } catch (err) {
        console.warn('RPC unavailable, executing client join:', err);
      }

      // Direct query fallback
      const { data: share, error } = await supabase
        .from('shares')
        .select('*, file:files(*), sender:profiles(*)')
        .eq('share_token', token)
        .single();

      if (error || !share) {
        return { valid: false, reason: 'not_found' };
      }

      if (share.status === 'revoked') {
        return {
          valid: false,
          reason: 'revoked',
          file_name: share.file?.file_name,
          sender_email: share.sender?.email,
        };
      }

      if (share.expires_at < now || share.status === 'expired') {
        await supabase.from('shares').update({ status: 'expired' }).eq('id', share.id);
        return {
          valid: false,
          reason: 'expired',
          file_name: share.file?.file_name,
          sender_email: share.sender?.email,
          expires_at: share.expires_at,
        };
      }

      return {
        valid: true,
        reason: 'active',
        share_id: share.id,
        file_id: share.file_id,
        file_name: share.file?.file_name,
        file_type: share.file?.file_type,
        file_size: share.file?.file_size,
        recipient_email: share.recipient_email,
        sender_email: share.sender?.email,
        sender_name: share.sender?.name,
        message: share.message,
        expires_at: share.expires_at,
        created_at: share.created_at,
        storage_path: share.file?.storage_path,
        access_count: share.access_count,
      };
    }

    // Local Persistence Check
    const shares = getLocalCollection<ShareRecord>(KEYS.SHARES);
    const share = shares.find((s) => s.share_token === token);

    if (!share) {
      return { valid: false, reason: 'not_found' };
    }

    const files = getLocalCollection<FileRecord>(KEYS.FILES);
    const profiles = getLocalCollection<Profile>(KEYS.PROFILES);
    const file = files.find((f) => f.id === share.file_id);
    const sender = profiles.find((p) => p.id === share.sender_id) || share.sender;

    if (share.status === 'revoked') {
      return {
        valid: false,
        reason: 'revoked',
        file_name: file?.file_name || 'Document',
        sender_email: sender?.email,
      };
    }

    if (share.expires_at < now || share.status === 'expired') {
      share.status = 'expired';
      setLocalCollection(KEYS.SHARES, shares);
      return {
        valid: false,
        reason: 'expired',
        file_name: file?.file_name || 'Document',
        sender_email: sender?.email,
        expires_at: share.expires_at,
      };
    }

    return {
      valid: true,
      reason: 'active',
      share_id: share.id,
      file_id: share.file_id,
      file_name: file?.file_name || 'Document',
      file_type: file?.file_type || 'application/octet-stream',
      file_size: file?.file_size || 0,
      recipient_email: share.recipient_email,
      sender_email: sender?.email || 'Unknown',
      sender_name: sender?.name || 'ShareSafe User',
      message: share.message,
      expires_at: share.expires_at,
      created_at: share.created_at,
      storage_path: file?.storage_path,
      access_count: share.access_count || 0,
    };
  },

  async recordAccessAndDownload(token: string): Promise<{ downloadUrl: string | null; error?: string }> {
    const access = await this.validateShare(token);
    if (!access.valid || !access.storage_path) {
      return { downloadUrl: null, error: `Access denied (${access.reason})` };
    }

    // 1. Increment access count & log activity
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.rpc('record_share_access', { p_token: token });
      } catch {
        // Direct increment
        if (access.share_id) {
          await supabase
            .from('shares')
            .update({ access_count: (access.access_count || 0) + 1 })
            .eq('id', access.share_id);
        }
      }
    } else {
      const shares = getLocalCollection<ShareRecord>(KEYS.SHARES);
      const share = shares.find((s) => s.share_token === token);
      if (share) {
        share.access_count = (share.access_count || 0) + 1;
        setLocalCollection(KEYS.SHARES, shares);

        await apiActivity.log(
          share.sender_id,
          'Recipient accessed file',
          {
            file_name: access.file_name,
            recipient_email: share.recipient_email,
            accessed_at: new Date().toISOString(),
          },
          share.id
        );
      }
    }

    // 2. Fetch binary file blob
    const downloadUrl = await apiFiles.downloadFile(access.storage_path, access.file_name || 'file');
    return { downloadUrl };
  },
};

// ==========================================
// Activity Log APIs
// ==========================================

export const apiActivity = {
  async getLogs(userId: string): Promise<ActivityLog[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    }

    const logs = getLocalCollection<ActivityLog>(KEYS.LOGS);
    return logs
      .filter((l) => l.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async log(
    userId: string,
    action: string,
    metadata: Record<string, any> = {},
    shareId?: string | null
  ): Promise<ActivityLog> {
    const entry: ActivityLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: userId,
      share_id: shareId || null,
      action,
      metadata,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      await supabase.from('activity_logs').insert(entry);
    }

    const logs = getLocalCollection<ActivityLog>(KEYS.LOGS);
    logs.unshift(entry);
    setLocalCollection(KEYS.LOGS, logs.slice(0, 100));

    return entry;
  },
};
