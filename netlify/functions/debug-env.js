/**
 * GET /.netlify/functions/debug-env
 * Returns non-sensitive Netlify environment context variables.
 * DELETE THIS FILE before going fully to production.
 */
exports.handler = async function (event) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Netlify automatic vars
      CONTEXT:          process.env.CONTEXT,           // "production" | "branch-deploy" | "deploy-preview"
      BRANCH:           process.env.BRANCH,             // e.g. "feature/live-test"
      URL:              process.env.URL,                // main site URL
      DEPLOY_URL:       process.env.DEPLOY_URL,         // deploy-specific URL
      DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,   // branch-specific URL

      // Our custom vars
      SITE_URL:               process.env.SITE_URL,
      NEXT_PUBLIC_SITE_URL:   process.env.NEXT_PUBLIC_SITE_URL,

      // Request headers (to verify host)
      host:              event.headers['host'],
      'x-forwarded-host': event.headers['x-forwarded-host'],
    }, null, 2),
  };
};
