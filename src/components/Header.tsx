import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search,
  Trophy,
  PlayCircle,
  BookOpen,
  UserRound,
  Network,
  LogOut
} from 'lucide-react';
import { StudentProfile } from '../utils/storage';
import { getCustomProfile, getSessionStudent } from '../utils/auth';

export type AppTab = 'courses' | 'learning' | 'leaderboard' | 'notebooklm' | 'management';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  completedLessonsCount: number;
  totalLessonsCount: number;
  onOpenExam?: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  // Học sinh đang hoạt động + danh sách để chuyển đổi
  currentStudent: StudentProfile;
  students: StudentProfile[];
  onSelectStudent: (student: StudentProfile) => void;
  // Mở modal sơ đồ tư duy (dùng cho bottom nav trên mobile)
  onOpenNotebookLM?: () => void;
  // Đăng xuất tài khoản học sinh đang đăng nhập
  onLogout?: () => void;
  // Mở trang cá nhân (đổi avatar, mật khẩu, thông tin)
  onOpenProfile?: () => void;
  // Email/mã HS của học sinh đang đăng nhập (hiển thị trong menu)
  studentEmail?: string;
  // Tăng lên mỗi khi hồ sơ cá nhân thay đổi -> Header đọc lại avatar tùy chỉnh
  profileVersion?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  completedLessonsCount,
  totalLessonsCount,
  selectedCategory,
  onSelectCategory,
  currentStudent,
  students,
  onSelectStudent,
  onOpenNotebookLM,
  onLogout,
  onOpenProfile,
  studentEmail,
  profileVersion,
}) => {
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showStudentMenu, setShowStudentMenu] = useState(false);
  const studentMenuRef = useRef<HTMLDivElement>(null);

  // Avatar tùy chỉnh của học sinh đang hoạt động (nếu đã đặt trong trang cá nhân)
  const session = getSessionStudent();
  const activeAvatar = useMemo(() => {
    void profileVersion; // đọc lại khi hồ sơ thay đổi
    const custom = getCustomProfile(currentStudent.id);
    return custom.avatar || currentStudent.avatar;
  }, [currentStudent.id, currentStudent.avatar, profileVersion]);

  const categories = ['Tất cả', 'Toán học', 'Vật lý', 'Lập trình'];

  const progressPercent = totalLessonsCount > 0 
    ? Math.round((completedLessonsCount / totalLessonsCount) * 100) 
    : 0;

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    if (!showStudentMenu) return;
    const handler = (e: MouseEvent) => {
      if (studentMenuRef.current && !studentMenuRef.current.contains(e.target as Node)) {
        setShowStudentMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showStudentMenu]);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Top Banner — nền solid xanh đậm, 2 dòng căn giữa */}
      <div className="bg-blue-800 text-white py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
          <div className="text-sm font-bold tracking-wider uppercase text-white">
            LỚP HỌC VẬT LÝ TQT
          </div>
          <div className="text-xs font-medium text-blue-200 mt-0.5 self-end pr-1 sm:pr-2">
            Năm học 2026-2027
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-6">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <button
              id="header-logo-btn"
              onClick={() => onSelectTab('courses')}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center group-hover:bg-blue-700 transition-colors shadow-xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
                  <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(0 12 12)" />
                  <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
                  <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
                </svg>
              </div>
              <div className="block min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                    Vật Lý <span className="text-blue-600">TQT</span>
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="header-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm kiếm bài giảng, video, sơ đồ tóm tắt..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-1.5">
            <button
              id="nav-tab-courses-btn"
              onClick={() => onSelectTab('courses')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'courses'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Khóa học</span>
            </button>

            <button
              id="nav-tab-learning-btn"
              onClick={() => onSelectTab('learning')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === 'learning'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <PlayCircle className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Học bài</span>
            </button>

            <button
              id="nav-tab-leaderboard-btn"
              onClick={() => onSelectTab('leaderboard')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Xếp hạng</span>
            </button>
          </nav>

          {/* Chọn học sinh + tiến độ của học sinh đó */}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
            <div className="relative" ref={studentMenuRef}>
              <button
                id="header-student-switcher-btn"
                onClick={() => setShowStudentMenu((v) => !v)}
                onDoubleClick={() => onOpenProfile?.()}
                className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-slate-100 transition"
                title="Chuyển đổi học sinh (nhấp đúp để mở trang cá nhân)"
              >
                <img
                  src={activeAvatar}
                  alt={currentStudent.name}
                  className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                />
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[130px]">
                    {session?.name || 'Khách'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {completedLessonsCount}/{totalLessonsCount} bài • {progressPercent}%
                  </p>
                </div>
              </button>

              {showStudentMenu && (
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
                  <p className="px-3 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Chọn học sinh
                  </p>
                  {students.map((s) => {
                    const isActive = s.id === currentStudent.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          onSelectStudent(s);
                          setShowStudentMenu(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition ${
                          isActive ? 'bg-sky-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <img
                          src={s.avatar}
                          alt={s.name}
                          className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {s.className ? `${s.className} • ` : ''}{s.school}
                          </p>
                        </div>
                        {isActive && (
                          <span className="ml-auto text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded shrink-0">
                            Đang học
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <div className="border-t border-slate-100 mt-2 pt-2 px-3 space-y-1">
                    {studentEmail && (
                      <p className="text-[10px] text-slate-500 mb-1.5 truncate" title={studentEmail}>
                        {studentEmail}
                      </p>
                    )}
                    <button
                      id="header-profile-btn"
                      onClick={() => {
                        setShowStudentMenu(false);
                        onOpenProfile?.();
                      }}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-blue-700 hover:bg-blue-50 transition"
                    >
                      <UserRound className="w-3.5 h-3.5" />
                      <span>Trang cá nhân</span>
                    </button>
                    <button
                      id="header-logout-btn"
                      onClick={() => {
                        setShowStudentMenu(false);
                        onLogout?.();
                      }}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="block md:hidden pb-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="header-mobile-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm kiếm khóa học & sơ đồ..."
              className="w-full bg-slate-100 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation — chỉ hiện trên mobile (< md) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-4 h-14">
          <button
            id="bottom-nav-courses-btn"
            onClick={() => onSelectTab('courses')}
            className={`flex flex-col items-center justify-center gap-0.5 transition ${
              activeTab === 'courses' ? 'text-blue-700' : 'text-slate-500'
            }`}
          >
            <BookOpen className={`w-5 h-5 ${activeTab === 'courses' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span className="text-[10px] font-semibold">Khóa học</span>
          </button>

          <button
            id="bottom-nav-learning-btn"
            onClick={() => onSelectTab('learning')}
            className={`flex flex-col items-center justify-center gap-0.5 transition ${
              activeTab === 'learning' ? 'text-blue-700' : 'text-slate-500'
            }`}
          >
            <PlayCircle className={`w-5 h-5 ${activeTab === 'learning' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span className="text-[10px] font-semibold">Học bài</span>
          </button>

          <button
            id="bottom-nav-mindmap-btn"
            onClick={() => onOpenNotebookLM?.()}
            className="flex flex-col items-center justify-center gap-0.5 text-slate-500 transition"
          >
            <Network className="w-5 h-5 text-slate-400" />
            <span className="text-[10px] font-semibold">Sơ đồ</span>
          </button>

          <button
            id="bottom-nav-leaderboard-btn"
            onClick={() => onSelectTab('leaderboard')}
            className={`flex flex-col items-center justify-center gap-0.5 transition ${
              activeTab === 'leaderboard' ? 'text-blue-700' : 'text-slate-500'
            }`}
          >
            <Trophy className={`w-5 h-5 ${activeTab === 'leaderboard' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className="text-[10px] font-semibold">Top 5</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
