const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

exports.handler = async (event) => {

  // gérer la preflight request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    }; 
  }

  // Always return CORS headers even on error
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    // Verify environment variables exist
    if (!process.env.WP_USER || !process.env.WP_APP_PASSWORD) {
      console.error("Missing WordPress credentials in environment variables");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server configuration error" })
      };
    }

    const data = JSON.parse(event.body);

    const wpData = {
      title: data.title,
      content: data.description,
      status: "publish"
    };

    const auth = Buffer.from(
      process.env.WP_USER + ":" + process.env.WP_APP_PASSWORD
    ).toString("base64");

    console.log("Sending request to WordPress API...");

    const response = await fetch(
      "https://blog.gifttags.com/wp-json/wp/v2/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic " + auth
        },
        body: JSON.stringify(wpData),
        timeout: 10000
      }
    );

    if (!response.ok) {
      console.error("WordPress API error:", response.status, response.statusText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `WordPress API returned ${response.status}` })
      };
    }

    const result = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error("Function error:", error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};