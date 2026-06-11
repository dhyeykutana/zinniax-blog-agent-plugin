import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function trendsAgent(topic) {
  console.log(`\n🔍 Trends Agent: Scanning trending angles for "${topic}"...`);

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: `You are a content trends researcher specializing in IONM (intraoperative neurophysiological monitoring), neuromonitoring, EEG, and clinical workflow management.

Given the blog topic below, research and identify:
1. The most commonly asked questions around this topic in the IONM/neuromonitoring community
2. Content gaps — things people are searching for but rarely find good answers to
3. Trending subtopics or recent developments related to this area
4. The angles competitors and industry publications typically take on this topic

Return ONLY valid JSON (no markdown, no code fences):
{
  "trending_questions": ["string (5 questions)"],
  "content_gaps": ["string (3 gaps that ZinniaX content could fill)"],
  "trending_subtopics": ["string (4 hot subtopics)"],
  "competitor_angles": ["string (3 common angles others take)"],
  "unique_zinniax_angle": "string (how ZinniaX workflow platform specifically helps with this topic)",
  "audience_pain_level": "high|medium|low",
  "content_opportunity": "string (one sentence: why now is a good time to write about this)"
}

Topic: ${topic}`,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const trends = JSON.parse(jsonText);

  console.log(`  ✓ Found ${trends.trending_questions.length} trending questions`);
  console.log(`  ✓ Identified ${trends.content_gaps.length} content gaps`);
  console.log(`  ✓ Spotted ${trends.trending_subtopics.length} hot subtopics`);

  return trends;
}
