import React, { useMemo, useState } from 'react';
import {
  GraduationCap,
  Search,
  ChevronRight,
  ChevronLeft,
  LogIn,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import {
  getSchoolOptions,
  searchStudents,
  login,
  changePassword,
  DEFAULT_PASSWORD,
  getStudentEmail,
  saveStudentEmail,
  getKnownAccountsOnDevice,
  clearDeviceAuth,
  DeviceAccount,
  SchoolOption,
} from '../utils/auth';
import { STUDENT_ACCOUNTS, StudentAccount } from '../data/studentAccounts';

type Step = 1 | 2 | 3 | 4 | 5;

interface LoginPageProps {
  onLoginSuccess: (student: StudentAccount) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const schools = useMemo(() => getSchoolOptions(), []);
  // Tài khoản đã từng đăng nhập trên thiết bị này (localStorage)
  const [deviceAccounts, setDeviceAccounts] = useState<DeviceAccount[]>(() =>
    getKnownAccountsOnDevice()
  );

  const [step, setStep] = useState<Step>(1);
  const [schoolCode, setSchoolCode] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentAccount[]>([]);
  const [selected, setSelected] = useState<StudentAccount | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Bước đổi mật khẩu
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Quên mật khẩu (OTP)
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPwd, setOtpNewPwd] = useState('');
  const [otpConfirmPwd, setOtpConfirmPwd] = useState('');
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');
  const [otpLoading, setOtpLoading] = useState(false);

  // Email bổ sung (HS thiếu email)
  const [extraEmail, setExtraEmail] = useState('');

  // Đăng nhập bằt tài khoản khác (nhập mã HS trực tiếp)
  const [showDirectInput, setShowDirectInput] = useState(false);
  const [directStudentId, setDirectStudentId] = useState('');

  const selectedSchool = schools.find((s) => s.code === schoolCode);

  const handleSearch = () => {
    setError('');
    if (!schoolCode) {
      setError('Vui lòng chọn trường trước.');
      return;
    }
    if (!query.trim()) {
      setError('Vui lòng nhập tên hoặc email để tra cứu.');
      return;
    }
    const found = searchStudents(schoolCode, query);
    setResults(found);
    if (found.length === 0) {
      setError('Không tìm thấy học sinh nào khớp. Hãy kiểm tra lại tên hoặc email.');
    } else {
      setStep(2);
    }
  };

  // Đăng nhập trực tiếp bằng mã HS (bỏ qua tra cứu)
  const handleDirectLogin = () => {
    setError('');
    if (!directStudentId.trim()) {
      setError('Vui lòng nhập mã học sinh.');
      return;
    }
    const student = STUDENT_ACCOUNTS.find((s) => s.id === directStudentId.trim());
    if (!student) {
      setError('Không tìm thấy học sinh với mã này.');
      return;
    }
    setSchoolCode(student.schoolCode);
    setSelected(student);
    setPassword('');
    setError('');
    setNotice('');
    setShowDirectInput(false);
    setStep(3);
  };

  const handlePickStudent = (student: StudentAccount) => {
    setSelected(student);
    setPassword('');
    setError('');
    setStep(3);
  };

  // Vào thẳng app với account đang có session (không cần nhập lại mật khẩu)
  const handleContinueAsSession = (account: DeviceAccount) => {
    const student = STUDENT_ACCOUNTS.find((s) => s.id === account.id);
    if (!student) return;
    setError('');
    onLoginSuccess(student);
  };

  // Chọn account cũ trên thiết bị → nhảy thẳng bước nhập mật khẩu
  const handlePickDeviceAccount = (account: DeviceAccount) => {
    const student = STUDENT_ACCOUNTS.find((s) => s.id === account.id);
    if (!student) return;
    setSchoolCode(account.schoolCode);
    setSelected(student);
    setPassword('');
    setError('');
    setNotice('');
    setStep(3);
  };

  // Xoá sạch dấu vết đăng nhập trên thiết bị (máy dùng chung)
  const handleClearDevice = () => {
    clearDeviceAuth();
    setDeviceAccounts([]);
    setNotice('Đã xoá thông tin đăng nhập trên thiết bị này.');
  };

  const handleLogin = () => {
    setError('');
    if (!selected) return;
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    const result = login(selected.id, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.mustChangePassword) {
      setOldPassword(DEFAULT_PASSWORD);
      // Nếu HS chưa có email -> yêu cầu nhập email trong bước đổi mật khẩu
      const currentEmail = getStudentEmail(selected.id);
      setExtraEmail(currentEmail);
      setStep(4);
      return;
    }
    onLoginSuccess(result.student);
  };

  const handleChangePassword = () => {
    setError('');
    if (!selected) return;
    // Nếu HS thiếu email -> bắt buộc nhập email hợp lệ
    const needEmail = !getStudentEmail(selected.id);
    if (needEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extraEmail.trim())) {
        setError('Vui lòng nhập email hợp lệ để đặt lại mật khẩu khi cần.');
        return;
      }
    }
    const res = changePassword(selected.id, oldPassword, newPassword, confirmPassword);
    if (!res.ok) {
      setError(res.error || 'Đổi mật khẩu thất bại.');
      return;
    }
    if (needEmail) {
      saveStudentEmail(selected.id, extraEmail.trim());
    }
    onLoginSuccess(selected);
  };

  const goBack = () => {
    setError('');
    setNotice('');
    if (step === 2) setStep(1);
    else if (step === 3) {
      setStep(2);
      setSelected(null);
    } else if (step === 4) setStep(3);
    else if (step === 5) {
      setStep(1);
      setOtpStep('email');
      setOtpEmail('');
      setOtpCode('');
      setOtpNewPwd('');
      setOtpConfirmPwd('');
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otpEmail.trim())) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Không thể gửi OTP. Vui lòng thử lại.');
        return;
      }
      setNotice(data.message || 'Nếu email tồn tại, mã OTP đã được gửi.');
      setOtpStep('code');
    } catch (e) {
      setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setNotice('');
    if (otpCode.length !== 6) {
      setError('Mã OTP gồm 6 chữ số.');
      return;
    }
    if (otpNewPwd.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (otpNewPwd !== otpConfirmPwd) {
      setError('Xác nhận mật khẩu không khớp.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail.trim(), otp: otpCode, newPassword: otpNewPwd }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'OTP không đúng hoặc đã hết hạn.');
        return;
      }
      // Lưu mật khẩu mới vào localStorage (auth.ts đọc từ đây)
      const mapKey = 'edulearn_auth_passwords_v1';
      const pwdMap = JSON.parse(localStorage.getItem(mapKey) || '{}');
      pwdMap[data.studentId] = otpNewPwd;
      localStorage.setItem(mapKey, JSON.stringify(pwdMap));
      const changedKey = 'edulearn_auth_pwd_changed_v1';
      const changedMap = JSON.parse(localStorage.getItem(changedKey) || '{}');
      changedMap[data.studentId] = '1';
      localStorage.setItem(changedKey, JSON.stringify(changedMap));
      setNotice('Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.');
      setStep(1);
      setOtpStep('email');
      setOtpEmail('');
      setOtpCode('');
      setOtpNewPwd('');
      setOtpConfirmPwd('');
    } catch (e) {
      setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setOtpLoading(false);
    }
  };

  const stepTitle = ['', 'Chọn trường', 'Tra cứu tài khoản', 'Nhập mật khẩu', 'Đổi mật khẩu', 'Quên mật khẩu'][step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 text-white py-3 px-4 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-center">
          <div className="text-center text-sm font-bold tracking-wider uppercase text-white drop-shadow-xs">
            LỚP HỌC VẬT LÝ TQT
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
              Đăng nhập tài khoản học sinh
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Hệ thống học liệu & luyện thi Vật lí 10 • Năm học 2026-2027
            </p>
          </div>

          {/* Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Stepper */}
            <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between gap-1">
                {[1, 2, 3, 4].map((s) => {
                  const labels: Record<number, string> = {
                    1: 'Trường',
                    2: 'Tra cứu',
                    3: 'Mật khẩu',
                    4: 'Đổi MK',
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
                      {s < 4 && (
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
                  Bước {step}/4
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
                  {/* Lối tắt: session còn → vào thẳng app */}
                  {deviceAccounts.filter((a) => a.hasSession).length > 0 && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide mb-2">
                        Tiếp tục với tư cách
                      </p>
                      {deviceAccounts
                        .filter((a) => a.hasSession)
                        .map((a) => (
                          <div key={a.id} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                              {a.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                              <p className="text-[11px] text-slate-500">Lớp {a.className}</p>
                            </div>
                            <button
                              id={`login-continue-${a.id}`}
                              onClick={() => handleContinueAsSession(a)}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shrink-0"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>Vào học ngay</span>
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Lối tắt: account đã từng đổi MK trên thiết bị này */}
                  {deviceAccounts.filter((a) => a.passwordChanged && !a.hasSession).length > 0 && (
                    <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                      <p className="text-[11px] font-bold text-sky-700 uppercase tracking-wide mb-2">
                        Đã từng đăng nhập trên thiết bị này
                      </p>
                      <div className="max-h-48 overflow-y-auto divide-y divide-sky-100 border border-sky-200 rounded-lg bg-white">
                        {deviceAccounts
                          .filter((a) => a.passwordChanged && !a.hasSession)
                          .slice(0, 5)
                          .map((a) => (
                            <button
                              key={a.id}
                              id={`login-device-account-${a.id}`}
                              onClick={() => handlePickDeviceAccount(a)}
                              className="w-full flex items-center justify-between gap-3 p-2.5 text-left hover:bg-sky-50 transition"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                                <p className="text-[11px] text-slate-500">Lớp {a.className}</p>
                              </div>
                              <span className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md shrink-0">
                                Đã có mật khẩu
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            </button>
                          ))}
                      </div>
                      <button
                        onClick={handleClearDevice}
                        className="mt-2 text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:underline"
                      >
                        Xoá thông tin đăng nhập trên thiết bị này
                      </button>
                    </div>
                  )}

                  {deviceAccounts.length > 0 && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[11px] font-semibold text-slate-400">HOẶC</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                  )}

                  <p className="text-xs text-slate-600">
                    Chọn trường của bạn để tra cứu tài khoản học sinh.
                  </p>
                  <div className="space-y-2">
                    {schools.map((s: SchoolOption) => {
                      const isActive = schoolCode === s.code;
                      return (
                        <button
                          key={s.code}
                          id={`login-school-${s.code}`}
                          onClick={() => {
                            setSchoolCode(s.code);
                            setError('');
                            setQuery('');
                            setResults([]);
                          }}
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
                            <p className="text-[11px] text-slate-500">Lớp {s.className}</p>
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
                    id="login-next-school-btn"
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

                  {/* Đăng nhập bằt tài khoản khác */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setShowDirectInput(!showDirectInput);
                        setDirectStudentId('');
                        setError('');
                      }}
                      className="w-full text-center text-xs font-semibold text-slate-500 hover:text-blue-700 hover:underline py-1"
                    >
                      {showDirectInput ? 'Nhấp để đóng' : 'Đăng nhập bằt tài khoản khác (nhập mã HS)'}
                    </button>
                    {showDirectInput && (
                      <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Nhập mã học sinh (ví dụ: HS2616079308)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={directStudentId}
                            onChange={(e) => setDirectStudentId(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleDirectLogin(); }}
                            placeholder="HS..."
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          />
                          <button
                            onClick={handleDirectLogin}
                            className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition shrink-0"
                          >
                            Tìm
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bước 2: tra cứu */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <span className="font-semibold text-slate-700">{selectedSchool?.name}</span>
                    <span className="text-slate-400">•</span>
                    <span>Lớp {selectedSchool?.className}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nhập tên hoặc email của bạn
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-search-input"
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSearch();
                        }}
                        placeholder="Ví dụ: Nguyễn Văn A hoặc email@gmail.com"
                        className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  {results.length > 0 && (
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                      {results.map((s) => (
                        <button
                          key={s.id}
                          id={`login-result-${s.id}`}
                          onClick={() => handlePickStudent(s)}
                          className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-sky-50 transition"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {s.email ? s.email : `Mã HS: ${s.id}`}
                              {s.dob ? ` • NS: ${s.dob}` : ''}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={goBack}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 border border-slate-300 hover:bg-slate-50 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Quay lại</span>
                    </button>
                    <button
                      id="login-search-btn"
                      onClick={handleSearch}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold py-2.5 rounded-lg transition-colors shadow-xs"
                    >
                      <Search className="w-4 h-4" />
                      <span>Tra cứu</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Bước 3: mật khẩu */}
              {step === 3 && selected && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-sky-50 border border-sky-200">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {selected.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{selected.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {selectedSchool?.name} • Lớp {selected.className}
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
                        id="login-password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleLogin();
                        }}
                        placeholder="Nhập mật khẩu của bạn"
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
                        {DEFAULT_PASSWORD}
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
                      id="login-submit-btn"
                      onClick={handleLogin}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold py-2.5 rounded-lg transition-colors shadow-xs"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Đăng nhập</span>
                    </button>
                  </div>
                  <button
                    id="login-forgot-btn"
                    onClick={() => { setError(''); setNotice(''); setOtpStep('email'); setStep(5); }}
                    className="w-full text-center text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline py-1"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              )}

              {/* Bước 4: đổi mật khẩu lần đầu */}
              {step === 4 && selected && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Đây là lần đăng nhập đầu tiên. Vui lòng đổi mật khẩu mới để bảo mật tài khoản.
                    </span>
                  </div>

                  {/* Yêu cầu nhập email nếu HS thiếu email */}
                  {!getStudentEmail(selected.id) && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Email liên hệ <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="setup-email-input"
                          type="email"
                          value={extraEmail}
                          onChange={(e) => setExtraEmail(e.target.value)}
                          placeholder="email@gmail.com"
                          className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Email dùng để đặt lại mật khẩu nếu bạn quên. Hãy nhập email thật đang sử dụng.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mật khẩu hiện tại
                    </label>
                    <input
                      id="change-old-password"
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
                      id="change-new-password"
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
                      id="change-confirm-password"
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
                    id="change-password-submit-btn"
                    onClick={handleChangePassword}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors shadow-xs"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Xác nhận đổi mật khẩu & đăng nhập</span>
                  </button>
                </div>
              )}

              {/* Bước 5: Quên mật khẩu (OTP) */}
              {step === 5 && (
                <div className="space-y-4">
                  {otpStep === 'email' ? (
                    <>
                      <p className="text-xs text-slate-600">
                        Nhập email của bạn. Hệ thống sẽ gửi mã OTP 6 số để đặt lại mật khẩu.
                      </p>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Email đã đăng ký
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="forgot-email-input"
                            type="email"
                            value={otpEmail}
                            onChange={(e) => setOtpEmail(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp(); }}
                            placeholder="email@gmail.com"
                            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          />
                        </div>
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
                          id="forgot-send-otp-btn"
                          onClick={handleSendOtp}
                          disabled={otpLoading}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-bold py-2.5 rounded-lg transition-colors shadow-xs"
                        >
                          {otpLoading ? <span>Đang gửi...</span> : <><Mail className="w-4 h-4" /><span>Gửi mã OTP</span></>}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-600">
                        Nhập mã OTP 6 số đã gửi đến <strong>{otpEmail}</strong> và đặt mật khẩu mới.
                      </p>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Mã OTP (6 số)
                        </label>
                        <input
                          id="forgot-otp-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-center text-lg font-bold tracking-[0.5em] text-slate-800 placeholder-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Mật khẩu mới (tối thiểu 6 ký tự)
                        </label>
                        <input
                          id="forgot-new-pwd"
                          type="password"
                          value={otpNewPwd}
                          onChange={(e) => setOtpNewPwd(e.target.value)}
                          placeholder="Nhập mật khẩu mới"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Xác nhận mật khẩu mới
                        </label>
                        <input
                          id="forgot-confirm-pwd"
                          type="password"
                          value={otpConfirmPwd}
                          onChange={(e) => setOtpConfirmPwd(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyOtp(); }}
                          placeholder="Nhập lại mật khẩu mới"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setOtpStep('email'); setError(''); setNotice(''); }}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 border border-slate-300 hover:bg-slate-50 transition"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Đổi email</span>
                        </button>
                        <button
                          id="forgot-verify-btn"
                          onClick={handleVerifyOtp}
                          disabled={otpLoading}
                          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-bold py-2.5 rounded-lg transition-colors shadow-xs"
                        >
                          {otpLoading ? <span>Đang xử lý...</span> : <><ShieldCheck className="w-4 h-4" /><span>Xác nhận & đặt lại</span></>}
                        </button>
                      </div>
                      <button
                        onClick={handleSendOtp}
                        disabled={otpLoading}
                        className="w-full text-center text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline py-1 disabled:text-slate-400"
                      >
                        Không nhận được mã? Gửi lại
                      </button>
                    </>
                  )}
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
