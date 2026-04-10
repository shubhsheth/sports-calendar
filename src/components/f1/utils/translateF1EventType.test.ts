import {
  translateF1EventTypeAbbr,
  translateF1EventTypeId,
} from './translateF1EventType';

describe('translateF1EventTypeAbbr', () => {
  it.each([
    ['FP1', 'Free Practice 1'],
    ['FP2', 'Free Practice 2'],
    ['FP3', 'Free Practice 3'],
    ['Qual', 'Qualifying'],
    ['Sprint', 'Spring Qualifying'],
    ['SR', 'Spring Race'],
  ])('translates %s to %s', (input, expected) => {
    expect(translateF1EventTypeAbbr(input)).toBe(expected);
  });

  it('returns the original string for unknown abbreviations', () => {
    expect(translateF1EventTypeAbbr('Race')).toBe('Race');
    expect(translateF1EventTypeAbbr('XYZ')).toBe('XYZ');
  });
});

describe('translateF1EventTypeId', () => {
  it.each([
    ['1', 'Practice'],
    ['2', 'Qualifying'],
    ['3', 'Race'],
    ['4', 'Spring Qualifying'],
    ['6', 'Spring Race'],
  ])('translates id %s to %s', (input, expected) => {
    expect(translateF1EventTypeId(input)).toBe(expected);
  });

  it('returns "Other" for unknown IDs', () => {
    expect(translateF1EventTypeId('5')).toBe('Other');
    expect(translateF1EventTypeId('99')).toBe('Other');
    expect(translateF1EventTypeId('')).toBe('Other');
  });
});
