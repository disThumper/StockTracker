import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle OPTIONS preflight request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Check if API key is configured
  if (!POLYGON_API_KEY) {
    console.error("POLYGON_API_KEY not configured");
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "API key not configured" }),
    };
  }

  try {
    // Get the endpoint path from query parameters
    const { endpoint } = event.queryStringParameters || {};

    if (!endpoint) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing endpoint parameter" }),
      };
    }

    // Validate endpoint to prevent SSRF attacks
    // Must be a relative path starting with /
    if (endpoint.includes('://') || endpoint.startsWith('http') || endpoint.startsWith('//')) {
      console.error("Invalid endpoint - possible SSRF attempt:", endpoint);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid endpoint parameter" }),
      };
    }

    // Ensure endpoint starts with /
    const safePath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Construct the full Polygon.io API URL
    const url = new URL(safePath, "https://api.polygon.io");

    // Add the API key
    url.searchParams.set("apiKey", POLYGON_API_KEY);

    // Make the request to Polygon.io
    const response = await fetch(url.toString());
    const data = await response.json();

    // Return the response
    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60", // Cache for 1 minute
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error proxying to Polygon API:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Service temporarily unavailable",
        // Don't expose internal error details to client
      }),
    };
  }
};

export { handler };
