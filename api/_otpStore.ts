import { list, put } from '@vercel/blob';

/**
 * OTP store bền vững — thay cho Map trong bộ nhớ.
 *
 * VẤN ĐỀ ĐÃ SỬA: trên Vercel serverless, lần GỬI OTP và lần XÁC THỰC có thể
 * rơi vào 2 instance khác nhau. Map trong bộ nhớ là per-instance nên OTP có
 * thể "mất" một cách ngẫu nhiên (người dùng thấy "Không tìm thấy OTP" dù vừa
 * nhận mail). Store này lưu lên Vercel Blob nên mọi instance đọc được.
 *
 * THIẾT KẾ:
 * - Map trong bộ nhớ = fast path cho cùng instance.
 * - Blob = nguồn sự thật dùng chung. Đọc khi miss, ghi sau mỗi thay đổi.
 * - Không có BLOB_READ_WRITE_TOKEN -> chỉ dùng Map (hành vi cũ), không crash.
 *
 * LƯU Ý tên file bắt đầu bằng `_` nên Vercel không coi là endpoint.
 *
 * GIỚI HẠN ĐÃ BIẾT: ghi Blob không có transaction. Hai instance ghi đồng thời
 * có thể ghi đè nhau (last-write-wins). Với lưu lượng OTP của lớp học (vài
 * chục lượt/ngày) rủi ro này chấp nhận được; đã ghi rõ trong báo cáo.
 */

const OTP_BLOB_PATH = 'edulearn/otp-store.json';

// ---------- Hằng số chính sách OTP (dùng chung send-otp / verify-otp) ----------
export const OTP_TTL_MS = 5 * 60 * 1000;        // 5 phút
export const MAX_ATTEMPTS = 5;                  // tối đa 5 lần nhập sai
export const LOCK_DURATION_MS = 15 * 60 * 1000; // khóa 15 phút
export const RATE_LIMIT = 3;                    // tối đa 3 lần gửi / giờ
export const RATE_WINDOW_MS = 60 * 60 * 1000;   // 1 giờ

export interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
  lockedUntil: number;
  accountId: string;
  accountName: string;
  role: 'student' | 'teacher';
}

export interface RateEntry {
  count: number;
  windowStart: number;
}

interface StoreShape {
  otps: Record<string, OtpEntry>;
  rates: Record<string, RateEntry>;
}

// ---------- Seam tiêm phụ thuộc (cho test) ----------
export type BlobStoreIO = {
  read: () => Promise<StoreShape | null>;
  write: (data: StoreShape) => Promise<void>;
};

let injectedIO: BlobStoreIO | null = null;

/** Thay thế lớp đọc/ghi Blob (test). Truyền null để dùng Blob thật. */
export function setOtpBlobIO(io: BlobStoreIO | null): void {
  injectedIO = io;
}

// ---------- Blob IO thật ----------
function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function normalizeShape(raw: unknown): StoreShape {
  const out: StoreShape = { otps: {}, rates: {} };
  if (!raw || typeof raw !== 'object') return out;
  const d = raw as Record<string, unknown>;
  if (d.otps && typeof d.otps === 'object' && !Array.isArray(d.otps)) {
    for (const [k, v] of Object.entries(d.otps as Record<string, unknown>)) {
      const e = v as Partial<OtpEntry>;
      if (
        e &&
        typeof e.otp === 'string' &&
        typeof e.expiresAt === 'number' &&
        typeof e.accountId === 'string' &&
        (e.role === 'student' || e.role === 'teacher')
      ) {
        out.otps[k] = {
          otp: e.otp,
          expiresAt: e.expiresAt,
          attempts: typeof e.attempts === 'number' ? e.attempts : 0,
          lockedUntil: typeof e.lockedUntil === 'number' ? e.lockedUntil : 0,
          accountId: e.accountId,
          accountName: typeof e.accountName === 'string' ? e.accountName : '',
          role: e.role,
        };
      }
    }
  }
  if (d.rates && typeof d.rates === 'object' && !Array.isArray(d.rates)) {
    for (const [k, v] of Object.entries(d.rates as Record<string, unknown>)) {
      const e = v as Partial<RateEntry>;
      if (e && typeof e.count === 'number' && typeof e.windowStart === 'number') {
        out.rates[k] = { count: e.count, windowStart: e.windowStart };
      }
    }
  }
  return out;
}

async function blobRead(): Promise<StoreShape | null> {
  if (!hasBlobToken()) return null;
  try {
    const { blobs } = await list({ prefix: OTP_BLOB_PATH });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    if (!res.ok) return null;
    return normalizeShape(await res.json());
  } catch (e) {
    console.error('[api/_otpStore] blobRead', e);
    return null;
  }
}

async function blobWrite(data: StoreShape): Promise<void> {
  if (!hasBlobToken()) return;
  try {
    await put(OTP_BLOB_PATH, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
  } catch (e) {
    console.error('[api/_otpStore] blobWrite', e);
  }
}

// ---------- Bộ đệm trong bộ nhớ (fast path cùng instance) ----------
let memOtps: Record<string, OtpEntry> = {};
let memRates: Record<string, RateEntry> = {};
let loaded = false;

/** Đọc store vào bộ đệm. Gọi 1 lần đầu mỗi invocation. */
export async function loadStore(): Promise<void> {
  if (loaded) return;
  loaded = true;
  const io = injectedIO;
  const data = io ? await io.read() : await blobRead();
  if (data) {
    memOtps = { ...data.otps, ...memOtps };
    memRates = { ...data.rates, ...memRates };
  }
}

/** Ghi store hiện tại xuống Blob. */
export async function persistStore(): Promise<void> {
  const payload: StoreShape = { otps: memOtps, rates: memRates };
  const io = injectedIO;
  if (io) await io.write(payload);
  else await blobWrite(payload);
}

// ---------- API thao tác ----------

export function getOtp(email: string): OtpEntry | undefined {
  return memOtps[email];
}

export async function setOtp(email: string, entry: OtpEntry): Promise<void> {
  memOtps[email] = entry;
  await persistStore();
}

export async function deleteOtp(email: string): Promise<void> {
  delete memOtps[email];
  await persistStore();
}

export function getRate(email: string): RateEntry | undefined {
  return memRates[email];
}

export async function setRate(email: string, entry: RateEntry): Promise<void> {
  memRates[email] = entry;
  await persistStore();
}

/** Xoá sạch bộ đệm (test). Không đụng Blob. */
export function clearMemory(): void {
  memOtps = {};
  memRates = {};
  loaded = false;
}

/** Đặt lại cờ loaded để lần sau đọc lại Blob (mô phỏng cold start). */
export function resetLoadedFlag(): void {
  loaded = false;
}
