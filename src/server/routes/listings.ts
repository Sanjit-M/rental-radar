import { Hono } from 'hono';
import { listingRepository, ListingQueryOptions } from '../../db/repository';
import { UserListingStatus } from '../../domain/types';

export const listingsRouter = new Hono();

listingsRouter.get('/', (c) => {
  const minScore = c.req.query('minScore') ? parseInt(c.req.query('minScore')!, 10) : undefined;
  const maxRent = c.req.query('maxRent') ? parseInt(c.req.query('maxRent')!, 10) : undefined;
  const bhkType = c.req.query('bhkType') || undefined;
  const furnishing = c.req.query('furnishing') || undefined;
  const userStatus = c.req.query('userStatus') || undefined;
  const search = c.req.query('search') || undefined;
  const sortBy = (c.req.query('sortBy') as any) || 'score_desc';

  const options: ListingQueryOptions = {
    minScore,
    maxRent,
    bhkType,
    furnishing,
    userStatus,
    search,
    sortBy,
  };

  const listings = listingRepository.getListings(options);
  return c.json({ count: listings.length, listings });
});

listingsRouter.get('/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const listing = listingRepository.getListingById(id);
  if (!listing) {
    return c.json({ error: 'Listing not found' }, 404);
  }

  return c.json(listing);
});

listingsRouter.patch('/:id/status', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const body = await c.req.json<{ status: UserListingStatus }>();
  const validStatuses: UserListingStatus[] = ['new', 'interested', 'called', 'applied', 'rejected'];
  if (!body.status || !validStatuses.includes(body.status)) {
    return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
  }

  const success = listingRepository.updateStatus(id, body.status);
  if (!success) {
    return c.json({ error: 'Failed to update status' }, 404);
  }

  const updated = listingRepository.getListingById(id);
  return c.json({ success: true, listing: updated });
});
