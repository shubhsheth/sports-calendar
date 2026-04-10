import {
  translateNbaEventTypeAbbr,
  translateNbaEventTypeId,
} from './translateNbaEventType';

describe('translateNbaEventTypeAbbr', () => {
  it.each([
    ['PS', 'Preseason'],
    ['RS', 'Regular Season'],
    ['PO', 'Playoffs'],
    ['AS', 'All-Star'],
    ['FIN', 'Finals'],
  ])('translates %s to %s', (input, expected) => {
    expect(translateNbaEventTypeAbbr(input)).toBe(expected);
  });

  it('returns the original string for unknown abbreviations', () => {
    expect(translateNbaEventTypeAbbr('XYZ')).toBe('XYZ');
    expect(translateNbaEventTypeAbbr('')).toBe('');
  });
});

describe('translateNbaEventTypeId', () => {
  it.each([
    ['1', 'Preseason'],
    ['2', 'Regular Season'],
    ['3', 'Playoffs'],
    ['4', 'All-Star'],
    ['5', 'Finals'],
  ])('translates id %s to %s', (input, expected) => {
    expect(translateNbaEventTypeId(input)).toBe(expected);
  });

  it('returns "Other" for unknown IDs', () => {
    expect(translateNbaEventTypeId('6')).toBe('Other');
    expect(translateNbaEventTypeId('99')).toBe('Other');
    expect(translateNbaEventTypeId('')).toBe('Other');
  });
});
