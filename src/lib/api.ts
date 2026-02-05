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

/**
 * Fetch data from CoinGecko API through our secure Netlify function
 * @param endpoint - The CoinGecko API endpoint (e.g., "/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
 * @returns Promise with the API response data
 */
export async function fetchFromCoinGecko(endpoint: string): Promise<any> {
  try {
    const response = await fetch(`/.netlify/functions/coingecko-proxy?endpoint=${encodeURIComponent(endpoint)}`);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching from CoinGecko API:', error);
    throw error;
  }
}
