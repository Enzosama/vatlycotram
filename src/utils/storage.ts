import { LeaderboardEntry, ExamSubmission } from '../types';
import { INITIAL_LEADERBOARD, isLegacyLeaderboard } from '../data/topStudentsData';
import { saveStudentGrade } from './managementStorage';
import { loadRemote, saveRemote } from '../lib/remoteStore';

const STORAGE_KEYS = {
  COMPLETED_LESSONS: 'edulearn_completed_lessons_v1', // legacy (1 thiết bị = 1 tiến độ)
  USER_EXAM_RESULTS: 'edulearn_user_exam_results_v1',
  TOP_STUDENTS: 'edulearn_top_students_v1',
  CURRENT_STUDENT: 'edulearn_current_student_v1',
  ALL_STUDENTS: 'edulearn_all_students_v1',
  ALL_SUBMISSIONS: 'tqt_all_submissions_v1',
};

// ==================== HỌC SINH ====================

export interface StudentProfile {
  id: string;
  name: string;
  avatar: string;
  school: string;
  className?: string;
}

export const DEFAULT_STUDENT: StudentProfile = {
  id: 'hs-default',
  name: 'Võ Minh Nhật (Bạn)',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  school: 'THPT Chuyên Lê Quý Đôn',
  className: '10A1',
};

/** Các học sinh mẫu có sẵn để chuyển đổi nhanh (không cần đăng nhập). */
export const DEMO_STUDENTS: StudentProfile[] = [
  DEFAULT_STUDENT,
  {
    id: 'hs-002',
    name: 'Nguyễn Hoàng Long',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    school: 'THPT Chuyên Lê Hồng Phong',
    className: '10A2',
  },
  {
    id: 'hs-003',
    name: 'Trần Bảo Châu',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    school: 'THPT Chu Văn An',
    className: '10A3',
  },
];

function progressKey(studentId: string): string {
  return `edulearn_progress_${studentId}_v1`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(e);
    return fallback;
  }
}

/**
 * Lấy danh sách học sinh đã từng dùng trên thiết bị này.
 * Luôn bao gồm DEFAULT_STUDENT để tránh trạng thái rỗng.
 */
export function getAllStudents(): StudentProfile[] {
  const list = safeParse<StudentProfile[]>(localStorage.getItem(STORAGE_KEYS.ALL_STUDENTS), []);
  const hasDefault = list.some((s) => s.id === DEFAULT_STUDENT.id);
  return hasDefault ? list : [DEFAULT_STUDENT, ...list];
}

export function saveStudent(profile: StudentProfile): void {
  try {
    const list = getAllStudents();
    const idx = list.findIndex((s) => s.id === profile.id);
    if (idx >= 0) list[idx] = profile;
    else list.push(profile);
    localStorage.setItem(STORAGE_KEYS.ALL_STUDENTS, JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Lấy học sinh đang hoạt động.
 * Migration 1 lần: nếu chưa có học sinh nào nhưng đã có tiến độ legacy,
 * tạo profile mặc định và chuyển toàn bộ tiến độ cũ sang key của học sinh đó
 * để không mất dữ liệu người dùng đã học.
 */
export function getCurrentStudent(): StudentProfile {
  const stored = safeParse<StudentProfile | null>(
    localStorage.getItem(STORAGE_KEYS.CURRENT_STUDENT),
    null
  );
  if (stored && stored.id) {
    saveStudent(stored);
    return stored;
  }

  // Migration từ phiên bản cũ (tiến độ chung theo thiết bị)
  const legacy = safeParse<string[]>(localStorage.getItem(STORAGE_KEYS.COMPLETED_LESSONS), []);
  if (legacy.length > 0) {
    try {
      localStorage.setItem(progressKey(DEFAULT_STUDENT.id), JSON.stringify(legacy));
      localStorage.removeItem(STORAGE_KEYS.COMPLETED_LESSONS);
    } catch (e) {
      console.error(e);
    }
  }

  saveStudent(DEFAULT_STUDENT);
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(DEFAULT_STUDENT));
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_STUDENT;
}

export function setCurrentStudent(profile: StudentProfile): void {
  saveStudent(profile);
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(profile));
  } catch (e) {
    console.error(e);
  }
}

