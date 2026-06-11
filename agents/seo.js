import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function seoAgent(research, draft) {
  console.log(`🔎 SEO Agent: Generating SEO metadata for "${draft.title}"`);

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `Act as an SEO specialist for ZinniaX healthcare blog targeting IONM/EEG professionals.

Given the blog title and keywords below, return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "seo_title": "string (60 characters max)",
  "meta_description": "string (155 characters max)",
  "focus_keyword": "string",
  "tags": ["string"],
  "category": "IONM Best Practices",
  "slug": "string (URL-friendly, hyphenated)",
  "internal_link_suggestions": ["string (suggested internal page paths or topics to link to)"]
}

Blog title: ${draft.title}
Keywords: ${research.keywords.join(', ')}
Topic: ${research.topic}
Target audience: ${research.target_audience}`,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  const seo = JSON.parse(jsonText);
  console.log(`✅ SEO Agent: Metadata ready — focus keyword: "${seo.focus_keyword}", slug: "${seo.slug}"`);
  return seo;
}
