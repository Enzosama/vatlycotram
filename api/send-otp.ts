import type { VercelRequest, VercelResponse } from '@vercel/node';
import { findAccountByEmail, sendMail, MailConfigError } from './_shared';
import {
  loadStore,
  getOtp,
  setOtp,
  getRate,
  setRate,
  OTP_TTL_MS,
  MAX_ATTEMPTS,
  LOCK_DURATION_MS,
  RATE_LIMIT,
  RATE_WINDOW_MS,
} from './_otpStore';

/**
 * POST /api/send-otp
 * Body: { email: string, role?: 'student' | 'teacher' }
 *
 * Tìm tài khoản theo email + vai trò -> sinh OTP 6 số -> lưu store (Vercel Blob,
 * dùng chung giữa các instance) -> gửi email qua Gmail SMTP.
 *
 * - role='student' (mặc định): tra danh sách gốc HOẶC email tự bổ sung trên
 *   DB dùng chung (91/138 em thiếu email trong danh sách gốc).
 * - role='teacher': tra TEACHER_ACCOUNTS.
 *
 * Không tiết lộ email có tồn tại hay không (trả thông báo chung).
 * Rate limit: tối đa 3 lần gửi OTP / giờ / email.
 */

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, role: rawRole } = req.body ?? {};
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Email không hợp lệ.' });
    }
    // Vai trò: mặc định 'student' để không phá luồng cũ
    const role: 'student' | 'teacher' = rawRole === 'teacher' ? 'teacher' : 'student';

    const normalizedEmail = email.toLowerCase().trim();

    // Nạp store dùng chung (Blob) — cần trước khi đọc rate/OTP
    await loadStore();

    // Rate limit check
    const now = Date.now();
    const rate = getRate(normalizedEmail);
    if (rate && now - rate.windowStart < RATE_WINDOW_MS) {
      if (rate.count >= RATE_LIMIT) {
        return res.status(429).json({
          ok: false,
          error: 'Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.',
        });
      }
      await setRate(normalizedEmail, { count: rate.count + 1, windowStart: rate.windowStart });
    } else {
      await setRate(normalizedEmail, { count: 1, windowStart: now });
    }

    // Kiểm tra tài khoản bị khóa
    const existing = getOtp(normalizedEmail);
    if (existing && now < existing.lockedUntil) {
      const minutesLeft = Math.ceil((existing.lockedUntil - now) / 60000);
      return res.status(429).json({
        ok: false,
        error: `Tài khoản tạm khóa. Thử lại sau ${minutesLeft} phút.`,
      });
    }

    // Tra tài khoản theo email + vai trò
    const found = await findAccountByEmail(normalizedEmail, role);

    // Không tiết lộ email có tồn tại hay không
    const genericMsg = 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi.';

    if (!found) {
      // Vẫn trả về OK để không lộ thông tin
      return res.status(200).json({ ok: true, message: genericMsg });
    }

    // Sinh và lưu OTP (kèm accountId để verify không phải tra lại)
    const otp = generateOtp();
    await setOtp(normalizedEmail, {
      otp,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      lockedUntil: 0,
      accountId: found.id,
      accountName: found.name,
      role,
    });

    // Gửi email
    try {
      await sendMail({
        to: normalizedEmail,
        subject: 'Mã OTP đặt lại mật khẩu - Lớp học Vật lý TQT',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
            <h2 style="color: #1e40af; margin-bottom: 16px;">Đặt lại mật khẩu</h2>
            <p style="color: #334155; font-size: 14px;">Xin chào <strong>${found.name}</strong>,</p>
            <p style="color: #334155; font-size: 14px;">Mã OTP đặt lại mật khẩu tài khoản ${role === 'teacher' ? 'giáo viên' : 'học sinh'} của bạn là:</p>
            <div style="background: #1e40af; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; border-radius: 8px; margin: 16px 0;">${otp}</div>
            <p style="color: #64748b; font-size: 12px;">Mã có hiệu lực trong <strong>5 phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
            <p style="color: #94a3b8; font-size: 11px; margin-top: 24px;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      if (mailErr instanceof MailConfigError) {
        console.error('[send-otp] SMTP chưa được cấu hình');
        return res.status(500).json({ ok: false, error: mailErr.message });
      }
      console.error('[send-otp] gửi email lỗi:', mailErr);
      return res.status(500).json({
        ok: false,
        error: 'Không thể gửi email. Vui lòng thử lại sau.',
      });
    }

    return res.status(200).json({ ok: true, message: genericMsg });
  } catch (err) {
    console.error('[send-otp]', err);
    return res.status(500).json({ ok: false, error: 'Lỗi hệ thống.' });
  }
}

// Hằng số dùng chung với verify-otp (qua _otpStore)
export { OTP_TTL_MS, MAX_ATTEMPTS, LOCK_DURATION_MS };
