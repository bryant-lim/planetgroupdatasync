import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

function extractSummaryMetadata(messages: any[], conv: any) {
  let sentiment: string | null = null;
  let summary: string | null = null;
  let nextSteps: string | null = null;
  let extractedName: string | null = null;
  let extractedPhone: string | null = null;

  let gender: string | null = null;
  let height: string | null = null;
  let weight: string | null = null;
  let age: string | null = null;
  let qualification: string | null = null;
  let address: string | null = null;
  let transportation: string | null = null;
  let medicalCondition: string | null = null;
  let workingExperience: string | null = null;
  let expectedSalary: string | null = null;
  let startDate: string | null = null;
  let photo: string | null = null;
  let positionApplied: string | null = null;

  // Extract photo from messages
  if (Array.isArray(messages)) {
    for (const m of messages) {
      if (m && m.msgType === 25 && m.msgInfo) {
        try {
          const parsed = typeof m.msgInfo === 'string' ? JSON.parse(m.msgInfo) : m.msgInfo;
          if (parsed && parsed.message && parsed.message.url) {
            photo = parsed.message.url;
            break;
          }
        } catch (e) {}
      }
    }
  }

  const parseSummaryText = (text: string) => {
    if (!text) return;
    const sMatch = text.match(/Customer Sentiment:\s*(.*?)(?=\s*(?:Conversation Summary|Next Steps|Follow-up Suggestions|Follow Up Suggestions|Customer Name|Phone Number|Full Name|Gender|Height|Weight|Age|Highest Qualification|Qualification|Address|Transportation|Medical Condition|Working Experience|Expected Salary|Start Date|Photo)|$)/i);
    if (sMatch && !sentiment) sentiment = sMatch[1].trim();

    const sumMatch = text.match(/Conversation Summary:\s*(.*?)(?=\s*(?:Next Steps|Follow-up Suggestions|Follow Up Suggestions|Customer Name|Phone Number|Full Name|Gender|Height|Weight|Age|Highest Qualification|Qualification|Address|Transportation|Medical Condition|Working Experience|Expected Salary|Start Date|Photo)|$)/i);
    if (sumMatch && !summary) summary = sumMatch[1].trim();

    const nsMatch = text.match(/(?:Next Steps|Follow-up Suggestions|Follow Up Suggestions):\s*(.*?)(?=\s*(?:Customer Name|Phone Number|Full Name|Gender|Height|Weight|Age|Highest Qualification|Qualification|Address|Transportation|Medical Condition|Working Experience|Expected Salary|Start Date|Photo)|$)/i);
    if (nsMatch && !nextSteps) nextSteps = nsMatch[1].trim();

    const lookahead = '(?=\\s*(?:Full Name|Name|Gender|Height|Weight|Age|Highest Qualification|Qualification|Address|Transportation|Medical Condition|Working Experience|Work Experience|Expected Salary|Start Date|Photo|Position Applied|Position|Conversation Summary|Next Steps|Follow-up Suggestions|Follow Up Suggestions|Customer Sentiment)|$)';

    const nMatch = text.match(new RegExp(`(?:Full Name|Customer Name|Name):\\s*(.*?)${lookahead}`, 'i'));
    if (nMatch && nMatch[1].trim() && nMatch[1].trim().toLowerCase() !== 'n/a' && !extractedName) {
      extractedName = nMatch[1].trim();
    }

    const pMatch = text.match(new RegExp(`(?:Phone Number|Phone):\\s*(.*?)${lookahead}`, 'i'));
    if (pMatch && pMatch[1].trim() && pMatch[1].trim().toLowerCase() !== 'n/a' && !extractedPhone) {
      extractedPhone = pMatch[1].trim();
    }

    const genderMatch = text.match(new RegExp(`Gender:\\s*(.*?)${lookahead}`, 'i'));
    if (genderMatch && genderMatch[1].trim() && !gender) gender = genderMatch[1].trim();

    const heightMatch = text.match(new RegExp(`Height:\\s*(.*?)${lookahead}`, 'i'));
    if (heightMatch && heightMatch[1].trim() && !height) height = heightMatch[1].trim();

    const weightMatch = text.match(new RegExp(`Weight:\\s*(.*?)${lookahead}`, 'i'));
    if (weightMatch && weightMatch[1].trim() && !weight) weight = weightMatch[1].trim();

    const ageMatch = text.match(new RegExp(`Age:\\s*(.*?)${lookahead}`, 'i'));
    if (ageMatch && ageMatch[1].trim() && !age) age = ageMatch[1].trim();

    const qualMatch = text.match(new RegExp(`(?:Highest Qualification|Qualification):\\s*(.*?)${lookahead}`, 'i'));
    if (qualMatch && qualMatch[1].trim() && !qualification) qualification = qualMatch[1].trim();

    const addrMatch = text.match(new RegExp(`Address:\\s*(.*?)${lookahead}`, 'i'));
    if (addrMatch && addrMatch[1].trim() && !address) address = addrMatch[1].trim();

    const transMatch = text.match(new RegExp(`Transportation:\\s*(.*?)${lookahead}`, 'i'));
    if (transMatch && transMatch[1].trim() && !transportation) transportation = transMatch[1].trim();

    const medMatch = text.match(new RegExp(`Medical Condition:\\s*(.*?)${lookahead}`, 'i'));
    if (medMatch && medMatch[1].trim() && !medicalCondition) medicalCondition = medMatch[1].trim();

    const expMatch = text.match(new RegExp(`(?:Working Experience|Work Experience):\\s*(.*?)${lookahead}`, 'i'));
    if (expMatch && expMatch[1].trim() && !workingExperience) workingExperience = expMatch[1].trim();

    const salMatch = text.match(new RegExp(`Expected Salary:\\s*(.*?)${lookahead}`, 'i'));
    if (salMatch && salMatch[1].trim() && !expectedSalary) expectedSalary = salMatch[1].trim();

    const startMatch = text.match(new RegExp(`Start Date:\\s*(.*?)${lookahead}`, 'i'));
    if (startMatch && startMatch[1].trim() && !startDate) startDate = startMatch[1].trim();

    const posMatch = text.match(new RegExp(`(?:Position Applied|Position):\\s*(.*?)${lookahead}`, 'i'));
    if (posMatch && posMatch[1].trim() && !positionApplied) positionApplied = posMatch[1].trim();
  };

  if (Array.isArray(messages)) {
    for (const m of messages) {
      if (m && m.msgType === 64 && m.msgInfo) {
        let parsed: any = null;
        try {
          if (typeof m.msgInfo === 'string' && m.msgInfo.trim().startsWith('{')) {
            parsed = JSON.parse(m.msgInfo);
          } else if (typeof m.msgInfo === 'object') {
            parsed = m.msgInfo;
          }
        } catch (e) {}

        if (parsed && parsed.summarize) {
          parseSummaryText(parsed.summarize);
        }
      }
    }
  }

  if (conv.conv_summary) parseSummaryText(conv.conv_summary);
  if (conv.summary) parseSummaryText(conv.summary);

  const cleanField = (val: string | null) => {
    if (!val) return null;
    let s = val.split(/\[nxlink_id:/i)[0].trim();
    s = s.replace(/Customer Name:.*$/is, '').replace(/Phone Number:.*$/is, '').replace(/["}'\\\}\],]+$/g, '').trim();
    if (!s || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'none' || s.toLowerCase() === 'null') {
      return null;
    }
    return s;
  };

  return {
    customer_sentiment: cleanField(sentiment),
    conversation_summary: cleanField(summary),
    next_steps: cleanField(nextSteps),
    customer_name: cleanField(extractedName || conv.customer_name || conv.customerName || null),
    phone_number: cleanField(extractedPhone || conv.customer_phone || conv.phone || null),
    gender: cleanField(gender),
    height: cleanField(height),
    weight: cleanField(weight),
    age: cleanField(age),
    qualification: cleanField(qualification),
    address: cleanField(address),
    transportation: cleanField(transportation),
    medical_condition: cleanField(medicalCondition),
    working_experience: cleanField(workingExperience),
    expected_salary: cleanField(expectedSalary),
    start_date: cleanField(startDate),
    photo,
    position_applied: cleanField(positionApplied)
  };
}

function shouldSyncToWebhook(tags: any[]) {
  if (!Array.isArray(tags) || tags.length === 0) return false;
  const lowerTags = tags.map(t => (typeof t === 'string' ? t.toLowerCase().trim() : ''));
  const routingOnlyTags = ['to agent', 'branch agent', 'contact agent'];
  const isOnlyRouting = lowerTags.every(t => routingOnlyTags.includes(t));
  if (isOnlyRouting) return false;

  const hasEmergencyOrCheckBooking = lowerTags.some(t =>
    t.includes('emergency') || t.includes('check booking')
  );
  if (hasEmergencyOrCheckBooking) return false;

  return lowerTags.some(t => t.includes('hot lead') || t.includes('warm lead') || t.includes('booking appointment') || t.includes('job application'));
}

const syncNxlinkHandler: Handler = async () => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const tokenUrl = process.env.NXAI_TOKEN_URL || 'https://asia-east1-lark-demo-67aa3.cloudfunctions.net/nxaiToken';

  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Supabase credentials missing' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
  });

  try {
    let token = process.env.NXLINK_PLAT_TOKEN || '';

    if (!token) {
      try {
        const tokenResp = await fetch(tokenUrl);
        if (tokenResp.ok) {
          const tText = await tokenResp.text();
          try {
            const tData: any = JSON.parse(tText);
            token = tData.token || '';
          } catch (e) {}
        }
      } catch (e) {}
    }

    if (!token) {
      try {
        const { execSync } = await import('child_process');
        const path = await import('path');
        const rootDir = process.cwd();
        const pyPath = path.join(rootDir, 'nxlink_get_plat_token.py');
        token = execSync(`python3 "${pyPath}"`, { encoding: 'utf8', cwd: rootDir }).trim();
      } catch (e) {}
    }

    if (!token) {
      token = '';
    }

    let conversations: any[] = [];
    let consecutiveAlreadySyncedPages = 0;
    const maxPagesToScan = 15; // Scan up to 15 pages (1500 records) per run

    for (let pageNum = 1; pageNum <= maxPagesToScan; pageNum++) {
      const convResp = await fetch('https://app.nxlink.ai/admin/nx_flow_manager/conversation', {
        method: 'POST',
        headers: { 'authorization': token, 'content-type': 'application/json' },
        body: JSON.stringify({ phone: null, tags: [], page_number: pageNum, page_size: 100, timeZone: 'UTC+08:00' })
      });

      if (!convResp.ok) break;

      const rawText = await convResp.text();
      let convData: any = {};
      try {
        convData = JSON.parse(rawText);
      } catch (e) {
        console.warn(`[Sync] Non-JSON response received from conversation list API on page ${pageNum}:`, rawText.slice(0, 150));
        break;
      }

      const pageList = convData.list || convData.data?.list || convData.data || [];
      if (!Array.isArray(pageList) || pageList.length === 0) break;

      conversations.push(...pageList);

      const pgRecords = pageList.filter((c: any) => (c.auto_flow_name || c.autoFlowName || '').toLowerCase().includes('planetgroup'));
      if (pgRecords.length > 0) {
        let unSyncedCount = 0;
        for (const c of pgRecords) {
          const cid = c.id || c.conversationId || c.uuid;
          if (!cid) continue;
          const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .ilike('conversation_transcript', `%nxlink_id:${cid}%`)
            .limit(1);
          if (!existing || existing.length === 0) {
            unSyncedCount++;
          }
        }
        if (unSyncedCount === 0) {
          consecutiveAlreadySyncedPages++;
          if (consecutiveAlreadySyncedPages >= 2) break;
        } else {
          consecutiveAlreadySyncedPages = 0;
        }
      }

      if (pageList.length < 100) break;
    }

    let syncedCount = 0;
    let webhookPushedCount = 0;

    for (const conv of conversations) {
      const flowName = conv.auto_flow_name || conv.autoFlowName || '';
      if (!flowName.toLowerCase().includes('planetgroup')) continue;

      const convId = conv.id || conv.conversationId || conv.uuid;
      if (!convId) continue;

      const { data: existing } = await supabase
        .from('conversations')
        .select('id, customer_name, conversation_summary, conversation_tags, webhook_status')
        .ilike('conversation_transcript', `%nxlink_id:${convId}%`)
        .limit(1);

      const msgResp = await fetch(`https://app.nxlink.ai/admin/nx_flow_manager/conversation/messages?pageSize=9999&pageNumber=1&conversationId=${convId}`, {
        headers: { 'authorization': token }
      });

      let messages: any[] = [];
      if (msgResp.ok) {
        const msgText = await msgResp.text();
        try {
          const msgData = JSON.parse(msgText);
          messages = msgData.data || msgData.list || [];
        } catch (e) {
          console.warn(`[Sync] Non-JSON response for conversation messages ID ${convId}`);
        }
      }
      const meta = extractSummaryMetadata(messages, conv);

      let tagsList: string[] = [];
      if (Array.isArray(conv.tags)) {
        tagsList = conv.tags.map((t: any) => (typeof t === 'string' ? t : t.name)).filter(Boolean);
      }

      let callAudioUrl: string | null = conv.call_audio_url || conv.callAudioUrl || null;
      if (!callAudioUrl && Array.isArray(messages)) {
        for (const m of messages) {
          if (m.msgInfo && typeof m.msgInfo === 'string' && m.msgInfo.includes('audio_url')) {
            try {
              const parsed = JSON.parse(m.msgInfo);
              if (parsed.audio_url) { callAudioUrl = parsed.audio_url; break; }
            } catch (e) {}
          }
        }
      }

      const rawTranscript = `[nxlink_id:${convId}]`;

      const rawTs = conv.created_at || conv.createdAt || conv.create_time || conv.createTime;
      let dateObj = new Date();
      if (rawTs) {
        const tsMs = typeof rawTs === 'number' ? (rawTs > 10000000000 ? rawTs : rawTs * 1000) : new Date(rawTs).getTime();
        if (!isNaN(tsMs)) dateObj = new Date(tsMs);
      }
      const cDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dateObj);
      const cTimeStr = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(dateObj);

      let wasIngestedOrUpdated = false;

      if (existing && existing.length > 0) {
        const row = existing[0];
        const tagsChanged = tagsList.length > 0 && JSON.stringify(row.conversation_tags || []) !== JSON.stringify(tagsList);
        if (!row.customer_name || !row.conversation_summary || tagsChanged) {
          await supabase.from('conversations').update({
            customer_name: meta.customer_name,
            phone_number: meta.phone_number,
            customer_sentiment: meta.customer_sentiment,
            conversation_summary: meta.conversation_summary,
            next_steps: meta.next_steps,
            conversation_tags: tagsList,
            conversation_date: cDateStr,
            conversation_time: cTimeStr,
            call_audio_url: callAudioUrl,
            gender: meta.gender,
            height: meta.height,
            weight: meta.weight,
            age: meta.age,
            qualification: meta.qualification,
            address: meta.address,
            transportation: meta.transportation,
            medical_condition: meta.medical_condition,
            working_experience: meta.working_experience,
            expected_salary: meta.expected_salary,
            start_date: meta.start_date,
            photo: meta.photo,
            position_applied: meta.position_applied
          }).eq('id', row.id);
          wasIngestedOrUpdated = true;
        }
      } else {
        const { error } = await supabase.from('conversations').insert([{
          customer_name: meta.customer_name,
          phone_number: meta.phone_number,
          customer_sentiment: meta.customer_sentiment,
          conversation_summary: meta.conversation_summary,
          next_steps: meta.next_steps,
          company_name: conv.company_name || null,
          email_address: conv.email_address || null,
          conversation_tags: tagsList,
          conversation_date: cDateStr,
          conversation_time: cTimeStr,
          conversation_transcript: rawTranscript,
          call_audio_url: callAudioUrl,
          gender: meta.gender,
          height: meta.height,
          weight: meta.weight,
          age: meta.age,
          qualification: meta.qualification,
          address: meta.address,
          transportation: meta.transportation,
          medical_condition: meta.medical_condition,
          working_experience: meta.working_experience,
          expected_salary: meta.expected_salary,
          start_date: meta.start_date,
          photo: meta.photo,
          position_applied: meta.position_applied
        }]);

        if (!error) {
          syncedCount++;
          wasIngestedOrUpdated = true;
        }
      }

      if (wasIngestedOrUpdated && shouldSyncToWebhook(tagsList)) {
        const webhookUrl = process.env.NXLINK_WEBHOOK_URL || 'https://asia-east1-lark-demo-67aa3.cloudfunctions.net/nxlinkWebhook';
        const clientId = process.env.NXLINK_WEBHOOK_CLIENT_ID || 'nxw_41ef8e4dee35cd8e4c6c1d3e';
        const clientSecret = process.env.NXLINK_WEBHOOK_CLIENT_SECRET || '8ab7881cfcf9cd8428274ff2771875277c06be7404a3d4b20365bd584649ceea';

        if (webhookUrl && clientId && clientSecret) {
          try {
            const resp = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'client_id': clientId, 'client_secret': clientSecret },
              body: JSON.stringify({
                fields: {
                  "Conversation ID": String(convId),
                  "Customer Name": meta.customer_name || 'Unknown',
                  "Phone Number": meta.phone_number || 'Not Provided',
                  "Company Name": conv.company_name || null,
                  "Email Address": conv.email_address || null,
                  "Tags": tagsList,
                  "Full Summary": meta.conversation_summary || null,
                  "Sentiment": meta.customer_sentiment || 'Neutral',
                  "Next Steps": meta.next_steps || null,
                  "Call Audio URL": callAudioUrl,
                  "Conversation Date": cDateStr
                }
              })
            });
            if (resp.ok) {
              webhookPushedCount++;
              await supabase.from('conversations').update({
                webhook_status: 'synced',
                webhook_synced_at: new Date().toISOString(),
                webhook_error: null
              }).filter('conversation_transcript', 'ilike', `%[nxlink_id:${convId}]%`);
            }
          } catch (e) {}
        }
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, syncedCount, webhookPushedCount, totalChecked: conversations.length })
    };
  } catch (err: any) {
    console.error('Netlify Sync Error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Sync failed' })
    };
  }
};

export const handler: Handler = syncNxlinkHandler;
