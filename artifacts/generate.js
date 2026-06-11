import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output');

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTagsHtml(tags = []) {
  return tags
    .map(
      (t) =>
        `<span class="tag">${escapeHtml(t)}</span>`
    )
    .join('\n      ');
}

function buildInternalLinks(links = []) {
  if (!links.length) return '';
  const items = links
    .map((l) => `<li><a href="https://zinniax.com${l.startsWith('/') ? l : '/' + l}" class="il-link">${escapeHtml(l)}</a></li>`)
    .join('\n            ');
  return `
    <aside class="internal-links">
      <h3>Related reading on zinniax.com</h3>
      <ul>${items}</ul>
    </aside>`;
}

export function generateArtifact(draft, seo, research = {}) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const publishDate = new Date().toISOString();
  const displayDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const canonicalUrl = `https://zinniax.com/blog/${seo.slug}`;
  const tagsHtml = buildTagsHtml(seo.tags);
  const internalLinksHtml = buildInternalLinks(seo.internal_link_suggestions);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Primary SEO -->
  <title>${escapeHtml(seo.seo_title)}</title>
  <meta name="description" content="${escapeHtml(seo.meta_description)}">
  <meta name="keywords" content="${escapeHtml([seo.focus_keyword, ...(seo.tags || [])].join(', '))}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="index, follow">
  <meta name="author" content="ZinniaX Editorial Team">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(seo.seo_title)}">
  <meta property="og:description" content="${escapeHtml(seo.meta_description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="ZinniaX">
  <meta property="article:published_time" content="${publishDate}">
  <meta property="article:section" content="${escapeHtml(seo.category)}">
  ${(seo.tags || []).map((t) => `<meta property="article:tag" content="${escapeHtml(t)}">`).join('\n  ')}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(seo.seo_title)}">
  <meta name="twitter:description" content="${escapeHtml(seo.meta_description)}">
  <meta name="twitter:site" content="@zinniax">

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": ${JSON.stringify(draft.title)},
    "description": ${JSON.stringify(seo.meta_description)},
    "url": "${canonicalUrl}",
    "datePublished": "${publishDate}",
    "publisher": {
      "@type": "Organization",
      "name": "ZinniaX",
      "url": "https://zinniax.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://zinniax.com/logo.png"
      }
    },
    "keywords": ${JSON.stringify([seo.focus_keyword, ...(seo.tags || [])].join(', '))}
  }
  </script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --color-primary: #0f4c81;
      --color-primary-light: #e8f1fa;
      --color-accent: #1d9e75;
      --color-accent-light: #e1f5ee;
      --color-text: #1a1a2e;
      --color-muted: #4a5568;
      --color-border: #e2e8f0;
      --color-bg: #ffffff;
      --color-surface: #f8fafc;
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --radius: 8px;
      --radius-lg: 12px;
      --max-width: 780px;
    }

    body {
      font-family: var(--font-sans);
      background: var(--color-surface);
      color: var(--color-text);
      line-height: 1.7;
      font-size: 16px;
    }

    /* ── Header ── */
    .site-header {
      background: var(--color-primary);
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .site-header .logo {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      text-decoration: none;
      letter-spacing: -0.02em;
    }
    .site-header .logo span { color: #5dcaa5; }
    .site-header nav a {
      color: rgba(255,255,255,0.8);
      text-decoration: none;
      font-size: 14px;
      margin-left: 1.25rem;
    }
    .site-header nav a:hover { color: #fff; }

    /* ── Layout ── */
    .page-wrap {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 2rem 1.25rem 4rem;
    }

    /* ── SEO metadata bar ── */
    .seo-bar {
      background: var(--color-primary-light);
      border: 1px solid #c3d9f0;
      border-radius: var(--radius);
      padding: 0.75rem 1rem;
      margin-bottom: 1.5rem;
      font-size: 12px;
      color: var(--color-primary);
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.5rem;
    }
    .seo-bar strong { font-weight: 600; }
    .seo-bar .seo-item { display: flex; flex-direction: column; gap: 1px; }
    .seo-bar .seo-label { text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; opacity: 0.7; }

    /* ── Hero ── */
    .post-hero {
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 2rem 2rem 1.5rem;
      margin-bottom: 1.5rem;
    }
    .category-badge {
      display: inline-block;
      background: var(--color-accent-light);
      color: #0f6e56;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 99px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 0.875rem;
    }
    .post-hero h1 {
      font-size: 30px;
      font-weight: 700;
      line-height: 1.25;
      color: var(--color-text);
      margin-bottom: 0.875rem;
      letter-spacing: -0.02em;
    }
    .post-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
      font-size: 13px;
      color: var(--color-muted);
      margin-bottom: 1rem;
    }
    .post-meta span { display: flex; align-items: center; gap: 4px; }
    .post-excerpt {
      font-size: 15px;
      line-height: 1.7;
      color: var(--color-muted);
      border-left: 3px solid var(--color-accent);
      padding-left: 1rem;
    }

    /* ── Body content ── */
    .post-body {
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 2rem;
      margin-bottom: 1.5rem;
    }
    .post-body h2 {
      font-size: 20px;
      font-weight: 700;
      color: var(--color-primary);
      margin: 2rem 0 0.75rem;
      padding-top: 2rem;
      border-top: 1px solid var(--color-border);
    }
    .post-body h2:first-child { margin-top: 0; padding-top: 0; border-top: none; }
    .post-body h3 { font-size: 17px; font-weight: 600; margin: 1.25rem 0 0.5rem; }
    .post-body p { margin-bottom: 1rem; color: var(--color-text); }
    .post-body ul, .post-body ol { padding-left: 1.4rem; margin-bottom: 1rem; }
    .post-body li { margin-bottom: 0.35rem; }
    .post-body strong { font-weight: 600; }
    .post-body a { color: var(--color-primary); }

    /* ── CTA ── */
    .cta-block {
      background: var(--color-primary);
      border-radius: var(--radius-lg);
      padding: 1.75rem 2rem;
      text-align: center;
      margin: 2rem 0 0;
    }
    .cta-block p { color: rgba(255,255,255,0.85); font-size: 15px; margin-bottom: 1rem; }
    .cta-block a {
      display: inline-block;
      background: var(--color-accent);
      color: #fff;
      font-weight: 600;
      font-size: 15px;
      padding: 0.7rem 1.75rem;
      border-radius: 6px;
      text-decoration: none;
    }
    .cta-block a:hover { background: #1d8a67; }

    /* ── Tags ── */
    .tag-section { margin-bottom: 1.5rem; }
    .tag-section h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); margin-bottom: 0.6rem; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag {
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 99px;
      border: 1px solid var(--color-border);
      color: var(--color-muted);
      background: var(--color-bg);
    }

    /* ── Internal links ── */
    .internal-links {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
    }
    .internal-links h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); margin-bottom: 0.6rem; }
    .internal-links ul { padding-left: 1.25rem; }
    .internal-links li { font-size: 14px; margin-bottom: 0.25rem; }
    .il-link { color: var(--color-primary); text-decoration: none; }
    .il-link:hover { text-decoration: underline; }

    /* ── Footer ── */
    .site-footer {
      background: var(--color-text);
      color: rgba(255,255,255,0.6);
      text-align: center;
      padding: 1.5rem;
      font-size: 13px;
      margin-top: 3rem;
    }
    .site-footer a { color: var(--color-accent); text-decoration: none; }

    @media (max-width: 600px) {
      .post-hero h1 { font-size: 22px; }
      .post-hero, .post-body { padding: 1.25rem; }
      .seo-bar { flex-direction: column; }
    }
  </style>
