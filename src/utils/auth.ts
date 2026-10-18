import { STUDENT_ACCOUNTS, SCHOOLS, StudentAccount } from '../data/studentAccounts';
import { TEACHER_ACCOUNTS, TEACHER_DEFAULT_PASSWORD, TeacherAccount } from '../data/teacherAccounts';
export type { TeacherAccount } from '../data/teacherAccounts';

// ==================== XÁC THỰC HỌC SINH ====================
// Mật khẩu mặc định ban đầu cho mọi tài khoản.
export const DEFAULT_PASSWORD = 'abc@1234';

const AUTH_KEYS = {
  /** studentId -> mật khẩu đã đổi (chỉ lưu khi học sinh tự đổi) */
  PASSWORDS: 'edulearn_auth_passwords_v1',
  /** studentId -> true nếu đã đổi mật khẩu lần đầu */
  PASSWORD_CHANGED: 'edulearn_auth_pwd_changed_v1',
  /** studentId đang đăng nhập */
  SESSION: 'edulearn_auth_session_v1',
  /** studentId -> email học sinh tự nhập bổ sung */
  EMAILS: 'edulearn_auth_emails_v1',
  /** studentId -> timestamp truy cập cuối cùng (ms) */
  LAST_SEEN: 'edulearn_auth_last_seen_v1',
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(e);
    return fallback;
  }
}

function readMap(key: string): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  return safeParse<Record<string, string>>(localStorage.getItem(key), {});
}

function writeMap(key: string, map: Record<string, unknown>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    console.error(e);
  }
}

export interface SchoolOption {
  code: string;
  name: string;
  className: string;
}

/** Danh sách trường để học sinh chọn ở bước 1. */
export function getSchoolOptions(): SchoolOption[] {
  return SCHOOLS.map((s) => ({ code: s.code, name: s.name, className: s.className }));
}

/** Bỏ dấu tiếng Việt để tra cứu không phân biệt dấu. */
function stripAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/** Tra học sinh theo trường + từ khóa (tên hoặc email), không phân biệt hoa/thường và dấu. */
export function searchStudents(schoolCode: string, query: string): StudentAccount[] {
  const q = stripAccents(query.trim().toLowerCase());
  if (!q) return [];
  return STUDENT_ACCOUNTS.filter((s) => {
    if (schoolCode && s.schoolCode !== schoolCode) return false;
    const name = stripAccents(s.name.toLowerCase());
    const email = s.email ? stripAccents(s.email.toLowerCase()) : '';
    return name.includes(q) || email.includes(q);
  });
}

/** Lấy học sinh theo id. */
export function findStudentById(id: string): StudentAccount | undefined {
  return STUDENT_ACCOUNTS.find((s) => s.id === id);
}

/** Mật khẩu hiện hành của tài khoản (mặc định nếu chưa đổi). */
export function getCurrentPassword(studentId: string): string {
  const map = readMap(AUTH_KEYS.PASSWORDS);
  return map[studentId] || DEFAULT_PASSWORD;
}

/** Đã đổi mật khẩu lần đầu chưa? */
export function hasChangedPassword(studentId: string): boolean {
  const map = readMap(AUTH_KEYS.PASSWORD_CHANGED);
  return map[studentId] === '1';
}

/** Email hiện tại của HS: ưu tiên email đã nhập bổ sung, sau đó đến email gốc trong STUDENT_ACCOUNTS. */
export function getStudentEmail(studentId: string): string {
  const map = readMap(AUTH_KEYS.EMAILS);
  if (map[studentId]) return map[studentId];
  return findStudentById(studentId)?.email || '';
}

/** Lưu email HS tự nhập bổ sung vào localStorage. */
export function saveStudentEmail(studentId: string, email: string): void {
  const map = readMap(AUTH_KEYS.EMAILS);
  map[studentId] = email.toLowerCase().trim();
  writeMap(AUTH_KEYS.EMAILS, map);
}

// ==================== TÀI KHOẢN ĐÃ DÙNG TRÊN THIẾT BỊ NÀY ====================

