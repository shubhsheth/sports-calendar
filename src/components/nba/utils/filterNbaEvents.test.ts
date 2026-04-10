import type {NbaEvent, NbaEventCompetition, NbaEventFilters} from '@/types/nba';
import {
  filterNbaEvent,
  filterNbaEvents,
  toggleShowPastEvents,
  toggleTeamFilter,
} from './filterNbaEvents';

// Dates relative to the test environment
const FUTURE_DATE = '2099-12-01T20:00:00Z';
const PAST_DATE = '2000-01-01T20:00:00Z';

const BASE_COMPETITION: NbaEventCompetition = {
  $ref: 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/1/competitions/1',
  id: '1',
  date: FUTURE_DATE,
  type: {id: '2', text: 'Regular Season', abbreviation: 'RS'},
  timeValid: true,
  recent: false,
  bracketAvailable: false,
  gameSource: {id: '0', description: 'Unknown', state: 'full'},
  venue: {
    $ref: 'https://venue',
    fullName: 'TD Garden',
    address: {city: 'Boston', state: 'MA'},
  },
  competitors: [
    {
      $ref: 'https://comp1',
      homeAway: 'home',
      team: {
        $ref: 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/teams/2',
      },
    },
    {
      $ref: 'https://comp2',
      homeAway: 'away',
      team: {
        $ref: 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/teams/14',
      },
    },
  ],
};

function makeEvent(
  competitions: Partial<NbaEventCompetition>[] = [{}]
): NbaEvent {
  return {
    $ref: 'https://event',
    id: '1',
    date: FUTURE_DATE,
    name: 'Los Angeles Lakers at Boston Celtics',
    shortName: 'LAL @ BOS',
    season: {$ref: 'https://season'},
    competitions: competitions.map(overrides => ({
      ...BASE_COMPETITION,
      ...overrides,
    })),
  };
}

const noFilters: NbaEventFilters = {showPastEvents: true, teamIds: []};

describe('filterNbaEvent', () => {
  it('returns the event unchanged when no filters are active', () => {
    const event = makeEvent();
    expect(filterNbaEvent(event, noFilters)).toEqual(event);
  });

  it('keeps future competitions when showPastEvents is false', () => {
    const event = makeEvent([{date: FUTURE_DATE}]);
    const result = filterNbaEvent(event, {showPastEvents: false, teamIds: []});
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
  });

  it('removes past competitions when showPastEvents is false', () => {
    const event = makeEvent([{date: PAST_DATE}]);
    const result = filterNbaEvent(event, {showPastEvents: false, teamIds: []});
    expect(result).toBeNull();
  });

  it('keeps past competitions when showPastEvents is true', () => {
    const event = makeEvent([{date: PAST_DATE}]);
    const result = filterNbaEvent(event, {showPastEvents: true, teamIds: []});
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
  });

  it('keeps event when a selected team is a competitor (home)', () => {
    const event = makeEvent();
    const result = filterNbaEvent(event, {
      showPastEvents: true,
      teamIds: ['2'],
    });
    expect(result).not.toBeNull();
  });

  it('keeps event when a selected team is a competitor (away)', () => {
    const event = makeEvent();
    const result = filterNbaEvent(event, {
      showPastEvents: true,
      teamIds: ['14'],
    });
    expect(result).not.toBeNull();
  });

  it('removes event when no selected team is a competitor', () => {
    const event = makeEvent();
    const result = filterNbaEvent(event, {
      showPastEvents: true,
      teamIds: ['999'],
    });
    expect(result).toBeNull();
  });

  it('shows all events when teamIds is empty (no team filter)', () => {
    const event = makeEvent();
    const result = filterNbaEvent(event, {showPastEvents: true, teamIds: []});
    expect(result).not.toBeNull();
  });

  it('returns null when all competitions are filtered out', () => {
    const event = makeEvent([{date: PAST_DATE}, {date: PAST_DATE}]);
    expect(
      filterNbaEvent(event, {showPastEvents: false, teamIds: []})
    ).toBeNull();
  });

  it('only returns competitions that pass the filter', () => {
    const event = makeEvent([{date: FUTURE_DATE}, {date: PAST_DATE}]);
    const result = filterNbaEvent(event, {showPastEvents: false, teamIds: []});
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
    expect(result!.competitions[0].date).toBe(FUTURE_DATE);
  });
});

describe('filterNbaEvents', () => {
  it('filters an array of events, dropping those with no remaining competitions', () => {
    const futureEvent = makeEvent([{date: FUTURE_DATE}]);
    const pastEvent = makeEvent([{id: '2', date: PAST_DATE}]);
    const result = filterNbaEvents([futureEvent, pastEvent], {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].competitions[0].date).toBe(FUTURE_DATE);
  });

  it('returns empty array when all events are filtered out', () => {
    const pastEvent = makeEvent([{date: PAST_DATE}]);
    expect(
      filterNbaEvents([pastEvent], {showPastEvents: false, teamIds: []})
    ).toEqual([]);
  });

  it('returns all events when nothing is filtered', () => {
    const events = [makeEvent(), makeEvent()];
    expect(filterNbaEvents(events, noFilters)).toHaveLength(2);
  });
});

describe('toggleShowPastEvents', () => {
  it('flips showPastEvents from false to true', () => {
    const setFilters = vi.fn();
    const filters: NbaEventFilters = {showPastEvents: false, teamIds: []};
    toggleShowPastEvents(filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: [],
    });
  });

  it('flips showPastEvents from true to false', () => {
    const setFilters = vi.fn();
    const filters: NbaEventFilters = {showPastEvents: true, teamIds: []};
    toggleShowPastEvents(filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: false,
      teamIds: [],
    });
  });
});

describe('toggleTeamFilter', () => {
  it('adds a team when it is not currently selected', () => {
    const setFilters = vi.fn();
    const filters: NbaEventFilters = {showPastEvents: true, teamIds: ['1']};
    toggleTeamFilter('2', filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ['1', '2'],
    });
  });

  it('removes a team when it is already selected', () => {
    const setFilters = vi.fn();
    const filters: NbaEventFilters = {
      showPastEvents: true,
      teamIds: ['1', '2'],
    };
    toggleTeamFilter('1', filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ['2'],
    });
  });

  it('adds a team to an empty teamIds list', () => {
    const setFilters = vi.fn();
    const filters: NbaEventFilters = {showPastEvents: true, teamIds: []};
    toggleTeamFilter('5', filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ['5'],
    });
  });
});
