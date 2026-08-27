import { describe, it, expect } from 'vitest';
import { isValidLocation, isValidGender, isValidBHK, passesAllFilters } from '../src/domain/parser/filter';
import { parseFacebookTimestamp, formatToIST } from '../src/domain/parser/cleaner';

describe('Location & Post Filter Rules (Correct-by-Construction)', () => {
  it('strictly excludes distant locations (Whitefield, HSR, Electronic City, Green Glen)', () => {
    expect(isValidLocation('1 BHK in Whitefield near ITPL')._tag).toBe('err');
    expect(isValidLocation('Room in HSR layout sector 2')._tag).toBe('err');
    expect(isValidLocation('Flat in Green Glen Layout')._tag).toBe('err');
    expect(isValidLocation('Single room in Electronic City phase 1')._tag).toBe('err');
  });

  it('strictly rejects posts located after/beyond the Panathur railway underpass', () => {
    expect(isValidLocation('1 BHK in Panathur after railway underpass')._tag).toBe('err');
    expect(isValidLocation('2 BHK in Panathur beyond the underpass near Balagere')._tag).toBe('err');
    expect(isValidLocation('Flat in Balagere road')._tag).toBe('err');
    expect(isValidLocation('Room after railway gate panathur')._tag).toBe('err');
  });

  it('correctly matches the 8 target areas (Kadubeesanahalli, PTP, Cessna, Devarabisanahalli, Boganahalli, Panathur, Marathahalli)', () => {
    const loc1 = isValidLocation('1 BHK for rent in Kadubeesanahalli');
    expect(loc1._tag).toBe('ok');
    if (loc1._tag === 'ok') expect(loc1.value).toBe('Kadubeesanahalli');

    const loc2 = isValidLocation('1 BHK near Prestige Tech Park');
    expect(loc2._tag).toBe('ok');

    const loc3 = isValidLocation('Room near PTP back gate');
    expect(loc3._tag).toBe('ok');

    const loc4 = isValidLocation('Panathur road near PTP');
    expect(loc4._tag).toBe('ok');

    const loc5 = isValidLocation('1 BHK in Devarabisanahalli near Cessna');
    expect(loc5._tag).toBe('ok');

    const loc6 = isValidLocation('Flat in Boganahalli near PTP');
    expect(loc6._tag).toBe('ok');

    const loc7 = isValidLocation('2 BHK in Marathahalli near PTP bridge');
    expect(loc7._tag).toBe('ok');
  });

  it('allows Kadubeesanahalli, Panathur, and PTP posts that mention Bellandur or Marathahalli as transit/proximity references', () => {
    const post1 = '1 BHK in Kadubeesanahalli, 5 mins from Bellandur EcoSpace and Marathahalli bridge';
    const loc1 = isValidLocation(post1);
    expect(loc1._tag).toBe('ok');
    if (loc1._tag === 'ok') expect(loc1.value).toBe('Kadubeesanahalli');

    const post2 = 'Looking for flatmate in Panathur near PTP. Easy commute to Bellandur & Marathahalli';
    const res2 = passesAllFilters(post2);
    expect(res2._tag).toBe('ok');
    if (res2._tag === 'ok') {
      expect(['Panathur', 'Ptp']).toContain(res2.value.location);
      expect(res2.value.bhkType).toBe('Private Room / Flatmate');
    }
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

    const bhkRoom = isValidBHK('1 room available in a flat near PTP');
    expect(bhkRoom._tag).toBe('ok');
    if (bhkRoom._tag === 'ok') expect(bhkRoom.value).toBe('Private Room / Flatmate');

    const bhkIndep = isValidBHK('Independent flat available for rent');
    expect(bhkIndep._tag).toBe('ok');
    if (bhkIndep._tag === 'ok') expect(bhkIndep.value).toBe('1 BHK');
  });

  it('matches phonetic transliterations and spelling variants for target localities', () => {
    expect(isValidLocation('1 BHK in kadubeesanhalli')._tag).toBe('ok');
    expect(isValidLocation('Room in kadubisanahali')._tag).toBe('ok');
    expect(isValidLocation('Flat in devarabeesanhalli')._tag).toBe('ok');
    expect(isValidLocation('1 BHK in boganahali')._tag).toBe('ok');
    expect(isValidLocation('Flat in kariyamma agrahara')._tag).toBe('ok');
    expect(isValidLocation('Room in marathahali near PTP')._tag).toBe('ok');
    expect(isValidLocation('1 BHK in cessna park')._tag).toBe('ok');
  });

  it('allows co-ed, any-gender, and mixed male/female listings while strictly rejecting female-only', () => {
    expect(isValidGender('1 BHK flat in Kadubeesanahalli, open for male or female')).toBe(true);
    expect(isValidGender('Co-ed flat (1 male and 1 female currently living here)')).toBe(true);
    expect(isValidGender('Bachelors / boys or girls allowed')).toBe(true);
    expect(isValidGender('Flat available for any gender / all welcome')).toBe(true);

    expect(isValidGender('Female flatmate needed for 2 BHK')).toBe(false);
    expect(isValidGender('Looking for female replacement')).toBe(false);
    expect(isValidGender('Girls only accommodation')).toBe(false);
  });

  it('runs complete filter pipeline returning Result monad', () => {
    const validPost = 'Looking for Male flatmate in Kadubeesanahalli. Master bedroom in 3 BHK.';
    const result = passesAllFilters(validPost);
    expect(result._tag).toBe('ok');
    if (result._tag === 'ok') {
      expect(result.value.location).toBe('Kadubeesanahalli');
      expect(result.value.bhkType).toBe('3 BHK (Shared/Full)');
    }

    const excludedPost = 'Female flatmate wanted in Whitefield near ITPL';
    const resultExcluded = passesAllFilters(excludedPost);
    expect(resultExcluded._tag).toBe('err');
    if (resultExcluded._tag === 'err') {
      expect(resultExcluded.error._tag).toBe('FilterRejectionError');
    }
  });
});

describe('Timestamp & IST Conversion (Cleaner)', () => {
  it('formats Date into exact IST string', () => {
    // 2026-08-27T01:00:00+05:30 -> "27 Aug 2026, 01:00 am IST" or similar
    const ref = new Date('2026-08-26T19:30:00.000Z'); // 1:00 AM IST on Aug 27
    const ist = formatToIST(ref);
    expect(ist).toContain('27 Aug 2026');
    expect(ist).toContain('01:00');
    expect(ist).toContain('IST');
  });

  it('parses relative minute and hour tokens into absolute IST', () => {
    const ref = new Date('2026-08-27T01:30:00+05:30');
    const res28m = parseFacebookTimestamp('28 mins ago', ref);
    expect(res28m).not.toBeNull();
    expect(res28m?.formattedIST).toContain('IST');
    expect(res28m?.date.getTime()).toBe(ref.getTime() - 28 * 60 * 1000);

    const res2h = parseFacebookTimestamp('2 hrs ago', ref);
    expect(res2h).not.toBeNull();
    expect(res2h?.date.getTime()).toBe(ref.getTime() - 2 * 60 * 60 * 1000);
  });
});


