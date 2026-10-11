import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { STUDENT_ACCOUNTS } from '../src/data/studentAccounts';

/**
 * POST /api/send-otp
 * Body: { email: string }
 *
 * Tìm học sinh theo email -> sinh OTP 6 số -> lưu vào in-memory Map
 * -> gửi email qua Gmail SMTP.
 *
 * Không tiết lộ email có tồn tại hay không (trả thông báo chung).
 * Rate limit: tối đa 3 lần gửi OTP / giờ / email.
 */

// In-memory OTP store: email -> { otp, expiresAt, attempts, lockedUntil }
const otpStore = new Map<string, {
  otp: string;
  expiresAt: number;
  attempts: number;
  lockedUntil: number;
}>();

const OTP_TTL_MS = 5 * 60 * 1000;       // 5 phút
const MAX_ATTEMPTS = 5;                 // tối đa 5 lần nhập sai
const LOCK_DURATION_MS = 15 * 60 * 1000; // khóa 15 phút
const RATE_LIMIT = 3;                   // tối đa 3 lần gửi / giờ
const RATE_WINDOW_MS = 60 * 60 * 1000;  // 1 giờ

// Rate limit store: email -> số lần gửi trong cửa sổ
const rateStore = new Map<string, { count: number; windowStart: number }>();

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body ?? {};
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Email không hợp lệ.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit check
    const now = Date.now();
    const rate = rateStore.get(normalizedEmail);
    if (rate && now - rate.windowStart < RATE_WINDOW_MS) {
      if (rate.count >= RATE_LIMIT) {
        return res.status(429).json({
          ok: false,
          error: 'Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.',
        });
      }
      rate.count++;
    } else {
      rateStore.set(normalizedEmail, { count: 1, windowStart: now });
    }

    // Kiểm tra tài khoản bị khóa
    const existing = otpStore.get(normalizedEmail);
    if (existing && now < existing.lockedUntil) {
      const minutesLeft = Math.ceil((existing.lockedUntil - now) / 60000);
      return res.status(429).json({
        ok: false,
        error: `Tài khoản tạm khóa. Thử lại sau ${minutesLeft} phút.`,
      });
    }

    // Tra học sinh theo email
    const student = STUDENT_ACCOUNTS.find(
      (s) => s.email && s.email.toLowerCase() === normalizedEmail
    );

    // Không tiết lộ email có tồn tại hay không
    const genericMsg = 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi.';

    if (!student) {
      // Vẫn trả về OK để không lộ thông tin
      return res.status(200).json({ ok: true, message: genericMsg });
    }

    // Sinh và lưu OTP
    const otp = generateOtp();
    otpStore.set(normalizedEmail, {
      otp,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      lockedUntil: 0,
    });

    // Gửi email
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('[send-otp] SMTP chưa được cấu hình');
      return res.status(500).json({
        ok: false,
        error: 'Hệ thống email chưa được cấu hình. Liên hệ giáo viên.',
      });
    }

    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"Lớp học Vật lý TQT" <${process.env.SMTP_USER}>`,
        to: normalizedEmail,
        subject: 'Mã OTP đặt lại mật khẩu - Lớp học Vật lý TQT',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
            <h2 style="color: #1e40af; margin-bottom: 16px;">Đặt lại mật khẩu</h2>
            <p style="color: #334155; font-size: 14px;">Xin chào <strong>${student.name}</strong>,</p>
            <p style="color: #334155; font-size: 14px;">Mã OTP của bạn là:</p>
            <div style="background: #1e40af; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; border-radius: 8px; margin: 16px 0;">${otp}</div>
            <p style="color: #64748b; font-size: 12px;">Mã có hiệu lực trong <strong>5 phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
            <p style="color: #94a3b8; font-size: 11px; margin-top: 24px;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
          </div>
        `,
      });
    } catch (mailErr) {
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

// Export để verify-otp dùng chung store
export { otpStore, OTP_TTL_MS, MAX_ATTEMPTS, LOCK_DURATION_MS };