</head>
<body>

  <header class="site-header">
    <a href="https://zinniax.com" class="logo">Zinnia<span>X</span></a>
    <nav>
      <a href="https://zinniax.com/blog">Blog</a>
      <a href="https://zinniax.com/features">Features</a>
      <a href="https://zinniax.com/contact">Contact</a>
    </nav>
  </header>

  <main class="page-wrap">

    <!-- SEO Metadata Display Bar -->
    <div class="seo-bar" aria-label="SEO metadata">
      <div class="seo-item">
        <span class="seo-label">SEO Title</span>
        <strong>${escapeHtml(seo.seo_title)}</strong>
      </div>
      <div class="seo-item">
        <span class="seo-label">Focus Keyword</span>
        <strong>${escapeHtml(seo.focus_keyword)}</strong>
      </div>
      <div class="seo-item">
        <span class="seo-label">Slug</span>
        <strong>/blog/${escapeHtml(seo.slug)}</strong>
      </div>
      <div class="seo-item">
        <span class="seo-label">Category</span>
        <strong>${escapeHtml(seo.category)}</strong>
      </div>
      <div class="seo-item">
        <span class="seo-label">Read time</span>
        <strong>${escapeHtml(draft.estimated_read_time)}</strong>
      </div>
    </div>

    <!-- Meta Description Preview -->
    <div class="seo-bar" style="background:#f0fdf4;border-color:#a7f3d0;color:#065f46;margin-bottom:1.5rem">
      <div class="seo-item" style="width:100%">
        <span class="seo-label" style="color:#059669">Meta Description (${seo.meta_description?.length || 0} chars)</span>
        <strong>${escapeHtml(seo.meta_description)}</strong>
      </div>
    </div>

    <!-- Hero -->
    <article>
      <div class="post-hero">
        <span class="category-badge">${escapeHtml(seo.category)}</span>
        <h1>${escapeHtml(draft.title)}</h1>
        <div class="post-meta">
          <span>&#128197; ${displayDate}</span>
          <span>&#9201; ${escapeHtml(draft.estimated_read_time)}</span>
          <span>&#127981; IONM / Neuromonitoring</span>
        </div>
        <p class="post-excerpt">${escapeHtml(draft.excerpt)}</p>
      </div>

      <!-- Tags -->
      <div class="tag-section">
        <h3>Tags</h3>
        <div class="tags">
          ${tagsHtml}
        </div>
      </div>

      ${internalLinksHtml}

      <!-- Body -->
      <div class="post-body">
        ${draft.content_html}

        <div class="cta-block">
          <p>ZinniaX is built for IONM teams — streamline documentation, approvals, and reporting in one place.</p>
          <a href="https://zinniax.com" target="_blank" rel="noopener">Explore ZinniaX &rarr;</a>
        </div>
      </div>
    </article>

  </main>

  <footer class="site-footer">
    <p>&#169; ${new Date().getFullYear()} ZinniaX &mdash; Clinical Workflow Management for IONM &amp; EEG &mdash; <a href="https://zinniax.com">zinniax.com</a></p>
  </footer>

</body>
</html>`;

  const filename = `${seo.slug}.html`;
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, html, 'utf8');

  console.log(`🎨 Artifact Generator: Saved → artifacts/output/${filename}`);
  return filePath;
}
