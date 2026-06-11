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

## Setup in Claude Cowork

Running the pipeline inside **Claude Cowork** (cloud agent) instead of your local machine. Same code, three differences: dependencies install in the cloud sandbox, secrets go in Cowork's environment, and the approval server must be exposed via a public tunnel (approvers can't reach the sandbox's `localhost`).

1. **Connect the repo.** In Cowork, attach this GitHub repo (`dhyeykutana/zinniax-blog-agent-plugin`) as the working directory.

2. **Install dependencies** — Cowork's sandbox starts clean:
   ```bash
   npm install
   ```

3. **Set secrets as environment variables.** Do **not** commit `.env`. Add each variable from the [Environment Variables](#environment-variables) table to Cowork's environment/secrets panel. At minimum: `ANTHROPIC_API_KEY`, `WP_URL`, `WP_USERNAME`, `WP_APP_PASSWORD`, `SMTP_*`, `EMAIL_*`.

4. **Expose the approval server publicly.** The sandbox's `localhost:3001` is unreachable from approvers' inboxes. Start the server, then tunnel it:
   ```bash
   npm run server          # Terminal 1 — approval server on :3001
   ngrok http 3001         # Terminal 2 — public URL
   ```
   Copy the `https://<id>.ngrok-free.app` URL ngrok prints.

5. **Point approval links at the tunnel.** Set:
   ```bash
   APPROVAL_SERVER_URL=https://<id>.ngrok-free.app/approve
   ```
   Re-run with this set so emailed Approve/Publish links resolve to the public URL instead of `localhost`.

6. **Run the pipeline:**
   ```bash
   npm start
   # or a specific topic:
   node orchestrator.js "MEP monitoring in scoliosis surgery"
   ```

> ⚠️ Tokens are stored in memory — if the Cowork sandbox or server restarts mid-flow, pending approval links expire. Keep the server process alive until both human gates clear.

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

---

## License

[MIT](LICENSE) © 2026 Sunflower Lab
