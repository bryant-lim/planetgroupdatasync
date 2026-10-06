import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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

function buildCleanDialogueThread(messages, convId) {
  if (!Array.isArray(messages)) return `[nxlink_id:${convId}]`;
  const lines = [];

  for (const m of messages) {
    if (!m || !m.msgInfo) continue;
    let parsed = null;
    try {
      if (typeof m.msgInfo === 'string' && m.msgInfo.trim().startsWith('{')) {
        parsed = JSON.parse(m.msgInfo);
      } else if (typeof m.msgInfo === 'object') {
        parsed = m.msgInfo;
      }
    } catch (e) {}

    // Direction 1: Customer Speech
    if (m.direction === 1 && parsed && parsed.text) {
      lines.push(`[Customer]: "${parsed.text}"`);
      continue;
    }

    // Direction 2: Bot Speech
    if (m.direction === 2 && parsed && parsed.text) {
      lines.push(`[Bot]: "${parsed.text}"`);
      continue;
    }

    // Direction 3: System / Flow Step
    if (m.direction === 3 && parsed) {
      if (parsed.name && m.msgType === 201) {
        lines.push(`[System]: Flow Node Step -> ${parsed.name}`);
      } else if (parsed.flowNodeName && m.msgType === 307 && parsed.branches) {
        const selected = parsed.branches.find(b => b.selected);
        if (selected && selected.flowNodeName) {
          lines.push(`[System]: Selected Step -> ${selected.flowNodeName}`);
        }
      }
    }
  }

  let fullThread = lines.join('\n');
  fullThread += `\n[nxlink_id:${convId}]`;
  return fullThread;
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

function extractSummaryMetadata(messages, conv) {
  let sentiment = null;
  let summary = null;
  let nextSteps = null;
  let extractedName = null;
  let extractedPhone = null;

  let extractedEmail = null;
  let gender = null;
  let age = null;
  let qualification = null;
  let address = null;
  let jobTitle = null;
  let workingExperience = null;
  let reason = null;
  let currentSalary = null;
  let expectedSalary = null;
  let noticePeriod = null;
  let photo = null;
  let positionApplied = null;
  let openingType = null;
  let height = null;
  let weight = null;
  let retailExperience = null;
  let spmCredits = null;
  let photoFullBody = null;
  let transportation = null;
  let languages = null;
  let medicalCondition = null;
  let consent = null;
  let postcode = null;
  let resumeUrl = null;
  let dob = null;
  let maritalStatus = null;
  let smokerVaper = null;
  let qualificationUrl = null;
  let retailIndustryExperience = null;
  let whyInterested = null;

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

  const parseText = (sumText) => {
    if (!sumText) return;
    const sentMatch = sumText.match(/Customer Sentiment:\s*([^\r\n]+?)(?=\s*(?:Conversation Summary|Next Steps|Follow-up Suggestions|Follow Up Suggestions|Customer Name|Phone Number|Full Name|Gender|Age|Contact Number|Email|Residential Address|Address|Highest Qualification|Education Level|Qualification|Job Title|Working Experience|Reason|Current Salary|Expected Salary|Notice Period|Photo|Position Applied|Position)|$)/i);
    const summMatch = sumText.match(/Conversation Summary:\s*([^\r\n]+?)(?=\s*(?:Next Steps|Follow-up Suggestions|Follow Up Suggestions|Customer Name|Phone Number|Full Name|Gender|Age|Contact Number|Email|Residential Address|Address|Highest Qualification|Education Level|Qualification|Job Title|Working Experience|Reason|Current Salary|Expected Salary|Notice Period|Photo|Position Applied|Position)|$)/i);
    const stepsMatch = sumText.match(/(?:Next Steps|Follow-up Suggestions|Follow Up Suggestions):\s*([^\r\n]+?)(?=\s*(?:Customer Name|Phone Number|Full Name|Gender|Age|Contact Number|Email|Residential Address|Address|Highest Qualification|Education Level|Qualification|Job Title|Working Experience|Reason|Current Salary|Expected Salary|Notice Period|Photo|Position Applied|Position)|$)/i);

    const lookahead = '(?=\\s*(?:Opening Type|OpeningType|Position Applied|Position|Full Name|Customer Name|Name|Gender|Age|Date of Birth|DOB|Marital Status|Smoker or Vaper|Smoker\\/Vaper|Contact Number|Phone Number|Phone|Email Address|Email|Residential Address|Address|Postcode|Qualification Document|Qualification URL|Highest Qualification|Education Level|Qualification|Job Title|Working Experience|Work Experience|Reason|Current Salary|Expected Salary|Notice Period|Photo Full Body URL|Full Body Photo|Photo|Height|Weight|Languages|Transportation|Retail Industry Experience|Retail Experience|Why Interested|SPM Credits|Medical Condition|Resume URL|Resume|Consent|Conversation Summary|Next Steps|Follow-up Suggestions|Follow Up Suggestions|Customer Sentiment):|$)';

    const otMatch = sumText.match(new RegExp(`(?:Opening Type|OpeningType):\\s*(.*?)${lookahead}`, 'i'));
    const posMatch = sumText.match(new RegExp(`(?:Position Applied|Position):\\s*(.*?)${lookahead}`, 'i'));
    const nameMatch = sumText.match(new RegExp(`(?:Full Name|Customer Name|Name):\\s*(.*?)${lookahead}`, 'i'));
    const genderMatch = sumText.match(new RegExp(`Gender:\\s*(.*?)${lookahead}`, 'i'));
    const ageMatch = sumText.match(new RegExp(`Age:\\s*(.*?)${lookahead}`, 'i'));
    const dobMatch = sumText.match(new RegExp(`(?:Date of Birth|DOB):\\s*(.*?)${lookahead}`, 'i'));
    const msMatch = sumText.match(new RegExp(`Marital Status:\\s*(.*?)${lookahead}`, 'i'));
    const svMatch = sumText.match(new RegExp(`(?:Smoker or Vaper|Smoker\\/Vaper):\\s*(.*?)${lookahead}`, 'i'));
    const phoneMatch = sumText.match(new RegExp(`(?:Contact Number|Phone Number|Phone):\\s*(.*?)${lookahead}`, 'i'));
    const emailMatch = sumText.match(new RegExp(`(?:Email Address|Email):\\s*(.*?)${lookahead}`, 'i'));
    const addrMatch = sumText.match(new RegExp(`(?:Residential Address|Address):\\s*(.*?)${lookahead}`, 'i'));
    const postMatch = sumText.match(new RegExp(`Postcode:\\s*(.*?)${lookahead}`, 'i'));
    const qualMatch = sumText.match(new RegExp(`(?:Highest Qualification|Education Level|Qualification):\\s*(.*?)${lookahead}`, 'i'));
    const jobTitleMatch = sumText.match(new RegExp(`Job Title:\\s*(.*?)${lookahead}`, 'i'));
    const expMatch = sumText.match(new RegExp(`(?:Working Experience|Work Experience):\\s*(.*?)${lookahead}`, 'i'));
    const reasonMatch = sumText.match(new RegExp(`Reason:\\s*(.*?)${lookahead}`, 'i'));
    const currentSalMatch = sumText.match(new RegExp(`Current Salary:\\s*(.*?)${lookahead}`, 'i'));
    const salMatch = sumText.match(new RegExp(`Expected Salary:\\s*(.*?)${lookahead}`, 'i'));
    const noticeMatch = sumText.match(new RegExp(`Notice Period:\\s*(.*?)${lookahead}`, 'i'));
    const photoMatch = sumText.match(new RegExp(`Photo:\\s*(.*?)${lookahead}`, 'i'));
    const heightMatch = sumText.match(new RegExp(`Height:\\s*(.*?)${lookahead}`, 'i'));
    const weightMatch = sumText.match(new RegExp(`Weight:\\s*(.*?)${lookahead}`, 'i'));
    const langMatch = sumText.match(new RegExp(`Languages:\\s*(.*?)${lookahead}`, 'i'));
    const transMatch = sumText.match(new RegExp(`Transportation:\\s*(.*?)${lookahead}`, 'i'));
    const retExpMatch = sumText.match(new RegExp(`Retail Experience:\\s*(.*?)${lookahead}`, 'i'));
    const retIndExpMatch = sumText.match(new RegExp(`Retail Industry Experience:\\s*(.*?)${lookahead}`, 'i'));
    const whyMatch = sumText.match(new RegExp(`Why Interested:\\s*(.*?)${lookahead}`, 'i'));
    const spmMatch = sumText.match(new RegExp(`SPM Credits:\\s*(.*?)${lookahead}`, 'i'));
    const medMatch = sumText.match(new RegExp(`Medical Condition:\\s*(.*?)${lookahead}`, 'i'));
    const fbPhotoMatch = sumText.match(new RegExp(`(?:Full Body Photo|Photo Full Body URL):\\s*(.*?)${lookahead}`, 'i'));
    const resMatch = sumText.match(new RegExp(`(?:Resume|Resume URL):\\s*(.*?)${lookahead}`, 'i'));
    const qDocMatch = sumText.match(new RegExp(`(?:Qualification Document|Qualification URL):\\s*(.*?)${lookahead}`, 'i'));
    const consentMatch = sumText.match(new RegExp(`Consent:\\s*(.*?)${lookahead}`, 'i'));

    if (sentMatch && sentMatch[1] && !sentiment) sentiment = sentMatch[1].trim();
    if (summMatch && summMatch[1] && !summary) summary = summMatch[1].trim();
    if (stepsMatch && stepsMatch[1] && !nextSteps) nextSteps = stepsMatch[1].trim();
    if (otMatch && otMatch[1] && !openingType) openingType = otMatch[1].trim();
    if (posMatch && posMatch[1] && !positionApplied) positionApplied = posMatch[1].trim();
    if (nameMatch && nameMatch[1] && !extractedName) extractedName = nameMatch[1].trim();
    if (genderMatch && genderMatch[1] && !gender) gender = genderMatch[1].trim();
    if (ageMatch && ageMatch[1] && !age) age = ageMatch[1].trim();
    if (dobMatch && dobMatch[1] && !dob) dob = dobMatch[1].trim();
    if (msMatch && msMatch[1] && !maritalStatus) maritalStatus = msMatch[1].trim();
    if (svMatch && svMatch[1] && !smokerVaper) smokerVaper = svMatch[1].trim();
    if (phoneMatch && phoneMatch[1] && !extractedPhone) extractedPhone = phoneMatch[1].trim();
    if (emailMatch && emailMatch[1] && !extractedEmail) extractedEmail = emailMatch[1].trim();
    if (addrMatch && addrMatch[1] && !address) address = addrMatch[1].trim();
    if (postMatch && postMatch[1] && !postcode) postcode = postMatch[1].trim();
    if (qualMatch && qualMatch[1] && !qualification) qualification = qualMatch[1].trim();
    if (jobTitleMatch && jobTitleMatch[1] && !jobTitle) jobTitle = jobTitleMatch[1].trim();
    if (expMatch && expMatch[1] && !workingExperience) workingExperience = expMatch[1].trim();
    if (reasonMatch && reasonMatch[1] && !reason) reason = reasonMatch[1].trim();
    if (currentSalMatch && currentSalMatch[1] && !currentSalary) currentSalary = currentSalMatch[1].trim();
    if (salMatch && salMatch[1] && !expectedSalary) expectedSalary = salMatch[1].trim();
    if (noticeMatch && noticeMatch[1] && !noticePeriod) noticePeriod = noticeMatch[1].trim();
    if (photoMatch && photoMatch[1] && !photo) photo = photoMatch[1].trim();
    if (heightMatch && heightMatch[1] && !height) height = heightMatch[1].trim();
    if (weightMatch && weightMatch[1] && !weight) weight = weightMatch[1].trim();
    if (langMatch && langMatch[1] && !languages) languages = langMatch[1].trim();
    if (transMatch && transMatch[1] && !transportation) transportation = transMatch[1].trim();
    if (retExpMatch && retExpMatch[1] && !retailExperience) retailExperience = retExpMatch[1].trim();
    if (retIndExpMatch && retIndExpMatch[1]) {
      if (!retailIndustryExperience) retailIndustryExperience = retIndExpMatch[1].trim();
      if (!retailExperience) retailExperience = retIndExpMatch[1].trim();
    }
    if (whyMatch && whyMatch[1] && !whyInterested) whyInterested = whyMatch[1].trim();
    if (spmMatch && spmMatch[1] && !spmCredits) spmCredits = spmMatch[1].trim();
    if (medMatch && medMatch[1] && !medicalCondition) medicalCondition = medMatch[1].trim();
    if (fbPhotoMatch && fbPhotoMatch[1] && !photoFullBody) photoFullBody = fbPhotoMatch[1].trim();
    if (resMatch && resMatch[1] && !resumeUrl) resumeUrl = resMatch[1].trim();
    if (qDocMatch && qDocMatch[1] && !qualificationUrl) qualificationUrl = qDocMatch[1].trim();
    if (consentMatch && consentMatch[1] && !consent) consent = consentMatch[1].trim();
  };

  if (Array.isArray(messages)) {
    for (const m of messages) {
      if (m && m.msgType === 64 && m.msgInfo) {
        let parsed = null;
        try {
          if (typeof m.msgInfo === 'string' && m.msgInfo.trim().startsWith('{')) {
            parsed = JSON.parse(m.msgInfo);
          } else if (typeof m.msgInfo === 'object') {
            parsed = m.msgInfo;
          }
        } catch (e) {}

        if (parsed && parsed.summarize) {
          parseText(parsed.summarize);
        }
      }
    }
  }

  // Fallbacks from conv object
  if (!summary && conv.conv_summary) parseText(conv.conv_summary);
  if (!summary && conv.summary) parseText(conv.summary);

  // Automatically parse 5-digit postcode from address if not explicitly present
  if (!postcode && address) {
    const pcMatch = address.match(/\b(\d{5})\b/);
    if (pcMatch) postcode = pcMatch[1];
  }

  // Clean trailing artifacts
  const cleanField = (val) => {
    if (!val) return null;
    let s = val.split(/\[nxlink_id:/i)[0].trim();
    s = s.replace(/Customer Name:.*$/is, '').replace(/Phone Number:.*$/is, '').replace(/["}'\\\}\],]+$/g, '').trim();
    if (!s || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'none' || s.toLowerCase() === 'null') {
      return null;
    }
    return s;
  };

  return {
    sentiment: cleanField(sentiment),
    summary: cleanField(summary),
    nextSteps: cleanField(nextSteps),
    extractedName: cleanField(extractedName),
    extractedPhone: cleanField(extractedPhone),
    extractedEmail: cleanField(extractedEmail),
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

function shouldSyncToWebhook(tags) {
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

async function main() {
  console.log('==========================================');
  console.log('🔄 NXLINK Local Ingestion & Sync Tool');
  console.log('   Target Flow: [MY]PLANETGROUP');
  console.log('==========================================');

  loadEnv();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing from .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
  });

  const credsPath = path.join(ROOT_DIR, '.nxlink_creds');
  const pyScriptPath = path.join(ROOT_DIR, 'nxlink_get_plat_token.py');

  if (!fs.existsSync(credsPath) || !fs.existsSync(pyScriptPath)) {
    console.error('❌ .nxlink_creds or nxlink_get_plat_token.py missing in project root.');
    process.exit(1);
  }

  console.log('🔑 Obtaining fresh plat_token via Playwright...');
  let token = '';
  try {
    token = execSync(`python3 "${pyScriptPath}"`, { encoding: 'utf8', cwd: ROOT_DIR }).trim();
  } catch (err) {
    console.error('❌ Error getting token:', err.message);
    process.exit(1);
  }

  console.log(`✓ Token retrieved (${token.slice(0, 20)}...)`);

  console.log('\n📥 Querying NXLINK AI Conversations API (Scanning Pages for [MY]PLANETGROUP)...');
  let conversations = [];

  for (let pageNum = 1; pageNum <= 10; pageNum++) {
    console.log(`   Fetching Page ${pageNum} (100 conversations)...`);
    const convResp = await fetch('https://app.nxlink.ai/admin/nx_flow_manager/conversation', {
      method: 'POST',
      headers: {
        'authorization': token,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        phone: null,
        tags: [],
        page_number: pageNum,
        page_size: 100,
        timeZone: 'UTC+08:00'
      })
    });

    if (convResp.ok) {
      const convData = await convResp.json();
      const pageList = Array.isArray(convData.list) ? convData.list : (Array.isArray(convData.data?.list) ? convData.data.list : (Array.isArray(convData.data) ? convData.data : []));
      conversations.push(...pageList);
    }
  }

  console.log(`Fetched ${conversations.length} total conversations from NXLINK. Filtering for [MY]PLANETGROUP...`);

  let insertedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    const convId = conv.id || conv.conversationId || conv.uuid;
    if (!convId) continue;

    // Check if already in Supabase
    const { data: existing } = await supabase
      .from('conversations')
      .select('id, customer_name, conversation_summary, conversation_tags, current_salary, job_title')
      .ilike('conversation_transcript', `%nxlink_id:${convId}%`)
      .limit(1);

    let needsUpdateOrInsert = false;
    let existingRow = null;

    if (existing && existing.length > 0) {
      existingRow = existing[0];
      const tagsListConv = Array.isArray(conv.tags) ? conv.tags.map(t => typeof t === 'string' ? t : t.name).filter(Boolean) : [];
      const tagsChanged = tagsListConv.length > 0 && JSON.stringify(existingRow.conversation_tags || []) !== JSON.stringify(tagsListConv);
      const isMissingNewFields = existingRow.current_salary === null || existingRow.job_title === null;
      if (!existingRow.customer_name || !existingRow.conversation_summary || tagsChanged || isMissingNewFields) {
        needsUpdateOrInsert = true;
      }
    } else {
      needsUpdateOrInsert = true;
    }

    if (!needsUpdateOrInsert) {
      skippedCount++;
      continue;
    }

    // Fetch transcript messages
    let messages = [];
    try {
      const msgResp = await fetch(`https://app.nxlink.ai/admin/nx_flow_manager/conversation/messages?pageSize=9999&pageNumber=1&conversationId=${convId}`, {
        headers: { 'authorization': token }
      });
      if (msgResp.ok) {
        const msgData = await msgResp.json();
        messages = msgData.data || msgData.list || [];
      }
    } catch (e) {
      console.warn(`     Warning: transcript fetch failed for ${convId}`);
    }

    // FILTER [MY]PLANETGROUP AND [MY]PLANETGROUP-V3 FLOWS
    const flowLower = (conv.flow_name || conv.auto_flow_name || '').toLowerCase();
    let isPlanetGroup = flowLower.includes('planetgroup') || flowLower.includes('planetgp') || conv.auto_flow_id === 1821 || conv.auto_flow_id === 1881;
    if (!isPlanetGroup && Array.isArray(messages)) {
      for (const m of messages) {
        if (m.autoFlowId === 1821 || m.autoFlowId === 1881) {
          isPlanetGroup = true;
          break;
        }
        if (m.msgType === 200 && m.msgInfo) {
          try {
            const p = typeof m.msgInfo === 'string' ? JSON.parse(m.msgInfo) : m.msgInfo;
            const pName = (p.name || '').toLowerCase();
            if (pName.includes('planetgroup') || pName.includes('planetgp')) {
              isPlanetGroup = true;
              break;
            }
          } catch (e) {}
        }
      }
    }

    if (!isPlanetGroup) {
      skippedCount++;
      continue;
    }

    console.log(`   Processing [MY]PLANETGROUP conversation #${i + 1} (ID: ${convId})...`);

    // Build clean dialogue thread
    const cleanTranscript = buildCleanDialogueThread(messages, convId);

    // Extract tags
    let tagsList = [];
    if (Array.isArray(conv.tags)) {
      tagsList = conv.tags.map(t => typeof t === 'string' ? t : t.name).filter(Boolean);
    }

    // Extract audio URL
    let callAudioUrl = conv.call_audio_url || conv.callAudioUrl || null;
    if (!callAudioUrl && Array.isArray(messages)) {
      for (const m of messages) {
        if (m.msgInfo && typeof m.msgInfo === 'string' && m.msgInfo.includes('audio_url')) {
          try {
            const parsed = JSON.parse(m.msgInfo);
            if (parsed.audio_url) {
              callAudioUrl = parsed.audio_url;
              break;
            }
          } catch (e) {}
        }
      }
    }

    // Extract sentiment, summary, next steps structured metadata
    const {
      sentiment,
      summary,
      nextSteps,
      extractedName,
      extractedPhone,
      extractedEmail,
      gender,
      age,
      qualification,
      address,
      job_title,
      working_experience,
      reason,
      current_salary,
      expected_salary,
      notice_period,
      photo,
      position_applied,
      opening_type,
      height,
      weight,
      retail_experience,
      spm_credits,
      photo_full_body_url,
      transportation,
      languages,
      medical_condition,
      consent,
      postcode,
      resume_url,
      date_of_birth,
      marital_status,
      smoker_or_vaper,
      qualification_url,
      retail_industry_experience,
      why_interested
    } = extractSummaryMetadata(messages, conv);

    // Date formatting (NXLINK created_at timestamp)
    let convDate = new Date().toISOString().split('T')[0];
    let convTime = new Date().toISOString().split('T')[1].split('.')[0];
    const rawTs = conv.created_at || conv.createdAt || conv.create_time || conv.createTime;
    if (rawTs) {
      const tsMs = typeof rawTs === 'number' ? (rawTs > 10000000000 ? rawTs : rawTs * 1000) : new Date(rawTs).getTime();
      if (!isNaN(tsMs)) {
        const d = new Date(tsMs);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        convDate = `${y}-${m}-${day}`;
        convTime = `${hh}:${mm}:${ss}`;
      }
    }

    // Extract customer name & phone & email
    let customerName = extractedName || conv.customer_name;
    let customerPhone = extractedPhone || conv.customer_phone || conv.phone_number;
    let customerEmail = extractedEmail || conv.email_address || conv.email;

    if (!customerName || customerName.startsWith('Customer #') || customerName.startsWith('Anonymous')) {
      for (const m of messages) {
        if (m && m.msgInfo) {
          try {
            const parsed = typeof m.msgInfo === 'string' ? JSON.parse(m.msgInfo) : m.msgInfo;
            const text = parsed?.message?.text || parsed?.text || '';
            if (text) {
              const matchNamePhone = text.match(/^([A-Za-z\s]+),\s*(0\d{8,10})/);
              if (matchNamePhone) {
                customerName = matchNamePhone[1].trim();
                customerPhone = matchNamePhone[2].trim();
                break;
              }
              const matchNameOnly = text.match(/Name:\s*([A-Za-z\s]+)/i);
              const matchPhoneOnly = text.match(/(?:Phone\s*Number|Phone):\s*(0\d{8,10})/i);
              if (matchNameOnly) customerName = matchNameOnly[1].trim();
              if (matchPhoneOnly) customerPhone = matchPhoneOnly[1].trim();
            }
          } catch (e) {}
        }
      }
    }

    // Strip Customer Name & Phone Number prefixes out of summary text
    let cleanSummary = summary;
    if (cleanSummary) {
      cleanSummary = cleanSummary
        .replace(/(?:Customer\s*)?Name:\s*[A-Za-z\s]+\.?\s*/gi, '')
        .replace(/(?:Phone\s*Number|Phone):\s*0\d{8,10}\.?\s*/gi, '')
        .replace(/^[\s,.-]+/, '')
        .trim();
    }

    let wasIngestedOrUpdated = false;

    if (existingRow) {
      const { error: updateErr } = await supabase
        .from('conversations')
        .update({
          customer_name: customerName || conv.customer_phone || `Customer #${convId}`,
          phone_number: customerPhone || null,
          email_address: customerEmail || null,
          customer_sentiment: sentiment || 'Neutral',
          conversation_summary: cleanSummary || '[MY]PLANETGROUP AI Bot Consultation',
          next_steps: nextSteps || null,
          conversation_tags: tagsList.length > 0 ? tagsList : null,
          call_audio_url: callAudioUrl,
          position_applied,
          gender,
          age,
          qualification,
          address,
          job_title,
          working_experience,
          reason,
          current_salary,
          expected_salary,
          notice_period,
          photo,
          opening_type,
          height,
          weight,
          retail_experience,
          spm_credits,
          photo_full_body_url,
          transportation,
          languages,
          medical_condition,
          consent,
          postcode,
          resume_url,
          date_of_birth,
          marital_status,
          smoker_or_vaper,
          qualification_url,
          retail_industry_experience,
          why_interested
        })
        .eq('id', existingRow.id);

      if (updateErr) {
        console.error(`     ❌ Supabase Update Error for ${convId}:`, updateErr.message);
      } else {
        console.log(`     ✅ Updated [MY]PLANETGROUP ID ${convId} (${customerName || 'Anonymous'})`);
        insertedCount++;
        wasIngestedOrUpdated = true;
      }
    } else {
      const { error: insertErr } = await supabase
        .from('conversations')
        .insert([{
          customer_name: customerName || conv.customer_phone || `Customer #${convId}`,
          phone_number: customerPhone || null,
          email_address: customerEmail || null,
          customer_sentiment: sentiment || 'Neutral',
          company_name: conv.company_name || null,
          conversation_summary: cleanSummary || '[MY]PLANETGROUP AI Bot Consultation',
          next_steps: nextSteps || null,
          conversation_date: convDate,
          conversation_time: convTime,
          conversation_tags: tagsList.length > 0 ? tagsList : null,
          conversation_transcript: cleanTranscript,
          call_audio_url: callAudioUrl,
          position_applied,
          gender,
          age,
          qualification,
          address,
          job_title,
          working_experience,
          reason,
          current_salary,
          expected_salary,
          notice_period,
          photo,
          opening_type,
          height,
          weight,
          retail_experience,
          spm_credits,
          photo_full_body_url,
          transportation,
          languages,
          medical_condition,
          consent,
          postcode,
          resume_url,
          date_of_birth,
          marital_status,
          smoker_or_vaper,
          qualification_url,
          retail_industry_experience,
          why_interested
        }]);

      if (insertErr) {
        console.error(`     ❌ Supabase Insert Error for ${convId}:`, insertErr.message);
      } else {
        console.log(`     ✅ Synced [MY]PLANETGROUP ID ${convId} (${customerName || 'Anonymous'}) ${callAudioUrl ? '(With Audio MP3 🎵)' : ''}`);
        insertedCount++;
        wasIngestedOrUpdated = true;
      }
    }

      // Auto-push to 3rd party webhook if record qualifies under tag rules
      if (shouldSyncToWebhook(tagsList)) {
        try {
          const webhookUrl = process.env.NXLINK_WEBHOOK_URL || 'https://hype-hr-441002907541.asia-southeast1.run.app/intake/chatbot';
          const clientId = process.env.NXLINK_WEBHOOK_CLIENT_ID || 'hype-chatbot';
          const clientSecret = process.env.NXLINK_WEBHOOK_CLIENT_SECRET || 'b7074fc1902d8ae2cd096612539700078f485611445c54d1d6bb06d226649443';

          const autoPayload = {
            fields: {
              "Conversation ID": convId.toString(),
              "Customer Name": customerName || 'Unknown',
              "Phone Number": customerPhone || 'Not Provided',
              "Company Name": conv.company_name || null,
              "Email Address": customerEmail || null,
              "Tags": tagsList,
              "Full Summary": cleanSummary || null,
              "Sentiment": sentiment || 'Neutral',
              "Next Steps": nextSteps || null,
              "Call Audio URL": callAudioUrl || null,
              "Conversation Date": convDate,
              "Position Applied": position_applied || null,
              "Gender": gender || null,
              "Age": age || null,
              "Highest Qualification": qualification || null,
              "Address": address || null,
              "Job Title": job_title || null,
              "Working Experience": working_experience || null,
              "Reason": reason || null,
              "Current Salary": current_salary || null,
              "Expected Salary": expected_salary || null,
              "Notice Period": notice_period || null,
              "Photo URL": photo || null,
              "Opening Type": opening_type || null,
              "Height": height || null,
              "Weight": weight || null,
              "Retail Experience": retail_experience || null,
              "SPM Credits": spm_credits || null,
              "Photo Full Body URL": photo_full_body_url || null,
              "Transportation": transportation || null,
              "Languages": languages || null,
              "Medical Condition": medical_condition || null,
              "Consent": consent || null,
              "Postcode": postcode || null,
              "Resume URL": resume_url || null,
              "Date of Birth": date_of_birth || null,
              "Marital Status": marital_status || null,
              "Smoker or Vaper": smoker_or_vaper || null,
              "Qualification URL": qualification_url || null,
              "Retail Industry Experience": retail_industry_experience || null,
              "Why Interested": why_interested || null
            }
          };

          const wbResp = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Id': clientId,
              'X-Client-Secret': clientSecret
            },
            body: JSON.stringify(autoPayload)
          });

          if (wbResp.ok) {
            console.log(`     🚀 Auto-pushed ID ${convId} to 3rd party Webhook!`);
          }
        } catch (wbErr) {
          console.error(`     ⚠️ Auto Webhook Push Error for ${convId}:`, wbErr.message);
        }
      }
    }

  console.log('\n==========================================');
  console.log(`🎉 INGESTION COMPLETE!`);
  console.log(`   [MY]PLANETGROUP records inserted: ${insertedCount}`);
  console.log(`   Skipped (other flows / existing): ${skippedCount}`);
  console.log('==========================================');
}

main().catch(console.error);
