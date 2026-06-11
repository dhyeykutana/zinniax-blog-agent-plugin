import 'dotenv/config';
import { researchAgent } from './agents/research.js';
import { writerAgent } from './agents/writer.js';
import { seoAgent } from './agents/seo.js';
import { generateArtifact } from './artifacts/generate.js';
import { createDraftPost } from './wordpress/publish.js';
import { pendingApprovals, sendDhyeyReviewEmail, sendRonakYashApprovalEmail } from './humans/email.js';
import { draftContext } from './token-server/server.js';

const topicOverride = process.argv[2] || null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAction(actionName, timeoutMs = 24 * 60 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const [token, data] of pendingApprovals.entries()) {
      if (data.action === actionName) return token;
    }
    await sleep(5000);
  }
  throw new Error(`Timeout: No "${actionName}" action received within ${timeoutMs / 1000}s`);
}

async function main() {
  console.log('\n🧠 ZinniaX Blog Agent Pipeline — Starting\n');

  // Step 1: Research
  const research = await researchAgent(topicOverride);

  // Step 2: Write
  const draft = await writerAgent(research);

  // Step 3: SEO
  const seo = await seoAgent(research, draft);

  console.log(`\n📄 Draft complete: "${draft.title}"`);

  // Step 4: Generate HTML/CSS artifact (full SEO-embedded standalone file)
  const artifactPath = generateArtifact(draft, seo, research);
  console.log(`🎨 HTML artifact saved: ${artifactPath}`);

  // Step 5: Save as WordPress draft
  const wpDraft = await createDraftPost(draft, seo);
  console.log(`💾 Saved as WP draft ID: ${wpDraft.id} — ${wpDraft.link}`);

  // Store context for token server
  draftContext.set(wpDraft.id, { draft, seo });

  // Step 6: Send Dhyey review email
  await sendDhyeyReviewEmail(draft, seo, wpDraft.id);
  console.log('\n⏳ Waiting for Dhyey review... (checking every 5s)');

  // Step 7: Poll for Dhyey approval
  await waitForAction('dhyey_approved');
  console.log('\n✅ Dhyey approved! Sending to Ronak & Yash...');

  // Step 8: Send Ronak + Yash approval email
  await sendRonakYashApprovalEmail(draft, seo, wpDraft.id);
  console.log('\n⏳ Waiting for Ronak/Yash approval... (checking every 5s)');

  // Step 9: Poll for publish approval
  await waitForAction('publish_approved');
  console.log(`\n🚀 Published to ZinniaX.com! Post ID: ${wpDraft.id}`);
  console.log(`🔗 Live URL: ${wpDraft.link}`);
  console.log('\n✅ Pipeline Complete\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Pipeline Error:', err.message);
  process.exit(1);
});
