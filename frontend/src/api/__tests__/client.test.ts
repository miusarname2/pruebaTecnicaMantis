import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, ApiError } from '../client';

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends Bearer authorization header and parses JSON', async () => {
    const mockProjects = [{ id: '1201-30001', name: '410 Harbor Ave', address: 'x', status: 'In production', clientName: 'Acme' }];
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockProjects), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    const result = await api.getProjects('staff-token');
    expect(result).toEqual(mockProjects);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/projects');
    expect((init?.headers as Headers).get('Authorization')).toBe('Bearer staff-token');
  });

  it('throws ApiError 401 on unauthorized responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));

    await expect(api.getProjects('bad')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
  });

  it('extracts server JSON error message on 4xx/5xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 })
    );

    await expect(api.getProjectDetail('0000-00000', 'staff-token')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Project not found',
    });
  });

  it('wraps network failures in ApiError with status 0 and Try again', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    try {
      await api.getProjects('staff-token');
      expect.fail('Expected error');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(0);
      expect((err as ApiError).message).toContain('Try again');
    }
  });

  it('rethrows AbortError without converting it to Network error', async () => {
    const controller = new AbortController();
    const abortErr = new DOMException('Aborted', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortErr);

    controller.abort();
    await expect(api.getProjectDetail('1201-30001', 'staff-token', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
