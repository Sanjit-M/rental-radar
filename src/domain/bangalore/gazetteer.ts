import { GoogleMapsUrl, makeGoogleMapsUrl } from '../prelude';

/** Canonical Bangalore residential and tech-corridor zones. */
export type BangaloreZone =
  | 'ORR & Bellandur'
  | 'HSR & Koramangala'
  | 'Indiranagar & Central'
  | 'Whitefield & East'
  | 'Sarjapur & Harlur'
  | 'South Bangalore'
  | 'North & Hebbal'
  | 'Bangalore General';

/** Exhaustive list of Bangalore zones for validation and UI filters. */
export const BANGALORE_ZONES: readonly BangaloreZone[] = [
  'ORR & Bellandur',
  'HSR & Koramangala',
  'Indiranagar & Central',
  'Whitefield & East',
  'Sarjapur & Harlur',
  'South Bangalore',
  'North & Hebbal',
  'Bangalore General',
] as const;

/** Metadata for a canonical Bangalore locality. */
export interface BangaloreLocalityEntry {
  readonly canonicalName: string;
  readonly zone: BangaloreZone;
  readonly lat: number;
  readonly lon: number;
  readonly isDirectToPtp: boolean;
  readonly aliases: readonly string[];
}

/** Metadata for a known gated apartment society in Bangalore. */
export interface KnownSociety {
  readonly name: string;
  readonly locality?: string;
  readonly zone?: BangaloreZone;
  readonly hasPool: boolean;
  readonly isGated: boolean;
  readonly hasPowerBackup: boolean;
  readonly isKadubeesanahalliDirect: boolean;
  readonly lat: number;
  readonly lon: number;
}

/** Resolved spatial and Google Maps metadata for a rental listing text. */
export interface ResolvedBangalorePlace {
  readonly zone: BangaloreZone;
  readonly locality: string;
  readonly society: string | null;
  readonly landmark: string | null;
  readonly lat: number;
  readonly lon: number;
  readonly isDirectToPtp: boolean;
  readonly societyMapsUrl?: GoogleMapsUrl | undefined;
  readonly landmarkMapsUrl?: GoogleMapsUrl | undefined;
  readonly localityMapsUrl: GoogleMapsUrl;
}

/**
 * Comprehensive catalog of Bangalore localities across all 8 metropolitan zones.
 */
