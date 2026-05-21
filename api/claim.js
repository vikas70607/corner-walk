import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';

const redis = Redis.fromEnv();

// Unambiguous characters: no 0/O/1/I/L
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode() {
  const buf = randomBytes(4);
  return Array.from(buf).map(b => CHARS[b % CHARS.length]).join('');
}

function getISTDate() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function maybeReset() {
  const today     = getISTDate();
  const lastReset = await redis.get('cw:lastReset');
  if (lastReset === today) return;

  // Wipe all codes issued today and reset counters
  const codes = await redis.smembers('cw:codes');
  const pl    = redis.pipeline();
  for (const code of codes) pl.del(`code:${code}`);
  pl.del('cw:codes');
  pl.set('cw:total', 0);
  pl.set('cw:used',  0);
  pl.set('cw:lastReset', today);
  await pl.exec();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    await maybeReset();

    const maxCodes   = Number(await redis.get('cw:maxCodes')) || 100;
    const totalCodes = Number(await redis.get('cw:total'))    || 0;

    if (totalCodes >= maxCodes) {
      return res.status(403).json({ error: 'limit_reached' });
    }

    // Generate a collision-safe unique code
    let code, attempts = 0;
    do {
      code = generateCode();
      if (++attempts > 50) return res.status(500).json({ error: 'generation_failed' });
    } while (await redis.exists(`code:${code}`));

    const pl = redis.pipeline();
    pl.set(`code:${code}`, { claimedAt: Date.now(), used: false });
    pl.sadd('cw:codes', code);
    pl.incr('cw:total');
    await pl.exec();

    return res.status(200).json({ code });
  } catch (err) {
    console.error('[/api/claim]', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
