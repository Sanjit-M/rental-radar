import { Context, Effect, Layer, Data } from 'effect';
import {
  RentalListing,
  DashboardStats,
  UserListingStatus,
  PaginatedListingsResponse,
  FbGroup,
  BangalorePlaceSummary,
  ListingId,
} from '../types';
import { DEFAULT_FB_GROUPS } from '../config';
import { deduplicateListings } from '../parser/deduplicator';
import {
  resolveBangalorePlace,
  buildSocietyMapsUrl,
  buildLocalityMapsUrl,
} from '../bangalore/gazetteer';
import { listingRepository, ListingQueryOptions } from '../../db/repository';

/** Tagged error when a repository database operation fails. */
export class RepositoryError extends Data.TaggedError('RepositoryError')<{
  readonly operation: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/** Tagged error when a requested listing does not exist in the database. */
export class ListingNotFoundError extends Data.TaggedError('ListingNotFoundError')<{
  readonly id: number;
  readonly message: string;
}> {}

/** Tagged error when a requested Facebook group does not exist in the database. */
export class GroupNotFoundError extends Data.TaggedError('GroupNotFoundError')<{
  readonly id: string;
  readonly message: string;
}> {}

/** Interface for the Effect-based Rental Listing Repository Service. */
export interface ListingRepositoryService {
  readonly getPaginatedListings: (
    options?: ListingQueryOptions
  ) => Effect.Effect<PaginatedListingsResponse, RepositoryError>;

  readonly getListingById: (
    id: number
  ) => Effect.Effect<RentalListing, ListingNotFoundError | RepositoryError>;

  readonly updateStatus: (
    id: number,
    status: UserListingStatus
  ) => Effect.Effect<boolean, RepositoryError>;

  readonly getStats: () => Effect.Effect<DashboardStats, RepositoryError>;

  readonly getPlacesDirectory: () => Effect.Effect<BangalorePlaceSummary[], RepositoryError>;

  readonly upsertListing: (
    listing: Omit<RentalListing, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string | undefined }
  ) => Effect.Effect<RentalListing, RepositoryError>;
}

/** Interface for the Effect-based Facebook Group Repository Service. */
export interface GroupRepositoryService {
  readonly getGroups: () => Effect.Effect<FbGroup[], RepositoryError>;

  readonly upsertGroup: (
    group: Omit<FbGroup, 'createdAt' | 'updatedAt'>
  ) => Effect.Effect<FbGroup, RepositoryError>;

  readonly toggleGroup: (
    id: string,
    enabled: boolean
  ) => Effect.Effect<boolean, GroupNotFoundError | RepositoryError>;
}

/** Context Tag for the ListingRepository service. */
export class ListingRepository extends Context.Tag('ListingRepository')<
  ListingRepository,
  ListingRepositoryService
>() {
  static layerWithoutDependencies: Layer.Layer<ListingRepository>;
  static layer: Layer.Layer<ListingRepository>;
  static layerMemory: (initialListings?: readonly RentalListing[]) => Layer.Layer<ListingRepository>;
}

/** Context Tag for the GroupRepository service. */
export class GroupRepository extends Context.Tag('GroupRepository')<
  GroupRepository,
  GroupRepositoryService
>() {
  static layerWithoutDependencies: Layer.Layer<GroupRepository>;
  static layer: Layer.Layer<GroupRepository>;
  static layerMemory: (initialGroups?: readonly FbGroup[]) => Layer.Layer<GroupRepository>;
}

