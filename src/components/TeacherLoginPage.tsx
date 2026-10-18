import React, { useMemo, useState } from 'react';
import {
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  LogIn,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { TEACHER_ACCOUNTS, TEACHER_DEFAULT_PASSWORD, TeacherAccount } from '../data/teacherAccounts';
import {
  teacherLogin,
  changeTeacherPassword,
} from '../utils/auth';
import { getSchoolOptions, SchoolOption } from '../utils/auth';

type Step = 1 | 2 | 3;

interface TeacherLoginPageProps {
  onLoginSuccess: (teacher: TeacherAccount) => void;
}

export const TeacherLoginPage: React.FC<TeacherLoginPageProps> = ({ onLoginSuccess }) => {
  const schools = useMemo(() => getSchoolOptions(), []);

  const [step, setStep] = useState<Step>(1);
  const [schoolCode, setSchoolCode] = useState('');
  const [teacher, setTeacher] = useState<TeacherAccount | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Bước đổi mật khẩu
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const selectedSchool = schools.find((s) => s.code === schoolCode);

  // Tìm giáo viên theo trường
  const teacherForSchool = useMemo(() => {
    if (!schoolCode) return null;
    return TEACHER_ACCOUNTS.find((t) => t.schoolCode === schoolCode) || null;
  }, [schoolCode]);

  const handlePickSchool = (code: string) => {
    setSchoolCode(code);
    setError('');
    setPassword('');
    const t = TEACHER_ACCOUNTS.find((teacher) => teacher.schoolCode === code);
    if (t) {
      setTeacher(t);
    }
  };

  const handleLogin = () => {
    setError('');
    if (!teacher) return;
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    const result = teacherLogin(teacher.id, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.mustChangePassword) {
      setOldPassword(TEACHER_DEFAULT_PASSWORD);
      setStep(3);
      return;
    }
    onLoginSuccess(result.teacher);
  };

  const handleChangePassword = () => {
    setError('');
    if (!teacher) return;
    const res = changeTeacherPassword(teacher.id, oldPassword, newPassword, confirmPassword);
    if (!res.ok) {
      setError(res.error || 'Đổi mật khẩu thất bại.');
      return;
    }
    onLoginSuccess(teacher);
  };

  const goBack = () => {
    setError('');
    setNotice('');
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const stepTitle = ['', 'Chọn trường', 'Nhập mật khẩu', 'Đổi mật khẩu'][step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 text-white py-3 px-4 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-center">
          <div className="text-center text-sm font-bold tracking-wider uppercase text-white drop-shadow-xs">
            BẢNG QUẢN TRỊ HỆ THỐNG
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg">
          {/* Logo + tiêu đề */}
          <div className="text-center mb-6">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600 text-white items-center justify-center shadow-sm mb-3">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Đăng nhập giáo viên
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Hệ thống quản trị Lớp học Vật lí • Năm học 2026-2027
            </p>
          </div>

          {/* Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Stepper */}
            <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between gap-1">
                {[1, 2, 3].map((s) => {
                  const labels: Record<number, string> = {
                    1: 'Trường',
                    2: 'Mật khẩu',
                    3: 'Đổi MK',
                  };
                  const isActive = s === step;
                  const isDone = s < step;
                  return (
                    <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-xs'
                              : isDone
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : s}
                        </div>
                        <span
                          className={`text-[10px] font-semibold whitespace-nowrap ${
                            isActive ? 'text-blue-700' : 'text-slate-400'
                          }`}
                        >
                          {labels[s]}
                        </span>
                      </div>
                      {s < 3 && (
                        <div
                          className={`h-0.5 flex-1 mx-1 rounded-full ${
                            isDone ? 'bg-emerald-400' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100">
                  Bước {step}/3
                </span>
                {stepTitle}
              </h2>

              {error && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {notice && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{notice}</span>
                </div>
              )}

              {/* Bước 1: chọn trường */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Chọn trường của bạn để đăng nhập vào bảng quản trị.
                  </p>
                  <div className="space-y-2">
                    {schools.map((s: SchoolOption) => {
                      const isActive = schoolCode === s.code;
                      const teacherName = teacherForSchool?.name && isActive ? teacherForSchool.name : null;
                      return (
                        <button
                          key={s.code}
                          onClick={() => handlePickSchool(s.code)}
                          className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border text-left transition ${
                            isActive
                              ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-semibold truncate ${
                                isActive ? 'text-blue-800' : 'text-slate-800'
                              }`}
                            >
                              {s.name}
                            </p>
                            {teacherName ? (
                              <p className="text-[11px] text-slate-500">{teacherName}</p>
                            ) : (
                              <p className="text-[11px] text-slate-500">Lớp {s.className}</p>
                            )}
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-blue-600' : 'text-slate-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      if (!schoolCode) {
                        setError('Vui lòng chọn trường.');
                        return;
                      }
                      setError('');
                      setStep(2);
                    }}
                    disabled={!schoolCode}
                    className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold py-2.5 rounded-lg transition-colors shadow-xs"
                  >
                    <span>Tiếp tục</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Bước 2: mật khẩu */}
              {step === 2 && teacher && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-sky-50 border border-sky-200">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {teacher.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{teacher.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {selectedSchool?.name}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleLogin();
                        }}
                        placeholder="Nhập mật khẩu"
                        className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Mật khẩu mặc định lần đầu đăng nhập:{' '}
                      <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">
                        {TEACHER_DEFAULT_PASSWORD}
                      </code>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={goBack}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 border border-slate-300 hover:bg-slate-50 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Quay lại</span>
                    </button>
                    <button
                      onClick={handleLogin}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold py-2.5 rounded-lg transition-colors shadow-xs"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Đăng nhập</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Bước 3: đổi mật khẩu lần đầu */}
              {step === 3 && teacher && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Đây là lần đăng nhập đầu tiên. Vui lòng đổi mật khẩu mới để bảo mật tài khoản.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mật khẩu hiện tại
                    </label>
                    <input
                      type="password"
                      value={oldPassword}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mật khẩu mới (tối thiểu 6 ký tự)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleChangePassword();
                      }}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>

                  <button
                    onClick={handleChangePassword}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors shadow-xs"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Xác nhận đổi mật khẩu & đăng nhập</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-4">
            Nếu gặp khó khăn khi đăng nhập, vui lòng liên hệ giáo viên chủ nhiệm.
          </p>
        </div>
      </div>
    </div>
  );
};
