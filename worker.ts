/**
 * Cloudflare Worker Entry Point with Static Assets support
 * Routes /api/* to the serverless backend handlers.
 * Static frontend files (JS, CSS, HTML) are handled by Cloudflare Static Assets.
 */
import { onRequest } from './functions/api/[[path]].ts';

interface Env {
  STATIC_ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  EARNHUB_KV?: any;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. Route API requests
    if (url.pathname.startsWith('/api/')) {
      return onRequest({ request, env, params: {} });
    }

    // 2. Route Static Assets (Vite build in dist/)
    const assetFetcher = env.STATIC_ASSETS || env.ASSETS;
    if (assetFetcher && typeof assetFetcher.fetch === 'function') {
      return assetFetcher.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
