/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** The project name from project.config.json, injected by vite.config.ts. */
declare const __APP_NAME__: string;

/** The project slug from project.config.json, injected by vite.config.ts. */
declare const __APP_SLUG__: string;

/** Where the catalogue is fetched from: content-hashed in production builds (vite.config.ts). */
declare const __CATALOG_URL__: string;

/** The repository URL from project.config.json, injected by vite.config.ts. */
declare const __REPO_URL__: string;
