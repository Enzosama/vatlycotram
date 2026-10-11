import { LeaderboardEntry } from '../types';
import { STUDENT_ACCOUNTS, SCHOOLS, StudentAccount } from './studentAccounts';

// Bảng xếp hạng chỉ tính điểm bài kiểm tra cuối mỗi bài học (Official Exam) trên website.
// TUYỆT ĐỐI KHÔNG tính mini-test trong video hay câu hỏi luyện tập.
//
// Danh sách khởi tạo lấy từ 138 học sinh thật của 3 lớp (trích xuất từ file
// Excel bảng điểm môn Vật lí HK1 2026-2027). Điểm = 0 nghĩa là "chưa thi".

const SCHOOL_NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  SCHOOLS.map((s) => [s.code, s.name])
);

/**
 * Bộ ảnh đại diện — nguồn Pravatar (https://i.pravatar.cc), 70 ảnh đa dạng
 * nam/nữ/nhiều châu lục. Chọn theo hash của mã học sinh để ổn định qua các lần tải.
 * 138 học sinh / 70 ảnh -> trung bình ~2 người/ảnh, giảm mạnh trùng lặp so với pool 6 ảnh cũ.
 */
const AVATAR_POOL: string[] = Array.from(
  { length: 70 },
  (_, i) => `https://i.pravatar.cc/150?img=${i + 1}`
);

function pickAvatar(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return AVATAR_POOL[hash % AVATAR_POOL.length];
}

/**
 * Sinh danh sách xếp hạng ban đầu từ danh sách học sinh thật.
 * Mỗi học sinh 1 dòng, điểm 0 = chưa có bài thi nào.
 */
export function buildInitialLeaderboard(students: StudentAccount[] = STUDENT_ACCOUNTS): LeaderboardEntry[] {
  return students.map((s) => ({
    id: 'lb-' + s.id,
    rank: 0,
    studentName: s.name,
    avatar: pickAvatar(s.id),
    schoolName: SCHOOL_NAME_BY_CODE[s.schoolCode] || s.schoolCode,
    examScore: 0,
    maxScore: 100,
    completionTime: '—',
    submittedAt: '',
    examTitle: 'Chưa có bài thi nào',
    studentId: s.id,
    className: s.className,
    score10: 0,
    timeSeconds: 0,
    totalQuestions: 0,
    correctCount: 0,
  }));
}

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = buildInitialLeaderboard();

/**
 * Kiểm tra dữ liệu xếp hạng đọc từ localStorage có còn hợp lệ không.
 * Dữ liệu "legacy" (bảng 5 người giả lập cũ) sẽ bị reset và dựng lại
 * từ bài nộp thật để tránh hiển thị sai.
 */
export function isLegacyLeaderboard(list: unknown): boolean {
  if (!Array.isArray(list) || list.length === 0) return false;
  const validIds = new Set(INITIAL_LEADERBOARD.map((b) => b.studentId));
  return list.some((item) => {
    const entry = item as LeaderboardEntry;
    // Không khớp bất kỳ học sinh thật nào -> coi là dữ liệu giả lập cũ
    return !entry.studentId || !validIds.has(entry.studentId);
  });
}
