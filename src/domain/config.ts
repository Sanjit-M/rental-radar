import {
  BANGALORE_LOCALITIES,
  KNOWN_SOCIETIES as GAZETTEER_SOCIETIES,
  type KnownSociety as GazetteerSociety,
} from './bangalore/gazetteer';

// Prestige Tech Park Anchor Coordinates (Kadubeesanahalli Main Gate)
export const PTP_COORDINATES = {
  name: 'Prestige Tech Park (PTP), Kadubeesanahalli',
  lat: 12.9385,
  lon: 77.6917,
};

// Known Gated Societies with verified attributes & coordinates
export type KnownSociety = GazetteerSociety;

export const KNOWN_SOCIETIES: Record<string, KnownSociety> = GAZETTEER_SOCIETIES;

// Core 21 ORR/PTP society keys for strict PTP perimeter mode
export const CORE_PTP_SOCIETY_KEYS: ReadonlySet<string> = new Set([
  'sobhairis',
  'sobhahibiscus',
  'sobhajasmine',
  'assetzmarq',
  'assetz',
  'orchidlakeview',
  'prestigesunnyside',
  'divyasree',
  'sjr',
  'salarpuria',
  'salarpuriasanctity',
  'adarshpalm',
  'rohanjharoka',
  'godrejreflections',
  'snnrajlakeview',
  'brenunity',
  'dsrwaterscape',
  'mantriespana',
  'vaswanireserve',
  'umiyacity',
  'panathuroasis',
  'prestigetechvista',
]);

export const LOCALITY_COORDS: Record<string, { lat: number; lon: number; isDirect: boolean }> = {
  kadubeesanahalli: { lat: 12.9380, lon: 77.6925, isDirect: true },
  kadubisanahalli: { lat: 12.9380, lon: 77.6925, isDirect: true },
  kadhubesanahalli: { lat: 12.9380, lon: 77.6925, isDirect: true },
  kadubeesanhalli: { lat: 12.9380, lon: 77.6925, isDirect: true },
  kadubisanahali: { lat: 12.9380, lon: 77.6925, isDirect: true },
  kadubeesanahali: { lat: 12.9380, lon: 77.6925, isDirect: true },
  ptp: { lat: 12.9385, lon: 77.6917, isDirect: true },
  'prestige tech park': { lat: 12.9385, lon: 77.6917, isDirect: true },
  'ptp back gate': { lat: 12.9360, lon: 77.6960, isDirect: true },
  'ptp main gate': { lat: 12.9385, lon: 77.6917, isDirect: true },
  cessna: { lat: 12.9368, lon: 77.6910, isDirect: true },
  'cessna business park': { lat: 12.9368, lon: 77.6910, isDirect: true },
  'cessna park': { lat: 12.9368, lon: 77.6910, isDirect: true },
  'embassy tech village': { lat: 12.9295, lon: 77.6890, isDirect: true },
  etv: { lat: 12.9295, lon: 77.6890, isDirect: true },
  'rmz ecoworld': { lat: 12.9260, lon: 77.6850, isDirect: true },
  ecoworld: { lat: 12.9260, lon: 77.6850, isDirect: true },
  ecospace: { lat: 12.9275, lon: 77.6830, isDirect: true },
  bellandur: { lat: 12.9304, lon: 77.6784, isDirect: true },
  'outer ring road': { lat: 12.9350, lon: 77.6920, isDirect: true },
  orr: { lat: 12.9350, lon: 77.6920, isDirect: true },
  devarabisanahalli: { lat: 12.9300, lon: 77.6880, isDirect: true },
  devarabeesanahalli: { lat: 12.9300, lon: 77.6880, isDirect: true },
  'devarabisana halli': { lat: 12.9300, lon: 77.6880, isDirect: true },
  devarabeesanhalli: { lat: 12.9300, lon: 77.6880, isDirect: true },
  devarabisanahali: { lat: 12.9300, lon: 77.6880, isDirect: true },
  boganahalli: { lat: 12.9310, lon: 77.6970, isDirect: true },
  bhoganahalli: { lat: 12.9310, lon: 77.6970, isDirect: true },
  boganahali: { lat: 12.9310, lon: 77.6970, isDirect: true },
  bhoganahali: { lat: 12.9310, lon: 77.6970, isDirect: true },
  'kaveriappa layout': { lat: 12.9365, lon: 77.6930, isDirect: true },
  'silver county': { lat: 12.9250, lon: 77.6850, isDirect: true },
  'kariyammana agrahara': { lat: 12.9345, lon: 77.6950, isDirect: true },
  kariyammana: { lat: 12.9345, lon: 77.6950, isDirect: true },
  'kariyamma agrahara': { lat: 12.9345, lon: 77.6950, isDirect: true },
  panathur: { lat: 12.9350, lon: 77.7000, isDirect: false },
  'panathur road': { lat: 12.9350, lon: 77.7000, isDirect: false },
  marathahalli: { lat: 12.9460, lon: 77.6980, isDirect: true },
  marathalli: { lat: 12.9460, lon: 77.6980, isDirect: true },
  marathahali: { lat: 12.9460, lon: 77.6980, isDirect: true },
  marathali: { lat: 12.9460, lon: 77.6980, isDirect: true },
  ...Object.fromEntries(
    BANGALORE_LOCALITIES.flatMap((entry) =>
      entry.aliases.map((alias) => [
        alias,
        { lat: entry.lat, lon: entry.lon, isDirect: entry.isDirectToPtp },
      ])
    )
  ),
};

