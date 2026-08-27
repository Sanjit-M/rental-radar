import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import edgeHandler from '../api/index';

describe('Vercel Edge Scrape Trigger - GitHub Actions Dispatch', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns HTTP 500 with configuration error when GITHUB_DISPATCH_TOKEN is not set', async () => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
    delete process.env.GITHUB_TOKEN;

    const request = new Request('http://localhost/api/scrape/trigger', {
      method: 'POST',
    });

    const response = await edgeHandler(request);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.status).toBe('error');
    expect(body.message).toContain('GITHUB_DISPATCH_TOKEN is not configured');
  });

  it('dispatches GitHub Actions workflow and returns HTTP 200 on 204 response', async () => {
    process.env.GITHUB_DISPATCH_TOKEN = 'ghp_test_mock_token_12345';
    process.env.GITHUB_REPO = 'TestOrg/test-repo';
    process.env.GITHUB_REF = 'develop';
    process.env.GITHUB_WORKFLOW = 'custom-scraper.yml';

    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options: RequestInit) => {
      capturedUrl = url;
      capturedOptions = options;
      return new Response(null, { status: 204 });
    });

    const request = new Request('http://localhost/api/scrape/trigger', {
      method: 'POST',
    });

    const response = await edgeHandler(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('success');
    expect(body.message).toContain('GitHub Actions scrape workflow dispatched successfully');

    expect(capturedUrl).toBe(
      'https://api.github.com/repos/TestOrg/test-repo/actions/workflows/custom-scraper.yml/dispatches'
    );
    expect(capturedOptions?.method).toBe('POST');
    const headers = capturedOptions?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer ghp_test_mock_token_12345');
    expect(headers['Accept']).toBe('application/vnd.github.v3+json');
    expect(headers['User-Agent']).toBe('Rental-Radar-Trigger');
    expect(JSON.parse(capturedOptions?.body as string)).toEqual({ ref: 'develop' });
  });

  it('handles route parity across /scrape/trigger, /api/scrape/trigger, /scrape/seed, and /api/scrape/seed', async () => {
    process.env.GITHUB_DISPATCH_TOKEN = 'ghp_test_token';

    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const endpoints = [
      '/scrape/trigger',
      '/api/scrape/trigger',
      '/scrape/seed',
      '/api/scrape/seed',
    ];

    for (const endpoint of endpoints) {
      const res = await edgeHandler(new Request(`http://localhost${endpoint}`, { method: 'POST' }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('success');
    }
  });

  it('returns HTTP 502 when GitHub API returns an error status (e.g. 401 Unauthorized)', async () => {
    process.env.GITHUB_DISPATCH_TOKEN = 'ghp_invalid_token';

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Bad credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const request = new Request('http://localhost/api/scrape/trigger', {
      method: 'POST',
    });

    const response = await edgeHandler(request);
    expect(response.status).toBe(502);

    const body = await response.json();
    expect(body.status).toBe('error');
    expect(body.message).toContain('GitHub Actions dispatch failed (HTTP 401): Bad credentials');
  });

  it('returns HTTP 500 when fetch throws a network exception', async () => {
    process.env.GITHUB_DISPATCH_TOKEN = 'ghp_test_token';

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));

    const request = new Request('http://localhost/api/scrape/trigger', {
      method: 'POST',
    });

    const response = await edgeHandler(request);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.status).toBe('error');
    expect(body.message).toContain('Network connection timeout');
  });
});
