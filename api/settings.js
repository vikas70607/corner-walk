import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const [maxCodes, totalCodes, usedCodes, lastReset] = await Promise.all([
        redis.get('cw:maxCodes'),
        redis.get('cw:total'),
        redis.get('cw:used'),
        redis.get('cw:lastReset'),
      ]);

      return res.status(200).json({
        maxCodes:   Number(maxCodes)   || 100,
        totalCodes: Number(totalCodes) || 0,
        usedCodes:  Number(usedCodes)  || 0,
        lastReset:  lastReset || null,
      });
    } catch (err) {
      console.error('[/api/settings GET]', err);
      return res.status(500).json({ error: 'server_error' });
    }
  }

  if (req.method === 'POST') {
    const { maxCodes } = req.body || {};
    const parsed = parseInt(maxCodes);

    if (isNaN(parsed) || parsed < 1 || parsed > 99999) {
      return res.status(400).json({ error: 'invalid_value' });
    }

    try {
      await redis.set('cw:maxCodes', parsed);
      return res.status(200).json({ success: true, maxCodes: parsed });
    } catch (err) {
      console.error('[/api/settings POST]', err);
      return res.status(500).json({ error: 'server_error' });
    }
  }

  return res.status(405).json({ error: 'method_not_allowed' });
}
