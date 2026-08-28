import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valParts] = trimmed.split('=');
        if (key && valParts.length > 0) {
          process.env[key.trim()] = valParts.join('=').trim();
        }
      }
    }
  }
}

function getConvoId(c) {
  if (c.conversation_transcript) {
    const match = c.conversation_transcript.match(/\[nxlink_id:(.*?)\]/);
    if (match && match[1]) return match[1];
  }
  return c.id ? c.id.slice(0, 8) : 'N/A';
}

function shouldSyncToWebhook(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return false;

  const lowerTags = tags.map(t => (typeof t === 'string' ? t.toLowerCase().trim() : ''));

  // Exclude routing-only tags (e.g. ["to agent"], ["branch agent"], ["to agent", "branch agent"])
  const routingOnlyTags = ['to agent', 'branch agent', 'contact agent'];
  const isOnlyRouting = lowerTags.every(t => routingOnlyTags.includes(t));
  if (isOnlyRouting) return false;

  // Exclude non-lead operational flows (Emergency, Check Booking)
  const hasEmergencyOrCheckBooking = lowerTags.some(t =>
    t.includes('emergency') || t.includes('check booking')
  );
  if (hasEmergencyOrCheckBooking) return false;

  // Sync if contains Hot Lead or Booking Appointment
  return lowerTags.some(t => t.includes('hot lead') || t.includes('booking appointment'));
}

async function main() {
  console.log('==========================================');
  console.log('🚀 NXLINK 3rd Party Webhook Sync Tool');
  console.log('==========================================');

  loadEnv();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const webhookUrl = process.env.NXLINK_WEBHOOK_URL || 'https://asia-southeast1-planet-group-d2436.cloudfunctions.net/jobApplication';
  const clientId = process.env.NXLINK_WEBHOOK_CLIENT_ID || 'nxlink_70a248a4b37bae828e53035a';
  const clientSecret = process.env.NXLINK_WEBHOOK_CLIENT_SECRET || 'f2c3fb34bdbbdc38a7ae08a5bee0748083bc587e916cefd976b189936702d50b';

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
  });

  console.log('📥 Fetching conversations from Supabase...');
  const { data: convos, error } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !convos) {
    console.error('❌ Error reading conversations:', error?.message);
    process.exit(1);
  }

  // Filter conversations based on Webhook rules (hot lead/booking, exclude emergency & check booking & routing-only)
  const taggedConvos = convos.filter(c => shouldSyncToWebhook(c.conversation_tags));

  console.log(`Found ${convos.length} total conversations in Supabase.`);
  console.log(`Filtered ${taggedConvos.length} conversation(s) with 1 or more tags (Skipped ${convos.length - taggedConvos.length} untagged records).\n`);

  if (taggedConvos.length === 0) {
    console.log('ℹ️ No tagged records found to sync.');
    process.exit(0);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < taggedConvos.length; i++) {
    const c = taggedConvos[i];
    const nxlinkId = getConvoId(c);

    const payload = {
      fields: {
        "Conversation ID": nxlinkId,
        "Customer Name": c.customer_name || 'Unknown',
        "Phone Number": c.phone_number || 'Not Provided',
        "Company Name": c.company_name || null,
        "Email Address": c.email_address || null,
        "Tags": c.conversation_tags,
        "Full Summary": c.conversation_summary || null,
        "Sentiment": c.customer_sentiment || 'Neutral',
        "Next Steps": c.next_steps || null,
        "Call Audio URL": c.call_audio_url || null,
        "Conversation Date": c.conversation_date || null,
        "Position Applied": c.position_applied || null,
        "Gender": c.gender || null,
        "Age": c.age || null,
        "Highest Qualification": c.qualification || null,
        "Address": c.address || null,
        "Job Title": c.job_title || null,
        "Working Experience": c.working_experience || null,
        "Reason": c.reason || null,
        "Current Salary": c.current_salary || null,
        "Expected Salary": c.expected_salary || null,
        "Notice Period": c.notice_period || null,
        "Photo URL": c.photo || null
      }
    };

    console.log(`   Posting #${i + 1}/${taggedConvos.length} (ID: ${nxlinkId}, Name: ${c.customer_name})...`);

    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientId,
          'X-Client-Secret': clientSecret
        },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        console.log(`     ✅ Webhook delivery successful!`);
        successCount++;
      } else {
        const text = await resp.text();
        console.error(`     ❌ Webhook returned HTTP ${resp.status}:`, text);
        failCount++;
      }
    } catch (err) {
      console.error(`     ❌ Webhook request failed:`, err.message);
      failCount++;
    }
  }

  console.log('\n==========================================');
  console.log(`🎉 WEBHOOK SYNC COMPLETE!`);
  console.log(`   Successful deliveries: ${successCount}`);
  console.log(`   Failed deliveries: ${failCount}`);
  console.log('==========================================');
}

main().catch(console.error);
