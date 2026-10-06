import { Context, Effect, Layer } from 'effect';
import { ExtractedEntities, CommuteWindow } from '../types';
import { computeListingScore, ScoredListingResult } from '../scorer/ratingEngine';

/** Interface for the Effect ListingScorer service. */
export interface ListingScorerService {
  readonly scoreListing: (
    entities: ExtractedEntities,
    commute: CommuteWindow
  ) => Effect.Effect<ScoredListingResult>;
}

/** Context Tag for the ListingScorer service. */
export class ListingScorer extends Context.Tag('ListingScorer')<
  ListingScorer,
  ListingScorerService
>() {}

/** Live layer computing deterministic 0-100 rating scores. */
export const ListingScorerLive = Layer.succeed(ListingScorer, {
  scoreListing: (entities: ExtractedEntities, commute: CommuteWindow) =>
    Effect.sync(() => computeListingScore(entities, commute)),
});
