import React, { useState, useEffect } from 'react';
import { Header, AppTab } from './components/Header';
import { CourseCatalog } from './components/CourseCatalog';
import { VideoLearningView } from './components/VideoLearningView';
import { LeaderboardView } from './components/LeaderboardView';
import { NotebookLMMindmap } from './components/NotebookLMMindmap';
import { OfficialExamModal } from './components/OfficialExamModal';
import { SiteManagementView } from './components/SiteManagement/SiteManagementView';
import { COURSES_DATA } from './data/coursesData';
import { Course } from './types';
import { LoginPage } from './components/LoginPage';
import { ProfilePage } from './components/ProfilePage';
import { getSessionStudent, logout as authLogout, getTeacherSession, teacherLogout, TeacherAccount } from './utils/auth';
import { SCHOOLS, StudentAccount } from './data/studentAccounts';
import { TeacherLoginPage } from './components/TeacherLoginPage';
import { resolveRoute, pathForTab } from './utils/routeResolver';
import { backupToGsheet, restoreFromGsheet } from './lib/gsheet';

const SCHOOL_NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  SCHOOLS.map((s) => [s.code, s.name])
);
import { 
  getCurrentStudent,
  setCurrentStudent,
  getAllStudents,
  getCompletedLessons, 
  saveCompletedLessons, 
  getTopStudents,
  hasCompletedExam,
  DEFAULT_STUDENT,
  StudentProfile
} from './utils/storage';
import { 
  CheckCircle2,
  BrainCircuit,
  X,
  BookOpen,
  Trophy,
  GraduationCap
} from 'lucide-react';

// Helper to resolve initial route from URL (path, hash, query)
const getInitialRoute = () => {
  if (typeof window === 'undefined') {
    return { tab: 'courses' as AppTab, openProfile: false, isManagement: false };
  }
  return resolveRoute(window.location.pathname, window.location.hash, window.location.search);
};