export const CORE_PTP_LOCATIONS = [
  'kadubeesanahalli',
  'kadubisanahalli',
  'kadhubesanahalli',
  'kadubeesanhalli',
  'kadubisanahali',
  'kadubeesanahali',
  'prestige tech park',
  'ptp',
  'ptp back gate',
  'ptp main gate',
  'cessna business park',
  'cessna park',
  'cessna',
  'devarabisanahalli',
  'devarabeesanahalli',
  'devarabisana halli',
  'devarabeesanhalli',
  'devarabisanahali',
  'boganahalli',
  'bhoganahalli',
  'boganahali',
  'bhoganahali',
  'kariyammana agrahara',
  'kariyammana',
  'kariyamma agrahara',
  'marathahalli',
  'marathalli',
  'marathahali',
  'marathali',
];

export const TARGET_LOCATIONS = Array.from(
  new Set([
    ...CORE_PTP_LOCATIONS,
    ...BANGALORE_LOCALITIES.flatMap((entry) => [
      entry.canonicalName.toLowerCase(),
      ...entry.aliases,
    ]),
  ])
);

export const UNDERPASS_BLOCKED_PATTERNS = [
  /after\s+(?:the\s+)?(?:railway\s+)?underpass/i,
  /beyond\s+(?:the\s+)?(?:railway\s+)?underpass/i,
  /past\s+(?:the\s+)?(?:railway\s+)?underpass/i,
  /after\s+(?:the\s+)?railway\s+(?:gate|bridge|track|crossing)/i,
  /beyond\s+(?:the\s+)?railway\s+(?:gate|bridge|track|crossing)/i,
  /\bbalagere\b/i,
  /\bvarthur\b/i,
];

export const EXCLUDED_LOCATIONS = [
  'bellandur',
  'panathur',
  'outer ring road',
  'orr',
  'kaveriappa',
  'green glen',
  'yemalur',
  'yamalur',
  'kammagondanahalli',
  'sarjapur',
  'hsr',
  'koramangala',
  'indiranagar',
  'whitefield',
  'electronic city',
  'hebbal',
  'btm',
  'mahadevapura',
  'kundalahalli',
  'hoodi',
  'dubai',
  'uae',
  'rigga',
  'deira',
  'sharjah',
  'bur dubai',
  'muraqqabat',
  'al barsha',
  'nahda',
];

export const TRAFFIC_CONFIG = {
  inboundMultiplier: 1.30,   // 11:00 AM – 1:00 PM IST
  outboundMultiplier: 1.65,  // 4:00 PM – 6:00 PM IST
  panathurUnderpassDelayMins: 8,
  baseScooterSpeedKmh: 22.0,
};

export const SCORING_CONFIG = {
  baseScore: 50,
  rentLe25k: 20,
  rent25kTo30k: 0,
  rentGt30k: -30,
  noBrokerage: 15,
  brokerageApplicable: -40,       // Strict brokerage penalty
  lowDeposit: 10,
  highDepositRatioPenalty: -30,   // > 2.2x monthly rent or >60k penalty
  gatedSociety: 15,
  swimmingPool: 15,
  powerBackup: 10,
  noPowerBackupPenalty: -20,      // No DG power backup penalty
  attachedWashroom: 10,
  sharedWashroomPenalty: -15,     // Shared washroom penalty
  vegetarianOnlyPenalty: -50,     // Strict -50pt vegetarian penalty
  bachelorMaleMatch: 10,          // Bachelor male match
  bachelorMismatchPenalty: -30,   // Strictly female only
  walkingProximityBonus: 15,      // < 500m walking bonus
  furnished: 5,
  panathurBypassBonus: 10,
  panathurUnderpassPenalty: -35,  // Bottleneck penalty
  commuteLe7min: 20,
  commute8To12min: 10,
  commute13To18min: -10,
  commuteGt18min: -30,
};

export interface DefaultFbGroupSeed {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly memberCount: string;
  readonly category: string;
}

