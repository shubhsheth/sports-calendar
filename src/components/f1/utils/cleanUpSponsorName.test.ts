import {cleanUpSponsorName} from './cleanUpSponsorName';

describe('cleanUpSponsorName', () => {
  it('strips a known sponsor prefix', () => {
    expect(cleanUpSponsorName('Qatar Airways Bahrain Grand Prix')).toBe(
      'Bahrain Grand Prix'
    );
  });

  it('strips another known sponsor prefix', () => {
    expect(cleanUpSponsorName('Heineken Dutch Grand Prix')).toBe(
      'Dutch Grand Prix'
    );
  });

  it('strips Aramco sponsor', () => {
    expect(cleanUpSponsorName('Aramco Saudi Arabian Grand Prix')).toBe(
      'Saudi Arabian Grand Prix'
    );
  });

  it('leaves names with no known sponsor unchanged', () => {
    expect(cleanUpSponsorName('Australian Grand Prix')).toBe(
      'Australian Grand Prix'
    );
  });

  it('returns empty string for empty input', () => {
    expect(cleanUpSponsorName('')).toBe('');
  });

  it('removes all occurrences of a repeated sponsor', () => {
    expect(cleanUpSponsorName('AWS AWS Monaco Grand Prix')).toBe(
      'Monaco Grand Prix'
    );
  });

  it('trims leading and trailing whitespace after removal', () => {
    const result = cleanUpSponsorName('STC Saudi Arabian Grand Prix');
    expect(result).not.toMatch(/^\s|\s$/);
  });

  it('collapses multiple internal spaces after removal', () => {
    const result = cleanUpSponsorName('Qatar Airways  Bahrain Grand Prix');
    expect(result).not.toMatch(/\s{2,}/);
  });

  it('is case-insensitive when stripping sponsors', () => {
    expect(cleanUpSponsorName('qatar airways Bahrain Grand Prix')).toBe(
      'Bahrain Grand Prix'
    );
  });
});
