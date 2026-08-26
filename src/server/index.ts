import { serve } from '@hono/node-server';
import { app } from './app';

const PORT = 3001;

console.log('='.repeat(60));
console.log(` 🚀 PTP & Kadubeesanahalli Rental Radar Backend API`);
console.log(` 📡 Server running on http://localhost:${PORT}`);
console.log('='.repeat(60));

serve({
  fetch: app.fetch,
  port: PORT,
});
