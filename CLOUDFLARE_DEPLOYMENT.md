# Cloudflare Deployment Guide

This guide details how to deploy the CRM frontend onto **Cloudflare Pages** (with GitHub Git integration) and the sync scheduler onto **Cloudflare Workers** (with a 5-minute cron trigger).

---

## 1. Deploy the Sync Worker (Cron Job)
The Cloudflare Worker manages the background sync every 5 minutes and handles the manual sync button request from the UI.

### Step A: Deploy the Worker
You can deploy the Worker using either of these two methods:

#### Method 1: Deploy via browser (Recommended if CLI auth fails)
1. Go to your **Cloudflare Dashboard** > **Workers & Pages** > **Create Application** > **Workers** > **Create Worker** (or **Start with Hello World!**).
2. Name your worker `nxlink-sync-planetgroup-worker` and click **Deploy**.
3. Once deployed, click **Edit Code**.
4. Open the compiled bundle file [`worker-dist/index.js`](file:///Users/bryantlim/Documents/chillor-repo/nxlink-sync-planetgroup/worker-dist/index.js) on your PC, copy its entire content, paste it into the Cloudflare online code editor, and click **Save and deploy**.

#### Method 2: Deploy via Wrangler CLI
1. Deploy the Worker script using Wrangler:
   ```bash
   npx wrangler deploy
   ```
3. Copy the URL of your deployed Worker (e.g., `nxlink-pg-datasync.tabsoft-account.workers.dev/`). You will need this URL for the Pages setup.


### Step B: Configure Worker Environment Secrets
Go to the **Cloudflare Dashboard** > **Workers & Pages** > Select **`nxlink-sync-planetgroup-worker`** > **Settings** > **Variables** > Click **Add Secret**, and configure:
* `SUPABASE_URL`: (Your new Supabase database URL)
* `SUPABASE_SERVICE_ROLE_KEY`: (Your new Supabase service role API key, required to bypass RLS)
* `NXLINK_PLAT_TOKEN`: (Optional; if you wish to override the automated token parser)
* `NXLINK_WEBHOOK_URL`: (Optional; Lark webhook URL if you wish to push warm leads/applications to Lark)
* `NXLINK_WEBHOOK_CLIENT_ID` / `NXLINK_WEBHOOK_CLIENT_SECRET`: (Optional; Lark webhook credentials)

Once deployed, the `[triggers]` block in your config automatically schedules a cron job to execute every 5 minutes. You can monitor this schedule in the Worker's **Triggers** tab.

---

## 2. Deploy the Frontend (Cloudflare Pages with Git Integration)
Connecting your GitHub repository to Cloudflare Pages automatically builds and deploys your CRM UI whenever you push updates.

### Step A: Connect Repository
1. Go to your **Cloudflare Dashboard** > **Workers & Pages**.
2. Click **Create Application** > **Pages** > **Connect to Git**.
3. Log in/Authorize your GitHub account, and select the repository **`planetgroupdatasync`**.
4. Click **Begin setup**.

### Step B: Configure Build & Deployment Settings
Configure the following settings:
* **Framework preset**: Select **`Vite`**
* **Build command**: `npm run build`
* **Build output directory**: `dist`
* **Root directory**: `/` (leave as default)

### Step C: Configure Environment Variables
Expand the **Environment variables (advanced)** section on the same setup page and add the following variables under both **Production** and **Preview**:
* `VITE_SUPABASE_URL`: (Your new Supabase database URL)
* `VITE_SUPABASE_ANON_KEY`: (Your new Supabase anonymous API key)
* `VITE_SYNC_URL`: (The URL of your deployed Cloudflare Worker sync script from Section 1, e.g. `https://nxlink-sync-planetgroup-worker.yourdomain.workers.dev/`)

Click **Save and Deploy**. Cloudflare will pull your GitHub code, compile it, and host your static SPA dashboard.
