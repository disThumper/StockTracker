/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // VITE_POLYGON_API_KEY removed - API calls now proxied through Netlify Function
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
