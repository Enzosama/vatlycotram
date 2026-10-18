import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  Camera,
  KeyRound,
  Save,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Phone,
  BookOpen,
  Trophy,
  User,
  Info,
  Upload,
  X,
} from 'lucide-react';
import {
  getCustomProfile,
  saveCustomProfile,
  changePassword,
  hasChangedPassword,
  CustomProfile,
} from '../utils/auth';
import { getSessionStudent } from '../utils/auth';
import { getCompletedLessons, getStudentOverallProgress } from '../utils/storage';
import { getStudentBestScore } from '../utils/storage';
import { COURSES_DATA } from '../data/coursesData';
import { SCHOOLS } from '../data/studentAccounts';

const AVATAR_POOL = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
];

interface ProfilePageProps {
  onBack: () => void;
}

type Tab = 'info' | 'password';

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const session = getSessionStudent();
  const studentId = session?.id || 'hs-default';
  const schoolName = session
    ? SCHOOLS.find((s) => s.code === session.schoolCode)?.name || session.schoolCode
    : 'Chưa đăng nhập';

  const initial = useMemo<CustomProfile>(() => getCustomProfile(studentId), [studentId]);
  const [profile, setProfile] = useState<CustomProfile>(initial);
  const [tab, setTab] = useState<Tab>('info');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Đổi mật khẩu
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const totalLessons = COURSES_DATA.reduce(
    (sum, c) => sum + c.modules.reduce((m, mm) => m + mm.lessons.length, 0),
    0
  );
  const completedCount = getCompletedLessons(studentId).length;
  const progress = getStudentOverallProgress(studentId, totalLessons);
  const best = getStudentBestScore(studentId);

  const avatar = profile.avatar || AVATAR_POOL[0];
  const hasChanged = hasChangedPassword(studentId);

  const handleSaveInfo = () => {
    const url = profile.avatar.trim();
    if (url && !/^https?:\/\//.test(url)) {
      setMessage({ type: 'err', text: 'Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://' });
      return;
    }
    saveCustomProfile(studentId, {
      avatar: url,
      phone: profile.phone.trim(),
      bio: profile.bio.trim(),
    });
    setMessage({ type: 'ok', text: 'Đã lưu thông tin cá nhân.' });
  };

  const handleChangePassword = () => {
    setMessage(null);
    const res = changePassword(studentId, oldPwd, newPwd, confirmPwd);
    if (!res.ok) {
      setMessage({ type: 'err', text: res.error || 'Đổi mật khẩu thất bại.' });
      return;
    }
    setOldPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setMessage({ type: 'ok', text: 'Đổi mật khẩu thành công.' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 text-white py-3 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          <div className="text-center text-sm font-bold tracking-wider uppercase text-white drop-shadow-xs">
            LỚP HỌC VẬT LÝ TQT
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Trang cá nhân
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý thông tin cá nhân và bảo mật tài khoản của bạn
          </p>
        </div>

        {/* Layout 2 cột */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar trái — Thông tin học sinh */}
          <div className="lg:w-72 shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden lg:sticky lg:top-6">
              {/* Cover + Avatar */}
              <div className="relative">
                <div className="h-24 bg-gradient-to-r from-blue-500 via-sky-400 to-blue-600" />
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                  <img
                    src={avatar}
                    alt="Ảnh đại diện"
                    className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="pt-12 pb-5 px-5 text-center">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {session?.name || 'Khách'}
                </h2>
                {session?.email && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate" title={session.email}>
                    {session.email}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-600">
                  <GraduationCap className="w-3.5 h-5 text-blue-600 shrink-0" />
                  <span className="truncate">
                    {schoolName}
                    {session?.className ? ` • ${session.className}` : ''}
                  </span>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-center">
                    <BookOpen className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                    <p className="text-sm font-bold text-slate-900 leading-none">
                      {completedCount}/{totalLessons}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Bài đã học</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-center">
                    <Trophy className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                    <p className="text-sm font-bold text-slate-900 leading-none">
                      {best ? best.score10.toFixed(1) : '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Điểm cao nhất</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-600">Tiến độ toàn khóa</span>
                    <span className="font-bold text-blue-700">{progress.percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nội dung phải */}
          <div className="flex-1 min-w-0">
            {/* Message banner */}
            {message && (
              <div
                className={`mb-5 flex items-start gap-2 p-3.5 rounded-xl border text-sm ${
                  message.type === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {message.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{message.text}</span>
                <button
                  onClick={() => setMessage(null)}
                  className="ml-auto shrink-0 opacity-60 hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-5 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
              <button
                onClick={() => { setTab('info'); setMessage(null); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition whitespace-nowrap ${
                  tab === 'info'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Thông tin & Ảnh đại diện</span>
                <span className="sm:hidden">Thông tin</span>
              </button>
              <button
                onClick={() => { setTab('password'); setMessage(null); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition whitespace-nowrap relative ${
                  tab === 'password'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>Đổi mật khẩu</span>
                {!hasChanged && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                    Nên đổi
                  </span>
                )}
              </button>
            </div>

            {/* Tab: Thông tin */}
            {tab === 'info' && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                {/* Section header */}
                <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Thông tin cá nhân
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cập nhật ảnh đại diện và thông tin liên hệ của bạn
                  </p>
                </div>

                <div className="px-5 sm:px-6 py-5 space-y-6">
                  {/* Avatar */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-3">
                      Ảnh đại diện
                    </label>
                    <div className="flex items-start gap-4">
                      <img
                        src={avatar}
                        alt="Ảnh đại diện"
                        className="w-16 h-16 rounded-full border-2 border-slate-200 object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                          {AVATAR_POOL.map((url) => {
                            const isActive = (profile.avatar || '') === url;
                            return (
                              <button
                                key={url}
                                onClick={() => setProfile((p) => ({ ...p, avatar: url }))}
                                className={`relative rounded-full overflow-hidden border-2 transition aspect-square ${
                                  isActive ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-400'
                                }`}
                                title="Chọn ảnh này"
                              >
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-3">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Hoặc dán đường dẫn ảnh (URL)
                          </label>
                          <div className="relative">
                            <Upload className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={profile.avatar}
                              onChange={(e) => setProfile((p) => ({ ...p, avatar: e.target.value }))}
                              placeholder="https://example.com/anh-cua-toi.jpg"
                              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Số điện thoại liên hệ
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="09xx xxx xxx"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      Giới thiệu bản thân / Mục tiêu học tập
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                      rows={3}
                      placeholder="Ví dụ: Em muốn ôn thi tốt nghiệp THPT môn Vật lí đạt trên 8 điểm."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                    />
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleSaveInfo}
                      className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-xs"
                    >
                      <Save className="w-4 h-4" />
                      <span>Lưu thay đổi</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Đổi mật khẩu */}
            {tab === 'password' && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    Đổi mật khẩu
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Nên đổi mật khẩu định kỳ để bảo vệ tài khoản
                  </p>
                </div>

                <div className="px-5 sm:px-6 py-5 space-y-5">
                  <div
                    className={`flex items-start gap-2 p-3.5 rounded-xl border text-sm ${
                      hasChanged
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {hasChanged
                        ? 'Bạn đã đổi mật khẩu. Có thể tiếp tục đổi lại nếu muốn.'
                        : 'Bạn vẫn đang dùng mật khẩu mặc định. Nên đổi ngay để bảo mật tài khoản.'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mật khẩu hiện tại
                    </label>
                    <input
                      type="password"
                      value={oldPwd}
                      onChange={(e) => setOldPwd(e.target.value)}
                      placeholder="Nhập mật khẩu đang dùng"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mật khẩu mới (tối thiểu 6 ký tự)
                    </label>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      placeholder="Nhập mật khẩu mới"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                      title={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword(); }}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleChangePassword}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-xs"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Xác nhận đổi mật khẩu</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
