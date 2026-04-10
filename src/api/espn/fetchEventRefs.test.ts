import {afterAll, afterEach, beforeAll} from 'vitest';
import {http, HttpResponse} from 'msw';
import {setupServer} from 'msw/node';
import {fetchEventRefsBySeason} from './fetchEventRefs';

const MOCK_RESPONSE = {
  items: [
    {
      $ref: 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/1',
    },
    {
      $ref: 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/2',
    },
  ],
  pageCount: 5,
  pageIndex: 1,
};

let capturedUrl: string | null = null;

const server = setupServer(
  http.get('https://sports.core.api.espn.com/*', ({request}) => {
    capturedUrl = request.url;
    return HttpResponse.json(MOCK_RESPONSE);
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  capturedUrl = null;
});
afterAll(() => server.close());

describe('fetchEventRefsBySeason', () => {
  it('returns items, pageCount, and pageIndex from the response', async () => {
    const result = await fetchEventRefsBySeason('basketball', 'nba', '2026');
    expect(result.items).toEqual(MOCK_RESPONSE.items);
    expect(result.pageCount).toBe(5);
    expect(result.pageIndex).toBe(1);
  });

  it('constructs URL with correct sport, league, and season', async () => {
    await fetchEventRefsBySeason('basketball', 'nba', '2026');
    expect(capturedUrl).toContain(
      '/sports/basketball/leagues/nba/seasons/2026/'
    );
  });

  it('defaults to seasonTypeId=2, pageSize=30, pageNumber=1', async () => {
    await fetchEventRefsBySeason('basketball', 'nba', '2026');
    expect(capturedUrl).toContain('/types/2/');
    expect(capturedUrl).toContain('limit=30');
    expect(capturedUrl).toContain('page=1');
  });

  it('uses custom pagination params when provided', async () => {
    await fetchEventRefsBySeason('basketball', 'nba', '2026', {
      seasonTypeId: 3,
      pageSize: 10,
      pageNumber: 4,
    });
    expect(capturedUrl).toContain('/types/3/');
    expect(capturedUrl).toContain('limit=10');
    expect(capturedUrl).toContain('page=4');
  });

  it('uses https (not http) in the request URL', async () => {
    await fetchEventRefsBySeason('football', 'nfl', '2025');
    expect(capturedUrl).toMatch(/^https:\/\//);
  });

  it('works with different sport and league IDs', async () => {
    await fetchEventRefsBySeason('racing', 'f1', '2026');
    expect(capturedUrl).toContain('/sports/racing/leagues/f1/seasons/2026/');
  });
});
