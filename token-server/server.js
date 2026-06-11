import 'dotenv/config';
import express from 'express';
import { pendingApprovals, sendRonakYashApprovalEmail } from '../humans/email.js';
import { publishPost, updatePostStatus } from '../wordpress/publish.js';

const app = express();
const PORT = process.env.APPROVAL_SERVER_PORT || 3001;

// In-memory store for draft/seo context — populated by orchestrator via server start
// We keep a shared context map here for server-triggered emails
export const draftContext = new Map();

function htmlResponse(res, title, body, color = '#28a745') {
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZinniaX Blog Agent</title>
  <style>
    body { font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f5f5f5; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 480px; width: 90%;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #1a1a2e; font-size: 22px; margin: 0 0 12px; }
    .post-title { background: #f4f4f4; border-radius: 6px; padding: 10px 16px;
                  font-size: 14px; color: #555; margin: 16px 0; }
    .status { display: inline-block; padding: 6px 16px; border-radius: 20px;
              color: white; background: ${color}; font-weight: bold; font-size: 14px; }
    .timestamp { margin-top: 24px; font-size: 12px; color: #999; }
    .brand { margin-top: 24px; font-size: 13px; color: #007bff; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🧠</div>
    <h1>${title}</h1>
    <div class="post-title">${body.postTitle || ''}</div>
    <span class="status">${body.statusLabel}</span>
    <div class="timestamp">⏰ ${timestamp}</div>
    <div class="brand">ZinniaX Blog Agent</div>
  </div>
</body>
</html>`);
}

app.get('/approve', async (req, res) => {
  const { token } = req.query;

  if (!token || !pendingApprovals.has(token)) {
    return res.status(400).send(`
<!DOCTYPE html><html><body style="font-family:Arial;text-align:center;padding:60px;">
<h2>⚠️ Invalid or Expired Token</h2>
<p>This approval link is no longer valid.</p>
</body></html>`);
  }

  const { action, postId, title } = pendingApprovals.get(token);
  pendingApprovals.delete(token);

  console.log(`🔔 Token Server: Action triggered — "${action}" for post ID ${postId}`);

  try {
    switch (action) {
      case 'dhyey_approved': {
        await updatePostStatus(postId, 'dhyey_approved');
        // Retrieve draft context to forward email
        const ctx = draftContext.get(postId);
        if (ctx) {
          await sendRonakYashApprovalEmail(ctx.draft, ctx.seo, postId);
        }
        return htmlResponse(res, 'Approved! Forwarded to Ronak & Yash.', {
          postTitle: title,
          statusLabel: '✅ Tech Review Passed',
        }, '#28a745');
      }

      case 'dhyey_rejected': {
        await updatePostStatus(postId, 'rejected');
        return htmlResponse(res, 'Draft Rejected', {
          postTitle: title,
          statusLabel: '❌ Draft Discarded',
        }, '#dc3545');
      }

      case 'publish_approved': {
        await publishPost(postId);
        return htmlResponse(res, 'Published to ZinniaX.com!', {
          postTitle: title,
          statusLabel: '🚀 Live on zinniax.com',
        }, '#007bff');
      }

      case 'publish_rejected': {
        await updatePostStatus(postId, 'needs_revision');
        return htmlResponse(res, 'Post Marked for Revision', {
          postTitle: title,
          statusLabel: '🔁 Sent Back for Revision',
        }, '#fd7e14');
      }

      default:
        return res.status(400).send('Unknown action.');
    }
  } catch (err) {
    console.error(`❌ Token Server: Error processing action "${action}":`, err.message);
    res.status(500).send(`<h2>Server Error</h2><p>${err.message}</p>`);
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Token Server: Listening on http://localhost:${PORT}/approve`);
});
