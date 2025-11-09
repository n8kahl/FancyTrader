import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { snapshotsRouter } from '../src/routes/snapshots.ts';
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

describe('/api/snapshots', () => {
  if (!SB_URL || !SB_KEY) {
    it.skip('supabase env missing', () => {});
    return;
  }
  const app = express();
  app.use('/api/snapshots', snapshotsRouter);

  beforeAll(async () => {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    await sb.from('snapshots').upsert([
      { symbol: 'SPY', asof: new Date().toISOString(), data: { p: 500.12 }, source: 'test' },
      { symbol: 'QQQ', asof: new Date().toISOString(), data: { p: 420.34 }, source: 'test' },
    ]);
  });

  it('returns snapshots map', async () => {
    const res = await request(app).get('/api/snapshots?symbol=SPY,QQQ').expect(200);
    expect(res.body.snapshots.SPY).toBeTruthy();
    expect(res.body.snapshots.QQQ).toBeTruthy();
  });

  it('400 without symbol', async () => {
    await request(app).get('/api/snapshots').expect(400);
  });
});