export const DEFAULT_FB_GROUPS: readonly DefaultFbGroupSeed[] = [
  {
    id: '591413389157630',
    name: 'Flat and Flatmates Bellandur, Kadubeesanahalli (200k)',
    url: 'https://www.facebook.com/groups/591413389157630/?sorting_setting=CHRONOLOGICAL',
    memberCount: '200K',
    category: 'ORR & Bellandur',
  },
  {
    id: '1265072124774804',
    name: 'Flats and Flatmates Kadubeesanahalli / PTP',
    url: 'https://www.facebook.com/groups/1265072124774804/?sorting_setting=CHRONOLOGICAL',
    memberCount: '45K',
    category: 'ORR & Bellandur',
  },
  {
    id: '507116087403813',
    name: 'Flat and Flatmates Bangalore (145k)',
    url: 'https://www.facebook.com/groups/507116087403813/?sorting_setting=CHRONOLOGICAL',
    memberCount: '145K',
    category: 'Bangalore City-Wide',
  },
  {
    id: 'flatsandflatmatesbangaluru',
    name: 'Flats and Flatmates Bengaluru (130k)',
    url: 'https://www.facebook.com/groups/flatsandflatmatesbangaluru/?sorting_setting=CHRONOLOGICAL',
    memberCount: '130K',
    category: 'Bangalore City-Wide',
  },
  {
    id: 'findmyroombangalore',
    name: 'Find My Room Bangalore (105k)',
    url: 'https://www.facebook.com/groups/findmyroombangalore/?sorting_setting=CHRONOLOGICAL',
    memberCount: '105K',
    category: 'Bangalore City-Wide',
  },
  {
    id: '697855465840944',
    name: 'Flats Without Brokers Bangalore (100k)',
    url: 'https://www.facebook.com/groups/697855465840944/?sorting_setting=CHRONOLOGICAL',
    memberCount: '100K',
    category: 'Zero Brokerage',
  },
  {
    id: '329320681157074',
    name: 'Flat and Flatmates Bangalore (94k)',
    url: 'https://www.facebook.com/groups/329320681157074/?sorting_setting=CHRONOLOGICAL',
    memberCount: '94K',
    category: 'Bangalore City-Wide',
  },
  {
    id: '1703473933213030',
    name: 'Flat and Flatmates Bangalore (86k)',
    url: 'https://www.facebook.com/groups/1703473933213030/?sorting_setting=CHRONOLOGICAL',
    memberCount: '86K',
    category: 'Bangalore City-Wide',
  },
  {
    id: '876779221120021',
    name: 'Flats Without Brokers Bangalore (72k)',
    url: 'https://www.facebook.com/groups/876779221120021/?sorting_setting=CHRONOLOGICAL',
    memberCount: '72K',
    category: 'Zero Brokerage',
  },
  {
    id: '1918733344819133',
    name: 'Flats and Flatmates Bangalore (63k)',
    url: 'https://www.facebook.com/groups/1918733344819133/?sorting_setting=CHRONOLOGICAL',
    memberCount: '63K',
    category: 'Bangalore City-Wide',
  },
  {
    id: '636932320207695',
    name: 'Bangalore Flatmates Community (39k)',
    url: 'https://www.facebook.com/groups/636932320207695/?sorting_setting=CHRONOLOGICAL',
    memberCount: '39K',
    category: 'Bangalore City-Wide',
  },
  {
    id: '224322741398603',
    name: 'Flat and Flatmates Bangalore (39k)',
    url: 'https://www.facebook.com/groups/224322741398603/?sorting_setting=CHRONOLOGICAL',
    memberCount: '39K',
    category: 'Bangalore City-Wide',
  },
  {
    id: '184612851933582',
    name: 'Flats and Flatmates Bangalore (35k)',
    url: 'https://www.facebook.com/groups/184612851933582/?sorting_setting=CHRONOLOGICAL',
    memberCount: '35K',
    category: 'Bangalore City-Wide',
  },
  {
    id: '147988655894011',
    name: 'Bangalore Rentals & Flatmates (35k)',
    url: 'https://www.facebook.com/groups/147988655894011/?sorting_setting=CHRONOLOGICAL',
    memberCount: '35K',
    category: 'Rental & Flatmates',
  },
  {
    id: '380069852631811',
    name: 'Flats Without Broker Bangalore (31k)',
    url: 'https://www.facebook.com/groups/380069852631811/?sorting_setting=CHRONOLOGICAL',
    memberCount: '31K',
    category: 'Zero Brokerage',
  },
  {
    id: 'flatandflatmatesbangalore',
    name: 'Flat and Flatmates Bangalore',
    url: 'https://www.facebook.com/groups/flatandflatmatesbangalore/?sorting_setting=CHRONOLOGICAL',
    memberCount: '180K',
    category: 'Bangalore City-Wide',
  },
  {
    id: 'flatswithoutbrokersbangalore',
    name: 'Flats Without Brokers Bangalore',
    url: 'https://www.facebook.com/groups/flatswithoutbrokersbangalore/?sorting_setting=CHRONOLOGICAL',
    memberCount: '110K',
    category: 'Zero Brokerage',
  },
];

