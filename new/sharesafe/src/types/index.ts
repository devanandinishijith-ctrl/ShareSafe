export type ShareStatus = 'active' | 'revoked' | 'expired';

export interface Profile {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface FileRecord {
  id: string;
  owner_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
  // Local cache url for instant preview / download
  data_url?: string;
}

export interface ShareRecord {
  id: string;
  file_id: string;
  sender_id: string;
  recipient_email: string;
  share_token: string;
  status: ShareStatus;
  grace_period_seconds: number;
  grace_period_expires_at: string;
  expires_at: string;
  message?: string;
  access_count?: number;
  created_at: string;
  revoked_at?: string | null;
  // Joined relation fields
  file?: FileRecord;
  sender?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface ActivityLog {
  id: string;
  user_id: string;
  share_id?: string | null;
  action: string;
  metadata?: {
    file_name?: string;
    recipient_email?: string;
    file_size?: number;
    grace_period_seconds?: number;
    expires_at?: string;
    revoked_at?: string;
    accessed_at?: string;
    reason?: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface RecipientAccessResult {
  valid: boolean;
  reason: 'active' | 'revoked' | 'expired' | 'not_found' | 'error';
  share_id?: string;
  file_id?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  recipient_email?: string;
  sender_email?: string;
  sender_name?: string;
  message?: string;
  expires_at?: string;
  created_at?: string;
  storage_path?: string;
  access_count?: number;
  download_url?: string;
}

export interface ShareCreationConfig {
  fileId: string;
  recipientEmail: string;
  gracePeriodSeconds: number;
  expirationHours: number;
  message?: string;
}
