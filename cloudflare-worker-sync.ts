import { createClient } from '@supabase/supabase-js';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NXAI_TOKEN_URL?: string;
  NXLINK_PLAT_TOKEN?: string;
  NXLINK_WEBHOOK_URL?: string;
  NXLINK_WEBHOOK_CLIENT_ID?: string;
  NXLINK_WEBHOOK_CLIENT_SECRET?: string;
}

function extractSummaryMetadata(messages: any[], conv: any) {
  let sentiment: string | null = null;
  let summary: string | null = null;
  let nextSteps: string | null = null;
  let extractedName: string | null = null;
  let extractedPhone: string | null = null;

  let extractedEmail: string | null = null;
  let gender: string | null = null;
  let age: string | null = null;
  let qualification: string | null = null;
  let address: string | null = null;
  let jobTitle: string | null = null;
  let workingExperience: string | null = null;
  let reason: string | null = null;
  let currentSalary: string | null = null;
  let expectedSalary: string | null = null;
  let noticePeriod: string | null = null;
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
    const sMatch = text.match(/Customer Sentiment:\s*(.*?)(?=\s*(?:Conversation Summary|Next Steps|Follow-up Suggestions|Follow Up Suggestions|Customer Name|Phone Number|Full Name|Gender|Age|Contact Number|Email|Residential Address|Address|Highest Qualification|Education Level|Qualification|Job Title|Working Experience|Reason|Current Salary|Expected Salary|Notice Period|Photo|Position Applied|Position)|$)/i);
    if (sMatch && !sentiment) sentiment = sMatch[1].trim();

    const sumMatch = text.match(/Conversation Summary:\s*(.*?)(?=\s*(?:Next Steps|Follow-up Suggestions|Follow Up Suggestions|Customer Name|Phone Number|Full Name|Gender|Age|Contact Number|Email|Residential Address|Address|Highest Qualification|Education Level|Qualification|Job Title|Working Experience|Reason|Current Salary|Expected Salary|Notice Period|Photo|Position Applied|Position)|$)/i);
    if (sumMatch && !summary) summary = sumMatch[1].trim();

    const nsMatch = text.match(/(?:Next Steps|Follow-up Suggestions|Follow Up Suggestions):\s*(.*?)(?=\s*(?:Customer Name|Phone Number|Full Name|Gender|Age|Contact Number|Email|Residential Address|Address|Highest Qualification|Education Level|Qualification|Job Title|Working Experience|Reason|Current Salary|Expected Salary|Notice Period|Photo|Position Applied|Position)|$)/i);
    if (nsMatch && !nextSteps) nextSteps = nsMatch[1].trim();

    const lookahead = '(?=\\s*(?:Position Applied|Position|Full Name|Customer Name|Name|Gender|Age|Contact Number|Phone Number|Phone|Email Address|Email|Address|Residential Address|Highest Qualification|Education Level|Qualification|Job Title|Working Experience|Work Experience|Reason|Current Salary|Expected Salary|Notice Period|Photo|Conversation Summary|Next Steps|Follow-up Suggestions|Follow Up Suggestions|Customer Sentiment)|$)';

    const posMatch = text.match(new RegExp(`(?:Position Applied|Position):\\s*(.*?)${lookahead}`, 'i'));
    if (posMatch && posMatch[1].trim() && !positionApplied) positionApplied = posMatch[1].trim();

    const nMatch = text.match(new RegExp(`(?:Full Name|Customer Name|Name):\\s*(.*?)${lookahead}`, 'i'));
    if (nMatch && nMatch[1].trim() && nMatch[1].trim().toLowerCase() !== 'n/a' && !extractedName) {
      extractedName = nMatch[1].trim();
    }

    const genderMatch = text.match(new RegExp(`Gender:\\s*(.*?)${lookahead}`, 'i'));
    if (genderMatch && genderMatch[1].trim() && !gender) gender = genderMatch[1].trim();

    const ageMatch = text.match(new RegExp(`Age:\\s*(.*?)${lookahead}`, 'i'));
    if (ageMatch && ageMatch[1].trim() && !age) age = ageMatch[1].trim();

    const pMatch = text.match(new RegExp(`(?:Contact Number|Phone Number|Phone):\\s*(.*?)${lookahead}`, 'i'));
    if (pMatch && pMatch[1].trim() && pMatch[1].trim().toLowerCase() !== 'n/a' && !extractedPhone) {
      extractedPhone = pMatch[1].trim();
    }

    const emailMatch = text.match(new RegExp(`(?:Email Address|Email):\\s*(.*?)${lookahead}`, 'i'));
    if (emailMatch && emailMatch[1].trim() && !extractedEmail) extractedEmail = emailMatch[1].trim();

    const addrMatch = text.match(new RegExp(`(?:Residential Address|Address):\\s*(.*?)${lookahead}`, 'i'));
    if (addrMatch && addrMatch[1].trim() && !address) address = addrMatch[1].trim();

    const qualMatch = text.match(new RegExp(`(?:Highest Qualification|Education Level|Qualification):\\s*(.*?)${lookahead}`, 'i'));
    if (qualMatch && qualMatch[1].trim() && !qualification) qualification = qualMatch[1].trim();

    const jobTitleMatch = text.match(new RegExp(`Job Title:\\s*(.*?)${lookahead}`, 'i'));
    if (jobTitleMatch && jobTitleMatch[1].trim() && !jobTitle) jobTitle = jobTitleMatch[1].trim();

    const expMatch = text.match(new RegExp(`(?:Working Experience|Work Experience):\\s*(.*?)${lookahead}`, 'i'));
    if (expMatch && expMatch[1].trim() && !workingExperience) workingExperience = expMatch[1].trim();

    const reasonMatch = text.match(new RegExp(`Reason:\\s*(.*?)${lookahead}`, 'i'));
    if (reasonMatch && reasonMatch[1].trim() && !reason) reason = reasonMatch[1].trim();

    const currentSalMatch = text.match(new RegExp(`Current Salary:\\s*(.*?)${lookahead}`, 'i'));
    if (currentSalMatch && currentSalMatch[1].trim() && !currentSalary) currentSalary = currentSalMatch[1].trim();

    const salMatch = text.match(new RegExp(`Expected Salary:\\s*(.*?)${lookahead}`, 'i'));
    if (salMatch && salMatch[1].trim() && !expectedSalary) expectedSalary = salMatch[1].trim();

    const noticeMatch = text.match(new RegExp(`Notice Period:\\s*(.*?)${lookahead}`, 'i'));
    if (noticeMatch && noticeMatch[1].trim() && !noticePeriod) noticePeriod = noticeMatch[1].trim();
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
    email_address: cleanField(extractedEmail || conv.email_address || conv.email || null),
    position_applied: cleanField(positionApplied),
    gender: cleanField(gender),
    age: cleanField(age),
    qualification: cleanField(qualification),
    address: cleanField(address),
    job_title: cleanField(jobTitle),
    working_experience: cleanField(workingExperience),
    reason: cleanField(reason),
    current_salary: cleanField(currentSalary),
    expected_salary: cleanField(expectedSalary),
    notice_period: cleanField(noticePeriod),
    photo
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

async function runSync(env: Env) {
  const tokenUrl = env.NXAI_TOKEN_URL || 'https://asia-east1-lark-demo-67aa3.cloudfunctions.net/nxaiToken';
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  let token = env.NXLINK_PLAT_TOKEN || '';

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
    token = '';
  }

  let conversations: any[] = [];
  const maxPagesToScan = 5; // Scan up to 5 pages (500 conversations)

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
      break;
    }

    const pageList = convData.list || convData.data?.list || convData.data || [];
    if (!Array.isArray(pageList) || pageList.length === 0) break;

    conversations.push(...pageList);
    if (pageList.length < 100) break;
  }

  // Filter out [MY]PLANETGROUP records and fetch existing map in ONE query
  const pgConvs = conversations.filter(c => (c.auto_flow_name || c.autoFlowName || '').toLowerCase().includes('planetgroup'));
  const convIds = pgConvs.map(c => c.id || c.conversationId || c.uuid).filter(Boolean);

  const existingMap = new Map<string, any>();
  if (convIds.length > 0) {
    try {
      const orQuery = convIds.map(id => `conversation_transcript.ilike.%[nxlink_id:${id}]%`).join(',');
      const { data: existingRows } = await supabase
        .from('conversations')
        .select('id, customer_name, conversation_summary, conversation_tags, conversation_transcript, current_salary, job_title')
        .or(orQuery);

      if (existingRows) {
        for (const row of existingRows) {
          const transcript = row.conversation_transcript || '';
          for (const cid of convIds) {
            if (transcript.includes(`[nxlink_id:${cid}]`)) {
              existingMap.set(String(cid), row);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error querying Supabase for existing conversations:', err);
    }
  }

  let syncedCount = 0;
  let webhookPushedCount = 0;
  let activeFetchesCount = 0; // Protect against Cloudflare Worker Free 50 subrequest limit
  const maxSyncLimit = parseInt(env.MAX_SYNC_LIMIT || '10', 10);

  for (const conv of conversations) {
    const flowName = conv.auto_flow_name || conv.autoFlowName || '';
    if (!flowName.toLowerCase().includes('planetgroup')) continue;

    const convId = conv.id || conv.conversationId || conv.uuid;
    if (!convId) continue;

    let tagsList: string[] = [];
    if (Array.isArray(conv.tags)) {
      tagsList = conv.tags.map((t: any) => (typeof t === 'string' ? t : t.name)).filter(Boolean);
    }

    let needsUpdateOrInsert = false;
    let existingRow: any = null;

    if (existingMap.has(String(convId))) {
      existingRow = existingMap.get(String(convId));
      const tagsChanged = tagsList.length > 0 && JSON.stringify(existingRow.conversation_tags || []) !== JSON.stringify(tagsList);
      const isMissingNewFields = existingRow.current_salary === null || existingRow.job_title === null;
      if (!existingRow.customer_name || !existingRow.conversation_summary || tagsChanged || isMissingNewFields) {
        needsUpdateOrInsert = true;
      }
    } else {
      needsUpdateOrInsert = true;
    }

    if (!needsUpdateOrInsert) continue;

    if (activeFetchesCount >= maxSyncLimit) {
      break; // Safeguard Cloudflare Workers Free limit (max 50 subrequests)
    }
    activeFetchesCount++;

    const msgResp = await fetch(`https://app.nxlink.ai/admin/nx_flow_manager/conversation/messages?pageSize=9999&pageNumber=1&conversationId=${convId}`, {
      headers: { 'authorization': token }
    });

    let messages: any[] = [];
    if (msgResp.ok) {
      const msgText = await msgResp.text();
      try {
        const msgData = JSON.parse(msgText);
        messages = msgData.data || msgData.list || [];
      } catch (e) {}
    }
    const meta = extractSummaryMetadata(messages, conv);

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

    if (existingRow) {
      await supabase.from('conversations').update({
        customer_name: meta.customer_name,
        phone_number: meta.phone_number,
        email_address: meta.email_address,
        customer_sentiment: meta.customer_sentiment,
        conversation_summary: meta.conversation_summary,
        next_steps: meta.next_steps,
        conversation_tags: tagsList,
        conversation_date: cDateStr,
        conversation_time: cTimeStr,
        call_audio_url: callAudioUrl,
        position_applied: meta.position_applied,
        gender: meta.gender,
        age: meta.age,
        qualification: meta.qualification,
        address: meta.address,
        job_title: meta.job_title,
        working_experience: meta.working_experience,
        reason: meta.reason,
        current_salary: meta.current_salary,
        expected_salary: meta.expected_salary,
        notice_period: meta.notice_period,
        photo: meta.photo
      }).eq('id', existingRow.id);
      wasIngestedOrUpdated = true;
    } else {
      const { error } = await supabase.from('conversations').insert([{
        customer_name: meta.customer_name,
        phone_number: meta.phone_number,
        email_address: meta.email_address || conv.email_address || null,
        customer_sentiment: meta.customer_sentiment,
        conversation_summary: meta.conversation_summary,
        next_steps: meta.next_steps,
        company_name: conv.company_name || null,
        conversation_tags: tagsList,
        conversation_date: cDateStr,
        conversation_time: cTimeStr,
        conversation_transcript: rawTranscript,
        call_audio_url: callAudioUrl,
        position_applied: meta.position_applied,
        gender: meta.gender,
        age: meta.age,
        qualification: meta.qualification,
        address: meta.address,
        job_title: meta.job_title,
        working_experience: meta.working_experience,
        reason: meta.reason,
        current_salary: meta.current_salary,
        expected_salary: meta.expected_salary,
        notice_period: meta.notice_period,
        photo: meta.photo
      }]);

      if (!error) {
        syncedCount++;
        wasIngestedOrUpdated = true;
      }
    }

    if (wasIngestedOrUpdated && shouldSyncToWebhook(tagsList)) {
      const webhookUrl = env.NXLINK_WEBHOOK_URL || 'https://asia-southeast1-planet-group-d2436.cloudfunctions.net/jobApplication';
      const clientId = env.NXLINK_WEBHOOK_CLIENT_ID || 'nxlink_70a248a4b37bae828e53035a';
      const clientSecret = env.NXLINK_WEBHOOK_CLIENT_SECRET || 'f2c3fb34bdbbdc38a7ae08a5bee0748083bc587e916cefd976b189936702d50b';

      if (webhookUrl && clientId && clientSecret) {
        try {
          const resp = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Client-Id': clientId, 'X-Client-Secret': clientSecret },
            body: JSON.stringify({
              fields: {
                "Conversation ID": String(convId),
                "Customer Name": meta.customer_name || 'Unknown',
                "Phone Number": meta.phone_number || 'Not Provided',
                "Company Name": conv.company_name || null,
                "Email Address": meta.email_address || conv.email_address || null,
                "Tags": tagsList,
                "Full Summary": meta.conversation_summary || null,
                "Sentiment": meta.customer_sentiment || 'Neutral',
                "Next Steps": meta.next_steps || null,
                "Call Audio URL": callAudioUrl,
                "Conversation Date": cDateStr,
                "Position Applied": meta.position_applied || null,
                "Gender": meta.gender || null,
                "Age": meta.age || null,
                "Highest Qualification": meta.qualification || null,
                "Address": meta.address || null,
                "Job Title": meta.job_title || null,
                "Working Experience": meta.working_experience || null,
                "Reason": meta.reason || null,
                "Current Salary": meta.current_salary || null,
                "Expected Salary": meta.expected_salary || null,
                "Notice Period": meta.notice_period || null,
                "Photo URL": meta.photo || null
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

  return { success: true, syncedCount, webhookPushedCount, totalChecked: conversations.length };
}

export default {
  async scheduled(controller: any, env: Env, ctx: any) {
    ctx.waitUntil(runSync(env));
  },
  async fetch(request: Request, env: Env, ctx: any) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        }
      });
    }
    try {
      const result = await runSync(env);
      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Sync failed' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