/** Tài khoản đã từng đăng nhập trên thiết bị hiện tại (từ localStorage). */
export interface DeviceAccount {
  id: string;
  name: string;
  className: string;
  schoolCode: string;
  /** Đang là session hiện tại (chưa logout) */
  hasSession: boolean;
  /** Đã đổi mật khẩu lần đầu (từng hoàn tất đăng nhập) */
  passwordChanged: boolean;
  /** Timestamp truy cập cuối cùng (ms) — dùng để sort gần đây nhất */
  lastSeen: number;
}

/**
 * Liệt kê các tài khoản đã từng dùng trên thiết bị này — gộp từ
 * session + passwords + pwd_changed keys. Id không có trong STUDENT_ACCOUNTS
 * (vd hs-default dev bypass) bị loại. Sort: session trước, rồi đã đổi MK, rồi tên.
 */
export function getKnownAccountsOnDevice(): DeviceAccount[] {
  if (typeof localStorage === 'undefined') return [];

  const sessionId = localStorage.getItem(AUTH_KEYS.SESSION) || '';
  const pwdMap = readMap(AUTH_KEYS.PASSWORDS);
  const changedMap = readMap(AUTH_KEYS.PASSWORD_CHANGED);
  const lastSeenMap = readMap(AUTH_KEYS.LAST_SEEN);

  const ids = new Set<string>();
  if (sessionId) ids.add(sessionId);
  Object.keys(pwdMap).forEach((id) => ids.add(id));
  Object.keys(changedMap).forEach((id) => ids.add(id));
  Object.keys(lastSeenMap).forEach((id) => ids.add(id));

  const accounts: DeviceAccount[] = [];
  for (const id of ids) {
    const student = findStudentById(id);
    if (!student) continue; // bỏ id không hợp lệ (hs-default...)
    accounts.push({
      id: student.id,
      name: student.name,
      className: student.className,
      schoolCode: student.schoolCode,
      hasSession: id === sessionId,
      passwordChanged: changedMap[id] === '1' || !!pwdMap[id],
      lastSeen: Number(lastSeenMap[id] || 0),
    });
  }

  accounts.sort((a, b) => {
    if (a.hasSession !== b.hasSession) return a.hasSession ? -1 : 1;
    if (a.lastSeen !== b.lastSeen) return b.lastSeen - a.lastSeen; // gần đây nhất lên đầu
    if (a.passwordChanged !== b.passwordChanged) return a.passwordChanged ? -1 : 1;
    return a.name.localeCompare(b.name, 'vi');
  });
  return accounts;
}

/**
 * Xoá toàn bộ dấu vết đăng nhập trên thiết bị này (session + mật khẩu đã đổi
 * + email bổ sung). Dùng cho máy tính dùng chung — học sinh đăng xuất sạch sẽ
 * phải đăng nhập lại từ đầu (mật khẩu mặc định) ở lần sau.
 */
export function clearDeviceAuth(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_KEYS.SESSION);
    localStorage.removeItem(AUTH_KEYS.PASSWORDS);
    localStorage.removeItem(AUTH_KEYS.PASSWORD_CHANGED);
    localStorage.removeItem(AUTH_KEYS.EMAILS);
    localStorage.removeItem(AUTH_KEYS.LAST_SEEN);
  } catch (e) {
    console.error(e);
  }
}

export type AuthResult =
  | { ok: true; student: StudentAccount; mustChangePassword: boolean; error?: undefined }
  | { ok: false; error: string; student?: undefined; mustChangePassword?: undefined };

/** Cập nhật timestamp truy cập cuối cùng của học sinh. */
export function touchLastSeen(studentId: string): void {
  if (typeof localStorage === 'undefined') return;
  const map = readMap(AUTH_KEYS.LAST_SEEN);
  map[studentId] = String(Date.now());
  writeMap(AUTH_KEYS.LAST_SEEN, map);
}

/** Đăng nhập: kiểm tra mật khẩu. Nếu đúng và là mật khẩu mặc định -> bắt buộc đổi. */
export function login(studentId: string, password: string): AuthResult {
  const student = findStudentById(studentId);
  if (!student) {
    return { ok: false, error: 'Không tìm thấy tài khoản học sinh.' };
  }
  if (password !== getCurrentPassword(studentId)) {
    return { ok: false, error: 'Mật khẩu không đúng. Vui lòng thử lại.' };
  }
  const mustChangePassword = !hasChangedPassword(studentId);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(AUTH_KEYS.SESSION, studentId);
      touchLastSeen(studentId);
    } catch (e) {
      console.error(e);
    }
  }
  return { ok: true, student, mustChangePassword };
}

