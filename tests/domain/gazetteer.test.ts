import { describe, it, expect, beforeEach } from 'vitest';
import { Effect } from 'effect';
import {
  BANGALORE_ZONES,
  BANGALORE_LOCALITIES,
  KNOWN_SOCIETIES,
  buildSocietyMapsUrl,
  buildLandmarkMapsUrl,
  buildLocalityMapsUrl,
  resolveBangalorePlace,
} from '../../src/domain/bangalore/gazetteer';
import {
  ListingRepository,
  GroupRepository,
} from '../../src/domain/services/RepositoryService';
import {
  makeINR,
  makeKilometers,
  makeMinutes,
  makeFbPostId,
  makeGroupId,
} from '../../src/domain/types';
import { app } from '../../src/server/app';
import { listingRepository } from '../../src/db/repository';
import { db } from '../../src/db/database';

describe('Bangalore Gazetteer & Google Maps Deep Link Builders', () => {
  it('contains all 8 BangaloreZone variants and 35+ localities & 30+ societies', () => {
    expect(BANGALORE_ZONES).toEqual([
      'ORR & Bellandur',
      'HSR & Koramangala',
      'Indiranagar & Central',
      'Whitefield & East',
      'Sarjapur & Harlur',
      'South Bangalore',
      'North & Hebbal',
      'Bangalore General',
    ]);
    expect(BANGALORE_LOCALITIES.length).toBeGreaterThanOrEqual(35);
    expect(Object.keys(KNOWN_SOCIETIES).length).toBeGreaterThanOrEqual(30);
  });

  it('builds Google Maps search deep links with proper encoding', () => {
    const societyUrl = buildSocietyMapsUrl('Adarsh Palm Retreat', 'Bellandur');
    expect(societyUrl).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(societyUrl).toContain('Adarsh%20Palm%20Retreat');

    const landmarkUrl = buildLandmarkMapsUrl('Sony World Signal', 'Koramangala');
    expect(landmarkUrl).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(landmarkUrl).toContain('Sony%20World%20Signal');

    const localityUrl = buildLocalityMapsUrl('Indiranagar');
    expect(localityUrl).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(localityUrl).toContain('Indiranagar');
  });

  it('resolves localities and zones across ORR, East, South, North, Central, and Sarjapur', () => {
    const orr = resolveBangalorePlace(
      '2BHK in Sobha Iris, Kadubeesanahalli near Prestige Tech Park'
    );
    expect(orr.zone).toBe('ORR & Bellandur');
    expect(orr.society).toBe('Sobha Iris');
    expect(orr.societyMapsUrl).toContain('Sobha%20Iris');
    expect(orr.localityMapsUrl).toContain('https://www.google.com/maps/search/?api=1&query=');

    const east = resolveBangalorePlace(
      'Spacious 3BHK in Prestige Shantiniketan Whitefield near ITPL'
    );
    expect(east.zone).toBe('Whitefield & East');
    expect(east.locality).toBe('Whitefield');
    expect(east.society).toBe('Prestige Shantiniketan');
    expect(east.societyMapsUrl).toContain('Prestige%20Shantiniketan');

    const hsr = resolveBangalorePlace('1BHK in Koramangala 4th Block near Sony Signal');
    expect(hsr.zone).toBe('HSR & Koramangala');
    expect(hsr.locality).toBe('Koramangala');

    const north = resolveBangalorePlace('2BHK flat in Hebbal near Manyata Tech Park');
    expect(north.zone).toBe('North & Hebbal');
    expect(north.locality).toBe('Hebbal');

    const central = resolveBangalorePlace('Luxury 2BHK off MG Road near Cubbon Park');
    expect(central.zone).toBe('Indiranagar & Central');
    expect(central.locality).toBe('MG Road');

    const sarjapur = resolveBangalorePlace('2BHK in Prestige Ferns Residency, Harlur Road');
    expect(sarjapur.zone).toBe('Sarjapur & Harlur');
    expect(sarjapur.society).toBe('Prestige Ferns Residency');

    const south = resolveBangalorePlace('2BHK in Jayanagar 4th Block near Metro');
    expect(south.zone).toBe('South Bangalore');
    expect(south.locality).toBe('Jayanagar');
  });
});

