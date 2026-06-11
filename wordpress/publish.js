import axios from 'axios';

function getAuthHeader() {
  const credentials = `${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`;
  return 'Basic ' + Buffer.from(credentials).toString('base64');
}

/**
 * Creates a WordPress draft post.
 * @returns {{ id: number, link: string }}
 */
export async function createDraftPost(draft, seo) {
  console.log(`📝 WordPress: Creating draft post — "${draft.title}"`);

  const response = await axios.post(
    `${process.env.WP_URL}/wp-json/wp/v2/posts`,
    {
      title: draft.title,
      content: draft.content_html,
      excerpt: draft.excerpt,
      status: 'draft',
      slug: seo.slug,
      meta: {
        _yoast_wpseo_title: seo.seo_title,
        _yoast_wpseo_metadesc: seo.meta_description,
        _yoast_wpseo_focuskw: seo.focus_keyword,
      },
      tags: seo.tags,
    },
    {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
    }
  );

  const { id, link } = response.data;
  console.log(`✅ WordPress: Draft created — ID: ${id}, URL: ${link}`);
  return { id, link };
}

/**
 * Publishes an existing WordPress draft post.
 */
export async function publishPost(postId) {
  console.log(`🚀 WordPress: Publishing post ID ${postId}...`);

  const response = await axios.patch(
    `${process.env.WP_URL}/wp-json/wp/v2/posts/${postId}`,
    { status: 'publish' },
    {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(`✅ WordPress: Post ${postId} is now live — ${response.data.link}`);
  return response.data;
}

/**
 * Adds a private comment to a post to track approval status.
 */
export async function updatePostStatus(postId, statusNote) {
  console.log(`📋 WordPress: Updating post ${postId} status → "${statusNote}"`);

  await axios.post(
    `${process.env.WP_URL}/wp-json/wp/v2/comments`,
    {
      post: postId,
      content: `[ZinniaX Blog Agent] Status update: ${statusNote} — ${new Date().toISOString()}`,
      status: 'approved',
      author_name: 'ZinniaX Blog Agent',
    },
    {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(`✅ WordPress: Status note added to post ${postId}`);
}
