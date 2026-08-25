import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const webhookUrl = 'https://asia-southeast1-planet-group-d2436.cloudfunctions.net/jobApplication';
const clientId = 'nxlink_70a248a4b37bae828e53035a';
const clientSecret = 'f2c3fb34bdbbdc38a7ae08a5bee0748083bc587e916cefd976b189936702d50b';

async function testPayload(name, fields) {
  console.log(`\n🧪 Testing Payload: ${name}`);
  const payload = { fields };
  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': clientId,
      'X-Client-Secret': clientSecret
    },
    body: JSON.stringify(payload)
  });
  console.log(`Status: ${resp.status}`);
  const text = await resp.text();
  console.log(`Response: ${text}`);
}

async function main() {
  // Test 1: Baseline successful format (from Collin #2877519)
  await testPayload('Collin Baseline', {
    "Conversation ID": "2877519_test",
    "Customer Name": "Collin Test",
    "Phone Number": "0167362712",
    "Company Name": null,
    "Email Address": null,
    "Tags": ["End Conversation", "Booking Appointment", "DH - Hot Lead"],
    "Full Summary": "Test summary",
    "Sentiment": "Positive",
    "Next Steps": "Follow up",
    "Call Audio URL": null,
    "Conversation Date": "2026-07-28"
  });

  // Test 2: CS with trailing dot or specific characters
  await testPayload('CS Test', {
    "Conversation ID": "2878807_test",
    "Customer Name": "CS",
    "Phone Number": "0199181918",
    "Company Name": null,
    "Email Address": null,
    "Tags": ["End Conversation", "Booking Appointment", "DH - Hot Lead"],
    "Full Summary": "The customer inquired about a general checkup.",
    "Sentiment": "Positive",
    "Next Steps": "Review submitted form.",
    "Call Audio URL": null,
    "Conversation Date": "2026-07-28"
  });
}

main().catch(console.error);