describe('Effect-TS ListingRepository & GroupRepository (layerMemory)', () => {
  it('supports CRUD, zone filtering, places directory, and group toggling in memory', async () => {
    const program = Effect.gen(function* () {
      const listingRepo = yield* ListingRepository;
      const groupRepo = yield* GroupRepository;

      const initialGroups = yield* groupRepo.getGroups();
      expect(initialGroups.length).toBeGreaterThanOrEqual(8);

      const targetGroup = initialGroups[0]!;
      const toggled = yield* groupRepo.toggleGroup(targetGroup.id, false);
      expect(toggled).toBe(true);

      const updatedGroups = yield* groupRepo.getGroups();
      expect(updatedGroups.find((g) => g.id === targetGroup.id)?.enabled).toBe(false);

      const saved = yield* listingRepo.upsertListing({
        fbPostId: makeFbPostId('fb_test_gazetteer_1'),
        groupId: targetGroup.id,
        groupName: targetGroup.name,
        postUrl: 'https://www.facebook.com/groups/bangalore/posts/101',
        authorName: 'Aarav Sharma',
        postedTime: '1 hr ago',
        rawText: '2 BHK in Prestige Shantiniketan Whitefield near ITPL rent 32000 no brokerage',
        location: 'Whitefield',
        zone: 'Whitefield & East',
        landmark: 'ITPL',
        societyMapsUrl: buildSocietyMapsUrl('Prestige Shantiniketan', 'Whitefield'),
        landmarkMapsUrl: buildLandmarkMapsUrl('ITPL', 'Whitefield'),
        localityMapsUrl: buildLocalityMapsUrl('Whitefield'),
        bhkType: '2 BHK (Shared/Full)',
        entities: {
          rent: makeINR(32000),
          deposit: makeINR(100000),
          isBrokerage: false,
          isGatedSociety: true,
          societyName: 'Prestige Shantiniketan',
          landmark: 'ITPL',
          hasSwimmingPool: true,
          hasPowerBackup: true,
          hasAttachedWashroom: true,
          hasBalcony: true,
          isVegetarianOnly: false,
          isMaleBachelorAllowed: true,
          isFemaleOnly: false,
          isWalkingDistance: false,
          furnishing: 'Fully Furnished',
          isKadubeesanahalliDirect: false,
          contactPhone: '9876543210',
        },
        commute: {
          distanceKm: makeKilometers(7.2),
          inboundMins: makeMinutes(25),
          outboundMins: makeMinutes(28),
          twoWayAvgPeakMins: makeMinutes(27),
          hasPanathurUnderpassBottleneck: false,
        },
        score: 95,
        scoreBreakdown: {
          base: 50,
          rent: 20,
          brokerage: 15,
          deposit: 5,
          gatedSociety: 20,
          swimmingPool: 10,
          powerBackup: 10,
          attachedWashroom: 10,
          vegetarianPenalty: 0,
          bachelorMatch: 15,
          walkProximity: 0,
          furnished: 15,
          panathurBypass: 0,
          commute: 0,
        },
        tier: 'Unicorn',
        userStatus: 'new',
      });

      expect(saved.zone).toBe('Whitefield & East');
      expect(saved.societyMapsUrl).toContain('Prestige%20Shantiniketan');

      const eastPage = yield* listingRepo.getPaginatedListings({ zone: 'Whitefield & East' });
      expect(eastPage.totalCount).toBe(1);

      const southPage = yield* listingRepo.getPaginatedListings({ zone: 'South Bangalore' });
      expect(southPage.totalCount).toBe(0);

      const places = yield* listingRepo.getPlacesDirectory();
      expect(places.length).toBeGreaterThanOrEqual(1);
      expect(places.some((p) => p.societyName === 'Prestige Shantiniketan')).toBe(true);
    });

    await Effect.runPromise(
      program.pipe(
        Effect.provide(ListingRepository.layerMemory()),
        Effect.provide(GroupRepository.layerMemory())
      )
    );
  });
});

