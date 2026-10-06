/**
 * Cloudflare Pages Functions - API Proxy & Handlers
 * Handles all requests matching /api/* on Cloudflare Pages edge network
 */

interface Env {
  EARNHUB_KV?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string) => Promise<void>;
  };
}

export async function onRequest(context: { request: Request; env: Env; params: any }): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Api-Key, api-key, Authorization',
      },
    });
  }

  const corsHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Api-Key, api-key, Authorization',
  };

  try {
    // 1. Health check
    if (pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'EarnHub Multi-App Manager (Cloudflare Pages)',
          runtime: 'Cloudflare Pages Functions / Workers Edge',
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // 2. Proxyrack Balance: POST /api/proxyrack/balance
    if (pathname === '/api/proxyrack/balance' && request.method === 'POST') {
      const apiKey = request.headers.get('api-key') || request.headers.get('Api-Key');
      if (!apiKey) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'Missing Api-Key header' }),
          { status: 401, headers: corsHeaders }
        );
      }

      let bodyData = {};
      try {
        bodyData = await request.json();
      } catch {
        bodyData = {};
      }

      const proxyRes = await fetch('https://peer.proxyrack.com/api/balance', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      const data = await proxyRes.json();
      return new Response(JSON.stringify(data), {
        status: proxyRes.status,
        headers: corsHeaders,
      });
    }

    // 3. Proxyrack Bandwidth: POST /api/proxyrack/bandwidth
    if (pathname === '/api/proxyrack/bandwidth' && request.method === 'POST') {
      const apiKey = request.headers.get('api-key') || request.headers.get('Api-Key');
      if (!apiKey) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'Missing Api-Key header' }),
          { status: 401, headers: corsHeaders }
        );
      }

      let reqBody: any = {};
      try {
        reqBody = await request.json();
      } catch {
        reqBody = {};
      }

      const rawDeviceId = reqBody.device_id || url.searchParams.get('device_id');
      let rawStart = reqBody.date_start || url.searchParams.get('date_start');
      let rawEnd = reqBody.date_end || url.searchParams.get('date_end');

      const cleanPayload: Record<string, string> = {};

      if (rawDeviceId && String(rawDeviceId).trim() !== '' && String(rawDeviceId).trim() !== 'ALL') {
        cleanPayload.device_id = String(rawDeviceId).trim();
      }

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

      const targetUrl = new URL('https://peer.proxyrack.com/api/bandwidth');
      if (cleanPayload.device_id) targetUrl.searchParams.set('device_id', cleanPayload.device_id);
      if (cleanPayload.date_start) targetUrl.searchParams.set('date_start', cleanPayload.date_start);
      if (cleanPayload.date_end) targetUrl.searchParams.set('date_end', cleanPayload.date_end);

      const proxyRes = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(cleanPayload),
      });

      const data = await proxyRes.json();
      return new Response(JSON.stringify(data), {
        status: proxyRes.status,
        headers: corsHeaders,
      });
    }

    // 4. Proxyrack Device Add: POST /api/proxyrack/device/add
    if (pathname === '/api/proxyrack/device/add' && request.method === 'POST') {
      const apiKey = request.headers.get('api-key') || request.headers.get('Api-Key');
      if (!apiKey) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'Missing Api-Key header' }),
          { status: 401, headers: corsHeaders }
        );
      }

      let reqBody: any = {};
      try {
        reqBody = await request.json();
      } catch {
        reqBody = {};
      }

      const { device_id, device_name } = reqBody;
      if (!device_id || !device_name) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'Thiếu device_id hoặc device_name bắt buộc.' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const proxyRes = await fetch('https://peer.proxyrack.com/api/device/add', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ device_id, device_name }),
      });

      const data = await proxyRes.json();
      return new Response(JSON.stringify(data), {
        status: proxyRes.status,
        headers: corsHeaders,
      });
    }

    // 5. Proxyrack Device Delete: POST /api/proxyrack/device/delete
    if (pathname === '/api/proxyrack/device/delete' && request.method === 'POST') {
      const apiKey = request.headers.get('api-key') || request.headers.get('Api-Key');
      if (!apiKey) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'Missing Api-Key header' }),
          { status: 401, headers: corsHeaders }
        );
      }

      let reqBody: any = {};
      try {
        reqBody = await request.json();
      } catch {
        reqBody = {};
      }

      const { device_id } = reqBody;
      if (!device_id) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'Thiếu device_id bắt buộc để xóa thiết bị.' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const proxyRes = await fetch('https://peer.proxyrack.com/api/device/delete', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ device_id }),
      });

      const data = await proxyRes.json();
      return new Response(JSON.stringify(data), {
        status: proxyRes.status,
        headers: corsHeaders,
      });
    }

    // 6. Proxyrack Device Status: POST /api/proxyrack/device/status
    if (pathname === '/api/proxyrack/device/status' && request.method === 'POST') {
      const apiKey = request.headers.get('api-key') || request.headers.get('Api-Key');
      if (!apiKey) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'Missing Api-Key header' }),
          { status: 401, headers: corsHeaders }
        );
      }

      let reqBody: any = {};
      try {
        reqBody = await request.json();
      } catch {
        reqBody = {};
      }

      const { device_id } = reqBody;
      if (!device_id) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'device_id là bắt buộc để kiểm tra trạng thái.' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const proxyRes = await fetch('https://peer.proxyrack.com/api/device/status', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ device_id }),
      });

      const data = await proxyRes.json();
      return new Response(JSON.stringify(data), {
        status: proxyRes.status,
        headers: corsHeaders,
      });
    }

    // 7. Storage State: GET /api/storage/state
    if (pathname === '/api/storage/state' && request.method === 'GET') {
      if (env?.EARNHUB_KV) {
        const stored = await env.EARNHUB_KV.get('earnhub_state');
        if (stored) {
          return new Response(stored, { status: 200, headers: corsHeaders });
        }
      }
      return new Response(
        JSON.stringify({ accounts: [], activeAccountId: '', devices: [] }),
        { status: 200, headers: corsHeaders }
      );
    }

    // 8. Storage Sync: POST /api/storage/sync
    if (pathname === '/api/storage/sync' && request.method === 'POST') {
      let bodyData: any = {};
      try {
        bodyData = await request.json();
      } catch {
        bodyData = {};
      }

      if (env?.EARNHUB_KV) {
        await env.EARNHUB_KV.put('earnhub_state', JSON.stringify(bodyData));
      }

      return new Response(
        JSON.stringify({
          status: 'ok',
          syncedAt: new Date().toISOString(),
          kvPersisted: Boolean(env?.EARNHUB_KV),
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Fallback: 404 for unknown /api route
    return new Response(
      JSON.stringify({ status: 'error', error: `Endpoint not found: ${pathname}` }),
      { status: 404, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: err.message || 'Lỗi xử lý yêu cầu tại Cloudflare Pages Functions',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}
