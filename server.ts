import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'EarnHub Multi-App Manager', timestamp: new Date().toISOString() });
  });

  // Proxyrack balance endpoint proxy
  app.post('/api/proxyrack/balance', async (req, res) => {
    const apiKey = (req.headers['api-key'] || req.headers['Api-Key']) as string;
    if (!apiKey) {
      return res.status(401).json({ status: 'error', error: 'Missing Api-Key header' });
    }

    try {
      console.log(`[Proxyrack API] POST https://peer.proxyrack.com/api/balance (Key: ${apiKey.slice(0, 6)}...)`);
      const response = await fetch('https://peer.proxyrack.com/api/balance', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(req.body || {}),
      });

      const data = await response.json();
      console.log(`[Proxyrack API] Balance response status: ${response.status}`);
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Proxyrack Balance API Error:', err);
      return res.status(502).json({
        status: 'error',
        error: err.message || 'Không thể kết nối đến máy chủ Proxyrack',
      });
    }
  });

  // Proxyrack bandwidth endpoint proxy
  app.post('/api/proxyrack/bandwidth', async (req, res) => {
    const apiKey = (req.headers['api-key'] || req.headers['Api-Key']) as string;
    if (!apiKey) {
      return res.status(401).json({ status: 'error', error: 'Missing Api-Key header' });
    }

    try {
      // Gather params from body or query
      const rawDeviceId = req.body?.device_id || req.query?.device_id;
      let rawStart = (req.body?.date_start || req.query?.date_start) as string | undefined;
      let rawEnd = (req.body?.date_end || req.query?.date_end) as string | undefined;

      const cleanPayload: Record<string, string> = {};

      // Device ID: only include if not empty and not ALL
      if (rawDeviceId && String(rawDeviceId).trim() !== '' && String(rawDeviceId).trim() !== 'ALL') {
        cleanPayload.device_id = String(rawDeviceId).trim();
      }

      // Date range: both must be provided and date_start MUST be before date_end
      if (rawStart || rawEnd) {
        if (rawStart && !rawEnd) {
          const d = new Date(rawStart);
          d.setDate(d.getDate() + 1);
          rawEnd = d.toISOString().split('T')[0];
        } else if (rawEnd && !rawStart) {
          const d = new Date(rawEnd);
          d.setDate(d.getDate() - 6);
          rawStart = d.toISOString().split('T')[0];
        }

        // If date_start >= date_end, adjust date_end to be start + 1 day
        if (rawStart && rawEnd && rawStart >= rawEnd) {
          const d = new Date(rawStart);
          d.setDate(d.getDate() + 1);
          rawEnd = d.toISOString().split('T')[0];
        }

        if (rawStart && rawEnd) {
          cleanPayload.date_start = rawStart;
          cleanPayload.date_end = rawEnd;
        }
      }

      // Build target URL with query parameters as specified in Proxyrack docs
      const targetUrl = new URL('https://peer.proxyrack.com/api/bandwidth');
      if (cleanPayload.device_id) targetUrl.searchParams.set('device_id', cleanPayload.device_id);
      if (cleanPayload.date_start) targetUrl.searchParams.set('date_start', cleanPayload.date_start);
      if (cleanPayload.date_end) targetUrl.searchParams.set('date_end', cleanPayload.date_end);

      console.log(`[Proxyrack API] POST ${targetUrl.toString()} Payload:`, cleanPayload);
      const response = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(cleanPayload),
      });

      const data = await response.json();
      console.log(`[Proxyrack API] Bandwidth response status: ${response.status}`);
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Proxyrack Bandwidth API Error:', err);
      return res.status(502).json({
        status: 'error',
        error: err.message || 'Không thể kết nối đến máy chủ Proxyrack',
      });
    }
  });

  // Proxyrack device/add endpoint proxy
  app.post('/api/proxyrack/device/add', async (req, res) => {
    const apiKey = (req.headers['api-key'] || req.headers['Api-Key']) as string;
    if (!apiKey) {
      return res.status(401).json({ status: 'error', error: 'Missing Api-Key header' });
    }

    const { device_id, device_name } = req.body || {};
    if (!device_id || !device_name) {
      return res.status(400).json({
        status: 'error',
        error: 'Thiếu device_id hoặc device_name bắt buộc.',
      });
    }

    try {
      const response = await fetch('https://peer.proxyrack.com/api/device/add', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ device_id, device_name }),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Proxyrack Device Add Error:', err);
      return res.status(502).json({
        status: 'error',
        error: err.message || 'Không thể kết nối đến máy chủ Proxyrack',
      });
    }
  });

  // Proxyrack device/delete endpoint proxy
  app.post('/api/proxyrack/device/delete', async (req, res) => {
    const apiKey = (req.headers['api-key'] || req.headers['Api-Key']) as string;
    if (!apiKey) {
      return res.status(401).json({ status: 'error', error: 'Missing Api-Key header' });
    }

    const { device_id } = req.body || {};
    if (!device_id) {
      return res.status(400).json({
        status: 'error',
        error: 'Thiếu device_id bắt buộc để xóa thiết bị.',
      });
    }

    try {
      console.log(`[Proxyrack API] POST https://peer.proxyrack.com/api/device/delete Payload:`, { device_id });
      const response = await fetch('https://peer.proxyrack.com/api/device/delete', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ device_id }),
      });

      const data = await response.json();
      console.log(`[Proxyrack API] Device delete response status: ${response.status}`, data);
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Proxyrack Device Delete Error:', err);
      return res.status(502).json({
        status: 'error',
        error: err.message || 'Không thể kết nối đến máy chủ Proxyrack',
      });
    }
  });

  // Proxyrack device/status endpoint proxy
  app.post('/api/proxyrack/device/status', async (req, res) => {
    const apiKey = (req.headers['api-key'] || req.headers['Api-Key']) as string;
    if (!apiKey) {
      return res.status(401).json({ status: 'error', error: 'Missing Api-Key header' });
    }

    const { device_id } = req.body || {};
    if (!device_id) {
      return res.status(400).json({
        status: 'error',
        error: 'device_id là bắt buộc để kiểm tra trạng thái.',
      });
    }

    try {
      const response = await fetch('https://peer.proxyrack.com/api/device/status', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ device_id }),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Proxyrack Device Status Error:', err);
      return res.status(502).json({
        status: 'error',
        error: err.message || 'Không thể kết nối đến máy chủ Proxyrack',
      });
    }
  });

  // Persistent Server-Side Storage Endpoints
  const DATA_DIR = path.resolve(__dirname, 'data');
  const STORAGE_FILE = path.resolve(DATA_DIR, 'earnhub_storage.json');

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.error('Failed to create data dir:', e);
    }
  }

  app.get('/api/storage/state', (req, res) => {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        return res.json(JSON.parse(raw));
      }
      return res.json({ accounts: [], activeAccountId: '', devices: [] });
    } catch (err: any) {
      console.error('Failed to read storage file:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/storage/sync', (req, res) => {
    try {
      const payload = req.body || {};
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
      return res.json({ status: 'ok', savedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error('Failed to write storage file:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Dev vs Prod Vite Integration
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.resolve(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production' || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`EarnHub server running at http://0.0.0.0:${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server');
    server.close(() => {
      process.exit(0);
    });
  });
}

startServer();
