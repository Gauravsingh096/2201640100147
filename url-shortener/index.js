import express from 'express';
import { log, expressLogger } from '../logger/index.js';
import { nanoid } from 'nanoid';

const app = express();
app.use(express.json());

// In-memory store for URLs
const urlStore = new Map();
const statsStore = new Map();

// Helper: Validate URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// POST /shorturls - Create short URL
app.post('/shorturls', expressLogger('backend', 'info', 'service'), async (req, res) => {
  const { url, validity = 30, shortcode } = req.body;
  if (!url || !isValidUrl(url)) {
    await log('backend', 'error', 'service', 'Invalid URL');
    return res.status(400).json({ message: 'Invalid URL' });
  }
  if (validity && (!Number.isInteger(validity) || validity <= 0)) {
    await log('backend', 'error', 'service', 'Invalid validity');
    return res.status(400).json({ message: 'Validity must be a positive integer (minutes)' });
  }
  let code = shortcode || nanoid(6);
  if (shortcode) {
    if (!/^[a-zA-Z0-9]{3,20}$/.test(shortcode)) {
      await log('backend', 'error', 'service', 'Invalid shortcode format');
      return res.status(400).json({ message: 'Shortcode must be alphanumeric, 3-20 chars' });
    }
    if (urlStore.has(shortcode)) {
      await log('backend', 'error', 'service', 'Shortcode collision');
      return res.status(409).json({ message: 'Shortcode already exists' });
    }
    code = shortcode;
  } else {
    while (urlStore.has(code)) code = nanoid(6);
  }
  const now = new Date();
  const expiry = new Date(now.getTime() + validity * 60000);
  urlStore.set(code, { url, created: now, expiry });
  statsStore.set(code, []);
  await log('backend', 'info', 'service', `Shortened URL created: ${code}`);
  res.status(201).json({
    shortLink: `${req.protocol}://${req.get('host')}/${code}`,
    expiry: expiry.toISOString(),
  });
});

// GET /shorturls/:shortcode - Get stats
app.get('/shorturls/:shortcode', expressLogger('backend', 'info', 'service'), async (req, res) => {
  const { shortcode } = req.params;
  const entry = urlStore.get(shortcode);
  if (!entry) {
    await log('backend', 'error', 'service', 'Shortcode not found');
    return res.status(404).json({ message: 'Shortcode not found' });
  }
  const stats = statsStore.get(shortcode) || [];
  res.json({
    url: entry.url,
    created: entry.created,
    expiry: entry.expiry,
    clicks: stats.length,
    clickData: stats,
  });
});

// Redirect /:shortcode
app.get('/:shortcode', expressLogger('backend', 'info', 'service'), async (req, res) => {
  const { shortcode } = req.params;
  const entry = urlStore.get(shortcode);
  if (!entry) {
    await log('backend', 'error', 'service', 'Shortcode not found');
    return res.status(404).json({ message: 'Shortcode not found' });
  }
  if (new Date() > entry.expiry) {
    await log('backend', 'error', 'service', 'Shortcode expired');
    return res.status(410).json({ message: 'Shortcode expired' });
  }
  // Log click
  const click = {
    timestamp: new Date(),
    referrer: req.get('referer') || null,
    ip: req.ip,
  };
  statsStore.get(shortcode).push(click);
  await log('backend', 'info', 'service', `Redirected: ${shortcode}`);
  res.redirect(entry.url);
});

// Error handler
app.use(async (err, req, res, next) => {
  await log('backend', 'error', 'service', err.message || 'Unknown error');
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`URL Shortener running on port ${PORT}`);
});