describe('Hono Server Routes: /api/groups, /api/places, and /api/listings?zone=', () => {
  beforeEach(async () => {
    await db.initSchema();
    await db.execute('DELETE FROM listings');
  });

  it('serves GET /api/groups and PATCH /api/groups/:id', async () => {
    const getRes = await app.request('/api/groups');
    expect(getRes.status).toBe(200);
    const groups = await getRes.json();
    expect(Array.isArray(groups)).toBe(true);
    expect(groups.length).toBeGreaterThanOrEqual(8);

    const firstId = groups[0].id;
    const patchRes = await app.request(`/api/groups/${firstId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.success).toBe(true);
    expect(patchBody.enabled).toBe(false);
  });

  it('filters listings by zone and serves GET /api/places with Google Maps deep links', async () => {
    await listingRepository.upsertListing({
      fbPostId: makeFbPostId('post_zone_test_1'),
      groupId: makeGroupId('507116087403813'),
      groupName: 'Flat and Flatmates Bangalore (145k)',
      postUrl: 'https://www.facebook.com/groups/507116087403813/posts/555',
      authorName: 'Rohan Rao',
      postedTime: 'Just now',
      rawText: '2 BHK in Koramangala near Sony World Signal',
      location: 'Koramangala',
      zone: 'HSR & Koramangala',
      landmark: 'Sony World Signal',
      bhkType: '2 BHK (Shared/Full)',
      entities: {
        rent: makeINR(26000),
        deposit: makeINR(80000),
        isBrokerage: false,
        isGatedSociety: true,
        societyName: 'National Games Village',
        landmark: 'Sony World Signal',
        hasSwimmingPool: true,
        hasPowerBackup: true,
        hasAttachedWashroom: true,
        hasBalcony: true,
        isVegetarianOnly: false,
        isMaleBachelorAllowed: true,
        isFemaleOnly: false,
        isWalkingDistance: false,
        furnishing: 'Fully Furnished',
        isKadubeesanahalliDirect: false,
        contactPhone: '9888877777',
      },
      commute: {
        distanceKm: makeKilometers(6.5),
        inboundMins: makeMinutes(22),
        outboundMins: makeMinutes(25),
        twoWayAvgPeakMins: makeMinutes(24),
        hasPanathurUnderpassBottleneck: false,
      },
      score: 92,
      scoreBreakdown: {
        base: 50,
        rent: 20,
        brokerage: 15,
        deposit: 5,
        gatedSociety: 20,
        swimmingPool: 10,
        powerBackup: 10,
        attachedWashroom: 10,
        vegetarianPenalty: 0,
        bachelorMatch: 15,
        walkProximity: 0,
        furnished: 15,
        panathurBypass: 0,
        commute: 0,
      },
      tier: 'Unicorn',
      userStatus: 'new',
    });

    const hsrRes = await app.request(
      `/api/listings?zone=${encodeURIComponent('HSR & Koramangala')}`
    );
    expect(hsrRes.status).toBe(200);
    const hsrBody = await hsrRes.json();
    expect(hsrBody.totalCount).toBe(1);
    expect(hsrBody.listings[0].zone).toBe('HSR & Koramangala');
    expect(hsrBody.listings[0].societyMapsUrl).toContain(
      'https://www.google.com/maps/search/?api=1&query=National%20Games%20Village'
    );
    expect(hsrBody.listings[0].landmarkMapsUrl).toContain(
      'https://www.google.com/maps/search/?api=1&query=Sony%20World%20Signal'
    );

    const northRes = await app.request(
      `/api/listings?zone=${encodeURIComponent('North & Hebbal')}`
    );
    expect(northRes.status).toBe(200);
    const northBody = await northRes.json();
    expect(northBody.totalCount).toBe(0);

    const placesRes = await app.request('/api/places');
    expect(placesRes.status).toBe(200);
    const places = await placesRes.json();
    expect(Array.isArray(places)).toBe(true);
    expect(places.length).toBeGreaterThanOrEqual(1);
    expect(
      places.every((p: { mapsUrl: string }) =>
        p.mapsUrl.startsWith('https://www.google.com/maps/search/?api=1&query=')
      )
    ).toBe(true);
  });
});