export const BANGALORE_LOCALITIES: readonly BangaloreLocalityEntry[] = [
  // 1. ORR & Bellandur
  {
    canonicalName: 'Kadubeesanahalli',
    zone: 'ORR & Bellandur',
    lat: 12.9380,
    lon: 77.6925,
    isDirectToPtp: true,
    aliases: [
      'kadubeesanahalli',
      'kadubisanahalli',
      'kadhubesanahalli',
      'kadubeesanhalli',
      'kadubisanahali',
      'kadubeesanahali',
      'kaveriappa layout',
    ],
  },
  {
    canonicalName: 'Prestige Tech Park',
    zone: 'ORR & Bellandur',
    lat: 12.9385,
    lon: 77.6917,
    isDirectToPtp: true,
    aliases: ['prestige tech park', 'ptp', 'ptp back gate', 'ptp main gate'],
  },
  {
    canonicalName: 'Cessna Business Park',
    zone: 'ORR & Bellandur',
    lat: 12.9368,
    lon: 77.6910,
    isDirectToPtp: true,
    aliases: ['cessna business park', 'cessna park', 'cessna'],
  },
  {
    canonicalName: 'Devarabisanahalli',
    zone: 'ORR & Bellandur',
    lat: 12.9300,
    lon: 77.6880,
    isDirectToPtp: true,
    aliases: [
      'devarabisanahalli',
      'devarabeesanahalli',
      'devarabisana halli',
      'devarabeesanhalli',
      'devarabisanahali',
      'embassy tech village',
      'etv',
      'rmz ecoworld',
      'ecoworld',
    ],
  },
  {
    canonicalName: 'Bellandur',
    zone: 'ORR & Bellandur',
    lat: 12.9304,
    lon: 77.6784,
    isDirectToPtp: true,
    aliases: ['bellandur', 'ecospace', 'rmz ecospace', 'green glen', 'green glen layout', 'outer ring road', 'orr'],
  },
  {
    canonicalName: 'Marathahalli',
    zone: 'ORR & Bellandur',
    lat: 12.9460,
    lon: 77.6980,
    isDirectToPtp: true,
    aliases: ['marathahalli', 'marathalli', 'marathahali', 'marathali', 'munnekolala', 'spice garden'],
  },
  {
    canonicalName: 'Panathur',
    zone: 'ORR & Bellandur',
    lat: 12.9350,
    lon: 77.7000,
    isDirectToPtp: false,
    aliases: ['panathur', 'panathur road', 'balagere'],
  },
  {
    canonicalName: 'Boganahalli',
    zone: 'ORR & Bellandur',
    lat: 12.9310,
    lon: 77.6970,
    isDirectToPtp: true,
    aliases: ['boganahalli', 'bhoganahalli', 'boganahali', 'bhoganahali'],
  },
  {
    canonicalName: 'Kariyammana Agrahara',
    zone: 'ORR & Bellandur',
    lat: 12.9345,
    lon: 77.6950,
    isDirectToPtp: true,
    aliases: ['kariyammana agrahara', 'kariyammana', 'kariyamma agrahara'],
  },
  {
    canonicalName: 'Yemalur',
    zone: 'ORR & Bellandur',
    lat: 12.9485,
    lon: 77.6745,
    isDirectToPtp: true,
    aliases: ['yemalur', 'yamalur', 'kempapura'],
  },

  // 2. HSR & Koramangala
  {
    canonicalName: 'HSR Layout',
    zone: 'HSR & Koramangala',
    lat: 12.9121,
    lon: 77.6446,
    isDirectToPtp: true,
    aliases: [
      'hsr layout',
      'hsr',
      'hsr sector 1',
      'hsr sector 2',
      'hsr sector 3',
      'hsr sector 4',
      'hsr sector 6',
      'hsr sector 7',
      'agara',
    ],
  },
  {
    canonicalName: 'Koramangala',
    zone: 'HSR & Koramangala',
    lat: 12.9352,
    lon: 77.6245,
    isDirectToPtp: true,
    aliases: [
      'koramangala',
      'kormangala',
      'koramangla',
      'sony signal',
      'ejipura',
      'st bed layout',
      'jakkasandra',
    ],
  },
  {
    canonicalName: 'BTM Layout',
    zone: 'HSR & Koramangala',
    lat: 12.9166,
    lon: 77.6101,
    isDirectToPtp: true,
    aliases: ['btm layout', 'btm', 'btm 1st stage', 'btm 2nd stage', 'madiwala', 'silk board', 'tavarekere'],
  },

  // 3. Indiranagar & Central
  {
    canonicalName: 'Indiranagar',
    zone: 'Indiranagar & Central',
    lat: 12.9784,
    lon: 77.6408,
    isDirectToPtp: true,
    aliases: ['indiranagar', 'indira nagar', '100 ft road', 'cmh road', 'hal 2nd stage', 'hal 3rd stage', 'new tippasandra'],
  },
  {
    canonicalName: 'Domlur',
    zone: 'Indiranagar & Central',
    lat: 12.9610,
    lon: 77.6387,
    isDirectToPtp: true,
    aliases: ['domlur', 'egl', 'embassy golf links', 'murugeshpalya', 'old airport road'],
  },
  {
    canonicalName: 'CV Raman Nagar',
    zone: 'Indiranagar & Central',
    lat: 12.9855,
    lon: 77.6639,
    isDirectToPtp: true,
    aliases: ['cv raman nagar', 'c v raman nagar', 'bagmane tech park', 'kaggadasapura', 'baiyappanahalli'],
  },
  {
    canonicalName: 'Ulsoor',
    zone: 'Indiranagar & Central',
    lat: 12.9817,
    lon: 77.6285,
    isDirectToPtp: true,
    aliases: ['ulsoor', 'halasuru'],
  },
  {
    canonicalName: 'MG Road',
    zone: 'Indiranagar & Central',
    lat: 12.9756,
    lon: 77.6066,
    isDirectToPtp: true,
    aliases: ['mg road', 'brigade road', 'church street', 'richmond town', 'richmond road', 'vasanth nagar', 'lavelle road'],
  },
  {
    canonicalName: 'Frazer Town',
    zone: 'Indiranagar & Central',
    lat: 12.9970,
    lon: 77.6144,
    isDirectToPtp: true,
    aliases: ['frazer town', 'pulikeshi nagar', 'benson town', 'cooke town'],
  },
  {
    canonicalName: 'Cox Town',
    zone: 'Indiranagar & Central',
    lat: 12.9958,
    lon: 77.6269,
    isDirectToPtp: true,
    aliases: ['cox town', 'wheeler road'],
  },
  {
    canonicalName: 'Malleshwaram',
    zone: 'Indiranagar & Central',
    lat: 13.0031,
    lon: 77.5643,
    isDirectToPtp: true,
    aliases: ['malleshwaram', 'malleswaram', 'sadashivanagar'],
  },
  {
    canonicalName: 'Rajajinagar',
    zone: 'Indiranagar & Central',
    lat: 12.9982,
    lon: 77.5530,
    isDirectToPtp: true,
    aliases: ['rajajinagar', 'rajaji nagar', 'mahalakshmi layout', 'vijayanagar'],
  },

  // 4. Whitefield & East
  {
    canonicalName: 'Whitefield',
    zone: 'Whitefield & East',
    lat: 12.9698,
    lon: 77.7500,
    isDirectToPtp: false,
    aliases: ['whitefield', 'itpl', 'hope farm', 'kadugodi', 'immadihalli', 'nallurhalli', 'varthur'],
  },
  {
    canonicalName: 'Hoodi',
    zone: 'Whitefield & East',
    lat: 12.9918,
    lon: 77.7159,
    isDirectToPtp: true,
    aliases: ['hoodi', 'hoodi circle', 'garudacharpalya', 'seetharampalya'],
  },
  {
    canonicalName: 'Brookefield',
    zone: 'Whitefield & East',
    lat: 12.9654,
    lon: 77.7185,
    isDirectToPtp: true,
    aliases: ['brookefield', 'brookfield', 'aecs layout', 'beml layout'],
  },
  {
    canonicalName: 'Kundalahalli',
    zone: 'Whitefield & East',
    lat: 12.9682,
    lon: 77.7160,
    isDirectToPtp: true,
    aliases: ['kundalahalli', 'kundalahalli gate', 'kundanhalli'],
  },
  {
    canonicalName: 'Mahadevapura',
    zone: 'Whitefield & East',
    lat: 12.9905,
    lon: 77.6869,
    isDirectToPtp: true,
    aliases: ['mahadevapura', 'doddanekundi', 'doddanekkundi', 'bagmane constellation', 'kr puram', 'tin factory'],
  },

  // 5. Sarjapur & Harlur
  {
    canonicalName: 'Sarjapur Road',
    zone: 'Sarjapur & Harlur',
    lat: 12.9081,
    lon: 77.6856,
    isDirectToPtp: true,
    aliases: ['sarjapur road', 'sarjapur', 'sarjapura', 'carmelaram', 'doddakannelli', 'kaikondrahalli', 'kodathi', 'wipro sarjapur'],
  },
  {
    canonicalName: 'Harlur',
    zone: 'Sarjapur & Harlur',
    lat: 12.9010,
    lon: 77.6650,
    isDirectToPtp: true,
    aliases: ['harlur', 'haralur', 'harlur road', 'halalur', 'silver county', 'kudlu', 'kudlu gate', 'hosa road'],
  },
  {
    canonicalName: 'Kasavanahalli',
    zone: 'Sarjapur & Harlur',
    lat: 12.9048,
    lon: 77.6762,
    isDirectToPtp: true,
    aliases: ['kasavanahalli', 'kasavanhalli'],
  },

  // 6. South Bangalore
  {
    canonicalName: 'Electronic City',
    zone: 'South Bangalore',
    lat: 12.8452,
    lon: 77.6602,
    isDirectToPtp: false,
    aliases: ['electronic city', 'ecity', 'electronic city phase 1', 'electronic city phase 2', 'neeladri', 'bommanahalli'],
  },
  {
    canonicalName: 'Jayanagar',
    zone: 'South Bangalore',
    lat: 12.9308,
    lon: 77.5838,
    isDirectToPtp: true,
    aliases: ['jayanagar', 'jaya nagar', 'basavanagudi', 'wilson garden'],
  },
  {
    canonicalName: 'JP Nagar',
    zone: 'South Bangalore',
    lat: 12.9063,
    lon: 77.5857,
    isDirectToPtp: true,
    aliases: ['jp nagar', 'j p nagar', 'puttenahalli', 'konanakunte', 'kanakapura road'],
  },
  {
    canonicalName: 'Banashankari',
    zone: 'South Bangalore',
    lat: 12.9255,
    lon: 77.5468,
    isDirectToPtp: true,
    aliases: ['banashankari', 'bsk', 'kathriguppe', 'uttarahalli', 'rr nagar', 'rajarajeshwari nagar'],
  },
  {
    canonicalName: 'Bannerghatta Road',
    zone: 'South Bangalore',
    lat: 12.8872,
    lon: 77.5970,
    isDirectToPtp: true,
    aliases: ['bannerghatta road', 'bannerghatta', 'arekere', 'hulimavu', 'gottigere', 'bilekahalli'],
  },

  // 7. North & Hebbal
  {
    canonicalName: 'Hebbal',
    zone: 'North & Hebbal',
    lat: 13.0354,
    lon: 77.5988,
    isDirectToPtp: true,
    aliases: ['hebbal', 'sahakara nagar', 'rt nagar', 'sanjaynagar', 'kodigehalli'],
  },
  {
    canonicalName: 'Manyata',
    zone: 'North & Hebbal',
    lat: 13.0458,
    lon: 77.6202,
    isDirectToPtp: true,
    aliases: ['manyata', 'manyata tech park', 'nagawara', 'thanisandra', 'rachenahalli', 'jakkur'],
  },
  {
    canonicalName: 'Hennur',
    zone: 'North & Hebbal',
    lat: 13.0359,
    lon: 77.6431,
    isDirectToPtp: true,
    aliases: ['hennur', 'hennur road', 'hbr layout', 'horamavu'],
  },
  {
    canonicalName: 'Kalyan Nagar',
    zone: 'North & Hebbal',
    lat: 13.0240,
    lon: 77.6398,
    isDirectToPtp: true,
    aliases: ['kalyan nagar', 'hrbr layout', 'chelekere'],
  },
  {
    canonicalName: 'Kammanahalli',
    zone: 'North & Hebbal',
    lat: 13.0159,
    lon: 77.6380,
    isDirectToPtp: true,
    aliases: ['kammanahalli', 'lingarajapuram'],
  },
  {
    canonicalName: 'Banaswadi',
    zone: 'North & Hebbal',
    lat: 13.0104,
    lon: 77.6482,
    isDirectToPtp: true,
    aliases: ['banaswadi', 'ramamurthy nagar', 'kasturi nagar'],
  },
  {
    canonicalName: 'Yelahanka',
    zone: 'North & Hebbal',
    lat: 13.1007,
    lon: 77.5963,
    isDirectToPtp: true,
    aliases: ['yelahanka', 'yelahanka new town', 'vidyaranyapura', 'bagalur'],
  },
] as const;

