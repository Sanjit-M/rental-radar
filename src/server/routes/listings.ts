import { Hono } from 'hono';
import { listingRepository, ListingQueryOptions } from '../../db/repository';
import { seedInitialData } from '../../scraper/groupScraper';
import { UserListingStatus } from '../../domain/types';

export const listingsRouter = new Hono();

listingsRouter.get('/', async (c) => {
  try {
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

    let listings = await listingRepository.getListings(options);

    // Auto-seed if database is completely empty on first launch
    if (listings.length === 0 && !search && minScore === undefined && maxRent === undefined) {
      const allCount = (await listingRepository.getListings()).length;
      if (allCount === 0) {
        console.log('📦 Database is empty. Auto-seeding initial listings...');
        await seedInitialData();
        listings = await listingRepository.getListings(options);
      }
    }

    return c.json({ count: listings.length, listings });
  } catch (err: any) {
    console.error('Error fetching listings:', err);
    return c.json(
      {
        count: 0,
        listings: [],
        error: err.message || 'Database connection error',
        hint: 'Please ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are valid in your Vercel project settings.',
      },
      500
    );
  }
});

listingsRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID' }, 400);
    }

    const listing = await listingRepository.getListingById(id);
    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404);
    }

    return c.json(listing);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

listingsRouter.patch('/:id/status', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID' }, 400);
    }

    const body = await c.req.json<{ status: UserListingStatus }>();
    const validStatuses: UserListingStatus[] = ['new', 'interested', 'called', 'applied', 'rejected'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
    }

    const success = await listingRepository.updateStatus(id, body.status);
    if (!success) {
      return c.json({ error: 'Failed to update status' }, 404);
    }

    const updated = await listingRepository.getListingById(id);
    return c.json({ success: true, listing: updated });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});