const makeListingRepositoryLive: Effect.Effect<ListingRepositoryService> = Effect.succeed({
  getPaginatedListings: Effect.fn('ListingRepository.getPaginatedListings')(function* (
    options: ListingQueryOptions = {}
  ) {
    return yield* Effect.tryPromise({
      try: () => listingRepository.getPaginatedListings(options),
      catch: (cause) =>
        new RepositoryError({
          operation: 'getPaginatedListings',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    });
  }),

  getListingById: Effect.fn('ListingRepository.getListingById')(function* (id: number) {
    const listing = yield* Effect.tryPromise({
      try: () => listingRepository.getListingById(id),
      catch: (cause) =>
        new RepositoryError({
          operation: 'getListingById',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    });
    if (!listing) {
      return yield* Effect.fail(
        new ListingNotFoundError({
          id,
          message: `Rental listing #${id} not found`,
        })
      );
    }
    return listing;
  }),

  updateStatus: Effect.fn('ListingRepository.updateStatus')(function* (
    id: number,
    status: UserListingStatus
  ) {
    return yield* Effect.tryPromise({
      try: () => listingRepository.updateStatus(id, status),
      catch: (cause) =>
        new RepositoryError({
          operation: 'updateStatus',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    });
  }),

  getStats: Effect.fn('ListingRepository.getStats')(function* () {
    return yield* Effect.tryPromise({
      try: () => listingRepository.getStats(),
      catch: (cause) =>
        new RepositoryError({
          operation: 'getStats',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    });
  }),

  getPlacesDirectory: Effect.fn('ListingRepository.getPlacesDirectory')(function* () {
    return yield* Effect.tryPromise({
      try: () => listingRepository.getPlacesDirectory(),
      catch: (cause) =>
        new RepositoryError({
          operation: 'getPlacesDirectory',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    });
  }),

  upsertListing: Effect.fn('ListingRepository.upsertListing')(function* (
    listing: Omit<RentalListing, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string | undefined }
  ) {
    return yield* Effect.tryPromise({
      try: () => listingRepository.upsertListing(listing),
      catch: (cause) =>
        new RepositoryError({
          operation: 'upsertListing',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    });
  }),
});

const makeGroupRepositoryLive: Effect.Effect<GroupRepositoryService> = Effect.succeed({
  getGroups: Effect.fn('GroupRepository.getGroups')(function* () {
    return yield* Effect.tryPromise({
      try: () => listingRepository.getGroups(),
      catch: (cause) =>
        new RepositoryError({
          operation: 'getGroups',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    });
  }),

  upsertGroup: Effect.fn('GroupRepository.upsertGroup')(function* (
    group: Omit<FbGroup, 'createdAt' | 'updatedAt'>
  ) {
    return yield* Effect.tryPromise({
      try: () => listingRepository.upsertGroup(group),
      catch: (cause) =>
        new RepositoryError({
          operation: 'upsertGroup',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    });
  }),

  toggleGroup: Effect.fn('GroupRepository.toggleGroup')(function* (
    id: string,
    enabled: boolean
  ) {
    const updated = yield* Effect.tryPromise({
      try: () => listingRepository.toggleGroup(id, enabled),
      catch: (cause) =>
        new RepositoryError({
          operation: 'toggleGroup',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    });
    if (!updated) {
      return yield* Effect.fail(
        new GroupNotFoundError({
          id,
          message: `Facebook group "${id}" not found`,
        })
      );
    }
    return true;
  }),
});

/** Honest in-memory implementation of ListingRepositoryService for deterministic unit tests. */
export function createListingRepositoryMemory(
  initialListings: readonly RentalListing[] = []
): Layer.Layer<ListingRepository> {
  return Layer.sync(ListingRepository, () => {
    const store = new Map<number, RentalListing>();
    let nextId = 1;
    for (const item of initialListings) {
      const id = Number(item.id) || nextId++;
      store.set(id, { ...item, id: id as ListingId });
      if (id >= nextId) nextId = id + 1;
    }

    return {
      getPaginatedListings: (options: ListingQueryOptions = {}) =>
        Effect.sync(() => {
          const page = Math.max(1, options.page ?? 1);
          const limit = Math.min(100, Math.max(1, options.limit ?? 12));
          const offset = (page - 1) * limit;

          let items = Array.from(store.values());
          if (options.minScore !== undefined) {
            items = items.filter((l) => l.score >= options.minScore!);
          }
          if (options.maxRent !== undefined) {
            items = items.filter((l) => l.entities.rent === null || l.entities.rent <= options.maxRent!);
          }
          if (options.zone && options.zone !== 'all') {
            items = items.filter((l) => (l.zone ?? 'ORR & Bellandur') === options.zone);
          }
          if (options.bhkType && options.bhkType !== 'all') {
            items = items.filter((l) => l.bhkType.includes(options.bhkType!));
          }
          if (options.furnishing && options.furnishing !== 'all') {
            items = items.filter((l) => l.entities.furnishing === options.furnishing);
          }
          if (options.userStatus && options.userStatus !== 'all') {
            items = items.filter((l) => l.userStatus === options.userStatus);
          }
          if (options.search) {
            const q = options.search.toLowerCase();
            items = items.filter((l) =>
              `${l.rawText} ${l.location} ${l.entities.societyName ?? ''} ${l.landmark ?? ''} ${l.authorName}`
                .toLowerCase()
                .includes(q)
            );
          }

          items.sort((a, b) => b.score - a.score);
          const canonical = deduplicateListings(items);
          const totalCount = canonical.length;
          const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);
          const listings = canonical.slice(offset, offset + limit);

          return {
            count: listings.length,
            totalCount,
            page,
            limit,
            totalPages,
            hasMore: page < totalPages,
            listings,
          };
        }),

      getListingById: (id: number) =>
        Effect.suspend(() => {
          const found = store.get(id);
          return found
            ? Effect.succeed(found)
            : Effect.fail(new ListingNotFoundError({ id, message: `Rental listing #${id} not found` }));
        }),

      updateStatus: (id: number, status: UserListingStatus) =>
        Effect.sync(() => {
          const existing = store.get(id);
          if (!existing) return false;
          store.set(id, { ...existing, userStatus: status, updatedAt: new Date().toISOString() });
          return true;
        }),

      getStats: () =>
        Effect.sync(() => {
          const all = Array.from(store.values());
          const rents = all.map((l) => l.entities.rent).filter((r): r is NonNullable<typeof r> => r !== null);
          const avgRent = rents.length > 0 ? Math.round(rents.reduce((a, b) => a + b, 0) / rents.length) : 0;
          const avgCommute =
            all.length > 0
              ? Math.round(all.reduce((a, b) => a + b.commute.twoWayAvgPeakMins, 0) / all.length)
              : 0;
          return {
            totalListings: all.length,
            unicornMatches: all.filter((l) => l.score >= 90).length,
            greatMatches: all.filter((l) => l.score >= 70 && l.score < 90).length,
            avgRent,
            avgPeakCommuteMins: avgCommute,
            gatedCount: all.filter((l) => l.entities.isGatedSociety).length,
            poolCount: all.filter((l) => l.entities.hasSwimmingPool).length,
            directOwnerCount: all.filter((l) => !l.entities.isBrokerage).length,
            lastScrapeTime: null,
          };
        }),

      getPlacesDirectory: () =>
        Effect.sync(() => {
          const all = Array.from(store.values());
          return all.map((l) => ({
            zone: l.zone ?? 'ORR & Bellandur',
            locality: l.location,
            societyName: l.entities.societyName,
            mapsUrl:
              l.societyMapsUrl ??
              l.localityMapsUrl ??
              (l.entities.societyName
                ? buildSocietyMapsUrl(l.entities.societyName, l.location)
                : buildLocalityMapsUrl(l.location)),
            listingCount: 1,
            medianRent: l.entities.rent !== null ? Number(l.entities.rent) : null,
            topScore: l.score,
          }));
        }),

      upsertListing: (input) =>
        Effect.sync(() => {
          const resolved = resolveBangalorePlace(
            input.rawText,
            input.location,
            input.entities.societyName,
            input.landmark
          );
          const now = new Date().toISOString();
          const existing = Array.from(store.values()).find((l) => l.fbPostId === input.fbPostId);
          const id = (existing ? Number(existing.id) : nextId++) as ListingId;
          const record: RentalListing = {
            ...input,
            id,
            zone: input.zone ?? resolved.zone,
            societyMapsUrl: input.societyMapsUrl ?? resolved.societyMapsUrl,
            landmarkMapsUrl: input.landmarkMapsUrl ?? resolved.landmarkMapsUrl,
            localityMapsUrl: input.localityMapsUrl ?? resolved.localityMapsUrl,
            createdAt: input.createdAt ?? existing?.createdAt ?? now,
            updatedAt: now,
          };
          store.set(Number(id), record);
          return record;
        }),
    };
  });
}

/** Honest in-memory implementation of GroupRepositoryService for deterministic unit tests. */
export function createGroupRepositoryMemory(
  initialGroups?: readonly FbGroup[]
): Layer.Layer<GroupRepository> {
  return Layer.sync(GroupRepository, () => {
    const now = new Date().toISOString();
    const seeds: FbGroup[] =
      initialGroups && initialGroups.length > 0
        ? [...initialGroups]
        : DEFAULT_FB_GROUPS.map((g) => ({
            id: g.id,
            name: g.name,
            url: g.url,
            memberCount: g.memberCount,
            category: g.category,
            enabled: true,
            listingsCount: 0,
            lastScrapedAt: null,
            createdAt: now,
            updatedAt: now,
          }));

    const store = new Map<string, FbGroup>(seeds.map((g) => [g.id, g]));

    return {
      getGroups: () => Effect.sync(() => Array.from(store.values())),
      upsertGroup: (group) =>
        Effect.sync(() => {
          const existing = store.get(group.id);
          const updated: FbGroup = {
            ...group,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          store.set(group.id, updated);
          return updated;
        }),
      toggleGroup: (id: string, enabled: boolean) =>
        Effect.suspend(() => {
          const existing = store.get(id);
          if (!existing) {
            return Effect.fail(new GroupNotFoundError({ id, message: `Facebook group "${id}" not found` }));
          }
          store.set(id, { ...existing, enabled, updatedAt: new Date().toISOString() });
          return Effect.succeed(true);
        }),
    };
  });
}

export const ListingRepositoryLive = Layer.effect(ListingRepository, makeListingRepositoryLive);
export const GroupRepositoryLive = Layer.effect(GroupRepository, makeGroupRepositoryLive);

ListingRepository.layerWithoutDependencies = ListingRepositoryLive;
ListingRepository.layer = ListingRepositoryLive;
ListingRepository.layerMemory = createListingRepositoryMemory;

GroupRepository.layerWithoutDependencies = GroupRepositoryLive;
GroupRepository.layer = GroupRepositoryLive;
GroupRepository.layerMemory = createGroupRepositoryMemory;
