import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Check if API key is configured
  if (!POLYGON_API_KEY) {
    console.error("POLYGON_API_KEY not configured");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not configured" }),
    };
  }

  try {
    // Get the endpoint path from query parameters
    const { endpoint } = event.queryStringParameters || {};

    if (!endpoint) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing endpoint parameter" }),
      };
    }

    // Construct the full Polygon.io API URL
    const url = new URL(endpoint, "https://api.polygon.io");

    // Add the API key
    url.searchParams.set("apiKey", POLYGON_API_KEY);

    // Make the request to Polygon.io
    const response = await fetch(url.toString());
    const data = await response.json();

    // Return the response
    return {
      statusCode: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60", // Cache for 1 minute
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error proxying to Polygon API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to fetch data from Polygon API",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
    };
  }
};

export { handler };
