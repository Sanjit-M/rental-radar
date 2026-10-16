import { Schema } from 'effect';

/** Effect Schema for BangaloreZone. */
export const BangaloreZoneSchema = Schema.Literal(
  'ORR & Bellandur',
  'HSR & Koramangala',
  'Indiranagar & Central',
  'Whitefield & East',
  'Sarjapur & Harlur',
  'South Bangalore',
  'North & Hebbal',
  'Bangalore General'
);

/** Effect Schema for BHKType. */
export const BHKTypeSchema = Schema.Literal(
  '1 BHK',
  '2 BHK (Shared/Full)',
  '3 BHK (Shared/Full)',
  'Private Room / Flatmate'
);

/** Effect Schema for FurnishingStatus. */
export const FurnishingStatusSchema = Schema.Literal(
  'Fully Furnished',
  'Semi-Furnished',
  'Unfurnished',
  'Unknown'
);

/** Effect Schema for UserListingStatus. */
export const UserListingStatusSchema = Schema.Literal(
  'new',
  'interested',
  'called',
  'applied',
  'rejected'
);

/** Effect Schema for RatingTier. */
export const RatingTierSchema = Schema.Literal(
  'Unicorn',
  'Prime',
  'Solid',
  'Fair',
  '🔥 Unicorn Deal',
  '✨ Great Match',
  '⚡ Moderate Match',
  '⚠️ Low Match'
);

/** Effect Schema for CommuteWindow. */
export const CommuteWindowSchema = Schema.Struct({
  distanceKm: Schema.Number,
  inboundMins: Schema.Number,
  outboundMins: Schema.Number,
  twoWayAvgPeakMins: Schema.Number,
  hasPanathurUnderpassBottleneck: Schema.Boolean,
});

/** Effect Schema for ScoringBreakdown. */
export const ScoringBreakdownSchema = Schema.Struct({
  base: Schema.Number,
  rent: Schema.Number,
  brokerage: Schema.Number,
  deposit: Schema.Number,
  gatedSociety: Schema.Number,
  swimmingPool: Schema.Number,
  powerBackup: Schema.Number,
  attachedWashroom: Schema.Number,
  vegetarianPenalty: Schema.Number,
  bachelorMatch: Schema.Number,
  walkProximity: Schema.Number,
  furnished: Schema.Number,
  panathurBypass: Schema.Number,
  commute: Schema.Number,
});

/** Effect Schema for ExtractedEntities. */
export const ExtractedEntitiesSchema = Schema.Struct({
  rent: Schema.NullOr(Schema.Number),
  deposit: Schema.NullOr(Schema.Number),
  isBrokerage: Schema.Boolean,
  isGatedSociety: Schema.Boolean,
  societyName: Schema.NullOr(Schema.String),
  landmark: Schema.optional(Schema.NullOr(Schema.String)),
  hasSwimmingPool: Schema.Boolean,
  hasPowerBackup: Schema.Boolean,
  hasAttachedWashroom: Schema.Boolean,
  hasBalcony: Schema.Boolean,
  isVegetarianOnly: Schema.Boolean,
  isMaleBachelorAllowed: Schema.Boolean,
  isFemaleOnly: Schema.Boolean,
  isWalkingDistance: Schema.Boolean,
  furnishing: FurnishingStatusSchema,
  isKadubeesanahalliDirect: Schema.Boolean,
  contactPhone: Schema.NullOr(Schema.String),
  societyLat: Schema.optional(Schema.Number),
  societyLon: Schema.optional(Schema.Number),
  imageUrls: Schema.optional(Schema.Array(Schema.String)),
});

/** Effect Schema for RentalListing. */
export const RentalListingSchema = Schema.Struct({
  id: Schema.Number,
  fbPostId: Schema.String,
  groupId: Schema.optional(Schema.String),
  groupName: Schema.String,
  groupNames: Schema.optional(Schema.Array(Schema.String)),
  postCount: Schema.optional(Schema.Number),
  postUrl: Schema.String,
  authorName: Schema.String,
  postedTime: Schema.String,
  rawText: Schema.String,
  location: Schema.String,
  zone: Schema.optional(BangaloreZoneSchema),
  landmark: Schema.optional(Schema.NullOr(Schema.String)),
  societyMapsUrl: Schema.optional(Schema.String),
  landmarkMapsUrl: Schema.optional(Schema.String),
  localityMapsUrl: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  summary: Schema.optional(Schema.String),
  imageUrls: Schema.optional(Schema.Array(Schema.String)),
  bhkType: BHKTypeSchema,
  entities: ExtractedEntitiesSchema,
  commute: CommuteWindowSchema,
  score: Schema.Number,
  scoreBreakdown: ScoringBreakdownSchema,
  tier: RatingTierSchema,
  userStatus: UserListingStatusSchema,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

/** Effect Schema for FbGroup. */
export const FbGroupSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  url: Schema.String,
  memberCount: Schema.String,
  category: Schema.String,
  enabled: Schema.Boolean,
  listingsCount: Schema.Number,
  lastScrapedAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

/** Effect Schema for BangalorePlaceSummary. */
export const BangalorePlaceSummarySchema = Schema.Struct({
  zone: BangaloreZoneSchema,
  locality: Schema.String,
  societyName: Schema.NullOr(Schema.String),
  mapsUrl: Schema.String,
  listingCount: Schema.Number,
  medianRent: Schema.NullOr(Schema.Number),
  topScore: Schema.Number,
});
