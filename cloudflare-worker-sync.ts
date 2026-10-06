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
  let openingType: string | null = null;
  let height: string | null = null;
  let weight: string | null = null;
  let retailExperience: string | null = null;
  let spmCredits: string | null = null;
  let photoFullBody: string | null = null;
  let transportation: string | null = null;
  let languages: string | null = null;
  let medicalCondition: string | null = null;
  let consent: string | null = null;
  let postcode: string | null = null;
  let resumeUrl: string | null = null;
  let dob: string | null = null;
  let maritalStatus: string | null = null;
  let smokerVaper: string | null = null;
  let qualificationUrl: string | null = null;
  let retailIndustryExperience: string | null = null;
  let whyInterested: string | null = null;

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

    const lookahead = '(?=\\s*(?:Opening Type|OpeningType|Position Applied|Position|Full Name|Customer Name|Name|Gender|Age|Date of Birth|DOB|Marital Status|Smoker or Vaper|Smoker\\/Vaper|Contact Number|Phone Number|Phone|Email Address|Email|Residential Address|Address|Postcode|Qualification Document|Qualification URL|Highest Qualification|Education Level|Qualification|Job Title|Working Experience|Work Experience|Reason|Current Salary|Expected Salary|Notice Period|Photo Full Body URL|Full Body Photo|Photo|Height|Weight|Languages|Transportation|Retail Industry Experience|Retail Experience|Why Interested|SPM Credits|Medical Condition|Resume URL|Resume|Consent|Conversation Summary|Next Steps|Follow-up Suggestions|Follow Up Suggestions|Customer Sentiment):|$)';

    const otMatch = text.match(new RegExp(`(?:Opening Type|OpeningType):\\s*(.*?)${lookahead}`, 'i'));
    if (otMatch && otMatch[1].trim() && !openingType) openingType = otMatch[1].trim();

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

    const dobMatch = text.match(new RegExp(`(?:Date of Birth|DOB):\\s*(.*?)${lookahead}`, 'i'));
    if (dobMatch && dobMatch[1].trim() && !dob) dob = dobMatch[1].trim();

    const msMatch = text.match(new RegExp(`Marital Status:\\s*(.*?)${lookahead}`, 'i'));
    if (msMatch && msMatch[1].trim() && !maritalStatus) maritalStatus = msMatch[1].trim();

    const svMatch = text.match(new RegExp(`(?:Smoker or Vaper|Smoker\\/Vaper):\\s*(.*?)${lookahead}`, 'i'));
    if (svMatch && svMatch[1].trim() && !smokerVaper) smokerVaper = svMatch[1].trim();

    const pMatch = text.match(new RegExp(`(?:Contact Number|Phone Number|Phone):\\s*(.*?)${lookahead}`, 'i'));
    if (pMatch && pMatch[1].trim() && pMatch[1].trim().toLowerCase() !== 'n/a' && !extractedPhone) {
      extractedPhone = pMatch[1].trim();
    }

    const emailMatch = text.match(new RegExp(`(?:Email Address|Email):\\s*(.*?)${lookahead}`, 'i'));
    if (emailMatch && emailMatch[1].trim() && !extractedEmail) extractedEmail = emailMatch[1].trim();

    const addrMatch = text.match(new RegExp(`(?:Residential Address|Address):\\s*(.*?)${lookahead}`, 'i'));
    if (addrMatch && addrMatch[1].trim() && !address) address = addrMatch[1].trim();

    const postMatch = text.match(new RegExp(`Postcode:\\s*(.*?)${lookahead}`, 'i'));
    if (postMatch && postMatch[1].trim() && !postcode) postcode = postMatch[1].trim();

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

    const photoMatch = text.match(new RegExp(`Photo:\\s*(.*?)${lookahead}`, 'i'));
    if (photoMatch && photoMatch[1].trim() && !photo) photo = photoMatch[1].trim();

    const heightMatch = text.match(new RegExp(`Height:\\s*(.*?)${lookahead}`, 'i'));
    if (heightMatch && heightMatch[1].trim() && !height) height = heightMatch[1].trim();

    const weightMatch = text.match(new RegExp(`Weight:\\s*(.*?)${lookahead}`, 'i'));
    if (weightMatch && weightMatch[1].trim() && !weight) weight = weightMatch[1].trim();

    const langMatch = text.match(new RegExp(`Languages:\\s*(.*?)${lookahead}`, 'i'));
    if (langMatch && langMatch[1].trim() && !languages) languages = langMatch[1].trim();

    const transMatch = text.match(new RegExp(`Transportation:\\s*(.*?)${lookahead}`, 'i'));
    if (transMatch && transMatch[1].trim() && !transportation) transportation = transMatch[1].trim();

    const retExpMatch = text.match(new RegExp(`Retail Experience:\\s*(.*?)${lookahead}`, 'i'));
    if (retExpMatch && retExpMatch[1].trim() && !retailExperience) retailExperience = retExpMatch[1].trim();

    const retIndExpMatch = text.match(new RegExp(`Retail Industry Experience:\\s*(.*?)${lookahead}`, 'i'));
    if (retIndExpMatch && retIndExpMatch[1].trim()) {
      if (!retailIndustryExperience) retailIndustryExperience = retIndExpMatch[1].trim();
      if (!retailExperience) retailExperience = retIndExpMatch[1].trim();
    }

    const whyMatch = text.match(new RegExp(`Why Interested:\\s*(.*?)${lookahead}`, 'i'));
    if (whyMatch && whyMatch[1].trim() && !whyInterested) whyInterested = whyMatch[1].trim();

    const spmMatch = text.match(new RegExp(`SPM Credits:\\s*(.*?)${lookahead}`, 'i'));
    if (spmMatch && spmMatch[1].trim() && !spmCredits) spmCredits = spmMatch[1].trim();

    const medMatch = text.match(new RegExp(`Medical Condition:\\s*(.*?)${lookahead}`, 'i'));
    if (medMatch && medMatch[1].trim() && !medicalCondition) medicalCondition = medMatch[1].trim();

    const fbPhotoMatch = text.match(new RegExp(`(?:Full Body Photo|Photo Full Body URL):\\s*(.*?)${lookahead}`, 'i'));
    if (fbPhotoMatch && fbPhotoMatch[1].trim() && !photoFullBody) photoFullBody = fbPhotoMatch[1].trim();

    const resMatch = text.match(new RegExp(`(?:Resume|Resume URL):\\s*(.*?)${lookahead}`, 'i'));
    if (resMatch && resMatch[1].trim() && !resumeUrl) resumeUrl = resMatch[1].trim();

    const qDocMatch = text.match(new RegExp(`(?:Qualification Document|Qualification URL):\\s*(.*?)${lookahead}`, 'i'));
    if (qDocMatch && qDocMatch[1].trim() && !qualificationUrl) qualificationUrl = qDocMatch[1].trim();

    const consentMatch = text.match(new RegExp(`Consent:\\s*(.*?)${lookahead}`, 'i'));
    if (consentMatch && consentMatch[1].trim() && !consent) consent = consentMatch[1].trim();
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

  // Automatically parse 5-digit postcode from address if not explicitly present
  if (!postcode && address) {
    const pcMatch = address.match(/\b(\d{5})\b/);
    if (pcMatch) postcode = pcMatch[1];
  }

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
    photo: cleanField(photo),
    opening_type: cleanField(openingType),
    height: cleanField(height),
    weight: cleanField(weight),
    retail_experience: cleanField(retailExperience),
    spm_credits: cleanField(spmCredits),
    photo_full_body_url: cleanField(photoFullBody),
    transportation: cleanField(transportation),
    languages: cleanField(languages),
    medical_condition: cleanField(medicalCondition),
    consent: cleanField(consent),
    postcode: cleanField(postcode),
    resume_url: cleanField(resumeUrl),
    date_of_birth: cleanField(dob),
    marital_status: cleanField(maritalStatus),
    smoker_or_vaper: cleanField(smokerVaper),
    qualification_url: cleanField(qualificationUrl),
    retail_industry_experience: cleanField(retailIndustryExperience),
    why_interested: cleanField(whyInterested)
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

  return lowerTags.some(t => t.includes('hot lead') || t.includes('warm lead') || t.includes('booking appointment') || t.includes('job application') || t.includes('job enquiry') || t.includes('enquiry'));
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
    throw new Error('NxLink plat_token is missing. Please configure NXLINK_PLAT_TOKEN.');
  }

  let conversations: any[] = [];
  const maxPagesToScan = 3; // Scan up to 3 pages (300 conversations)

  for (let pageNum = 1; pageNum <= maxPagesToScan; pageNum++) {
    const convResp = await fetch('https://app.nxlink.ai/admin/nx_flow_manager/conversation', {
      method: 'POST',
      headers: { 'authorization': token, 'content-type': 'application/json' },
      body: JSON.stringify({ phone: null, tags: [], page_number: pageNum, page_size: 100, timeZone: 'UTC+08:00' })
    });

    if (!convResp.ok) {
      throw new Error(`NxLink API request failed (HTTP ${convResp.status})`);
    }

    const rawText = await convResp.text();
    let convData: any = {};
    try {
      convData = JSON.parse(rawText);
    } catch (e) {
      break;
    }

    if (convData.code === 401 || (convData.message && convData.message.includes('not logged in'))) {
      throw new Error('NxLink authentication failed: plat_token expired or invalid');
    }

    const pageList = convData.list || convData.data?.list || convData.data || [];
    if (!Array.isArray(pageList) || pageList.length === 0) break;

    conversations.push(...pageList);
    if (pageList.length < 100) break;
  }

  // Filter out [MY]PLANETGROUP records and fetch existing map in ONE query
  const pgConvs = conversations.filter(c => {
    const flowName = (c.auto_flow_name || c.autoFlowName || c.flow_name || '').toLowerCase();
    return flowName.includes('planetgroup') || flowName.includes('planetgp') || c.auto_flow_id === 1821 || c.auto_flow_id === 1881;
  });
  const convIds = pgConvs.map(c => c.id || c.conversationId || c.uuid).filter(Boolean);

  const existingMap = new Map<string, any>();
  if (convIds.length > 0) {
    try {
      const orQuery = convIds.map(id => `conversation_transcript.ilike.%[nxlink_id:${id}]%`).join(',');
      const { data: existingRows } = await supabase
        .from('conversations')
        .select('id, customer_name, conversation_summary, conversation_tags, conversation_transcript, current_salary, job_title, webhook_status')
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

  // Priority sorting:
  // 1: Webhook-eligible leads not yet synced (or incomplete)
  // 2: Brand new records not in existingMap
  // 3: Existing records with tag changes or incomplete data
  // 4: Empty sessions
  pgConvs.sort((a, b) => {
    const aId = String(a.id || a.conversationId || a.uuid || '');
    const bId = String(b.id || b.conversationId || b.uuid || '');
    const aRow = existingMap.get(aId);
    const bRow = existingMap.get(bId);

    const aTags = Array.isArray(a.tags) ? a.tags.map((t: any) => (typeof t === 'string' ? t : t.name)).filter(Boolean) : [];
    const bTags = Array.isArray(b.tags) ? b.tags.map((t: any) => (typeof t === 'string' ? t : t.name)).filter(Boolean) : [];

    const aIsWebhookEligible = shouldSyncToWebhook(aTags);
    const bIsWebhookEligible = shouldSyncToWebhook(bTags);

    const aNeedsWebhookPush = aIsWebhookEligible && (!aRow || aRow.webhook_status !== 'synced' || !aRow.customer_name);
    const bNeedsWebhookPush = bIsWebhookEligible && (!bRow || bRow.webhook_status !== 'synced' || !bRow.customer_name);

    if (aNeedsWebhookPush && !bNeedsWebhookPush) return -1;
    if (!aNeedsWebhookPush && bNeedsWebhookPush) return 1;

    const aExists = aRow ? 1 : 0;
    const bExists = bRow ? 1 : 0;
    return aExists - bExists;
  });

  let syncedCount = 0;
  let webhookPushedCount = 0;
  let activeFetchesCount = 0; // Protect against Cloudflare Worker Free 50 subrequest limit
  const maxSyncLimit = parseInt(env.MAX_SYNC_LIMIT || '10', 10);

  for (const conv of pgConvs) {
    const flowName = (conv.auto_flow_name || conv.autoFlowName || conv.flow_name || '').toLowerCase();
    const isPlanetGroup = flowName.includes('planetgroup') || flowName.includes('planetgp') || conv.auto_flow_id === 1821 || conv.auto_flow_id === 1881;
    if (!isPlanetGroup) continue;

    const convId = conv.id || conv.conversationId || conv.uuid;
    if (!convId) continue;

    let tagsList: string[] = [];
    if (Array.isArray(conv.tags)) {
      tagsList = conv.tags.map((t: any) => (typeof t === 'string' ? t : t.name)).filter(Boolean);
    }

    const isWebhookEligible = shouldSyncToWebhook(tagsList);
    let needsUpdateOrInsert = false;
    let existingRow: any = null;

    if (existingMap.has(String(convId))) {
      existingRow = existingMap.get(String(convId));
      const tagsChanged = tagsList.length > 0 && JSON.stringify(existingRow.conversation_tags || []) !== JSON.stringify(tagsList);
      const isWebhookUnsynced = isWebhookEligible && existingRow.webhook_status !== 'synced';
      const isIncomplete = !existingRow.customer_name || !existingRow.conversation_summary;

      // Skip empty 0-message sessions from repeatedly re-fetching
      if (tagsList.length === 0 && !conv.conv_summary && !conv.summary && existingRow.customer_name === null) {
        needsUpdateOrInsert = false;
      } else if (isWebhookUnsynced || tagsChanged || isIncomplete) {
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
        photo: meta.photo,
        opening_type: meta.opening_type,
        height: meta.height,
        weight: meta.weight,
        retail_experience: meta.retail_experience,
        spm_credits: meta.spm_credits,
        photo_full_body_url: meta.photo_full_body_url,
        transportation: meta.transportation,
        languages: meta.languages,
        medical_condition: meta.medical_condition,
        consent: meta.consent,
        postcode: meta.postcode,
        resume_url: meta.resume_url,
        date_of_birth: meta.date_of_birth,
        marital_status: meta.marital_status,
        smoker_or_vaper: meta.smoker_or_vaper,
        qualification_url: meta.qualification_url,
        retail_industry_experience: meta.retail_industry_experience,
        why_interested: meta.why_interested
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
        photo: meta.photo,
        opening_type: meta.opening_type,
        height: meta.height,
        weight: meta.weight,
        retail_experience: meta.retail_experience,
        spm_credits: meta.spm_credits,
        photo_full_body_url: meta.photo_full_body_url,
        transportation: meta.transportation,
        languages: meta.languages,
        medical_condition: meta.medical_condition,
        consent: meta.consent,
        postcode: meta.postcode,
        resume_url: meta.resume_url,
        date_of_birth: meta.date_of_birth,
        marital_status: meta.marital_status,
        smoker_or_vaper: meta.smoker_or_vaper,
        qualification_url: meta.qualification_url,
        retail_industry_experience: meta.retail_industry_experience,
        why_interested: meta.why_interested
      }]);

      if (!error) {
        syncedCount++;
        wasIngestedOrUpdated = true;
      }
    }

    const alreadySyncedToWebhook = existingRow && existingRow.webhook_status === 'synced';
    const wasIncompleteSynced = existingRow && existingRow.webhook_status === 'synced' && !existingRow.customer_name && !!meta.customer_name;
    const shouldPushToWebhook = (!alreadySyncedToWebhook || wasIncompleteSynced) && shouldSyncToWebhook(tagsList);

    if (wasIngestedOrUpdated && shouldPushToWebhook) {
      const webhookUrl = env.NXLINK_WEBHOOK_URL || 'https://hype-hr-441002907541.asia-southeast1.run.app/intake/chatbot';
      const clientId = env.NXLINK_WEBHOOK_CLIENT_ID || 'hype-chatbot';
      const clientSecret = env.NXLINK_WEBHOOK_CLIENT_SECRET || 'b7074fc1902d8ae2cd096612539700078f485611445c54d1d6bb06d226649443';

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
                "Photo URL": meta.photo || null,
                "Opening Type": meta.opening_type || null,
                "Height": meta.height || null,
                "Weight": meta.weight || null,
                "Retail Experience": meta.retail_experience || null,
                "SPM Credits": meta.spm_credits || null,
                "Photo Full Body URL": meta.photo_full_body_url || null,
                "Transportation": meta.transportation || null,
                "Languages": meta.languages || null,
                "Medical Condition": meta.medical_condition || null,
                "Consent": meta.consent || null,
                "Postcode": meta.postcode || null,
                "Resume URL": meta.resume_url || null,
                "Date of Birth": meta.date_of_birth || null,
                "Marital Status": meta.marital_status || null,
                "Smoker or Vaper": meta.smoker_or_vaper || null,
                "Qualification URL": meta.qualification_url || null,
                "Retail Industry Experience": meta.retail_industry_experience || null,
                "Why Interested": meta.why_interested || null
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
    try {
      console.log('Cron trigger started');
      const result = await runSync(env);
      console.log('Cron trigger completed:', JSON.stringify(result));
    } catch (err: any) {
      console.error('Scheduled cron error:', err);
    }
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
