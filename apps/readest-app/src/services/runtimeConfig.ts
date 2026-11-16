export interface ReadestRuntimeConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiBaseUrl?: string;
  objectStorageType?: string;
  storageFixedQuota?: number;
  translationFixedQuota?: number;
  fontBaseUrl?: string;
  selfHosted?: boolean;
  // Optional extra OAuth/OIDC provider on the sign-in page, for deployments
  // that enable one in gotrue (e.g. Keycloak). Empty hides the button.
  ssoProvider?: string;
  ssoLabel?: string;
}

declare global {
  interface Window {
    __READEST_RUNTIME_CONFIG?: ReadestRuntimeConfig;
  }
}

export const getRuntimeConfig = () =>
  typeof window === 'undefined' ? undefined : window.__READEST_RUNTIME_CONFIG;

export const getServerRuntimeConfig = (): ReadestRuntimeConfig => ({
  // Browser runtime config should prefer a public Supabase URL when provided.
  // SUPABASE_URL remains as a backward-compatible fallback for non-split setups.
  supabaseUrl:
    process.env['SUPABASE_PUBLIC_URL'] ??
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ??
    process.env['SUPABASE_URL'],
  supabaseAnonKey: process.env['SUPABASE_ANON_KEY'] ?? process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  apiBaseUrl:
    process.env['API_BASE_URL'] ??
    process.env['NEXT_PUBLIC_API_BASE_URL'] ??
    process.env['SITE_URL'],
  // These were previously baked as NEXT_PUBLIC_* build args; now read from runtime env so
  // the published image can be configured without rebuilding.
  objectStorageType:
    process.env['OBJECT_STORAGE_TYPE'] ?? process.env['NEXT_PUBLIC_OBJECT_STORAGE_TYPE'],
  // A self-hosted deployment unlocks every premium feature: there is no store
  // to buy from, and the operator already runs the infrastructure the paywall
  // funds.
  selfHosted:
    (process.env['SELF_HOSTED'] || process.env['NEXT_PUBLIC_SELF_HOSTED']) === 'true' || undefined,
  storageFixedQuota: (() => {
    const raw =
      process.env['STORAGE_FIXED_QUOTA'] ?? process.env['NEXT_PUBLIC_STORAGE_FIXED_QUOTA'];
    return raw ? parseInt(raw, 10) : undefined;
  })(),
  translationFixedQuota: (() => {
    const raw =
      process.env['TRANSLATION_FIXED_QUOTA'] ?? process.env['NEXT_PUBLIC_TRANSLATION_FIXED_QUOTA'];
    return raw ? parseInt(raw, 10) : undefined;
  })(),
  // Base URL of the directory holding the self-hosted CJK webfont bundles.
  // Readest's own CDN only answers CORS for readest.com origins, so a
  // self-hosted deployment on a custom domain has to serve them itself (#5550).
  // `||` not `??`: compose passes the variable through even when it is unset,
  // and an empty string would build root-relative font URLs.
  fontBaseUrl:
    process.env['FONT_BASE_URL'] || process.env['NEXT_PUBLIC_FONT_BASE_URL'] || undefined,
  // `||` not `??` for the same reason as fontBaseUrl: compose passes these
  // through even when unset, and an empty provider must mean "hidden".
  ssoProvider: process.env['SSO_PROVIDER'] || process.env['NEXT_PUBLIC_SSO_PROVIDER'] || undefined,
  ssoLabel: process.env['SSO_LABEL'] || process.env['NEXT_PUBLIC_SSO_LABEL'] || undefined,
});

export interface SsoProviderConfig {
  provider: string;
  label: string;
}

const DEFAULT_SSO_LABELS: Record<string, string> = {
  keycloak: 'Keycloak',
};

/**
 * Resolves the optional extra OAuth/OIDC provider button (self-hosted SSO).
 * Web/Docker builds get it from the runtime config injected by
 * `/runtime-config.js`; Tauri builds have no runtime config and fall back to
 * the `NEXT_PUBLIC_*` envs baked at build time.
 */
export const getSsoProviderConfig = (): SsoProviderConfig | undefined => {
  const runtimeConfig = getRuntimeConfig();
  const provider = runtimeConfig?.ssoProvider || process.env['NEXT_PUBLIC_SSO_PROVIDER'];
  if (!provider) return undefined;

  const label =
    runtimeConfig?.ssoLabel ||
    process.env['NEXT_PUBLIC_SSO_LABEL'] ||
    DEFAULT_SSO_LABELS[provider] ||
    'SSO';

  return { provider, label };
};
