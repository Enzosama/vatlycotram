import type { VercelRequest, VercelResponse } from '@vercel/node';
import { otpStore, MAX_ATTEMPTS, LOCK_DURATION_MS } from './send-otp';
import { STUDENT_ACCOUNTS } from '../src/data/studentAccounts';

/**
 * POST /api/verify-otp
 * Body: { email: string, otp: string, newPassword: string }
 *
 * Xác thực OTP -> nếu đúng -> trả về { ok: true, studentId }
 * để client lưu mật khẩu mới vào localStorage.
 *
 * Bảo mật:
 * - Tối đa MAX_ATTEMPTS lần nhập sai -> khóa LOCK_DURATION_MS
 * - OTP hết hạn -> từ chối
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, otp, newPassword } = req.body ?? {};

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ ok: false, error: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ ok: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();

    const entry = otpStore.get(normalizedEmail);
    if (!entry) {
      return res.status(400).json({ ok: false, error: 'Không tìm thấy OTP. Vui lòng yêu cầu mã mới.' });
    }

    // Kiểm tra khóa
    if (now < entry.lockedUntil) {
      const minutesLeft = Math.ceil((entry.lockedUntil - now) / 60000);
      return res.status(429).json({
        ok: false,
        error: `Tài khoản tạm khóa. Thử lại sau ${minutesLeft} phút.`,
      });
    }

    // Kiểm tra hết hạn
    if (now > entry.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ ok: false, error: 'OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
    }

    // Kiểm tra OTP
    if (String(otp) !== entry.otp) {
      entry.attempts++;
      if (entry.attempts >= MAX_ATTEMPTS) {
        entry.lockedUntil = now + LOCK_DURATION_MS;
        otpStore.set(normalizedEmail, entry);
        return res.status(429).json({
          ok: false,
          error: 'Bạn đã nhập sai quá nhiều lần. Tài khoản tạm khóa 15 phút.',
        });
      }
      const remaining = MAX_ATTEMPTS - entry.attempts;
      return res.status(400).json({
        ok: false,
        error: `OTP không đúng. Còn ${remaining} lần thử.`,
      });
    }

    // OTP đúng -> xóa khỏi store, tra studentId
    otpStore.delete(normalizedEmail);
    const student = STUDENT_ACCOUNTS.find(
      (s) => s.email && s.email.toLowerCase() === normalizedEmail
    );
    if (!student) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy tài khoản.' });
    }

    return res.status(200).json({
      ok: true,
      studentId: student.id,
      studentName: student.name,
    });
  } catch (err) {
    console.error('[verify-otp]', err);
    return res.status(500).json({ ok: false, error: 'Lỗi hệ thống.' });
  }
}
