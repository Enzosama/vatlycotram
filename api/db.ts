import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list } from '@vercel/blob';

/**
 * /api/db — Vercel Serverless Function lưu trữ dữ liệu động dùng chung.
 *
 * - GET  /api/db -> trả JSON từ Vercel Blob (hoặc seed nếu Blob chưa có).
 * - POST /api/db -> ghi JSON lên Vercel Blob (addRandomSuffix:false để ghi đè cùng path).
 *
 * Blob là hạ tầng của Vercel. Nếu BLOB_READ_WRITE_TOKEN chưa được set,
 * endpoint tự fallback về dữ liệu rỗng để app (client) dùng seed/localStorage,
 * KHÔNG bao giờ trả lỗi làm trắng trang.
 */

const BLOB_PATH = 'edulearn/db.json';

const EMPTY_DB = {
  submissions: [],
  grades: [],
  posts: [],
  examPackages: [],
  customExams: [],
  customQuizzes: [],
  topStudents: [],
};

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function normalize(data: unknown) {
  if (!data || typeof data !== 'object') return EMPTY_DB;
  const d = data as Record<string, unknown>;
  const arr = (k: string) => (Array.isArray(d[k]) ? d[k] : []);
  return {
    submissions: arr('submissions'),
    grades: arr('grades'),
    posts: arr('posts'),
    examPackages: arr('examPackages'),
    customExams: arr('customExams'),
    customQuizzes: arr('customQuizzes'),
    topStudents: arr('topStudents'),
  };
}

async function readFromBlob(): Promise<unknown | null> {
  if (!hasBlobToken()) return null;
  try {
    const { blobs } = await list({ prefix: BLOB_PATH });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('[api/db] read blob error', e);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS cho cùng origin (SPA) — không cần wildcard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const data = await readFromBlob();
    if (data === null) {
      // Chưa có Blob hoặc chưa setup token -> trả rỗng, client dùng seed/localStorage
      return res.status(200).json(EMPTY_DB);
    }
    return res.status(200).json(normalize(data));
  }

  if (req.method === 'POST') {
    if (!hasBlobToken()) {
      // Chưa setup token -> không ghi được, trả 200 để client cache localStorage
      return res.status(200).json({ ok: false, persisted: false, reason: 'no_token' });
    }
    try {
      const body = normalize(req.body);
      await put(BLOB_PATH, JSON.stringify(body), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
      });
      return res.status(200).json({ ok: true, persisted: true });
    } catch (e) {
      console.error('[api/db] write blob error', e);
      return res.status(200).json({ ok: false, persisted: false });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
