export interface ConversationData {
  id: string;
  customer_name?: string | null;
  phone_number?: string | null;
  email_address?: string | null;
  customer_sentiment?: string | null;
  company_name?: string | null;
  conversation_summary?: string | null;
  conversation_date?: string | null;
  conversation_time?: string | null;
  conversation_tags?: string[] | null;
  conversation_transcript?: string | null;
  next_steps?: string | null;
  call_audio_url?: string | null;
  webhook_status?: 'synced' | 'not_synced' | 'failed' | null;
  webhook_error?: string | null;
  webhook_synced_at?: string | null;
  position_applied?: string | null;
  gender?: string | null;
  age?: string | null;
  qualification?: string | null;
  address?: string | null;
  job_title?: string | null;
  working_experience?: string | null;
  reason?: string | null;
  current_salary?: string | null;
  expected_salary?: string | null;
  notice_period?: string | null;
  photo?: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  name: string;
  mobile?: string | null;
  role: 'admin' | 'support' | 'sales';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Standardize phone number
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return 'Unknown';
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) return phone.trim();
  return digits;
}
