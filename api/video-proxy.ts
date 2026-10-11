import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * /api/video-proxy?id={driveFileId}
 *
 * Proxy stream video MP4 từ Google Drive để client `<video>` phát trực tiếp
 * (Drive trả CORP same-site → không dùng trực tiếp làm <video src> được).
 *
 * - Pass-through streaming (không buffer toàn bộ vào memory).
 * - Hỗ trợ Range requests (HTTP 206) để học sinh tua video.
 * - Forward Content-Type / Content-Length / Accept-Ranges từ Drive.
 *
 * LƯU Ý: file này chỉ chạy trên Vercel production. Khi dev local (vite dev),
 * vite.config.ts có `videoProxyDevPlugin()` chạy CÙNG logic này — 2 bản phải
 * đồng bộ khi sửa (xem vite.config.ts plugin video-proxy-dev).
 */

const DRIVE_DOWNLOAD_BASE = 'https://drive.usercontent.google.com/download';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: 'Missing or invalid id' });
  }

  const upstreamUrl = `${DRIVE_DOWNLOAD_BASE}?id=${encodeURIComponent(id)}&export=download&confirm=t`;

  try {
    // Forward Range header để Drive trả 206 (hỗ trợ seek)
    const fetchHeaders: Record<string, string> = {};
    const range = req.headers['range'];
    if (range) fetchHeaders['range'] = Array.isArray(range) ? range[0] : range;

    const upstream = await fetch(upstreamUrl, { headers: fetchHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).json({ error: 'Upstream fetch failed' });
    }

    // Forward headers cần thiết cho <video> player
    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    const contentLength = upstream.headers.get('content-length');
    const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';
    const contentRange = upstream.headers.get('content-range');

    res.status(upstream.status === 206 ? 206 : 200);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', acceptRanges);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    // Stream pass-through — Readable.fromWeb nhận ReadableStream, không nhận Reader
    if (!upstream.body) {
      return res.status(502).json({ error: 'Empty upstream body' });
    }

    const { Readable } = await import('node:stream');
    const nodeStream = Readable.fromWeb(upstream.body as any);
    nodeStream.pipe(res);
  } catch (e) {
    console.error('[api/video-proxy] error', e);
    return res.status(502).json({ error: 'Proxy error' });
  }
}