/**
 * Đổi mật khẩu. Mật khẩu mới phải khác mật khẩu mặc định và tối thiểu 6 ký tự.
 * Chấp nhận cả ID mặc định (hs-default) khi chưa bật đăng nhập.
 */
/** ID học sinh mặc định khi chưa bật đăng nhập (dùng để chỉnh web). */
export const FALLBACK_STUDENT_ID = 'hs-default';

/** Mọi tài khoản hợp lệ: học sinh trong danh sách hoặc ID mặc định. */
function isKnownStudent(studentId: string): boolean {
  return studentId === FALLBACK_STUDENT_ID || !!findStudentById(studentId);
}

export function changePassword(
  studentId: string,
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
): { ok: boolean; error?: string } {
  if (!isKnownStudent(studentId)) {
    return { ok: false, error: 'Không tìm thấy tài khoản học sinh.' };
  }
  if (oldPassword !== getCurrentPassword(studentId)) {
    return { ok: false, error: 'Mật khẩu hiện tại không đúng.' };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
  }
  if (newPassword === DEFAULT_PASSWORD) {
    return { ok: false, error: 'Mật khẩu mới phải khác mật khẩu mặc định.' };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: 'Xác nhận mật khẩu không khớp.' };
  }

  const pwdMap = readMap(AUTH_KEYS.PASSWORDS);
  pwdMap[studentId] = newPassword;
  writeMap(AUTH_KEYS.PASSWORDS, pwdMap);

  const changedMap = readMap(AUTH_KEYS.PASSWORD_CHANGED);
  changedMap[studentId] = '1';
  writeMap(AUTH_KEYS.PASSWORD_CHANGED, changedMap);

  return { ok: true };
}

/** Học sinh đang đăng nhập (nếu có). */
export function getSessionStudent(): StudentAccount | null {
  if (typeof localStorage === 'undefined') return null;
  const id = localStorage.getItem(AUTH_KEYS.SESSION);
  if (!id) return null;
  return findStudentById(id) || null;
}

/** Đăng xuất. */
export function logout(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_KEYS.SESSION);
  } catch (e) {
    console.error(e);
  }
}

// ==================== XÁC THỰC GIÁO VIÊN ====================

const TEACHER_AUTH_KEYS = {
  /** teacherId -> mật khẩu đã đổi */
  PASSWORDS: 'edulearn_teacher_passwords_v1',
  /** teacherId -> true nếu đã đổi mật khẩu lần đầu */
  PASSWORD_CHANGED: 'edulearn_teacher_pwd_changed_v1',
  /** teacherId đang đăng nhập */
  SESSION: 'edulearn_teacher_session_v1',
};

function readTeacherMap(key: string): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  return safeParse<Record<string, string>>(localStorage.getItem(key), {});
}

function writeTeacherMap(key: string, map: Record<string, unknown>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    console.error(e);
  }
}

/** Lấy giáo viên theo id. */
export function findTeacherById(id: string): TeacherAccount | undefined {
  return TEACHER_ACCOUNTS.find((t) => t.id === id);
}

/** Mật khẩu hiện hành của giáo viên (mặc định nếu chưa đổi). */
export function getTeacherPassword(teacherId: string): string {
  const map = readTeacherMap(TEACHER_AUTH_KEYS.PASSWORDS);
  return map[teacherId] || TEACHER_DEFAULT_PASSWORD;
}

/** Đã đổi mật khẩu lần đầu chưa? */
export function hasTeacherChangedPassword(teacherId: string): boolean {
  const map = readTeacherMap(TEACHER_AUTH_KEYS.PASSWORD_CHANGED);
  return map[teacherId] === '1';
}

/** Giáo viên đang đăng nhập (nếu có). */
export function getTeacherSession(): TeacherAccount | null {
  if (typeof localStorage === 'undefined') return null;
  const id = localStorage.getItem(TEACHER_AUTH_KEYS.SESSION);
  if (!id) return null;
  return findTeacherById(id) || null;
}

