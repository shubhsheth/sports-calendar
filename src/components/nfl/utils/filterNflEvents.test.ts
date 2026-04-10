import type {NflEvent, NflEventCompetition, NflEventFilters} from '@/types/nfl';
import {
  filterNflEvent,
  filterNflEvents,
  toggleShowPastEvents,
  toggleTeamFilter,
} from './filterNflEvents';

const FUTURE_DATE = '2099-12-01T20:00:00Z';
const PAST_DATE = '2000-01-01T20:00:00Z';

const BASE_COMPETITION: NflEventCompetition = {
  $ref: 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/1/competitions/1',
  id: '1',
  date: FUTURE_DATE,
  type: {id: '2', text: 'Regular Season', abbreviation: 'RS'},
  timeValid: true,
  recent: false,
  bracketAvailable: false,
  gameSource: {id: '0', description: 'Unknown', state: 'full'},
  venue: {
    $ref: 'https://venue',
    fullName: 'Gillette Stadium',
    address: {city: 'Foxborough', state: 'MA'},
  },
  competitors: [
    {
      $ref: 'https://comp1',
      homeAway: 'home',
      team: {
        $ref: 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/17',
      },
    },
    {
      $ref: 'https://comp2',
      homeAway: 'away',
      team: {
        $ref: 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/25',
      },
    },
  ],
};

function makeEvent(
  competitions: Partial<NflEventCompetition>[] = [{}]
): NflEvent {
  return {
    $ref: 'https://event',
    id: '1',
    date: FUTURE_DATE,
    name: 'New England Patriots at Kansas City Chiefs',
    shortName: 'NE @ KC',
    season: {$ref: 'https://season'},
    competitions: competitions.map(overrides => ({
      ...BASE_COMPETITION,
      ...overrides,
    })),
  };
}

const noFilters: NflEventFilters = {showPastEvents: true, teamIds: []};

describe('filterNflEvent', () => {
  it('returns the event unchanged when no filters are active', () => {
    const event = makeEvent();
    expect(filterNflEvent(event, noFilters)).toEqual(event);
  });

  it('keeps future competitions when showPastEvents is false', () => {
    const event = makeEvent([{date: FUTURE_DATE}]);
    const result = filterNflEvent(event, {showPastEvents: false, teamIds: []});
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
  });

  it('removes past competitions when showPastEvents is false', () => {
    const event = makeEvent([{date: PAST_DATE}]);
    expect(
      filterNflEvent(event, {showPastEvents: false, teamIds: []})
    ).toBeNull();
  });

  it('keeps past competitions when showPastEvents is true', () => {
    const event = makeEvent([{date: PAST_DATE}]);
    expect(
      filterNflEvent(event, {showPastEvents: true, teamIds: []})
    ).not.toBeNull();
  });

  it('keeps event when a selected team is a competitor (home)', () => {
    const event = makeEvent();
    const result = filterNflEvent(event, {
      showPastEvents: true,
      teamIds: ['17'],
    });
    expect(result).not.toBeNull();
  });

  it('keeps event when a selected team is a competitor (away)', () => {
    const event = makeEvent();
    const result = filterNflEvent(event, {
      showPastEvents: true,
      teamIds: ['25'],
    });
    expect(result).not.toBeNull();
  });

  it('removes event when no selected team is a competitor', () => {
    const event = makeEvent();
    expect(
      filterNflEvent(event, {showPastEvents: true, teamIds: ['999']})
    ).toBeNull();
  });

  it('shows all events when teamIds is empty', () => {
    const event = makeEvent();
    expect(
      filterNflEvent(event, {showPastEvents: true, teamIds: []})
    ).not.toBeNull();
  });

  it('only returns competitions that pass both filters', () => {
    const event = makeEvent([{date: FUTURE_DATE}, {id: '2', date: PAST_DATE}]);
    const result = filterNflEvent(event, {showPastEvents: false, teamIds: []});
    expect(result).not.toBeNull();
    expect(result!.competitions).toHaveLength(1);
    expect(result!.competitions[0].date).toBe(FUTURE_DATE);
  });
});

describe('filterNflEvents', () => {
  it('filters an array, dropping events with no remaining competitions', () => {
    const futureEvent = makeEvent([{date: FUTURE_DATE}]);
    const pastEvent = makeEvent([{id: '2', date: PAST_DATE}]);
    const result = filterNflEvents([futureEvent, pastEvent], {
      showPastEvents: false,
      teamIds: [],
    });
    expect(result).toHaveLength(1);
  });

  it('returns all events when nothing is filtered', () => {
    const events = [makeEvent(), makeEvent()];
    expect(filterNflEvents(events, noFilters)).toHaveLength(2);
  });
});

describe('toggleShowPastEvents', () => {
  it('flips showPastEvents from false to true', () => {
    const setFilters = vi.fn();
    const filters: NflEventFilters = {showPastEvents: false, teamIds: []};
    toggleShowPastEvents(filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: [],
    });
  });

  it('flips showPastEvents from true to false', () => {
    const setFilters = vi.fn();
    const filters: NflEventFilters = {showPastEvents: true, teamIds: []};
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
    const filters: NflEventFilters = {showPastEvents: true, teamIds: ['17']};
    toggleTeamFilter('25', filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ['17', '25'],
    });
  });

  it('removes a team when it is already selected', () => {
    const setFilters = vi.fn();
    const filters: NflEventFilters = {
      showPastEvents: true,
      teamIds: ['17', '25'],
    };
    toggleTeamFilter('17', filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ['25'],
    });
  });

  it('adds a team to an empty teamIds list', () => {
    const setFilters = vi.fn();
    const filters: NflEventFilters = {showPastEvents: true, teamIds: []};
    toggleTeamFilter('17', filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith({
      showPastEvents: true,
      teamIds: ['17'],
    });
  });
});
