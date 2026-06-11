import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function plannerAgent(topic, trends) {
  console.log(`\n📋 Content Planner: Building content plan for "${topic}"...`);

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `You are a content strategist for ZinniaX, a clinical workflow management platform for IONM/EEG providers.

Using the topic and trend research below, build a detailed content plan for a blog post.

Return ONLY valid JSON (no markdown, no code fences):
{
  "recommended_headline": "string (the single best headline, 60-70 chars, punchy and clinical)",
  "alternative_headlines": ["string (3 alternative headline options)"],
  "content_angle": "string (2-3 sentences: the specific angle and why it resonates with IONM techs/neurophysiologists)",
  "target_reader": "string (specific persona: e.g. 'IONM tech with 1-3 years experience working at an independent IONM company')",
  "outline": [
    { "h2": "string", "points": ["string (2-3 sub-points to cover)"] }
  ],
  "focus_keyword": "string",
  "secondary_keywords": ["string (4-5 LSI keywords)"],
  "content_ideas": [
    { "idea": "string (specific content idea / angle)", "why": "string (why this works for ZinniaX audience)" }
  ],
  "zinniax_cta": "string (specific CTA tied to the topic — what ZinniaX feature helps with this)",
  "estimated_impact": "string (one sentence on expected audience value)"
}

Topic: ${topic}

Trend Research:
${JSON.stringify(trends, null, 2)}`,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const plan = JSON.parse(jsonText);

  console.log(`  ✓ Headline options generated`);
  console.log(`  ✓ ${plan.outline.length}-section outline built`);
  console.log(`  ✓ ${plan.content_ideas.length} content ideas ready`);

  return plan;
}
