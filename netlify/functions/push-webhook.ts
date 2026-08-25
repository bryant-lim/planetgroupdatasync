import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Id, X-Client-Secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : null;
    if (!body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Payload body is required' })
      };
    }

    const webhookUrl = process.env.NXLINK_WEBHOOK_URL || 'https://asia-southeast1-planet-group-d2436.cloudfunctions.net/jobApplication';
    const clientId = process.env.NXLINK_WEBHOOK_CLIENT_ID || 'nxlink_70a248a4b37bae828e53035a';
    const clientSecret = process.env.NXLINK_WEBHOOK_CLIENT_SECRET || 'f2c3fb34bdbbdc38a7ae08a5bee0748083bc587e916cefd976b189936702d50b';

    console.log(`Backend proxy forwarding payload to ${webhookUrl}...`);

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': clientId,
        'X-Client-Secret': clientSecret
      },
      body: JSON.stringify(body)
    });

    const responseText = await resp.text();

    return {
      statusCode: resp.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: responseText
    };
  } catch (err: any) {
    console.error('Push webhook proxy error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Internal Proxy Error' })
    };
  }
};
