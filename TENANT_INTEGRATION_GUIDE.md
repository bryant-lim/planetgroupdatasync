# Tenant Integration Duplication Guide

This guide provides step-by-step instructions on how to replicate the NxLink and Lark integration for other tenants. It covers the overall architecture, system requirements, credentials checklist, and verification procedures.

---

## 1. Integration Architecture & Data Flow

The integration runs serverless workflows using **Netlify Functions** and **Supabase** to sync NxLink conversation records to a **Lark Multidimensional Table**.

```mermaid
graph TD
    Cron[Netlify Cron Schedule: every 5 min] -->|Triggers| SyncFunc[sync-nxlink Function]
    SyncFunc -->|1. Authenticates| NxAuth[NxLink Auth / plat_token]
    SyncFunc -->|2. Pulls conversations| NxConv[NxLink Conversations API]
    SyncFunc -->|3. Pulls transcripts| NxMsg[NxLink Messages API]
    SyncFunc -->|4. Saves to database| Supabase[(Supabase Database)]
    SyncFunc -->|5. Filter Lead Tags| CheckTags{Qualified Lead?}
    CheckTags -->|Yes| LarkWebhook[Lark Webhook Proxy]
    LarkWebhook -->|6. Writes Row| LarkBase[Lark Multidimensional Table]
```

### Components:
- **`sync-nxlink-cron.ts`**: A Netlify background scheduled function that runs every 5 minutes (`*/5 * * * *`).
- **`sync-nxlink.ts`**: The core synchronization logic. It:
  - Connects to the NxLink admin endpoints to retrieve conversations and messages.
  - Parses metadata (Sentiment, Summary, Next Steps, Name, Phone, and Call Audio URLs).
  - Synchronizes records to the Supabase database.
  - Automatically pushes qualifying leads (based on tags) to the Lark Webhook.
- **`push-webhook.ts`**: A secure proxy forwarding payloads to Lark with signature credentials to hide secrets from client scripts.
- **`ingest-crm.ts`**: An alternative inbound API endpoint allowing other systems to push raw conversation text payloads which are then parsed and stored.

---

## 2. Requirements & Prerequisites

To set up a new tenant integration, you need access and configuration prepared across three platforms:

