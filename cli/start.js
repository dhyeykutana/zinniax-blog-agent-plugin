import 'dotenv/config';
import readline from 'readline';
import { trendsAgent } from '../agents/trends.js';
import { plannerAgent } from '../agents/planner.js';
import { researchAgent } from '../agents/research.js';
import { writerAgent } from '../agents/writer.js';
import { seoAgent } from '../agents/seo.js';
import { generateArtifact } from '../artifacts/generate.js';
import { createDraftPost } from '../wordpress/publish.js';
import { pendingApprovals, sendDhyeyReviewEmail, sendRonakYashApprovalEmail } from '../humans/email.js';
import { draftContext } from '../token-server/server.js';

// ── ANSI colors (no external deps) ──────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  red:     '\x1b[31m',
  gray:    '\x1b[90m',
  white:   '\x1b[97m',
  bgBlue:  '\x1b[44m',
};

const b  = (s) => `${C.bold}${s}${C.reset}`;
const cy = (s) => `${C.cyan}${s}${C.reset}`;
const gr = (s) => `${C.green}${s}${C.reset}`;
const yw = (s) => `${C.yellow}${s}${C.reset}`;
const gx = (s) => `${C.gray}${s}${C.reset}`;
const mg = (s) => `${C.magenta}${s}${C.reset}`;
const rd = (s) => `${C.red}${s}${C.reset}`;
const ln = '─'.repeat(60);

// ── Readline helpers ─────────────────────────────────────────────────────────
function ask(rl, prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Print content plan ───────────────────────────────────────────────────────
function printPlan(topic, trends, plan) {
  console.log(`\n${cy(ln)}`);
  console.log(`${b(cy('  📊  CONTENT PLAN'))}`);
  console.log(`${cy(ln)}\n`);

  console.log(`${b('  Topic:')} ${topic}\n`);

  console.log(b('  ✦ Recommended Headline'));
  console.log(`    ${gr(plan.recommended_headline)}\n`);

  console.log(b('  ✦ Alternative Headlines'));
  plan.alternative_headlines.forEach((h, i) => {
    console.log(`    ${gx(`${i + 1}.`)} ${h}`);
  });

  console.log(`\n${b('  ✦ Content Angle')}`);
  console.log(`    ${plan.content_angle}\n`);

  console.log(b('  ✦ Target Reader'));
  console.log(`    ${plan.target_reader}\n`);

  console.log(b('  ✦ Trending Questions This Post Will Answer'));
  trends.trending_questions.slice(0, 4).forEach((q, i) => {
    console.log(`    ${yw(`${i + 1}.`)} ${q}`);
  });

  console.log(`\n${b('  ✦ Content Gaps We Are Filling')}`);
  trends.content_gaps.forEach((g) => {
    console.log(`    ${mg('→')} ${g}`);
  });

  console.log(`\n${b('  ✦ Suggested Outline')}`);
  plan.outline.forEach((section, i) => {
    console.log(`    ${b(`H2 ${i + 1}:`)} ${cy(section.h2)}`);
    section.points.forEach((p) => console.log(`       ${gx('•')} ${p}`));
  });

  console.log(`\n${b('  ✦ Keywords')}`);
  console.log(`    ${b('Focus:')} ${gr(plan.focus_keyword)}`);
  console.log(`    ${b('Secondary:')} ${plan.secondary_keywords.join(', ')}`);

  console.log(`\n${b('  ✦ Content Ideas')}`);
  plan.content_ideas.forEach((ci, i) => {
    console.log(`    ${yw(`${i + 1}.`)} ${b(ci.idea)}`);
    console.log(`       ${gx(ci.why)}`);
  });

  console.log(`\n${b('  ✦ ZinniaX CTA Angle')}`);
  console.log(`    ${plan.zinniax_cta}`);

  console.log(`\n${b('  ✦ Expected Impact')}`);
  console.log(`    ${plan.estimated_impact}`);

  console.log(`\n${cy(ln)}\n`);
}

// ── Approval poller (same as orchestrator) ───────────────────────────────────
async function waitForAction(actionName, timeoutMs = 24 * 60 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const [, data] of pendingApprovals.entries()) {
      if (data.action === actionName) return true;
    }
    await sleep(5000);
  }
  throw new Error(`Timeout waiting for "${actionName}"`);
}

