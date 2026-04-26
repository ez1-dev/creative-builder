import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import packageJson from '../../../package.json';

// --- Mock supabase client ---
const maybeSingleMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
    }),
  },
}));

import { formatVersionLabel, UpdateNotifier } from '../UpdateNotifier';

const CURRENT = packageJson.version;

describe('formatVersionLabel', () => {
  it('formats a real version without suffix', () => {
    expect(formatVersionLabel('1.0.3', '1.0.3', false)).toBe('v1.0.3');
  });

  it('appends "(novo build)" when bundleOnlyUpdate is true', () => {
    expect(formatVersionLabel('1.0.3', '1.0.3', true)).toBe('v1.0.3 (novo build)');
  });

  it('falls back to current version when latestVersion is null', () => {
    expect(formatVersionLabel(null, '1.0.3', true)).toBe('v1.0.3 (novo build)');
    expect(formatVersionLabel(null, '1.0.3', false)).toBe('v1.0.3');
  });

  it('regression: never displays the literal "novo build" as a version', () => {
    const label = formatVersionLabel('novo build', '1.0.3', true);
    expect(label).toBe('v1.0.3 (novo build)');
    expect(label).not.toMatch(/vnovo build/);
  });

  it('falls back when latestVersion is empty string', () => {
    expect(formatVersionLabel('', '1.0.3', false)).toBe('v1.0.3');
  });

  it('falls back when latestVersion is not semver-like', () => {
    expect(formatVersionLabel('abc', '1.0.3', false)).toBe('v1.0.3');
  });
});

// --- Component integration tests ---

function mockIndexHtml(bundle: string) {
  return {
    ok: true,
    text: async () => `<html><body><script src="${bundle}"></script></body></html>`,
  } as unknown as Response;
}

describe('UpdateNotifier component', () => {
  beforeEach(() => {
    localStorage.clear();
    maybeSingleMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows "v{remote}" without "(novo build)" when app_version differs', async () => {
    const remote = CURRENT === '9.9.9' ? '9.9.10' : '9.9.9';
    maybeSingleMock.mockResolvedValue({ data: { value: remote }, error: null });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(mockIndexHtml('/assets/index-AAA.js'))),
    );

    render(<UpdateNotifier />);
    await flush();

    await waitFor(() => {
      expect(screen.getByText(`Nova: v${remote}`)).toBeInTheDocument();
    });
    expect(screen.queryByText(/\(novo build\)/)).toBeNull();
    expect(screen.queryByText(/Nova: novo build/)).toBeNull();
  });

  it('shows "v{CURRENT} (novo build)" when only bundle hash changed', async () => {
    maybeSingleMock.mockResolvedValue({ data: { value: CURRENT }, error: null });
    // baseline bundle already stored
    localStorage.setItem('app:last_seen_bundle', '/assets/index-OLD.js');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(mockIndexHtml('/assets/index-NEW.js'))),
    );

    render(<UpdateNotifier />);
    await flush();

    await waitFor(() => {
      expect(screen.getByText(`Nova: v${CURRENT} (novo build)`)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Nova: novo build/)).toBeNull();
    expect(screen.queryByText(/vnovo build/)).toBeNull();
  });

  it('does not open modal when both version and bundle match baseline', async () => {
    maybeSingleMock.mockResolvedValue({ data: { value: CURRENT }, error: null });
    localStorage.setItem('app:last_seen_version', CURRENT);
    localStorage.setItem('app:last_seen_bundle', '/assets/index-SAME.js');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(mockIndexHtml('/assets/index-SAME.js'))),
    );

    render(<UpdateNotifier />);
    await flush();

    expect(screen.queryByText(/Nova versão disponível/)).toBeNull();
  });
});
