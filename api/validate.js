import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'missing_code' });
  }

  const normalised = code.toUpperCase().trim().slice(0, 4);
  if (!/^[A-Z0-9]{4}$/.test(normalised)) {
    return res.status(200).json({ status: 'invalid' });
  }

  try {
    const key  = `code:${normalised}`;
    const data = await redis.get(key);

    if (!data) {
      return res.status(200).json({ status: 'invalid' });
    }

    if (data.used) {
      return res.status(200).json({ status: 'used', usedAt: data.used });
    }

    // Mark as used and increment usage counter
    const usedAt = Date.now();
    await redis.set(key, { ...data, used: usedAt });
    await redis.incr('stats:usedCodes');

    return res.status(200).json({ status: 'valid' });
  } catch (err) {
    console.error('[/api/validate]', err);
    return res.status(500).json({ error: 'server_error', status: 'error' });
  }
}
