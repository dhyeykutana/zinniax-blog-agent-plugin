import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function writerAgent(research) {
  console.log(`✍️  Writer Agent: Writing blog post for "${research.topic}"`);

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `Act as an expert IONM healthcare content writer for ZinniaX, a clinical workflow management platform for IONM/EEG providers.

Write an 800-1000 word blog post in HTML based on the research below.

Audience: IONM techs, neurophysiologists, IONM company managers.
Tone: Clinical, authoritative, practical.
Structure:
  - Introduction paragraph
  - Three H2 sections with body paragraphs
  - Conclusion with a soft CTA linking to zinniax.com

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "title": "string",
  "excerpt": "string (2-3 sentence summary)",
  "content_html": "string (full HTML blog post)",
  "estimated_read_time": "string (e.g. '5 min read')"
}

Research data:
${JSON.stringify(research, null, 2)}`,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  const draft = JSON.parse(jsonText);
  console.log(`✅ Writer Agent: Draft complete — "${draft.title}" (${draft.estimated_read_time})`);
  return draft;
}
