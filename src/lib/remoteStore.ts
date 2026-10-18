import seed from '../../api/data/seed.json';

/**
 * remoteStore — lớp đọc/ghi dữ liệu động dùng chung qua Vercel Serverless Function (/api/db).
 *
 * Thiết kế lai:
 * - Đọc/ghi qua API trước (dữ liệu dùng chung giữa mọi thiết bị).
 * - Nếu API lỗi (offline / chưa deploy / chưa setup Blob) -> fallback localStorage.
 * - Không bao giờ throw: luôn trả về dữ liệu hợp lệ để app không trắng trang.
 */

export interface RemoteDB {
  submissions: unknown[];
  grades: unknown[];
  posts: unknown[];
  examPackages: unknown[];
  customExams: unknown[];
  customQuizzes: unknown[];
  topStudents: unknown[];
  /** studentId -> email học sinh tự bổ sung */
  studentEmails: Record<string, string>;
}

const EMPTY_DB: RemoteDB = {
  submissions: [],
  grades: [],
  posts: [],
  examPackages: [],
  customExams: [],
  customQuizzes: [],
  topStudents: [],
  studentEmails: {},
};

/** API có sẵn không (tránh gọi lặp lại khi đã biết offline). */
let apiHealthy = true;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof fetch !== 'undefined';
}

/** Chuẩn hoá payload trả về từ API về đúng shape RemoteDB. */
function normalize(data: unknown): RemoteDB {
  if (!data || typeof data !== 'object') return { ...EMPTY_DB };
  const d = data as Partial<RemoteDB>;
  // studentEmails là object map -> chuẩn hoá riêng, loại giá trị rỗng
  const rawEmails = d.studentEmails;
  const studentEmails: Record<string, string> = {};
  if (rawEmails && typeof rawEmails === 'object' && !Array.isArray(rawEmails)) {
    for (const [k, v] of Object.entries(rawEmails as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) studentEmails[k] = v.trim().toLowerCase();
    }
  }
  return {
    submissions: Array.isArray(d.submissions) ? d.submissions : [],
    grades: Array.isArray(d.grades) ? d.grades : [],
    posts: Array.isArray(d.posts) ? d.posts : [],
    examPackages: Array.isArray(d.examPackages) ? d.examPackages : [],
    customExams: Array.isArray(d.customExams) ? d.customExams : [],
    customQuizzes: Array.isArray(d.customQuizzes) ? d.customQuizzes : [],
    topStudents: Array.isArray(d.topStudents) ? d.topStudents : [],
    studentEmails,
  };
}

/**
 * Tải toàn bộ dữ liệu động dùng chung.
 * Thứ tự ưu tiên: API -> seed.json (build sẵn, dùng khi API chưa có dữ liệu).
 */
export async function loadRemote(): Promise<RemoteDB> {
  if (!isBrowser() || !apiHealthy) {
    return normalize(seed);
  }
  try {
    const res = await fetch('/api/db', { method: 'GET' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    // Nếu API trả về toàn bộ rỗng (Blob chưa khởi tạo) -> dùng seed
    const norm = normalize(data);
    const isEmpty =
      norm.submissions.length === 0 &&
      norm.grades.length === 0 &&
      norm.posts.length === 0 &&
      norm.examPackages.length === 0 &&
      norm.customExams.length === 0 &&
      norm.customQuizzes.length === 0 &&
      norm.topStudents.length === 0;
    return isEmpty ? normalize(seed) : norm;
  } catch (e) {
    // API lỗi -> đánh dấu unhealthy, dùng seed. Không throw để app không hỏng.
    apiHealthy = false;
    return normalize(seed);
  }
}

/**
 * Ghi toàn bộ dữ liệu động lên API.
 * Trả về true nếu ghi thành công, false nếu thất bại (caller tự cache localStorage).
 */
export async function saveRemote(data: RemoteDB): Promise<boolean> {
  if (!isBrowser()) return false;
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    apiHealthy = true;
    return true;
  } catch (e) {
    apiHealthy = false;
    return false;
  }
}

/** Cho phép test/reset trạng thái apiHealthy. */
export function resetRemoteHealth(): void {
  apiHealthy = true;
}
