import { describe, it, expect } from 'vitest';
import { parseStorageState } from '../src/scraper/browserSession';

describe('Facebook Session Storage Parser', () => {
  it('parses direct JSON storage state string', () => {
    const raw = JSON.stringify({
      cookies: [{ name: 'c_user', value: '100012345' }],
      origins: [],
    });
    const parsed = parseStorageState(raw);
    expect(parsed).toBeDefined();
    expect(parsed.cookies).toHaveLength(1);
    expect(parsed.cookies[0].name).toBe('c_user');
  });

  it('parses base64 encoded JSON storage state', () => {
    const raw = JSON.stringify({
      cookies: [{ name: 'xs', value: 'secret_token_123' }],
      origins: [],
    });
    const b64 = Buffer.from(raw).toString('base64');
    const parsed = parseStorageState(b64);
    expect(parsed).toBeDefined();
    expect(parsed.cookies[0].name).toBe('xs');
    expect(parsed.cookies[0].value).toBe('secret_token_123');
  });

  it('parses raw cookie strings into structured Playwright cookies', () => {
    const cookieHeader = 'sb=abc123xyz; datr=token_999; c_user=1000888999; xs=2%3Asecret%3A123';
    const parsed = parseStorageState(cookieHeader);
    expect(parsed).toBeDefined();
    expect(parsed.cookies).toHaveLength(4);
    expect(parsed.cookies.find((c: any) => c.name === 'c_user')?.value).toBe('1000888999');
    expect(parsed.cookies.find((c: any) => c.name === 'xs')?.value).toBe('2%3Asecret%3A123');
    expect(parsed.cookies[0].domain).toBe('.facebook.com');
  });

  it('handles quotes and whitespace safely', () => {
    const quoted = '"sb=abc123xyz; c_user=1000888999"';
    const parsed = parseStorageState(quoted);
    expect(parsed).toBeDefined();
    expect(parsed.cookies).toHaveLength(2);
  });

  it('returns undefined gracefully on invalid input without throwing', () => {
    expect(parseStorageState('')).toBeUndefined();
    expect(parseStorageState('invalid_random_string_no_equals')).toBeUndefined();
  });
});