// ==================== TIẾN ĐỘ THEO TỪNG HỌC SINH ====================

/** Lấy danh sách bài đã hoàn thành của 1 học sinh cụ thể. */
export function getCompletedLessons(studentId?: string): string[] {
  const sid = studentId || getCurrentStudent().id;
  return safeParse<string[]>(localStorage.getItem(progressKey(sid)), []);
}

/** Ghi lại danh sách bài đã hoàn thành cho 1 học sinh cụ thể. */
export function saveCompletedLessons(lessonIds: string[], studentId?: string): void {
  const sid = studentId || getCurrentStudent().id;
  try {
    localStorage.setItem(progressKey(sid), JSON.stringify(lessonIds));
  } catch (e) {
    console.error(e);
  }
}

/** Đánh dấu 1 bài là đã hoàn thành (idempotent). */
export function markLessonCompleted(lessonId: string, studentId?: string): void {
  const sid = studentId || getCurrentStudent().id;
  const current = getCompletedLessons(sid);
  if (current.includes(lessonId)) return;
  saveCompletedLessons([...current, lessonId], sid);
}

/** Tổng % tiến độ của 1 học sinh trên toàn bộ nền tảng. */
export function getStudentOverallProgress(
  studentId: string,
  totalLessons: number
): { completed: number; total: number; percent: number } {
  const completed = getCompletedLessons(studentId).length;
  const percent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
  return { completed, total: totalLessons, percent };
}

// ==================== BẢNG XẾP HẠNG & BÀI NỘP ====================

