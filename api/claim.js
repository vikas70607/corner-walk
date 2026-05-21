import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';

const redis = Redis.fromEnv();

// Unambiguous characters: no 0/O/1/I/L
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode() {
  const buf = randomBytes(4);
  return Array.from(buf).map(b => CHARS[b % CHARS.length]).join('');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const maxCodes   = Number(await redis.get('settings:maxCodes')) || 100;
    const totalCodes = Number(await redis.get('stats:totalCodes')) || 0;

    if (totalCodes >= maxCodes) {
      return res.status(403).json({ error: 'limit_reached' });
    }

    // Generate a unique code (collision-safe)
    let code;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
      if (attempts > 50) {
        return res.status(500).json({ error: 'generation_failed' });
      }
    } while (await redis.exists(`code:${code}`));

    // Persist the code and increment counter
    await redis.set(`code:${code}`, { claimedAt: Date.now(), used: false });
    await redis.incr('stats:totalCodes');

    return res.status(200).json({ code });
  } catch (err) {
    console.error('[/api/claim]', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
