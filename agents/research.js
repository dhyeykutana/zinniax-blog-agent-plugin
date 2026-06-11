import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOPICS = [
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

export async function researchAgent(topicOverride = null) {
  const topic = topicOverride || TOPICS[Math.floor(Math.random() * TOPICS.length)];

  console.log(`🔍 Research Agent: Starting research on "${topic}"`);

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Act as a research agent for ZinniaX healthcare blog.
ZinniaX is a clinical workflow management platform for IONM/EEG providers.

Given the following topic, return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "topic": "string",
  "key_points": ["string"],
  "target_audience": "string",
  "pain_points": ["string"],
  "zinniax_angle": "string",
  "keywords": ["string"]
}

Topic: ${topic}`,
      },
    ],
  });

  const raw = message.content[0].text.trim();

  // Strip markdown code fences if present
  const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  const research = JSON.parse(jsonText);
  console.log(`✅ Research Agent: Research complete for "${research.topic}"`);
  return research;
}
