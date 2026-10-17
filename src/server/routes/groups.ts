import { Hono } from 'hono';
import { Effect, Either } from 'effect';
import {
  GroupRepository,
  GroupRepositoryLive,
  GroupNotFoundError,
} from '../../domain/services/RepositoryService';
import { makeGroupId } from '../../domain/types';

export const groupsRouter = new Hono();

groupsRouter.get('/', async (c) => {
  const program = Effect.gen(function* () {
    const repo = yield* GroupRepository;
    return yield* repo.getGroups();
  }).pipe(Effect.either, Effect.provide(GroupRepositoryLive));

  const result = await Effect.runPromise(program);
  if (Either.isLeft(result)) {
    return c.json({ error: result.left.message || 'Failed to fetch groups', groups: [] }, 500);
  }

  return c.json(result.right);
});

groupsRouter.post('/', async (c) => {
  let body: {
    id?: string;
    name?: string;
    url?: string;
    memberCount?: string;
    category?: string;
    enabled?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  if (!body.name || !body.url) {
    return c.json({ error: 'Both name and url are required' }, 400);
  }

  const name = body.name;
  const url = body.url;
  const id = makeGroupId(
    body.id ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
  );

  const program = Effect.gen(function* () {
    const repo = yield* GroupRepository;
    return yield* repo.upsertGroup({
      id,
      name,
      url,
      memberCount: body.memberCount || '',
      category: body.category || 'Rental & Flatmates',
      enabled: body.enabled ?? true,
      listingsCount: 0,
      lastScrapedAt: null,
    });
  }).pipe(Effect.either, Effect.provide(GroupRepositoryLive));

  const result = await Effect.runPromise(program);
  if (Either.isLeft(result)) {
    return c.json({ error: result.left.message || 'Failed to upsert group' }, 500);
  }

  return c.json({ success: true, group: result.right }, 201);
});

groupsRouter.patch('/:id', async (c) => {
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

  const program = Effect.gen(function* () {
    const repo = yield* GroupRepository;
    let nextEnabled = requestedEnabled;
    if (nextEnabled === undefined) {
      const existingGroups = yield* repo.getGroups();
      const existing = existingGroups.find((g) => g.id === id);
      if (!existing) {
        return yield* Effect.fail(
          new GroupNotFoundError({ id, message: `Facebook group "${id}" not found` })
        );
      }
      nextEnabled = !existing.enabled;
    }

    yield* repo.toggleGroup(id, nextEnabled);
    const refreshedGroups = yield* repo.getGroups();
    const updatedGroup = refreshedGroups.find((g) => g.id === id);

    return {
      success: true as const,
      id,
      enabled: nextEnabled,
      group: updatedGroup,
    };
  }).pipe(Effect.either, Effect.provide(GroupRepositoryLive));

  const result = await Effect.runPromise(program);
  if (Either.isLeft(result)) {
    if (result.left._tag === 'GroupNotFoundError') {
      return c.json({ error: 'Group not found' }, 404);
    }
    return c.json({ error: result.left.message || 'Failed to update group' }, 500);
  }

  return c.json(result.right);
});
