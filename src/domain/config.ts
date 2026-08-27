// Prestige Tech Park Anchor Coordinates (Kadubeesanahalli Main Gate)
export const PTP_COORDINATES = {
  name: 'Prestige Tech Park (PTP), Kadubeesanahalli',
  lat: 12.9385,
  lon: 77.6917,
};

// Known Gated Societies with verified attributes & coordinates for Leaflet OpenStreetMap
export interface KnownSociety {
  name: string;
  hasPool: boolean;
  isGated: boolean;
  hasPowerBackup: boolean;
  isKadubeesanahalliDirect: boolean;
  lat: number;
  lon: number;
}

export const KNOWN_SOCIETIES: Record<string, KnownSociety> = {
  sobhairis: {
    name: 'Sobha Iris',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9372,
    lon: 77.6934,
  },
  sobhahibiscus: {
    name: 'Sobha Hibiscus',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9358,
    lon: 77.6948,
  },
  sobhajasmine: {
    name: 'Sobha Jasmine',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9365,
    lon: 77.6955,
  },
  assetzmarq: {
    name: 'Assetz Marq',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9410,
    lon: 77.6960,
  },
  assetz: {
    name: 'Assetz East Point',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9422,
    lon: 77.6980,
  },
  orchidlakeview: {
    name: 'Goyal Orchid Lakeview',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9320,
    lon: 77.6890,
  },
  prestigesunnyside: {
    name: 'Prestige Sunnyside',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9390,
    lon: 77.6950,
  },
  divyasree: {
    name: 'Divyasree 77 East',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9450,
    lon: 77.6880,
  },
  sjr: {
    name: 'SJR Parkway Homes',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9315,
    lon: 77.6920,
  },
  salarpuria: {
    name: 'Salarpuria Sattva',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9360,
    lon: 77.6900,
  },
  umiyacity: {
    name: 'Umiya City / Velocity',
    hasPool: false,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9375,
    lon: 77.6910,
  },
  panathuroasis: {
    name: 'Panathur Gated Society',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: false,
    lat: 12.9340,
    lon: 77.7010,
  },
};

export const LOCALITY_COORDS: Record<string, { lat: number; lon: number; isDirect: boolean }> = {
  kadubeesanahalli: { lat: 12.9380, lon: 77.6925, isDirect: true },
  ptp: { lat: 12.9385, lon: 77.6917, isDirect: true },
  'prestige tech park': { lat: 12.9385, lon: 77.6917, isDirect: true },
  'ptp back gate': { lat: 12.9360, lon: 77.6960, isDirect: true },
  cessna: { lat: 12.9368, lon: 77.6910, isDirect: true },
  'cessna business park': { lat: 12.9368, lon: 77.6910, isDirect: true },
  devarabisanahalli: { lat: 12.9300, lon: 77.6880, isDirect: true },
  devarabeesanahalli: { lat: 12.9300, lon: 77.6880, isDirect: true },
  boganahalli: { lat: 12.9310, lon: 77.6970, isDirect: true },
  bhoganahalli: { lat: 12.9310, lon: 77.6970, isDirect: true },
  panathur: { lat: 12.9350, lon: 77.7000, isDirect: false },
  'panathur road': { lat: 12.9350, lon: 77.7000, isDirect: false },
  marathahalli: { lat: 12.9460, lon: 77.6980, isDirect: true },
  marathalli: { lat: 12.9460, lon: 77.6980, isDirect: true },
};

export const TARGET_LOCATIONS = [
  'kadubeesanahalli',
  'kadubisanahalli',
  'kadhubesanahalli',
  'prestige tech park',
  'ptp',
  'cessna business park',
  'cessna',
  'ptp back gate',
  'boganahalli',
  'bhoganahalli',
  'devarabisanahalli',
  'devarabeesanahalli',
  'devarabisana halli',
  'panathur',
  'panathur road',
  'marathahalli',
  'marathalli',
];

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
  'green glen layout',
  'green glen',
  'kariyammana agrahara',
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
