import http from 'http';
import { main } from './dist/index.js';

const ONESHOT = process.env.WORKER_ONESHOT === '1';
const EVERY = Number(process.env.WORKER_EVERY_MS || 60000);
const PORT = Number(process.env.PORT) || 3000;

const run = async () => {
  try {
    await main();
    console.log('[diag] main() returned');
  } catch (e) {
    console.error('[diag] main() failed', e);
    process.exitCode = 1;
  }
};

if (ONESHOT) {
  run().finally(() => process.exit(process.exitCode || 0));
} else {
  const srv = http.createServer((_, res) => {
    res.writeHead(200);
    res.end('ok');
  });
  srv.listen(PORT, '0.0.0.0', () => console.log('[diag] web health listening on', PORT));

  run();
  setInterval(run, EVERY);
}