### A. NxLink Requirements
- **Tenant Target URL**: E.g., `https://app.nxlink.ai` (default) or other tenant endpoints like `https://idn.nxlink.ai`.
- **Flow Filter Name**: The synchronization script searches for a specific string in the conversation's flow name (e.g., `'dentalhome'`). Determine the identifier for the new tenant's flow.
- **Authentication**: A valid `plat_token` is required. This can be obtained in two ways:
  1. **Token Service**: A shared endpoint (`NXAI_TOKEN_URL`) returning the token.
  2. **Headless Login (Preferred Fallback)**: An admin account email and password stored in a local `.nxlink_creds` file. The python script [`nxlink_get_plat_token.py`](file:///Users/bryantlim/Documents/chillor-repo/nxlink-crm/nxlink_get_plat_token.py) uses Playwright to programmatically login and scrape a fresh token.

### B. Lark Requirements
- **Lark Multidimensional / Base Table**: Create a table in Lark to store leads.
- **Fields Configuration**: Ensure the table has columns that match the webhook payload key names exactly:
  - `Conversation ID` (Text)
  - `Customer Name` (Text)
  - `Phone Number` (Text)
  - `Company Name` (Text/Null)
  - `Email Address` (Text/Null)
  - `Tags` (Multi-select or Text array)
  - `Full Summary` (Text)
  - `Sentiment` (Text)
  - `Next Steps` (Text)
  - `Call Audio URL` (Link/Text)
  - `Conversation Date` (Date/Text)
- **Lark Webhook URL**: Set up a multidimensional table webhook trigger on Lark and retrieve the URL.
- **Lark API Client Credentials**: Create a Lark custom app/webhook credential to obtain a `client_id` and `client_secret` to authorize webhook POST requests.

### C. Supabase Database Requirements
- **Supabase Instance**: Set up a Supabase project for the tenant.
- **Database Schema**: Execute [`supabase_schema.sql`](file:///Users/bryantlim/Documents/chillor-repo/nxlink-crm/supabase_schema.sql) in the Supabase SQL editor to create the following tables:
  - `conversations`: Stores conversation transcripts, summaries, tags, metadata, and webhook sync statuses.
  - `customer_profiles`: Consolidated profiles of customers keyed by phone number.
  - `profiles`: Internal user roles and authentication mapping.
  - `webhook_logs`: Logging table for tracking inbound `ingest-crm` requests (if enabled).

---

## 3. Required Credentials Checklist

Keep these environment variables configured in Netlify's site settings under **Environment Variables** (or in a local `.env` file for testing):

| Env Variable | Description | Example / Usage |
|--------------|-------------|-----------------|
| `SUPABASE_URL` | Supabase API connection URL | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for bypass RLS limits | `eyJhbGciOi...` |
| `NXLINK_WEBHOOK_URL` | Lark webhook endpoint | `https://asia-southeast1-planet-group-d2436.cloudfunctions.net/...` |
| `NXLINK_WEBHOOK_CLIENT_ID` | Lark webhook credential Client ID | `nxlink_70a248a4b37bae828e53035a` |
| `NXLINK_WEBHOOK_CLIENT_SECRET`| Lark webhook credential Client Secret | `f2c3fb34bdbbdc38a7ae...` |
| `NXAI_TOKEN_URL` | (Optional) Shared token service endpoint | `https://asia-east1...` |
| `NXLINK_PLAT_TOKEN` | (Fallback/Testing) Hardcoded plat token | `eyJhbGciOiJIUzI1...` |

### Local Verification Credentials:
- **File Name**: `.nxlink_creds` (Place at project root. Do NOT commit this file).
- **Format**:
  ```
  username@company.com
  yourpasswordhere
  ```

---

## 4. Step-by-Step Duplication Guide

Follow these steps to replicate or set up the candidate integration:

### Step 1: Initialize Database Tables
Log in to your new Supabase dashboard, go to the **SQL Editor**, and run the schema setup from [`supabase_schema.sql`](file:///Users/bryantlim/Documents/chillor-repo/nxlink-sync-planetgroup/supabase_schema.sql). This will provision the `conversations` table containing the 12 candidate profile fields: `gender, height, weight, age, qualification, address, transportation, medical_condition, working_experience, expected_salary, start_date, photo`.

### Step 2: Configure Lark Base and Webhook (Optional)
If forwarding leads to Lark:
1. Create your Lark Multidimensional Table with the column schema outlined in Section 2B.
2. Set up the Lark webhook connector and record the Webhook URL.
3. Configure signature validation inside Lark to acquire the Webhook **Client ID** and **Client Secret**.

### Step 3: Modify Codebase Filters (Tenant Customization)
1. Open [`sync-local.js`](file:///Users/bryantlim/Documents/chillor-repo/nxlink-sync-planetgroup/scripts/sync-local.js) and locate the flow name filter on line 258. It filters for `[MY]PLANETGROUP` (ID `1821`) by default.
2. Check [`cloudflare-worker-sync.ts`](file:///Users/bryantlim/Documents/chillor-repo/nxlink-sync-planetgroup/cloudflare-worker-sync.ts) and [`netlify/functions/sync-nxlink.ts`](file:///Users/bryantlim/Documents/chillor-repo/nxlink-sync-planetgroup/netlify/functions/sync-nxlink.ts) to verify they use the same filter.

### Step 4: Configure Cloudflare Worker (Scheduled Cron Sync)
To run the 5-minute background sync cron job on Cloudflare Workers:
1. Install Wrangler globally or run it via npx:
   ```bash
   npm install -g wrangler
   ```
2. Deploy the Worker script [`cloudflare-worker-sync.ts`](file:///Users/bryantlim/Documents/chillor-repo/nxlink-sync-planetgroup/cloudflare-worker-sync.ts):
   ```bash
   npx wrangler deploy
   ```
3. Set your secret environment variables in Cloudflare dashboard under the Worker Settings > Variables, or using Wrangler CLI:
   ```bash
   npx wrangler secret put SUPABASE_URL
   ```
   *Secrets to add*: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NXLINK_PLAT_TOKEN` (optional), `NXAI_TOKEN_URL` (optional), `NXLINK_WEBHOOK_URL` (optional), `NXLINK_WEBHOOK_CLIENT_ID` (optional), `NXLINK_WEBHOOK_CLIENT_SECRET` (optional).

### Step 5: Deploy Frontend to Cloudflare Pages
1. Build the Vite React SPA application:
   ```bash
   npm run build
   ```
2. Deploy the `dist/` directory to Cloudflare Pages.
3. In the Cloudflare Pages project settings, configure the environment variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase Anonymous Key
   - `VITE_SYNC_URL` = the HTTP route of your deployed Cloudflare Worker (e.g. `https://nxlink-sync-planetgroup-worker.yourdomain.workers.dev/`) so the "Sync" button on the UI Dashboard triggers the sync process via your worker.

### Step 6: Test the Setup Locally
1. Create `.nxlink_creds` at the root with your NxLink login credentials.
2. Set up a local `.env` file containing your Supabase and Lark variables.
3. Execute the dry-run/local sync tool:
   ```bash
   npm run sync:planetgroup
   ```
4. Ensure conversations are written to Supabase (check that the candidate attributes such as gender, age, expected salary, and photo are filled).

