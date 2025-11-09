import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const startPath = new URL('../start.mjs', import.meta.url).pathname;

function runWorkerOnce(env: Record<string, string>) {
  return new Promise<{ code: number | null; out: string; err: string }>((resolve) => {
    const child = spawn(process.execPath, [startPath], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => {
      out += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      err += chunk.toString();
    });
    child.on('close', (code) => {
      resolve({ code, out, err });
    });
  });
}

describe('worker oneshot closed-session snapshot fallback', () => {
  if (!SB_URL || !SB_KEY) {
    it.skip('supabase env missing', () => {});
    return;
  }

  it('writes scan_run snapshot_backed=true when snapshots exist', async () => {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    await sb.from('snapshots').upsert({ symbol: 'SPY', asof: new Date().toISOString(), data: { p: 500 }, source: 'test' });
    const { code } = await runWorkerOnce({
      WORKER_ONESHOT: '1',
      WORKER_FORCE_SESSION: 'closed',
      WORKER_SYMBOLS: 'SPY,QQQ',
    });
    expect(code).toBe(0);
    const { data, error } = await sb
      .from('scan_jobs')
      .select('job_name,window_start,meta')
      .eq('job_name', 'scan_run')
      .order('window_start', { ascending: false })
      .limit(1);
    if (error) {
      throw new Error(error.message);
    }
    const row = data?.[0];
    expect(row).toBeTruthy();
    expect(row.meta?.session).toBe('closed');
    expect(row.meta?.snapshot_backed).toBe(true);
    expect(row.meta?.noop).toBe(false);
  });
});
