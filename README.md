# LiveThread — Threads Analytics & AI Content Engine

A modern, fast, and local-first web application integrating with the official Meta Threads API.

## Core Features

1. **Personal Threads Analytics (Module A)**
   - Syncs your published Threads with engagement insights: **Views, Likes, Comments/Replies, Reposts, Quotes**.
   - Summary metric cards with **30-day trend comparisons**.
   - Performance trend chart (Views & Engagements) powered by Recharts.
   - Interactive data table with one-click sorting (**Most Viewed, Most Liked, Most Commented, Most Recent**) and text filtering.
   - One-click **"Rewrite with AI"** action on any past post.

2. **Viral Topic Discovery (Module B)**
   - Search public Threads by topic tag or keyword query.
   - Supports **TAG** and **KEYWORD** modes, ranked by **TOP** (engagement) or **RECENT** (chronological).
   - Quick one-click topic chips (`#software`, `#startup`, `#physics`, `#philosophy`, `#ai`, etc.).
   - Card view with author verification badge and direct links to Threads.
   - Direct **"Import to AI Studio"** button on each card.

3. **AI Content Studio & Rewriter (Module C)**
   - Side-by-side drawer comparing original source vs. rewritten output.
   - Multiple AI modes:
     - **Direct Rewrite:** One punchy, high-engagement post.
     - **Hook Variations:** 3 distinct scroll-stopping opening lines.
     - **Thread Split:** 2–3 chained posts that can be published as a connected thread.
   - Live character counters enforcing the **500-character Threads limit**.
   - Copy to clipboard, save to local Drafts, or publish directly via Meta API.
   - Quick scratchpad for raw ideas on the Studio page.

4. **Security & Local-First Architecture**
   - Access tokens and API keys are stored in your browser's `localStorage` and never saved to a database or disk.
   - Proxied through Next.js Route Handlers to prevent CORS restrictions and hide credentials.
   - IndexedDB caching ensures instant load times for your metrics.
   - Built-in **Demo Mode** allows exploring all dashboard, discovery, and studio features with realistic sample data without requiring an API key.
   - Real-time 24h rate-limit counters for Meta Threads limits (250 publishes & 2,200 searches per 24 hours).

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 22)
- npm 10+

### 2. Installation
```bash
git clone <repo-url>
cd livethread
npm install
```

### 3. Environment (Optional)
Credentials can be configured entirely inside the web interface without touching files. If you want server-level fallbacks for single-user self-hosting:
```bash
cp .env.example .env.local
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Meta Threads API Setup & Permissions

To connect a live Threads account, create an app on [Meta for Developers](https://developers.facebook.com/):
1. Add the **Threads** product to your App.
2. In App Roles / Threads Tester, invite your Threads account.
3. Generate a Long-Lived User Access Token with the following permissions:
   - `threads_basic` — read account profile & published posts
   - `threads_manage_insights` — fetch views, likes, replies, reposts
   - `threads_keyword_search` — search public threads
   - `threads_content_publish` — publish single posts and threads
4. Paste the token into LiveThread's setup screen or settings.
