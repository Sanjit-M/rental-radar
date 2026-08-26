export default async function handler(req: any, res: any) {
  try {
    const { getRequestListener } = await import('@hono/node-server');
    const { app } = await import('../src/server/app');
    const listener = getRequestListener(app.fetch);
    return listener(req, res);
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify(
        {
          error: 'Serverless Initialization Failure',
          message: err?.message || String(err),
          stack: err?.stack || null,
        },
        null,
        2
      )
    );
  }
}
