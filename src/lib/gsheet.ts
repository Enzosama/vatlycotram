/**
 * gsheet — backup/khôi phục dữ liệu động EduLearn sang Google Sheet (Apps Script Web App).
 *
 * - URL Web App đọc từ biến môi trường VITE_GSHEET_URL (đặt trong .env, KHÔNG commit public).
 * - Nếu chưa cấu hình URL -> mọi hàm no-op trả false, app không bị ảnh hưởng.
 * - Không bao giờ throw: lỗi mạng chỉ log ra console để không phá luồng nộp bài.
 */

const GSH_URL = import.meta.env.VITE_GSHEET_URL as string | undefined;

/** Các key localStorage chứa dữ liệu động cần backup/restore. */
const DB_KEYS: Record<string, string> = {
  submissions: 'tqt_all_submissions_v1',
  grades: 'tqt_student_grades_v1',
  posts: 'tqt_management_posts_v1',
  examPackages: 'tqt_exam_packages_v2',
  customExams: 'tqt_custom_exams_v1',
  customQuizzes: 'tqt_custom_quizzes_v1',
  topStudents: 'edulearn_top_students_v1',
};

export function isGsheetConfigured(): boolean {
  return Boolean(GSH_URL);
}

function readLS(key: string): unknown[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeLS(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('[gsheet] writeLS', key, e);
  }
}

function collectDB(): Record<string, unknown[]> {
  const db: Record<string, unknown[]> = {};
  for (const [k, lsKey] of Object.entries(DB_KEYS)) db[k] = readLS(lsKey);
  return db;
}

/**
 * Đẩy toàn bộ dữ liệu động hiện tại (localStorage) lên Google Sheet.
 * @returns true nếu backup thành công.
 */
export async function backupToGsheet(): Promise<boolean> {
  if (!GSH_URL || typeof localStorage === 'undefined') return false;
  try {
    const res = await fetch(GSH_URL, {
      method: 'POST',
      // text/plain tránh CORS preflight; Apps Script vẫn đọc được postData
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(collectDB()),
      redirect: 'follow',
    });
    const data = await res.json();
    return Boolean(data && data.ok);
  } catch (e) {
    console.error('[gsheet] backup lỗi:', e);
    return false;
  }
}

/**
 * Kéo dữ liệu từ Google Sheet về và ghi đè vào localStorage.
 * Chỉ ghi đè collection nào Sheet có dữ liệu (tránh xoá mất khi Sheet rỗng).
 * @returns true nếu có dữ liệu được khôi phục.
 */
export async function restoreFromGsheet(): Promise<boolean> {
  if (!GSH_URL || typeof localStorage === 'undefined') return false;
  try {
    const res = await fetch(GSH_URL, { method: 'GET', redirect: 'follow' });
    const db = await res.json();
    let restored = false;
    for (const [k, lsKey] of Object.entries(DB_KEYS)) {
      if (db && Array.isArray(db[k]) && db[k].length > 0) {
        writeLS(lsKey, db[k]);
        restored = true;
      }
    }
    return restored;
  } catch (e) {
    console.error('[gsheet] restore lỗi:', e);
    return false;
  }
}
