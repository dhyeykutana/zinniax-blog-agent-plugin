# ZinniaX Blog Agent

An autonomous multi-agent pipeline that researches, writes, SEO-optimizes, and publishes blog posts to the ZinniaX WordPress site — with a human email-approval gate before anything goes live.

---

## Prerequisites

- **Node.js 18+** (`node --version` to check)
- **WordPress Application Password** — generated in WP Admin → Users → Your Profile → Application Passwords
- **Gmail SMTP access** — either an App Password (if 2FA is on) or less-secure app access
- All approvers (Dhyey, Ronak, Yash) must be able to receive email and click links that reach `localhost:3001`

> ⚠️ The approval server runs locally. Approvers must be on the same network, or you must expose port 3001 via ngrok/cloudflare tunnel.

---

## Setup

1. **Clone / copy this folder** to your machine.

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and fill in all values (see table below).

4. **Start the approval server** (Terminal 1):
   ```bash
   npm run server
   ```

5. **Run the pipeline** (Terminal 2):
   ```bash
   npm start
   ```
   Or with a specific topic:
   ```bash
   node orchestrator.js "MEP monitoring in scoliosis surgery"
   ```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key from console.anthropic.com |
| `WP_URL` | Your WordPress site URL (e.g. `https://zinniax.com`) |
| `WP_USERNAME` | WordPress username |
| `WP_APP_PASSWORD` | WordPress Application Password (spaces optional) |
| `SMTP_HOST` | SMTP server (default: `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (default: `587`) |
| `SMTP_USER` | Sender email address |
| `SMTP_PASS` | Gmail App Password (not your regular password) |
| `EMAIL_DHYEY` | Dhyey's email for tech review |
| `EMAIL_RONAK` | Ronak's email for publish approval |
| `EMAIL_YASH` | Yash's email for publish approval |
| `APPROVAL_SERVER_URL` | Full URL to the approve endpoint (default: `http://localhost:3001/approve`) |
| `APPROVAL_SERVER_PORT` | Port for the approval server (default: `3001`) |

---

## Agent Pipeline

```
researchAgent()
    ↓  Picks a topic, calls Claude (claude-opus-4-5)
    ↓  Returns: { topic, key_points, target_audience, pain_points, zinniax_angle, keywords }

writerAgent(research)
    ↓  Writes an 800-1000 word HTML blog post
    ↓  Returns: { title, excerpt, content_html, estimated_read_time }

seoAgent(research, draft)
    ↓  Generates SEO metadata
    ↓  Returns: { seo_title, meta_description, focus_keyword, tags, slug, internal_link_suggestions }

createDraftPost(draft, seo)
    ↓  Saves to WordPress as a draft via REST API
    ↓  Returns: { id, link }

sendDhyeyReviewEmail(draft, seo, postId)
    ↓  Sends Approve/Reject email to Dhyey

    [HUMAN GATE 1: Dhyey clicks Approve or Reject]

sendRonakYashApprovalEmail(draft, seo, postId)
    ↓  Sends Publish/Revision email to Ronak + Yash

    [HUMAN GATE 2: Ronak or Yash clicks Publish or Send Back]

publishPost(postId)
    ↓  Sets WordPress post status to "publish"
```

---

## Approval Flow

1. The pipeline saves a draft to WordPress and emails **Dhyey** with:
   - Post title, SEO metadata, excerpt, content preview
   - **✅ Approve** button → forwards to Ronak & Yash
   - **❌ Reject** button → marks draft as rejected

2. If Dhyey approves, **Ronak and Yash** both receive an email with:
   - Full post details
   - **🚀 Publish to ZinniaX.com** → publishes live
   - **🔁 Send Back for Revision** → marks post for revision

3. All approval actions are handled by clicking links that hit the local Express server at `localhost:3001/approve?token=XXX`.

Tokens are single-use and stored in memory — they expire if the server restarts.

---

## Adding New Topics

Open `agents/research.js` and add entries to the `TOPICS` array:

```js
const TOPICS = [
  'SSEP waveform interpretation for IONM techs',
  // ... existing topics ...
  'Your new topic here',
];
```

The pipeline picks a random topic on each run unless you pass one via CLI:
```bash
node orchestrator.js "Your specific topic"
```

---

## Running Both Server and Orchestrator Together

```bash
npm run dev
```

This uses `concurrently` to run the approval server and orchestrator in parallel in a single terminal.