export type TeacherAuthResult =
  | { ok: true; teacher: TeacherAccount; mustChangePassword: boolean; error?: undefined }
  | { ok: false; error: string; teacher?: undefined; mustChangePassword?: undefined };

/** Đăng nhập giáo viên: kiểm tra mật khẩu. Nếu đúng và là mật khẩu mặc định -> bắt buộc đổi. */
export function teacherLogin(teacherId: string, password: string): TeacherAuthResult {
  const teacher = findTeacherById(teacherId);
  if (!teacher) {
    return { ok: false, error: 'Không tìm thấy tài khoản giáo viên.' };
  }
  if (password !== getTeacherPassword(teacherId)) {
    return { ok: false, error: 'Mật khẩu không đúng. Vui lòng thử lại.' };
  }
  const mustChangePassword = !hasTeacherChangedPassword(teacherId);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(TEACHER_AUTH_KEYS.SESSION, teacherId);
    } catch (e) {
      console.error(e);
    }
  }
  return { ok: true, teacher, mustChangePassword };
}

/** Đổi mật khẩu giáo viên. */
export function changeTeacherPassword(
  teacherId: string,
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
): { ok: boolean; error?: string } {
  if (!findTeacherById(teacherId)) {
    return { ok: false, error: 'Không tìm thấy tài khoản giáo viên.' };
  }
  if (oldPassword !== getTeacherPassword(teacherId)) {
    return { ok: false, error: 'Mật khẩu hiện tại không đúng.' };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
  }
  if (newPassword === TEACHER_DEFAULT_PASSWORD) {
    return { ok: false, error: 'Mật khẩu mới phải khác mật khẩu mặc định.' };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: 'Xác nhận mật khẩu không khớp.' };
  }

  const pwdMap = readTeacherMap(TEACHER_AUTH_KEYS.PASSWORDS);
  pwdMap[teacherId] = newPassword;
  writeTeacherMap(TEACHER_AUTH_KEYS.PASSWORDS, pwdMap);

  const changedMap = readTeacherMap(TEACHER_AUTH_KEYS.PASSWORD_CHANGED);
  changedMap[teacherId] = '1';
  writeTeacherMap(TEACHER_AUTH_KEYS.PASSWORD_CHANGED, changedMap);

  return { ok: true };
}

/** Đăng xuất giáo viên. */
export function teacherLogout(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(TEACHER_AUTH_KEYS.SESSION);
  } catch (e) {
    console.error(e);
  }
}

// ==================== HỒ SƠ CÁ NHÂN (tùy chỉnh) ====================

const PROFILE_KEY = 'edulearn_student_profile_v1';

/** Thông tin học sinh có thể tự chỉnh sửa. */
export interface CustomProfile {
  /** URL ảnh đại diện do học sinh tự đặt (ghi đè avatar mặc định) */
  avatar: string;
  /** Số điện thoại liên hệ */
  phone: string;
  /** Sở thích / mục tiêu học tập */
  bio: string;
}

const EMPTY_PROFILE: CustomProfile = { avatar: '', phone: '', bio: '' };

function readProfiles(): Record<string, CustomProfile> {
  if (typeof localStorage === 'undefined') return {};
  return safeParse<Record<string, CustomProfile>>(localStorage.getItem(PROFILE_KEY), {});
}

/** Lấy hồ sơ tùy chỉnh của 1 học sinh. */
export function getCustomProfile(studentId: string): CustomProfile {
  const all = readProfiles();
  const p = all[studentId];
  if (!p) return { ...EMPTY_PROFILE };
  return {
    avatar: p.avatar || '',
    phone: p.phone || '',
    bio: p.bio || '',
  };
}

/**
 * Lưu hồ sơ tùy chỉnh. Chỉ cập nhật field được truyền vào,
 * nên có thể gọi riêng cho avatar hoặc riêng cho mật khẩu/thông tin.
 */
export function saveCustomProfile(studentId: string, patch: Partial<CustomProfile>): CustomProfile {
  const all = readProfiles();
  const merged: CustomProfile = { ...EMPTY_PROFILE, ...(all[studentId] || {}), ...patch };
  all[studentId] = merged;
  writeMap(PROFILE_KEY, all);
  return merged;
}
