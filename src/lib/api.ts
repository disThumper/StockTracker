// Polygon.io API proxy through Netlify Function
// This keeps the API key secure on the server side

/**
 * Fetch data from Polygon.io API through our secure Netlify function
 * @param endpoint - The Polygon.io API endpoint (e.g., "/v2/snapshot/locale/us/markets/stocks/tickers")
 * @returns Promise with the API response data
 */
export async function fetchFromPolygon(endpoint: string): Promise<any> {
  try {
    const response = await fetch(`/.netlify/functions/polygon-proxy?endpoint=${encodeURIComponent(endpoint)}`);

    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching from Polygon API:', error);
    throw error;
  }
}

// Legacy export for backward compatibility during migration
// TODO: Remove this once all code is updated to use fetchFromPolygon
const POLYGON_API_KEY = import.meta.env.VITE_POLYGON_API_KEY || '';

export { POLYGON_API_KEY };
