import { Hono } from 'hono';
import { listingRepository } from '../../db/repository';
import { makeGroupId } from '../../domain/types';

export const groupsRouter = new Hono();

groupsRouter.get('/', async (c) => {
  try {
    const groups = await listingRepository.getGroups();
    return c.json(groups);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch groups';
    return c.json({ error: message, groups: [] }, 500);
  }
});

groupsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      id?: string;
      name?: string;
      url?: string;
      memberCount?: string;
      category?: string;
      enabled?: boolean;
    }>();

    if (!body.name || !body.url) {
      return c.json({ error: 'Both name and url are required' }, 400);
    }

    const id = makeGroupId(
      body.id ||
        body.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
    );

    const group = await listingRepository.upsertGroup({
      id,
      name: body.name,
      url: body.url,
      memberCount: body.memberCount || '',
      category: body.category || 'Rental & Flatmates',
      enabled: body.enabled ?? true,
      listingsCount: 0,
      lastScrapedAt: null,
    });

    return c.json({ success: true, group }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upsert group';
    return c.json({ error: message }, 500);
  }
});

groupsRouter.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Invalid group ID' }, 400);
    }

    let requestedEnabled: boolean | undefined;
    try {
      const body = await c.req.json<{ enabled?: boolean }>();
      if (typeof body.enabled === 'boolean') {
        requestedEnabled = body.enabled;
      }
    } catch {
      // Allow empty body to toggle
    }

    const existingGroups = await listingRepository.getGroups();
    const existing = existingGroups.find((g) => g.id === id);

    const nextEnabled =
      requestedEnabled !== undefined
        ? requestedEnabled
        : existing
          ? !existing.enabled
          : false;

    const updated = await listingRepository.toggleGroup(id, nextEnabled);
    if (!updated) {
      return c.json({ error: 'Group not found' }, 404);
    }

    const refreshedGroups = await listingRepository.getGroups();
    const updatedGroup = refreshedGroups.find((g) => g.id === id);

    return c.json({
      success: true,
      id,
      enabled: nextEnabled,
      group: updatedGroup,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update group';
    return c.json({ error: message }, 500);
  }
});