// ── Full pipeline (write → SEO → artifact → WP → emails) ────────────────────
async function runFullPipeline(topic, plan) {
  console.log(`\n${b(gr('🚀 Running full pipeline...\n'))}`);

  const research = await researchAgent(topic);
  // Enrich research with planner data
  research.key_points = [
    ...new Set([...research.key_points, ...plan.outline.map((s) => s.h2)])
  ];
  research.keywords = [
    ...new Set([plan.focus_keyword, ...plan.secondary_keywords, ...research.keywords])
  ];

  const draft = await writerAgent(research);
  const seo   = await seoAgent(research, draft);

  // Override with planner's preferred headline if user chose recommended
  if (plan._useRecommended) draft.title = plan.recommended_headline;

  console.log(`\n${gr('📄 Draft complete:')} "${draft.title}"`);

  const artifactPath = generateArtifact(draft, seo, research);
  console.log(`${gr('🎨 HTML artifact saved:')} ${artifactPath}`);

  const wpDraft = await createDraftPost(draft, seo);
  console.log(`${gr('💾 WP draft ID:')} ${wpDraft.id} — ${wpDraft.link}`);

  draftContext.set(wpDraft.id, { draft, seo });

  await sendDhyeyReviewEmail(draft, seo, wpDraft.id);
  console.log(`\n${yw('⏳ Waiting for Dhyey review...')}`);

  await waitForAction('dhyey_approved');
  console.log(`\n${gr('✅ Dhyey approved!')} Sending to Ronak & Yash...`);

  await sendRonakYashApprovalEmail(draft, seo, wpDraft.id);
  console.log(`\n${yw('⏳ Waiting for Ronak / Yash approval...')}`);

  await waitForAction('publish_approved');
  console.log(`\n${b(gr('🚀 Published to ZinniaX.com!'))} Post ID: ${wpDraft.id}`);
  console.log(`${gr('🔗 Live URL:')} ${wpDraft.link}`);
  console.log(`\n${b(gr('✅ Pipeline complete!\n'))}`);
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // Header
  console.clear();
  console.log(`\n${cy(b('  ╔══════════════════════════════════════════════╗'))}`);
  console.log(`${cy(b('  ║'))}  ${b('🧠  ZinniaX Blog Agent')}  ${gx('— Interactive Mode')}   ${cy(b('║'))}`);
  console.log(`${cy(b('  ╚══════════════════════════════════════════════╝'))}\n`);
  console.log(`  ${gx('Agents: Research · Trends · Planner · Writer · SEO · Artifact')}`);
  console.log(`  ${gx('Output: HTML artifact + WordPress draft + email approval\n')}`);
  console.log(`${cy(ln)}\n`);

  let topic = '';
  let trends = null;
  let plan   = null;

  // ── Step 1: Topic Input ──
  while (!topic.trim()) {
    topic = await ask(
      rl,
      `${b('Enter your blog topic')} ${gx('(or press Enter for a random IONM topic)')}:\n${cy('❯')} `
    );
    if (!topic.trim()) {
      const defaults = [
        'SSEP waveform interpretation for IONM techs',
        'IOM documentation best practices for billing compliance',
        'Free-run vs triggered EMG in spine surgery',
        'How to reduce alert fatigue in IONM monitoring',
        'ZinniaX workflow vs manual IONM reporting',
        'EEG artifact recognition during neurosurgery',
        'IONM team communication during critical changes',
        'Neuromonitoring credentialing requirements 2025',
        'MEP monitoring in scoliosis surgery',
        'IONM billing and reimbursement trends',
      ];
      topic = defaults[Math.floor(Math.random() * defaults.length)];
      console.log(`\n  ${gx('→ Random topic selected:')} ${yw(topic)}\n`);
    }
  }

  // ── Step 2: Trends ──
  console.log(`\n${gx(ln)}`);
  trends = await trendsAgent(topic);

  // ── Step 3: Content Plan ──
  plan = await plannerAgent(topic, trends);

  // ── Step 4: Display Plan ──
  printPlan(topic, trends, plan);

  // ── Step 5: User Choice ──
  let choice = '';
  while (!['1', '2', '3', 'q'].includes(choice.toLowerCase())) {
    console.log(`  ${b('What would you like to do?')}`);
    console.log(`    ${gr('[1]')} Proceed — write the full blog post`);
    console.log(`    ${yw('[2]')} Regenerate — get a different content plan`);
    console.log(`    ${cy('[3]')} Edit — change the topic`);
    console.log(`    ${rd('[Q]')} Quit\n`);
    choice = await ask(rl, `${cy('❯')} `);
  }

  switch (choice.toLowerCase()) {
    case '1': {
      plan._useRecommended = true;
      rl.close();
      await runFullPipeline(topic, plan);
      break;
    }
    case '2': {
      console.log(`\n${yw('🔄 Regenerating plan...')}\n`);
      plan = await plannerAgent(topic, trends);
      printPlan(topic, trends, plan);
      console.log(`${gx('Tip: Run /start again to interact with the new plan.')}\n`);
      rl.close();
      break;
    }
    case '3': {
      rl.close();
      console.log(`\n${gx('Restarting with a new topic...\n')}`);
      await main();
      break;
    }
    case 'q': {
      console.log(`\n${gx('Exiting ZinniaX Blog Agent. Goodbye!\n')}`);
      rl.close();
      process.exit(0);
    }
  }
}

main().catch((err) => {
  console.error(`\n${rd('❌ Error:')} ${err.message}`);
  process.exit(1);
});
