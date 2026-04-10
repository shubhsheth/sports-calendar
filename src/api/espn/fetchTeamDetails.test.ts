import {afterAll, afterEach, beforeAll} from 'vitest';
import {http, HttpResponse} from 'msw';
import {setupServer} from 'msw/node';
import {fetchTeamDetails} from './fetchTeamDetails';

const MOCK_TEAM = {
  id: '2',
  name: 'Celtics',
  displayName: 'Boston Celtics',
  logos: [{href: 'https://a.espncdn.com/logo.png', rel: ['default']}],
};

let capturedUrl: string | null = null;

const server = setupServer(
  http.get('https://*', ({request}) => {
    capturedUrl = request.url;
    return HttpResponse.json(MOCK_TEAM);
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  capturedUrl = null;
});
afterAll(() => server.close());

describe('fetchTeamDetails', () => {
  it('returns the parsed JSON from the ref URL', async () => {
    const result = await fetchTeamDetails(
      'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/teams/2'
    );
    expect(result).toEqual(MOCK_TEAM);
  });

  it('normalizes http:// to https:// in the ref URL', async () => {
    await fetchTeamDetails(
      'http://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/teams/2'
    );
    expect(capturedUrl).toMatch(/^https:\/\//);
  });

  it('does not double-normalize an already-https URL', async () => {
    await fetchTeamDetails(
      'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/teams/2'
    );
    expect(capturedUrl).not.toContain('https://https://');
  });

  it('fetches the exact URL (with https) that was passed in', async () => {
    const url =
      'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/teams/14';
    await fetchTeamDetails(url);
    expect(capturedUrl).toBe(url);
  });
});
