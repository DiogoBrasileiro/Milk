// GitHub Pages is static: it cannot provide authenticated server-side APIs.
export const IS_STATIC_PAGES = import.meta.env.MODE === 'pages';
