
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
  try {
   let splat = event.queryStringParameters?.splat; 
if (!splat) {
  return { statusCode: 404, body: 'Not found' };
}

// Remove any trailing /index.htm or /index.html
splat = splat.replace(/\/index\.html?$/i, '');

const parts = splat.split('/');

    let slug;
    let id;
    if (parts.length === 1) {
  // Only a category
  const category = parts[0];
  return {
    statusCode: 301,
    headers: { Location: `https://gifttags.com/${category}` },
    body: ''
  };
} else
    if (parts.length === 2) {
      // Format /tags/:slug/:id
      [slug, id] = parts;
    } else if (parts.length === 3) {
      // Format /tags/:category/:slug/:id
      // Optional: handle if some URLs already have category
      [, slug, id] = parts; // ignore first part, or adjust depending on your structure
    } else {
      return { statusCode: 404, body: 'Invalid URL format' };
    }

    // Fetch category from Supabase using ID
    const { data, error } = await supabase
      .from('art_docs')
      .select('categorie')
      .eq('firestore_id', id)
      .single();

    if (error || !data?.categorie) {
      return { statusCode: 404, body: 'Artwork not found' };
    }

    const category = data.categorie.toLowerCase();

    // Build the new URL
    const newUrl = `https://gifttags.com/${category}/${slug}/${id}`;
    // Return 301 redirect
    return {
      statusCode: 301,
      headers: { Location: newUrl },
      body: ''
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
