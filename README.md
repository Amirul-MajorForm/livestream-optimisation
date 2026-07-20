# MajorForm Livestream Dashboard

Internal ops dashboard for analysing MajorForm's livestream campaign performance. Built with Next.js 14, Google Sheets API, and Claude AI.

## Features

- **Overview** — KPI cards, monthly GMV trends, platform split, recent streams
- **Streamers** — ranked by GMV, expandable history per streamer
- **Brands** — breakdown by brand with account type filter
- **Timeslots** — heatmap of avg GMV by day × time bucket
- **Ask Claude** — freeform natural language queries over your filtered data

## Setup

### 1. Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable the **Google Sheets API**: APIs & Services → Library → search "Google Sheets API" → Enable
4. Create a service account: APIs & Services → Credentials → Create Credentials → Service Account
5. Fill in a name, click Create, skip role assignment, click Done
6. Click the service account → Keys → Add Key → Create new key → JSON → Download

The JSON file contains `client_email` and `private_key`.

### 2. Share the Google Sheet

Open the target sheet and share it with the service account's `client_email` with **Viewer** access.

### 3. Environment Variables

Set these in Railway (or `.env.local` for local dev):

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
GOOGLE_SHEET_ID=1abc...xyz
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

For `GOOGLE_PRIVATE_KEY`: paste the full key from the JSON file. Railway's env var UI accepts multi-line values. The app handles `\n` escaping automatically.

### 4. Local Development

```bash
npm install
# create .env.local with the vars above
npm run dev
```

Visit `http://localhost:3000`. Check `/test` first to verify the Sheet connection.

### 5. Deploy to Railway

1. Push to GitHub: `Amirul-MajorForm/livestream-optimisation`
2. Create a new Railway project, connect the GitHub repo
3. Railway auto-detects Next.js via Nixpacks
4. Add the four env vars in the Railway dashboard
5. Deploy — `railway.toml` configures the build and start commands

### 6. DNS — `streams.majorform.co` via Squarespace

1. In Railway: Settings → Domains → Add Custom Domain → `streams.majorform.co`
2. Copy the Railway hostname (e.g. `livestream-dashboard.up.railway.app`)
3. In Squarespace DNS, add a CNAME:
   - Host: `streams`
   - Points to: the Railway hostname
   - TTL: Auto

## Data Source

Sheet: `NEW Availability 2026` — headers at row 25, data from row 29.

The dashboard defaults to `Status = Paid` rows only. Use the filter toggles in the top bar to include Invoice Sent, Invoice Pending, or Scheduled.
