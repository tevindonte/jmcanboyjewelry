import { describe, expect, it } from 'vitest';
import { POST } from './route';

function teethPlain(n: number): Record<string, string> {
  const ids = [
    'U1',
    'U2',
    'U3',
    'U4',
    'U5',
    'U6',
    'U7',
    'U8',
    'L1',
    'L2',
    'L3',
    'L4',
    'L5',
    'L6',
    'L7',
    'L8',
  ];
  const teeth: Record<string, string> = {};
  for (let i = 0; i < n; i++) teeth[ids[i]] = 'plain';
  return teeth;
}

async function postEstimate(body: unknown) {
  const req = new Request('http://localhost/api/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, json };
}

describe('POST /api/estimate', () => {
  it('returns only low and high for 10k 6 plain', async () => {
    const { status, json } = await postEstimate({
      metal: 'gold',
      goldKarat: 10,
      teeth: teethPlain(6),
    });
    expect(status).toBe(200);
    expect(Object.keys(json).sort()).toEqual(['high', 'low']);
    expect(json.low).toBe(950);
    expect(json.high).toBe(1150);
  });

  it('returns only low and high for 10k 16 plain', async () => {
    const { json } = await postEstimate({
      metal: 'gold10k',
      teeth: teethPlain(16),
    });
    expect(Object.keys(json).sort()).toEqual(['high', 'low']);
    expect(json.low).toBe(2350);
    expect(json.high).toBe(2750);
  });

  it('14k and platinum return numeric bands with only low/high', async () => {
    const fourteen = await postEstimate({
      metal: 'gold',
      goldKarat: 14,
      teeth: teethPlain(6),
    });
    const plat = await postEstimate({
      metal: 'platinum',
      teeth: teethPlain(6),
    });
    expect(Object.keys(fourteen.json).sort()).toEqual(['high', 'low']);
    expect(Object.keys(plat.json).sort()).toEqual(['high', 'low']);
    expect(fourteen.json.low).toBeGreaterThan(950);
    expect(plat.json.low).toBeGreaterThan(2000);
  });

  it('plating returns no estimate (null low/high only)', async () => {
    const { json } = await postEstimate({
      metal: 'plating',
      teeth: teethPlain(6),
    });
    expect(Object.keys(json).sort()).toEqual(['high', 'low']);
    expect(json.low).toBeNull();
    expect(json.high).toBeNull();
  });
});