/** Đọc toàn bộ bài nộp thi chính thức. */
function readSubmissions(): ExamSubmission[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALL_SUBMISSIONS);
    const list: ExamSubmission[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

function writeSubmissions(list: ExamSubmission[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ALL_SUBMISSIONS, JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
}

/** Điểm cao nhất hiện tại của 1 học sinh (để so sánh khi có bài mới). */
export function getStudentBestScore(studentId: string): ExamSubmission | null {
  const mine = readSubmissions().filter((s) => s.studentId === studentId);
  if (mine.length === 0) return null;
  return mine.reduce((best, cur) => (cur.score10 > best.score10 ? cur : best));
}

/** Toàn bộ bài nộp của 1 học sinh. */
export function getStudentSubmissions(studentId: string): ExamSubmission[] {
  return readSubmissions().filter((s) => s.studentId === studentId);
}

/** Số bài đã nộp của 1 khóa. */
export function getCourseSubmissionsCount(courseId: string, examTitle?: string): number {
  return readSubmissions().filter(
    (s) =>
      (s.courseId && s.courseId === courseId) ||
      (examTitle && s.examTitle && s.examTitle.toLowerCase() === examTitle.toLowerCase())
  ).length;
}

/**
 * Kiểm tra học sinh đã hoàn thành (nộp bài) bài kiểm tra cuối bài của khóa này chưa.
 * Dùng để khoá "làm duy nhất 1 lần" — không cho mở lại đề sau khi đã nộp.
 */
export function hasCompletedExam(studentId: string, courseId: string): boolean {
  return readSubmissions().some(
    (s) => s.studentId === studentId && s.courseId === courseId
  );
}

/**
 * Gom điểm cao nhất của mỗi học sinh rồi merge vào danh sách 138 học sinh.
 * Học sinh chưa thi vẫn xuất hiện với điểm 0.
 */
function buildRankedList(): LeaderboardEntry[] {
  const subs = readSubmissions();

  // Điểm cao nhất của mỗi học sinh
  const bestByStudent = new Map<string, ExamSubmission>();
  for (const s of subs) {
    const cur = bestByStudent.get(s.studentId);
    if (!cur || s.score10 > cur.score10 || (s.score10 === cur.score10 && s.timeSeconds < cur.timeSeconds)) {
      bestByStudent.set(s.studentId, s);
    }
  }

  const list: LeaderboardEntry[] = INITIAL_LEADERBOARD.map((base) => {
    const best = bestByStudent.get(base.studentId as string);
    if (!best) return { ...base };
    return {
      ...base,
      examScore: best.score,
      maxScore: best.maxScore,
      score10: best.score10,
      completionTime: best.completionTime,
      submittedAt: best.submittedAt,
      examTitle: best.examTitle,
      timeSeconds: best.timeSeconds,
      totalQuestions: best.totalQuestions,
      correctCount: best.correctCount,
    };
  });

  // Người có bài nộp nhưng không thuộc danh sách (phòng trường hợp dữ liệu cũ)
  const known = new Set(INITIAL_LEADERBOARD.map((b) => b.studentId));
  for (const [sid, best] of Array.from(bestByStudent.entries())) {
    if (known.has(sid)) continue;
    list.push({
      id: 'lb-' + sid,
      rank: 0,
      studentName: best.examTitle, // fallback, sẽ được ghi đè bởi caller nếu có
      avatar: INITIAL_LEADERBOARD[0]?.avatar || '',
      schoolName: '',
      examScore: best.score,
      maxScore: best.maxScore,
      score10: best.score10,
      completionTime: best.completionTime,
      submittedAt: best.submittedAt,
      examTitle: best.examTitle,
      studentId: sid,
      timeSeconds: best.timeSeconds,
      totalQuestions: best.totalQuestions,
      correctCount: best.correctCount,
    });
  }

  // Xếp hạng: điểm thang 10 giảm dần -> thời gian (giây) tăng dần -> thời điểm nộp tăng dần
  list.sort((a, b) => {
    const sa = a.score10 ?? 0;
    const sb = b.score10 ?? 0;
    if (sb !== sa) return sb - sa;
    const ta = a.timeSeconds ?? 0;
    const tb = b.timeSeconds ?? 0;
    if (ta !== tb) return ta - tb;
    return (a.submittedAt || '').localeCompare(b.submittedAt || '');
  });

  return list.map((item, index) => ({ ...item, rank: index + 1 }));
}

/** Đọc bảng xếp hạng. Tự reset nếu dữ liệu cũ là bảng 5 người giả lập. */
export function getTopStudents(): LeaderboardEntry[] {
  if (typeof localStorage === 'undefined') return buildRankedList();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TOP_STUDENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && !isLegacyLeaderboard(parsed)) {
        return parsed as LeaderboardEntry[];
      }
      // Dữ liệu cũ không hợp lệ -> dựng lại từ bài nộp thật
      const rebuilt = buildRankedList();
      localStorage.setItem(STORAGE_KEYS.TOP_STUDENTS, JSON.stringify(rebuilt));
      return rebuilt;
    }
  } catch (e) {
    console.error(e);
  }
  return buildRankedList();
}

/**
 * Ghi nhận kết quả kỳ thi chính thức và cập nhật bảng xếp hạng.
 * - Giữ điểm cao nhất của học sinh (bài mới điểm thấp hơn không đè bài cũ).
 * - Cùng điểm thì ai làm nhanh hơn xếp trước.
 * - Không hardcode số câu hỏi.
 */
