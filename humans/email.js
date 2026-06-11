import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Shared in-memory token store — imported by token-server/server.js
export const pendingApprovals = new Map();

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function approvalButtonHtml(label, emoji, token, color) {
  const url = `${process.env.APPROVAL_SERVER_URL}?token=${token}`;
  return `<a href="${url}" style="
    display: inline-block;
    padding: 14px 28px;
    background-color: ${color};
    color: #ffffff;
    text-decoration: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: bold;
    margin: 8px;
  ">${emoji} ${label}</a>`;
}

/**
 * Sends the tech review email to Dhyey.
 */
export async function sendDhyeyReviewEmail(draft, seo, postId) {
  const approveToken = generateToken();
  const rejectToken = generateToken();

  pendingApprovals.set(approveToken, { action: 'dhyey_approved', postId, title: draft.title });
  pendingApprovals.set(rejectToken, { action: 'dhyey_rejected', postId, title: draft.title });

  const transporter = createTransporter();
  const contentPreview = draft.content_html.replace(/<[^>]+>/g, '').slice(0, 800);

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #333;">
  <h2 style="color: #1a1a2e;">📋 ZinniaX Blog — Tech Review Required</h2>
  <p>A new blog post has been drafted and saved as a WordPress draft. Please review for technical accuracy.</p>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 8px; font-weight: bold; width: 160px;">Post Title</td><td style="padding: 8px;">${draft.title}</td></tr>
    <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold;">SEO Title</td><td style="padding: 8px;">${seo.seo_title}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Focus Keyword</td><td style="padding: 8px;">${seo.focus_keyword}</td></tr>
    <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold;">Tags</td><td style="padding: 8px;">${seo.tags.join(', ')}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Read Time</td><td style="padding: 8px;">${draft.estimated_read_time}</td></tr>
    <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold;">WP Draft ID</td><td style="padding: 8px;">${postId}</td></tr>
  </table>

  <h3>Excerpt</h3>
  <p style="background: #f4f4f4; padding: 12px; border-left: 4px solid #007bff; border-radius: 4px;">${draft.excerpt}</p>

  <h3>Content Preview (first 800 chars)</h3>
  <p style="background: #f9f9f9; padding: 12px; border-radius: 4px; font-size: 14px; line-height: 1.6;">${contentPreview}…</p>

  <div style="text-align: center; margin: 32px 0;">
    ${approvalButtonHtml('Approve — Forward to Ronak & Yash', '✅', approveToken, '#28a745')}
    ${approvalButtonHtml('Reject — Discard Draft', '❌', rejectToken, '#dc3545')}
  </div>

  <p style="font-size: 12px; color: #888;">This email was sent by the ZinniaX Blog Agent. Approval tokens expire when the server restarts.</p>
</body>
</html>`;

  await transporter.sendMail({
    from: `"ZinniaX Blog Agent" <${process.env.SMTP_USER}>`,
    to: process.env.EMAIL_DHYEY,
    subject: `[Tech Review] ${draft.title}`,
    html,
  });

  console.log(`📧 Email: Tech review request sent to Dhyey for "${draft.title}"`);
}

/**
 * Sends final publish approval email to Ronak and Yash.
 */
export async function sendRonakYashApprovalEmail(draft, seo, postId) {
  const approveToken = generateToken();
  const rejectToken = generateToken();

  pendingApprovals.set(approveToken, { action: 'publish_approved', postId, title: draft.title });
  pendingApprovals.set(rejectToken, { action: 'publish_rejected', postId, title: draft.title });

  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #333;">
  <h2 style="color: #1a1a2e;">🚀 ZinniaX Blog — Final Publish Approval</h2>
  <p><strong>Dhyey has reviewed and approved this post for technical accuracy.</strong> Please give final sign-off to publish it to zinniax.com.</p>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 8px; font-weight: bold; width: 160px;">Post Title</td><td style="padding: 8px;">${draft.title}</td></tr>
    <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold;">SEO Title</td><td style="padding: 8px;">${seo.seo_title}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Meta Description</td><td style="padding: 8px;">${seo.meta_description}</td></tr>
    <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold;">Focus Keyword</td><td style="padding: 8px;">${seo.focus_keyword}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Slug</td><td style="padding: 8px;">zinniax.com/${seo.slug}</td></tr>
    <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold;">Category</td><td style="padding: 8px;">${seo.category}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Tags</td><td style="padding: 8px;">${seo.tags.join(', ')}</td></tr>
    <tr style="background:#f9f9f9;"><td style="padding: 8px; font-weight: bold;">Read Time</td><td style="padding: 8px;">${draft.estimated_read_time}</td></tr>
  </table>

  <h3>Excerpt</h3>
  <p style="background: #f4f4f4; padding: 12px; border-left: 4px solid #007bff; border-radius: 4px;">${draft.excerpt}</p>

  <div style="text-align: center; margin: 32px 0;">
    ${approvalButtonHtml('Publish to ZinniaX.com', '🚀', approveToken, '#007bff')}
    ${approvalButtonHtml('Send Back for Revision', '🔁', rejectToken, '#fd7e14')}
  </div>

  <p style="font-size: 12px; color: #888;">This email was sent by the ZinniaX Blog Agent. Approval tokens expire when the server restarts.</p>
</body>
</html>`;

  await transporter.sendMail({
    from: `"ZinniaX Blog Agent" <${process.env.SMTP_USER}>`,
    to: [process.env.EMAIL_RONAK, process.env.EMAIL_YASH],
    subject: `[Publish Approval] ${draft.title}`,
    html,
  });

  console.log(`📧 Email: Publish approval request sent to Ronak & Yash for "${draft.title}"`);
}