/**
 * Rich catalog of known gated societies across Bangalore.
 * Preserves all 21 core ORR/PTP societies and adds major gated communities across all zones.
 */
export const KNOWN_SOCIETIES: Record<string, KnownSociety> = {
  // Core 21 ORR & Kadubeesanahalli societies
  sobhairis: {
    name: 'Sobha Iris',
    locality: 'Kadubeesanahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9372,
    lon: 77.6934,
  },
  sobhahibiscus: {
    name: 'Sobha Hibiscus',
    locality: 'Bellandur',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9358,
    lon: 77.6948,
  },
  sobhajasmine: {
    name: 'Sobha Jasmine',
    locality: 'Bellandur',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9365,
    lon: 77.6955,
  },
  assetzmarq: {
    name: 'Assetz Marq',
    locality: 'Kadubeesanahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9410,
    lon: 77.6960,
  },
  assetz: {
    name: 'Assetz East Point',
    locality: 'Kadubeesanahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9422,
    lon: 77.6980,
  },
  orchidlakeview: {
    name: 'Goyal Orchid Lakeview',
    locality: 'Bellandur',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9320,
    lon: 77.6890,
  },
  prestigesunnyside: {
    name: 'Prestige Sunnyside',
    locality: 'Kadubeesanahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9390,
    lon: 77.6950,
  },
  divyasree: {
    name: 'Divyasree 77 East',
    locality: 'Yemalur',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9450,
    lon: 77.6880,
  },
  sjr: {
    name: 'SJR Parkway Homes',
    locality: 'Kadubeesanahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9315,
    lon: 77.6920,
  },
  salarpuria: {
    name: 'Salarpuria Sattva',
    locality: 'Kadubeesanahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9360,
    lon: 77.6900,
  },
  salarpuriasanctity: {
    name: 'Salarpuria Sanctity',
    locality: 'Kadubeesanahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9345,
    lon: 77.6895,
  },
  adarshpalm: {
    name: 'Adarsh Palm Retreat',
    locality: 'Devarabisanahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9280,
    lon: 77.6860,
  },
  rohanjharoka: {
    name: 'Rohan Jharoka',
    locality: 'Yemalur',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9430,
    lon: 77.6850,
  },
  godrejreflections: {
    name: 'Godrej Reflections',
    locality: 'Harlur',
    zone: 'Sarjapur & Harlur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9305,
    lon: 77.6875,
  },
  snnrajlakeview: {
    name: 'SNN Raj Lakeview',
    locality: 'BTM Layout',
    zone: 'HSR & Koramangala',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9290,
    lon: 77.6840,
  },
  brenunity: {
    name: 'Bren Unity',
    locality: 'Kadubeesanahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9335,
    lon: 77.6975,
  },
  dsrwaterscape: {
    name: 'DSR Waterscape',
    locality: 'Kadubeesanahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9312,
    lon: 77.6955,
  },
  mantriespana: {
    name: 'Mantri Espana',
    locality: 'Devarabisanahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9300,
    lon: 77.6930,
  },
  vaswanireserve: {
    name: 'Vaswani Reserve',
    locality: 'Panathur',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9350,
    lon: 77.6990,
  },
  umiyacity: {
    name: 'Umiya City / Velocity',
    locality: 'Kadubeesanahalli',
    zone: 'ORR & Bellandur',
    hasPool: false,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9375,
    lon: 77.6910,
  },
  panathuroasis: {
    name: 'Panathur Gated Society',
    locality: 'Panathur',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: false,
    lat: 12.9340,
    lon: 77.7010,
  },

  // Extended City-Wide Bangalore Gated Societies
  prestigeshantiniketan: {
    name: 'Prestige Shantiniketan',
    locality: 'Whitefield',
    zone: 'Whitefield & East',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: false,
    lat: 12.9896,
    lon: 77.7279,
  },
  brigademetropolis: {
    name: 'Brigade Metropolis',
    locality: 'Mahadevapura',
    zone: 'Whitefield & East',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9935,
    lon: 77.7042,
  },
  prestigefernsresidency: {
    name: 'Prestige Ferns Residency',
    locality: 'Harlur',
    zone: 'Sarjapur & Harlur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9001,
    lon: 77.6632,
  },
  sobhaclassic: {
    name: 'Sobha Classic',
    locality: 'Harlur',
    zone: 'Sarjapur & Harlur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9056,
    lon: 77.6619,
  },
  mantriflora: {
    name: 'Mantri Flora',
    locality: 'Sarjapur Road',
    zone: 'Sarjapur & Harlur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9182,
    lon: 77.6689,
  },
  purvafountainsquare: {
    name: 'Purva Fountain Square',
    locality: 'Marathahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9525,
    lon: 77.7018,
  },
  prestigejindalcity: {
    name: 'Prestige Jindal City',
    locality: 'Rajajinagar',
    zone: 'Indiranagar & Central',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: false,
    lat: 13.0468,
    lon: 77.4932,
  },
  karlezenith: {
    name: 'Karle Zenith',
    locality: 'Manyata',
    zone: 'North & Hebbal',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: false,
    lat: 13.0435,
    lon: 77.6195,
  },
  nikoohomes: {
    name: 'Nikoo Homes',
    locality: 'Hennur',
    zone: 'North & Hebbal',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: false,
    lat: 13.0812,
    lon: 77.6385,
  },
  adarshpalmmeadows: {
    name: 'Adarsh Palm Meadows',
    locality: 'Whitefield',
    zone: 'Whitefield & East',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: false,
    lat: 12.9612,
    lon: 77.7375,
  },
  divyasreerepublic: {
    name: 'Divyasree Republic of Whitefield',
    locality: 'Brookefield',
    zone: 'Whitefield & East',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9735,
    lon: 77.7172,
  },
  salarpuriagreenage: {
    name: 'Salarpuria Greenage',
    locality: 'HSR Layout',
    zone: 'HSR & Koramangala',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.8998,
    lon: 77.6288,
  },
  brenimperia: {
    name: 'Bren Imperia',
    locality: 'Harlur',
    zone: 'Sarjapur & Harlur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.8975,
    lon: 77.6692,
  },
  sobhadreamacres: {
    name: 'Sobha Dream Acres',
    locality: 'Panathur',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: false,
    lat: 12.9401,
    lon: 77.7185,
  },
  prestigetechvista: {
    name: 'Prestige Tech Vista',
    locality: 'Kadubeesanahalli',
    zone: 'ORR & Bellandur',
    hasPool: true,
    isGated: true,
    hasPowerBackup: true,
    isKadubeesanahalliDirect: true,
    lat: 12.9378,
    lon: 77.6942,
  },
};