export function registerOfficialExamResult(params: {
  studentId: string;
  studentName: string;
  schoolName: string;
  className?: string;
  avatar?: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  timeSeconds: number;
  examTitle: string;
  courseId?: string;
}): { isTop5: boolean; rank: number; updatedTop5: LeaderboardEntry[]; fullList: LeaderboardEntry[] } {
  const {
    studentId,
    studentName,
    schoolName,
    className,
    avatar,
    score,
    maxScore,
    correctCount,
    totalQuestions,
    timeSeconds,
    examTitle,
    courseId,
  } = params;

  const minutes = Math.floor(timeSeconds / 60);
  const seconds = timeSeconds % 60;
  const timeFormatted = `${minutes} phút ${seconds < 10 ? '0' : ''}${seconds} giây`;
  const score10 = maxScore > 0 ? Math.round((score / maxScore) * 100) / 10 : 0;
  const submittedAt =
    new Date().toLocaleDateString('vi-VN') +
    ' - ' +
    new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const submission: ExamSubmission = {
    id: 'sub-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    studentId,
    courseId: courseId || '',
    examTitle,
    score,
    maxScore,
    score10,
    correctCount,
    totalQuestions,
    completionTime: timeFormatted,
    timeSeconds,
    submittedAt,
  };

  // 1. Lưu bài nộp
  const subs = readSubmissions();
  subs.push(submission);
  writeSubmissions(subs);

  // 2. Chỉ cập nhật bảng nếu đây là điểm cao nhất của học sinh này
  const previousBest = getStudentBestScore(studentId);
  const isNewBest =
    !previousBest ||
    score10 > previousBest.score10 ||
    (score10 === previousBest.score10 && timeSeconds < previousBest.timeSeconds);

  if (isNewBest) {
    const classification =
      score10 >= 9.0
        ? 'Xuất sắc'
        : score10 >= 8.0
        ? 'Giỏi'
        : score10 >= 6.5
        ? 'Khá'
        : score10 >= 5.0
        ? 'Trung bình'
        : 'Yếu';

    try {
      saveStudentGrade({
        id: 'grd-' + Date.now(),
        studentId,
        studentName,
        schoolName,
        className: className || '10A1',
        courseId,
        examTitle,
        score,
        maxScore,
        score10,
        correctCount,
        totalQuestions,
        completionTime: timeFormatted,
        submittedAt: new Date().toISOString(),
        status: score10 >= 5.0 ? 'Đạt' : 'Chưa đạt',
        gradeClassification: classification,
        notes: `Học sinh đã làm bài trên hệ thống Lớp học Vật lí TQT.`,
      });
    } catch (err) {
      console.error(err);
    }
  }

  // 3. Dựng lại toàn bộ bảng xếp hạng từ bài nộp thật
  const fullList = buildRankedList();
  try {
    localStorage.setItem(STORAGE_KEYS.TOP_STUDENTS, JSON.stringify(fullList));
  } catch (e) {
    console.error(e);
  }

  const rank = fullList.findIndex((item) => item.studentId === studentId) + 1;

  return {
    isTop5: rank > 0 && rank <= 5,
    rank,
    updatedTop5: fullList.slice(0, 5),
    fullList,
  };
}

// ==================== ĐỒNG BỘ DỮ LIỆU DÙNG CHUNG (Vercel /api/db) ====================
// Lớp lai: đọc/ghi qua API để dùng chung giữa các thiết bị, đồng thời cache
// vào localStorage. Nếu API lỗi -> chỉ dùng localStorage (offline vẫn chạy).

/** Đọc bài nộp dùng chung từ API và ghi đè cache localStorage. */
export async function syncSubmissionsFromRemote(): Promise<ExamSubmission[]> {
  const db = await loadRemote();
  const remote = db.submissions as ExamSubmission[];
  // Merge: gộp bài nộp local + remote, khử trùng theo id
  const local = readSubmissions();
  const seen = new Set<string>();
  const merged: ExamSubmission[] = [];
  for (const s of [...remote, ...local]) {
    if (!s || typeof s.id !== 'string' || seen.has(s.id)) continue;
    seen.add(s.id);
    merged.push(s);
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.ALL_SUBMISSIONS, JSON.stringify(merged));
    } catch (e) {
      console.error(e);
    }
  }
  return merged;
}

/** Ghi toàn bộ bài nộp + bảng xếp hạng hiện tại lên API. */
export async function pushSubmissionsToRemote(): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  let db;
  try {
    db = await loadRemote();
  } catch (e) {
    return;
  }
  db.submissions = readSubmissions();
  db.topStudents = getTopStudents();
  await saveRemote(db);
}
