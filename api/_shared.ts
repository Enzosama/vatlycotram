import { list } from '@vercel/blob';
import nodemailer from 'nodemailer';
import { STUDENT_ACCOUNTS } from '../src/data/studentAccounts';
import { TEACHER_ACCOUNTS } from '../src/data/teacherAccounts';

/**
 * Helper dùng chung cho các Serverless Function trong api/.
 *
 * LƯU Ý: tên file bắt đầu bằng `_` nên Vercel KHÔNG coi đây là endpoint
 * (theo tài liệu Vercel: "Adding utility files to the /api directory —
 * Files that start with an underscore, _"). Đừng đổi tên bỏ dấu gạch dưới.
 */

const BLOB_PATH = 'edulearn/db.json';

// ==================== SEAM TIÊM PHỤ THUỘC ====================
// Cho phép thay thế ở ranh giới ngoài (Gmail SMTP, Vercel Blob) khi test,
// và để dành cho luồng nhập email hàng loạt về sau. Mặc định null = dùng thật.

export type MailSender = (opts: { to: string; subject: string; html: string }) => Promise<unknown>;
export type StudentEmailReader = () => Promise<Record<string, string>>;

let injectedMailSender: MailSender | null = null;
let injectedEmailReader: StudentEmailReader | null = null;

/** Thay thế bộ gửi mail (test). Truyền null để trả về bộ gửi thật. */
export function setMailSender(fn: MailSender | null): void {
  injectedMailSender = fn;
}

/** Thay thế nguồn đọc email học sinh (test). Truyền null để dùng Blob thật. */
export function setStudentEmailReader(fn: StudentEmailReader | null): void {
  injectedEmailReader = fn;
}

/** Lỗi cấu hình mail — handler phân biệt để trả thông báo rõ cho người dùng. */
export class MailConfigError extends Error {}

// ==================== GỬI MAIL ====================

/**
 * Gửi 1 email. Ném MailConfigError nếu thiếu cấu hình SMTP,
 * ném lỗi khác nếu SMTP từ chối.
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (injectedMailSender) {
    await injectedMailSender(opts);
    return;
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new MailConfigError('Hệ thống email chưa được cấu hình. Liên hệ giáo viên.');
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: `"Lớp học Vật lý TQT" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

// ==================== ĐỌC EMAIL HỌC SINH ====================

/**
 * Đọc map studentId -> email (học sinh tự bổ sung) từ Vercel Blob.
 * Trả {} nếu chưa cấu hình token / lỗi / chưa có dữ liệu — KHÔNG throw.
 */
export async function readStudentEmailsFromBlob(): Promise<Record<string, string>> {
  if (injectedEmailReader) return injectedEmailReader();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return {};
  try {
    const { blobs } = await list({ prefix: BLOB_PATH });
    if (blobs.length === 0) return {};
    const res = await fetch(blobs[0].url);
    if (!res.ok) return {};
    const data = (await res.json()) as Record<string, unknown>;
    const raw = data?.studentEmails;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim().toLowerCase();
    }
    return out;
  } catch (e) {
    console.error('[api/_shared] readStudentEmailsFromBlob', e);
    return {};
  }
}

/**
 * Tìm học sinh theo email. Nguồn 1: email trong danh sách gốc (47 em trường
 * Thái Phiên). Nguồn 2: email học sinh tự bổ sung, đã đồng bộ lên Blob
 * (91 em còn lại). Trả null nếu không khớp nguồn nào.
 */
export async function findStudentByEmail(
  email: string
): Promise<{ id: string; name: string } | null> {
  const normalized = email.toLowerCase().trim();

  // Nguồn 1: danh sách gốc
  const direct = STUDENT_ACCOUNTS.find(
    (s) => s.email && s.email.toLowerCase().trim() === normalized
  );
  if (direct) return { id: direct.id, name: direct.name };

  // Nguồn 2: email tự bổ sung trên Blob (studentId -> email)
  const sharedEmails = await readStudentEmailsFromBlob();
  for (const [studentId, storedEmail] of Object.entries(sharedEmails)) {
    if (storedEmail === normalized) {
      const student = STUDENT_ACCOUNTS.find((s) => s.id === studentId);
      if (student) return { id: student.id, name: student.name };
    }
  }

  return null;
}

/**
 * Tìm giáo viên theo email (danh sách tĩnh TEACHER_ACCOUNTS).
 * Trả null nếu không có email hoặc email để trống — giáo viên chưa bổ sung
 * email thì KHÔNG thể tự đặt lại mật khẩu (không giả vờ thành công).
 */
export function findTeacherByEmail(email: string): { id: string; name: string } | null {
  const normalized = email.toLowerCase().trim();
  const teacher = TEACHER_ACCOUNTS.find(
    (t) => t.email && t.email.toLowerCase().trim() === normalized
  );
  if (!teacher) return null;
  return { id: teacher.id, name: teacher.name };
}

/**
 * Tra tài khoản theo email + vai trò. Dùng chung cho send-otp và verify-otp.
 * role mặc định 'student' để không phá luồng cũ.
 */
export async function findAccountByEmail(
  email: string,
  role: 'student' | 'teacher'
): Promise<{ id: string; name: string } | null> {
  if (role === 'teacher') return findTeacherByEmail(email);
  return findStudentByEmail(email);
}

/** Nhãn hiển thị theo vai trò, dùng cho tiêu đề email. */
export function roleLabel(role: 'student' | 'teacher'): string {
  return role === 'teacher' ? 'giáo viên' : 'học sinh';
}
