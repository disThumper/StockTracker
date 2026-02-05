const POLYGON_API_KEY = import.meta.env.VITE_POLYGON_API_KEY

if (!POLYGON_API_KEY) {
  throw new Error('Missing Polygon API key')
}

export { POLYGON_API_KEY }
