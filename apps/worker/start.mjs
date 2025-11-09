import http from 'node:http';

process.on('unhandledRejection', e => console.error('[diag] unhandledRejection', e));
process.on('uncaughtException', e => console.error('[diag] uncaughtException', e));

const PORT  = Number(process.env.PORT) || 3000;
const every = Number(process.env.WORKER_EVERY_MS) || 60000;

// Minimal health server so Railway marks the service healthy
const srv = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
  } else {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('worker');
  }
});
srv.listen(PORT, '0.0.0.0', () => console.log('[diag] web health listening on', PORT));

// Load the compiled worker and loop it
import('./dist/index.js')
  .then((m) => {
    console.log('[diag] env', {
      MASSIVE_API_KEY: !!process.env.MASSIVE_API_KEY,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      WORKER_SYMBOLS: process.env.WORKER_SYMBOLS || 'SPY,QQQ',
      every
    });

    const run = () =>
      Promise.resolve(m.main())
        .then(() => console.log('[diag] main() returned'))
        .catch((e) => console.error('[diag] main() failed', e));

    run();                // run immediately
    setInterval(run, every); // and repeat
  })
  .catch((e) => {
    console.error('[diag] import failed', e);
    setTimeout(() => process.exit(1), 1000);
  });
