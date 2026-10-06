import { Context, Effect, Layer } from 'effect';
import { RentalListing } from '../types';
import { deduplicateListings, areDuplicates } from '../parser/deduplicator';

/** Interface for the Effect ListingDeduplicator service. */
export interface ListingDeduplicatorService {
  readonly deduplicate: (
    listings: RentalListing[]
  ) => Effect.Effect<RentalListing[]>;

  readonly areDuplicates: (
    a: RentalListing,
    b: RentalListing
  ) => Effect.Effect<boolean>;
}

/** Context Tag for the ListingDeduplicator service. */
export class ListingDeduplicator extends Context.Tag('ListingDeduplicator')<
  ListingDeduplicator,
  ListingDeduplicatorService
>() {}

/** Live layer performing Jaccard 3-gram text and phone deduplication. */
export const ListingDeduplicatorLive = Layer.succeed(ListingDeduplicator, {
  deduplicate: (listings: RentalListing[]) =>
    Effect.sync(() => deduplicateListings(listings)),

  areDuplicates: (a: RentalListing, b: RentalListing) =>
    Effect.sync(() => areDuplicates(a, b)),
});
