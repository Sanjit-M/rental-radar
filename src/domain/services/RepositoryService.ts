import { Context, Effect, Layer, Data } from 'effect';
import {
  RentalListing,
  DashboardStats,
  UserListingStatus,
  PaginatedListingsResponse,
} from '../types';
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

  readonly upsertListing: (
    listing: Omit<RentalListing, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string | undefined }
  ) => Effect.Effect<RentalListing, RepositoryError>;
}

/** Context Tag for the ListingRepository service. */
export class ListingRepository extends Context.Tag('ListingRepository')<
  ListingRepository,
  ListingRepositoryService
>() {}

/** Live production layer connecting the repository service to LibSQL/Turso storage. */
export const ListingRepositoryLive = Layer.succeed(ListingRepository, {
  getPaginatedListings: (options = {}) =>
    Effect.tryPromise({
      try: () => listingRepository.getPaginatedListings(options),
      catch: (cause) =>
        new RepositoryError({
          operation: 'getPaginatedListings',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    }),

  getListingById: (id: number) =>
    Effect.tryPromise({
      try: () => listingRepository.getListingById(id),
      catch: (cause) =>
        new RepositoryError({
          operation: 'getListingById',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    }).pipe(
      Effect.flatMap((listing) =>
        listing
          ? Effect.succeed(listing)
          : Effect.fail(
              new ListingNotFoundError({
                id,
                message: `Rental listing #${id} not found`,
              })
            )
      )
    ),

  updateStatus: (id: number, status: UserListingStatus) =>
    Effect.tryPromise({
      try: () => listingRepository.updateStatus(id, status),
      catch: (cause) =>
        new RepositoryError({
          operation: 'updateStatus',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    }),

  getStats: () =>
    Effect.tryPromise({
      try: () => listingRepository.getStats(),
      catch: (cause) =>
        new RepositoryError({
          operation: 'getStats',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    }),

  upsertListing: (listing: Omit<RentalListing, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string | undefined }) =>
    Effect.tryPromise({
      try: () => listingRepository.upsertListing(listing),
      catch: (cause) =>
        new RepositoryError({
          operation: 'upsertListing',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        }),
    }),
});
