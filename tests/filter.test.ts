import { describe, it, expect } from 'vitest';
import { isValidLocation, isValidGender, isValidBHK, passesAllFilters } from '../src/domain/parser/filter';

describe('Location & Post Filter Rules (Correct-by-Construction)', () => {
  it('strictly excludes Bellandur, Marathahalli, Green Glen, Kariyammana Agrahara', () => {
    expect(isValidLocation('1 BHK in Bellandur near ecospace')._tag).toBe('err');
    expect(isValidLocation('Room in Marathahalli bridge')._tag).toBe('err');
    expect(isValidLocation('Flat in Green Glen Layout')._tag).toBe('err');
    expect(isValidLocation('Single room in Kariyammana Agrahara')._tag).toBe('err');
  });

  it('correctly matches Kadubeesanahalli, PTP, and Cessna', () => {
    const loc1 = isValidLocation('Looking for flatmate in Sobha Iris, Kadubeesanahalli');
    expect(loc1._tag).toBe('ok');
    if (loc1._tag === 'ok') expect(loc1.value).toBe('Kadubeesanahalli');

    const loc2 = isValidLocation('1 BHK near Prestige Tech Park');
    expect(loc2._tag).toBe('ok');

    const loc3 = isValidLocation('Room near PTP back gate');
    expect(loc3._tag).toBe('ok');

    const loc4 = isValidLocation('Panathur road near PTP');
    expect(loc4._tag).toBe('ok');
  });

  it('filters out female-only/girls-only posts and allows male or ungendered', () => {
    expect(isValidGender('Female flatmate needed for 2 BHK')).toBe(false);
    expect(isValidGender('Only girls allowed in this flat')).toBe(false);
    expect(isValidGender('Looking for female replacement')).toBe(false);

    expect(isValidGender('Male flatmate required in 3 BHK')).toBe(true);
    expect(isValidGender('Any gender / working professional')).toBe(true);
    expect(isValidGender('1 BHK for rent in Kadubeesanahalli')).toBe(true);
  });

  it('detects 1 BHK, 2 BHK, 3 BHK and flatmate requirements', () => {
    const bhk1 = isValidBHK('1 BHK available');
    expect(bhk1._tag).toBe('ok');
    if (bhk1._tag === 'ok') expect(bhk1.value).toBe('1 BHK');

    const bhk2 = isValidBHK('2 BHK pre-occupied flatmate');
    expect(bhk2._tag).toBe('ok');
    if (bhk2._tag === 'ok') expect(bhk2.value).toBe('2 BHK (Shared/Full)');

    const bhk3 = isValidBHK('Single private room in 3 BHK');
    expect(bhk3._tag).toBe('ok');
    if (bhk3._tag === 'ok') expect(bhk3.value).toBe('3 BHK (Shared/Full)');
  });

  it('runs complete filter pipeline returning Result monad', () => {
    const validPost = 'Looking for Male flatmate in Sobha Iris, Kadubeesanahalli. Master bedroom in 3 BHK.';
    const result = passesAllFilters(validPost);
    expect(result._tag).toBe('ok');
    if (result._tag === 'ok') {
      expect(result.value.location).toBe('Kadubeesanahalli');
      expect(result.value.bhkType).toBe('3 BHK (Shared/Full)');
    }

    const excludedPost = 'Female flatmate wanted in Bellandur near ecospace';
    const resultExcluded = passesAllFilters(excludedPost);
    expect(resultExcluded._tag).toBe('err');
    if (resultExcluded._tag === 'err') {
      expect(resultExcluded.error._tag).toBe('FilterRejectionError');
    }
  });
});
