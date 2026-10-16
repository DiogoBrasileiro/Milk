// The public GitHub Pages build uses Supabase Auth only when both public
// configuration variables are available. Without them, the existing
// browser-local edition remains active and does not contact a backend.
export const IS_GITHUB_PAGES = import.meta.env.MODE === 'pages';
export const HAS_SUPABASE_CONFIG = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)
);
export const IS_CLOUD_PAGES = IS_GITHUB_PAGES && HAS_SUPABASE_CONFIG;
export const IS_STATIC_PAGES = IS_GITHUB_PAGES && !HAS_SUPABASE_CONFIG;
