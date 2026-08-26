import { getRequestListener } from '@hono/node-server';
import { app } from '../src/server/app';

// Bridge standard Node.js serverless request/response to Hono
export default getRequestListener(app.fetch);
