// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { SystemSettings } from '@/types/settings';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Self-hosted deployments can enable an extra gotrue provider (Keycloak and
 * friends). The button only exists when the runtime config names one, so the
 * hosted build keeps its four fixed providers.
 */

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({
    envConfig: {
      getAppService: async () => ({
        saveSettings: vi.fn(),
        loadSettings: async () => useSettingsStore.getState().settings,
      }),
    },
    appService: null,
  }),
}));

vi.mock('@/hooks/useTranslation', () => ({
  // Interpolate so the provider buttons are distinguishable by name.
  useTranslation: () => (key: string, opts?: Record<string, string>) =>
    opts ? key.replace(/\{\{(\w+)\}\}/g, (_m, name) => opts[name] ?? _m) : key,
}));

vi.mock('@/utils/settingsSync', () => ({
  broadcastGlobalSettings: vi.fn(),
}));

import AuthPanel from '@/app/auth/components/AuthPanel';

const freshInstall = {
  version: 1,
  webdav: { enabled: false },
  googleDrive: { enabled: false },
} as unknown as SystemSettings;

beforeEach(() => {
  vi.clearAllMocks();
  useSettingsStore.setState({ settings: freshInstall } as never);
});

afterEach(() => {
  cleanup();
  delete window.__READEST_RUNTIME_CONFIG;
});

const renderPanel = (onProviderSignIn = vi.fn(async () => {})) =>
  render(
    <AuthPanel supabaseClient={{} as never} onProviderSignIn={onProviderSignIn} magicLink={true} />,
  );

describe('AuthPanel custom SSO provider', () => {
  test('shows no extra provider when the runtime config does not set one', () => {
    renderPanel();

    expect(screen.getAllByRole('button', { name: /Sign in with/ })).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /Keycloak/ })).toBeNull();
  });

  test('shows and signs in with the configured provider', async () => {
    window.__READEST_RUNTIME_CONFIG = { ssoProvider: 'keycloak' };
    const onProviderSignIn = vi.fn(async () => {});
    renderPanel(onProviderSignIn);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Keycloak' }));

    await waitFor(() => expect(onProviderSignIn).toHaveBeenCalledWith('keycloak'));
  });

  test('uses the configured label and passes provider ids through verbatim', async () => {
    window.__READEST_RUNTIME_CONFIG = {
      ssoProvider: 'custom:corp-sso',
      ssoLabel: 'Corp SSO',
    };
    const onProviderSignIn = vi.fn(async () => {});
    renderPanel(onProviderSignIn);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Corp SSO' }));

    await waitFor(() => expect(onProviderSignIn).toHaveBeenCalledWith('custom:corp-sso'));
  });
});
