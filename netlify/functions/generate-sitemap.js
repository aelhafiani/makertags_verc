const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

const BASE_URL = 'https://gifttags.com';

exports.handler = async function () {
  const categoryMap = {};
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/xml',
  };

  try {
    // Fetch only published items from Supabase
    const { data: arts, error } = await supabase
      .from('art_docs')
      .select('id, firestore_id, title, updated_at, categorie, status')
      .eq('status', 'published');

    if (error) throw error;

    const slugify = (title) => {
      return title
        .replace(/\u2013/g, '-') // EN dash → hyphen
        .replace(/&/g, 'and') // & → "and"
        .replace(/[^\w\s-]/g, '') // Remove non-word/space/dash chars
        .replace(/\s+/g, '-') // Spaces → dashes
        .replace(/-+/g, '-') // Collapse multiple dashes
        .toLowerCase()
        .trim();
    };

    const formatDate = (dateString) => {
      const d = new Date(dateString);
      return d.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    const dynamicUrls = (arts || []).map((item) => {
      const slug = slugify(item?.title || 'untitled');
      const id = item.firestore_id ? item.firestore_id : item.id;
      const category = item.categorie ? item.categorie.toLowerCase() : 'other';
      const lastmod = item.updated_at ? formatDate(item.updated_at) : formatDate(new Date());

      return {
        loc: `${BASE_URL}/${category}/${slug}/${id}`,
        lastmod,
      };
    });

    const staticUrls = [
      { loc: `${BASE_URL}/`, lastmod: '2024-12-16' },
      { loc: `${BASE_URL}/about`, lastmod: '2024-12-16' },
      { loc: `${BASE_URL}/contact`, lastmod: '2024-12-16' },
      { loc: `${BASE_URL}/questions`, lastmod: '2025-02-10' },
    ];

 
     
      const { data: cats, errors }  = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

(arts || []).forEach((item) => {
  const cat = item.categorie ? item.categorie.toLowerCase() : 'other';
  const updatedAt = new Date(item.updated_at);
  if (!categoryMap[cat] || updatedAt > new Date(categoryMap[cat])) {
    categoryMap[cat] = updatedAt;
  }
});

// Ensuite, au moment de générer les URLs de catégories :
const categoryUrls = cats.map((category) => {
  const cat = category.value.toLowerCase();
  const lastmod = categoryMap[cat]
    ? formatDate(categoryMap[cat])
    : formatDate(new Date('2024-12-16')); // valeur par défaut si vide

  return {
    loc: `${BASE_URL}/${category.value}`,
    lastmod,
  };
});

    const allUrls = [...staticUrls, ...dynamicUrls, ...categoryUrls];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
      .map(
        (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
  </url>`
      )
      .join('\n')}
</urlset>`;

    return {
      statusCode: 200,
      headers,
      body: sitemap,
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return {
      statusCode: 500,
      headers,
      body: `<error>Unable to generate sitemap</error>`,
    };
  }
};