/**
 * Pure Google Maps search URL builder for a specific apartment society in Bangalore.
 */
export function buildSocietyMapsUrl(societyName: string, locality: string): GoogleMapsUrl {
  const cleanSociety = societyName.trim();
  const cleanLocality = locality.trim() || 'Bengaluru';
  const query = `${cleanSociety}, ${cleanLocality}, Bengaluru, Karnataka`;
  return makeGoogleMapsUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
}

/**
 * Pure Google Maps search URL builder for a specific landmark in Bangalore.
 */
export function buildLandmarkMapsUrl(landmark: string, locality: string): GoogleMapsUrl {
  const cleanLandmark = landmark.trim();
  const cleanLocality = locality.trim() || 'Bengaluru';
  const query = `${cleanLandmark}, ${cleanLocality}, Bengaluru, Karnataka`;
  return makeGoogleMapsUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
}

/**
 * Pure Google Maps search URL builder for a neighborhood or locality in Bangalore.
 */
export function buildLocalityMapsUrl(locality: string): GoogleMapsUrl {
  const cleanLocality = locality.trim() || 'Bengaluru';
  const query = `${cleanLocality}, Bengaluru, Karnataka`;
  return makeGoogleMapsUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractInlineLandmark(text: string): string | null {
  const landmarkPatterns = [
    /(?:near|opposite\s*(?:to)?|opp\s*(?:to)?|behind|close\s*to|next\s*to|beside)\s+([A-Za-z0-9\s&'-]{3,35})(?=[.,\n|$]|$)/i,
    /(?:landmark)\s*[:=-]?\s*([A-Za-z0-9\s&'-]{3,35})(?=[.,\n|$]|$)/i,
  ];

  for (const pat of landmarkPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const candidate = match[1].replace(/[,|].*$/, '').trim();
      if (candidate.length > 3 && !/^(rent|deposit|bhk|flat|room|male|female|broker|available)/i.test(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

/**
 * Resolves a raw post text (and optional existing location/society/landmark fields) into
 * a canonical Bangalore zone, locality, society, coordinates, and Google Maps deep links.
 */
export function resolveBangalorePlace(
  text: string,
  fallbackLocation?: string,
  explicitSociety?: string | null,
  explicitLandmark?: string | null
): ResolvedBangalorePlace {
  const combinedText = `${fallbackLocation ?? ''} ${explicitSociety ?? ''} ${text}`;
  const textLower = combinedText.toLowerCase();
  const textClean = textLower.replace(/[\s-]/g, '');

  let matchedSociety: KnownSociety | null = null;
  for (const [key, society] of Object.entries(KNOWN_SOCIETIES)) {
    if (textClean.includes(key) || textLower.includes(society.name.toLowerCase())) {
      matchedSociety = society;
      break;
    }
  }

  let matchedLocality: BangaloreLocalityEntry | null = null;

  // Prefer matching fallbackLocation first if provided and specific
  if (fallbackLocation) {
    const fbLower = fallbackLocation.toLowerCase().trim();
    for (const entry of BANGALORE_LOCALITIES) {
      if (
        entry.canonicalName.toLowerCase() === fbLower ||
        entry.aliases.some((alias) => alias === fbLower || new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i').test(fbLower))
      ) {
        matchedLocality = entry;
        break;
      }
    }
  }

  // Otherwise scan the full text for locality aliases
  if (!matchedLocality) {
    for (const entry of BANGALORE_LOCALITIES) {
      let found = false;
      for (const alias of entry.aliases) {
        if (alias === 'ptp' && /\bptp\s*(?:admin|moderator|group|rules?)\b/i.test(textLower) && !/\b(?:flat|room|bhk|rent|stay|near|in)\s+ptp\b/i.test(textLower)) {
          continue;
        }
        const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i');
        if (pattern.test(textLower)) {
          matchedLocality = entry;
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  const societyName = explicitSociety ?? matchedSociety?.name ?? null;
  const locality =
    matchedLocality?.canonicalName ??
    matchedSociety?.locality ??
    (fallbackLocation && fallbackLocation.trim().length > 0 ? fallbackLocation.trim() : 'Kadubeesanahalli');
  const zone: BangaloreZone =
    matchedLocality?.zone ?? matchedSociety?.zone ?? 'ORR & Bellandur';
  const lat = matchedSociety?.lat ?? matchedLocality?.lat ?? 12.9380;
  const lon = matchedSociety?.lon ?? matchedLocality?.lon ?? 77.6925;
  const isDirectToPtp = matchedSociety?.isKadubeesanahalliDirect ?? matchedLocality?.isDirectToPtp ?? true;
  const landmark = explicitLandmark ?? extractInlineLandmark(text);

  const localityMapsUrl = buildLocalityMapsUrl(locality);
  const societyMapsUrl = societyName ? buildSocietyMapsUrl(societyName, locality) : undefined;
  const landmarkMapsUrl = landmark ? buildLandmarkMapsUrl(landmark, locality) : undefined;

  return {
    zone,
    locality,
    society: societyName,
    landmark,
    lat,
    lon,
    isDirectToPtp,
    societyMapsUrl,
    landmarkMapsUrl,
    localityMapsUrl,
  };
}
