import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Dev middleware: proxy stream video MP4 từ Google Drive.
 * Vite dev server KHÔNG chạy Vercel serverless functions (api/*.ts) —
 * rewrites trong vercel.json chỉ hoạt động trên production.
 * Plugin này chạy CÙNG logic với api/video-proxy.ts (production) nhưng chỉ lúc dev.
 */
function videoProxyDevPlugin(): Plugin {
  const DRIVE_DOWNLOAD_BASE = 'https://drive.usercontent.google.com/download';

  return {
    name: 'video-proxy-dev',
    configureServer(server) {
      server.middlewares.use('/api/video-proxy', async (req, res) => {
        try {
          const url = new URL(req.url || '', 'http://localhost');
          const id = url.searchParams.get('id') || '';

          if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing or invalid id' }));
            return;
          }

          const upstreamUrl = `${DRIVE_DOWNLOAD_BASE}?id=${encodeURIComponent(id)}&export=download&confirm=t`;

          // Forward Range header để Drive trả 206 (hỗ trợ seek)
          const fetchHeaders: Record<string, string> = {};
          const range = req.headers['range'];
          if (range) fetchHeaders['range'] = Array.isArray(range) ? range[0] : range;

          const upstream = await fetch(upstreamUrl, { headers: fetchHeaders });

          if (!upstream.ok && upstream.status !== 206) {
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Upstream fetch failed' }));
            return;
          }

          const contentType = upstream.headers.get('content-type') || 'video/mp4';
          const contentLength = upstream.headers.get('content-length');
          const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';
          const contentRange = upstream.headers.get('content-range');

          res.statusCode = upstream.status === 206 ? 206 : 200;
          res.setHeader('Content-Type', contentType);
          res.setHeader('Accept-Ranges', acceptRanges);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.setHeader('Access-Control-Allow-Origin', '*');
          if (contentLength) res.setHeader('Content-Length', contentLength);
          if (contentRange) res.setHeader('Content-Range', contentRange);

          if (!upstream.body) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'Empty upstream body' }));
            return;
          }

          // Stream pass-through — Web ReadableStream → Node ServerResponse
          const { Readable } = await import('node:stream');
          Readable.fromWeb(upstream.body as any).pipe(res);
        } catch (e) {
          console.error('[video-proxy-dev] error', e);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Proxy error' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), videoProxyDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