export default function App() {
  const initialRoute = getInitialRoute();
  // Học sinh phải đăng nhập; giáo viên phải đăng nhập trang /m@nagement.
  const [authStudent, setAuthStudent] = useState<StudentAccount | null>(() =>
    initialRoute.isManagement ? null : getSessionStudent()
  );
  const [authTeacher, setAuthTeacher] = useState<TeacherAccount | null>(() =>
    initialRoute.isManagement ? getTeacherSession() : null
  );
  const [activeTab, setActiveTab] = useState<AppTab>(() => initialRoute.tab);
  const [selectedCourse, setSelectedCourse] = useState<Course>(COURSES_DATA[0]);
  const [activeLessonId, setActiveLessonId] = useState<string>(COURSES_DATA[0].modules[0].lessons[0].id);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [currentStudent, setStudent] = useState<StudentProfile>(DEFAULT_STUDENT);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [topStudents, setTopStudents] = useState(getTopStudents());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examCourse, setExamCourse] = useState<Course>(COURSES_DATA[0]);
  const [isMindmapOpen, setIsMindmapOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(() => initialRoute.openProfile);
  // Tăng lên mỗi khi lưu hồ sơ -> Header cập nhật avatar tùy chỉnh
  const [profileVersion, setProfileVersion] = useState(0);
  const [userScoreInfo, setUserScoreInfo] = useState<{
    score: number;
    maxScore: number;
    rank?: number;
    completionTime?: string;
  } | null>(null);

  // Sync route when URL changes or popstate/hashchange triggers
  useEffect(() => {
    const handleRouteChange = () => {
      const route = resolveRoute(
        window.location.pathname,
        window.location.hash,
        window.location.search
      );
      setActiveTab(route.tab);
      setIsProfileOpen(route.openProfile);
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  // Đồng bộ URL với trạng thái điều hướng hiện tại (pushState)
  const navigateTo = (tab: AppTab, openProfile: boolean = false) => {
    const path = pathForTab(tab, openProfile);
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setActiveTab(tab);
    setIsProfileOpen(openProfile);
  };

  // Support hotkey (Alt + M or Ctrl + Shift + M) to navigate to /m@nagement conveniently
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && (e.key === 'm' || e.key === 'M')) || (e.ctrlKey && e.shiftKey && (e.key === 'm' || e.key === 'M'))) {
        e.preventDefault();
        navigateTo('management');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Exit management and restore URL
  const handleExitManagement = () => {
    navigateTo('courses');
  };

  // Khi đăng nhập giáo viên thành công
  const handleTeacherLoginSuccess = (teacher: TeacherAccount) => {
    setAuthTeacher(teacher);
  };

  // Đăng xuất giáo viên
  const handleTeacherLogout = () => {
    teacherLogout();
    setAuthTeacher(null);
  };

  // Load persistence — học sinh đang hoạt động + tiến độ riêng của học sinh đó
  useEffect(() => {
    const student = getCurrentStudent();
    setStudent(student);
    setStudents(getAllStudents());
    setCompletedLessons(getCompletedLessons(student.id));
  }, []);

  // Khi đăng nhập thành công: map tài khoản -> StudentProfile để dùng chung tiến độ
  const handleLoginSuccess = (student: StudentAccount) => {
    const profile: StudentProfile = {
      id: student.id,
      name: student.name,
      avatar: DEFAULT_STUDENT.avatar,
      school: SCHOOL_NAME_BY_CODE[student.schoolCode] || student.schoolCode,
      className: student.className,
    };
    setCurrentStudent(profile);
    setStudent(profile);
    setStudents(getAllStudents());
    setCompletedLessons(getCompletedLessons(profile.id));
    setAuthStudent(student);
  };

  const handleLogout = () => {
    authLogout();
    setAuthStudent(null);
    setActiveTab('courses');
  };

  // Chuyển đổi học sinh: nạp lại tiến độ của học sinh được chọn
  const handleSelectStudent = (student: StudentProfile) => {
    setCurrentStudent(student);
    setStudent(student);
    setStudents(getAllStudents());
    setCompletedLessons(getCompletedLessons(student.id));
  };

  // Total lessons in entire platform
  const totalPlatformLessons = COURSES_DATA.reduce(
    (sum, c) => sum + c.modules.reduce((mSum, m) => mSum + m.lessons.length, 0),
    0
  );

  // When completing a lesson
  const handleCompleteLesson = (lessonId: string) => {
    setCompletedLessons((prev) => {
      if (prev.includes(lessonId)) return prev;
      const updated = [...prev, lessonId];
      // Ghi vào key tiến độ của học sinh đang hoạt động
      saveCompletedLessons(updated, currentStudent.id);
      return updated;
    });
  };

  // Start course from catalog
  const handleStartCourse = (course: Course) => {
    setSelectedCourse(course);
    // Select first lesson or first uncompleted lesson (theo tiến độ học sinh hiện tại)
    const allCourseLessons = course.modules.flatMap((m) => m.lessons);
    const firstUncompleted = allCourseLessons.find((l) => !completedLessons.includes(l.id));
    setActiveLessonId(firstUncompleted ? firstUncompleted.id : allCourseLessons[0].id);
    navigateTo('learning');
  };

  // Open official exam — chỉ mở nếu học sinh chưa làm bài này (khoá 1 lần duy nhất)
  const handleOpenExam = (courseToExam?: Course) => {
    const course = courseToExam || selectedCourse;
    const sid = currentStudent?.id || DEFAULT_STUDENT.id;
    if (hasCompletedExam(sid, course.id)) return;
    setExamCourse(course);
    setIsExamModalOpen(true);
  };

  // Exam completion handler
  const handleExamCompleted = (result: {
    score: number;
    maxScore: number;
    isTop5: boolean;
    rank: number;
    completionTime: string;
    courseId: string;
  }) => {
    setUserScoreInfo({
      score: result.score,
      maxScore: result.maxScore,
      rank: result.rank,
      completionTime: result.completionTime,
    });
    // Refresh Top 5 list
    setTopStudents(getTopStudents());
    // Backup dữ liệu động lên Google Sheet (không chặn UI; no-op nếu chưa cấu hình URL)
    void backupToGsheet();

    // Tự động hoàn thành lesson cuối (bài kiểm tra cuối bài) của khóa học vừa thi xong
    const examCourse = COURSES_DATA.find((c) => c.id === result.courseId);
    const finalLesson = examCourse?.modules
      .flatMap((m) => m.lessons)
      .find((l) => l.isFinalExam);
    if (finalLesson) {
      handleCompleteLesson(finalLesson.id);
    }
  };

  // Mở trang Xếp hạng -> kéo dữ liệu backup từ Google Sheet về, rồi refresh.
  // Khôi phục khi Vercel sự cố / sau update git làm hỏng dữ liệu.
  const handleRestoreGsheet = () => {
    void restoreFromGsheet().then((restored) => {
      if (restored) setTopStudents(getTopStudents());
    });
  };

  // Dedicated WordPress-style Site Management view when routed via /m@nagement
  // Cổng bảo mật: giáo viên phải đăng nhập trước khi vào trang quản trị.
  if (activeTab === 'management') {
    if (!authTeacher) {
      return <TeacherLoginPage onLoginSuccess={handleTeacherLoginSuccess} />;
    }
    return (
      <SiteManagementView
        teacher={authTeacher}
        onTeacherLogout={handleTeacherLogout}
        onBackToApp={handleExitManagement}
      />
    );
  }

  // Cổng đăng nhập: học sinh phải đăng nhập trước khi vào nội dung học tập.
  // Đặt AUTH_ENABLED = false để tạm thời vượt qua phần đăng nhập khi điều chỉnh web.
  // Khi nào cần bật lại cho học sinh, chỉ cần đổi về true.
  const AUTH_ENABLED = true;
  if (AUTH_ENABLED && !authStudent) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Trang cá nhân (đổi avatar, mật khẩu, thông tin)
  if (isProfileOpen) {
    return (
      <ProfilePage
        onBack={() => {
          // Quay lại trang trước khi mở profile (URL đã có sẵn)
          setIsProfileOpen(false);
          setProfileVersion((v) => v + 1);
          if (typeof window !== 'undefined') {
            window.history.pushState(null, '', pathForTab(activeTab, false));
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={navigateTo}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        completedLessonsCount={completedLessons.length}
        totalLessonsCount={totalPlatformLessons}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        currentStudent={currentStudent}
        students={students}
        onSelectStudent={handleSelectStudent}
        onOpenNotebookLM={() => setIsMindmapOpen(true)}
        onLogout={handleLogout}
        onOpenProfile={() => navigateTo('courses', true)}
        profileVersion={profileVersion}
        studentEmail={authStudent?.email || undefined}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16 md:pb-0">
        {activeTab === 'courses' && (
          <CourseCatalog
            courses={COURSES_DATA}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            completedLessons={completedLessons}
            onStartCourse={handleStartCourse}
            studentId={currentStudent.id}
          />
        )}

        {activeTab === 'learning' && (
          <VideoLearningView
            course={selectedCourse}
            activeLessonId={activeLessonId}
            completedLessons={completedLessons}
            onSelectLesson={setActiveLessonId}
            onCompleteLesson={handleCompleteLesson}
            onOpenOfficialExam={() => handleOpenExam(selectedCourse)}
            onOpenNotebookLM={() => setIsMindmapOpen(true)}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            topStudents={topStudents}
            userScoreInfo={userScoreInfo}
            onTakeOfficialExam={() => handleOpenExam(selectedCourse)}
            onRestore={handleRestoreGsheet}
          />
        )}
      </main>

      {/* Footer - Theo hướng sáng kiến bài giảng / phương pháp dạy học Vật lý THPT */}
      <footer className="bg-blue-900 text-blue-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Cột 1: Brand + Sáng kiến */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
                    <ellipse cx="12" cy="12" rx="10" ry="4" />
                    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
                    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
                  </svg>
                </div>
                <span className="text-base font-extrabold text-white">
                  Vật Lý <span className="text-sky-300">TQT</span>
                </span>
              </div>
              <p className="text-xs text-blue-200/80 leading-relaxed max-w-sm">
                Sáng kiến bài giảng môn Vật lí THPT của Cô Trần Lê Ngọc Trâm. Hệ thống học liệu video, sơ đồ tư duy tóm tắt công thức và bài kiểm tra đánh giá năng lực, được tổ chức tuần tự theo chương trình Vật lí 10.
              </p>
            </div>

            {/* Cột 2: Phương pháp giảng dạy */}
            <div>
              <h4 className="font-bold text-white mb-3 uppercase tracking-wider text-[11px]">
                Phương Pháp Giảng Dạy
              </h4>
              <ul className="space-y-2 text-xs text-blue-200/90">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Dạy học theo định hướng phát triển năng lực</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Mô hình hóa &amp; thực nghiệm trong dạy học Vật lí</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Sơ đồ tư duy hệ thống hóa kiến thức trọng tâm</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Đánh giá thường xuyên qua bài kiểm tra chuẩn hóa</span>
                </li>
              </ul>
            </div>

            {/* Cột 3: Học liệu & Công cụ */}
            <div>
              <h4 className="font-bold text-white mb-3 uppercase tracking-wider text-[11px]">
                Học Liệu &amp; Công Cụ
              </h4>
              <ul className="space-y-2 text-xs text-blue-200/90">
                <li className="flex items-start gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-sky-300 shrink-0 mt-0.5" />
                  <span>Bài giảng video theo từng chuyên đề</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5 text-sky-300 shrink-0 mt-0.5" />
                  <span>Sơ đồ tư duy NotebookLM tóm tắt công thức</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                  <span>Bảng xếp hạng Top 5 học sinh xuất sắc</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-sky-300 shrink-0 mt-0.5" />
                  <span>Theo dõi tiến độ &amp; mở khóa bài học tuần tự</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-blue-800 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-blue-300/70">
            <p>© 2026 Sáng kiến bài giảng Vật Lý TQT • Năm học 2026-2027</p>
            <p>Hệ thống học tập &amp; đánh giá năng lực trực tuyến</p>
          </div>
        </div>
      </footer>

      {/* Kỳ thi chính thức - tính vào Bảng xếp hạng Top 5 */}
      <OfficialExamModal
        course={examCourse}
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        onExamCompleted={handleExamCompleted}
      />

      {/* Sơ đồ tư duy NotebookLM của khóa học đang học */}
      {isMindmapOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900 truncate">
                  Sơ đồ tư duy: {selectedCourse.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMindmapOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
                  aria-label="Đóng sơ đồ tư duy"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NotebookLMMindmap
                key={selectedCourse.mindmapId}
                initialProjectId={selectedCourse.mindmapId}
                onSelectCourse={(courseId) => {
                  const next = COURSES_DATA.find((c) => c.id === courseId);
                  if (next) {
                    setSelectedCourse(next);
                    const firstLesson = next.modules[0].lessons[0];
                    setActiveLessonId(firstLesson.id);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
