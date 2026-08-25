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

async function main() {
  loadEnv();
  const searchId = process.argv[2] || '2877223';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
  });

  console.log(`🔍 Searching Supabase for ID ${searchId}...`);
  const { data: convos, error } = await supabase.from('conversations').select('*');

  if (error || !convos) {
    console.error('Error:', error);
    return;
  }

  const match = convos.find(c => {
    if (c.id && c.id.toLowerCase().includes(searchId.toLowerCase())) return true;
    if (c.conversation_transcript && c.conversation_transcript.includes(searchId)) return true;
    return false;
  });

  if (match) {
    console.log('📌 MATCH FOUND:');
    console.log(`  Customer: ${match.customer_name}, Phone: ${match.phone_number}, Tags: ${JSON.stringify(match.conversation_tags)}`);

    const webhookUrl = process.env.NXLINK_WEBHOOK_URL || 'https://asia-southeast1-planet-group-d2436.cloudfunctions.net/jobApplication';
    const clientId = process.env.NXLINK_WEBHOOK_CLIENT_ID || 'nxlink_70a248a4b37bae828e53035a';
    const clientSecret = process.env.NXLINK_WEBHOOK_CLIENT_SECRET || 'f2c3fb34bdbbdc38a7ae08a5bee0748083bc587e916cefd976b189936702d50b';

    const getConvoId = (c) => {
      if (c.conversation_transcript) {
        const m = c.conversation_transcript.match(/\[nxlink_id:(.*?)\]/);
        if (m && m[1]) return m[1];
      }
      return c.id ? c.id.slice(0, 8) : 'N/A';
    };

    const payload = {
      fields: {
        "Conversation ID": getConvoId(match),
        "Customer Name": match.customer_name || 'Unknown',
        "Phone Number": match.phone_number || 'Not Provided',
        "Company Name": match.company_name || null,
        "Email Address": match.email_address || null,
        "Tags": match.conversation_tags,
        "Full Summary": match.conversation_summary || null,
        "Sentiment": match.customer_sentiment || 'Neutral',
        "Next Steps": match.next_steps || null,
        "Call Audio URL": match.call_audio_url || null,
        "Conversation Date": match.conversation_date || null
      }
    };

    console.log('\n📤 Pushing to Webhook:', JSON.stringify(payload, null, 2));

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': clientId,
        'X-Client-Secret': clientSecret
      },
      body: JSON.stringify(payload)
    });

    console.log(`HTTP Status: ${resp.status} ${resp.statusText}`);
    const text = await resp.text();
    console.log('Response:', text);

  } else {
    console.log(`❌ No record found matching ID ${searchId}`);
  }
}

main().catch(console.error);
