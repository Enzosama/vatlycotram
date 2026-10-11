import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard,
  BookOpen, 
  GraduationCap, 
  Settings, 
  ChevronRight, 
  ChevronLeft, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  User, 
  Award, 
  HelpCircle, 
  Layers, 
  Eye, 
  RefreshCw, 
  X, 
  TrendingUp, 
  BarChart3, 
  FileSpreadsheet, 
  Check, 
  ArrowUpDown, 
  Clock, 
  ExternalLink, 
  ShieldCheck, 
  Menu,
  School,
  CheckSquare,
  Square,
  ArrowLeft,
  Copy,
  FolderPlus,
  FileEdit,
  Sparkles,
  PlayCircle
} from 'lucide-react';
import { StudentGradeRecord, OfficialExam, Question, Course, ExamPackage } from '../../types';
import { COURSES_DATA } from '../../data/coursesData';
import { getStudentOverallProgress } from '../../utils/storage';
import { 
  getAllStudentGrades, 
  saveStudentGrade, 
  deleteStudentGrade, 
  exportGradesToCSV, 
  getEffectiveCourseExam, 
  saveCourseExam, 
  resetCourseExam,
  getAllExamPackages,
  saveExamPackage,
  deleteExamPackage,
  setActiveExamPackage,
  duplicateExamPackage,
  resetAllExamPackages,
  INITIAL_EXAM_PACKAGES
} from '../../utils/managementStorage';

interface SiteManagementViewProps {
  onBackToApp?: () => void;
}

type WpMenuTab = 'dashboard' | 'exercises' | 'grades' | 'settings';

export const SiteManagementView: React.FC<SiteManagementViewProps> = ({
  onBackToApp,
}) => {
  // Navigation tabs mimicking WordPress wp-admin menus
  const [activeMenu, setActiveMenu] = useState<WpMenuTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Notice alert banner (WordPress style green/blue banner)
  const [notice, setNotice] = useState<{ type: 'success' | 'info' | 'warning'; message: string } | null>({
    type: 'info',
    message: 'Chào mừng Cô Trần Lê Ngọc Trâm đến với Bảng Quản Trị Hệ Thống. Bạn đang làm việc trong khu vực bảo mật /m@nagement.',
  });

  // ==================== QUẢN LÝ TỪNG BỘ ĐỀ & ĐIỀU CHỈNH CÂU HỎI ====================
  // Hai cấp độ: 'packages' (Danh sách từng bộ đề) -> 'questions' (Điều chỉnh từng câu hỏi trong bộ đề đang chọn)
  const [examViewMode, setExamViewMode] = useState<'packages' | 'questions'>('packages');
  const [examPackages, setExamPackages] = useState<ExamPackage[]>(() => getAllExamPackages());
  const [selectedPackageId, setSelectedPackageId] = useState<string>(() => {
    const pkgs = getAllExamPackages();
    return pkgs[0]?.id || 'pkg-dao-dong-co-1';
  });

  // Bộ lọc danh sách bộ đề
  const [pkgFilterCourse, setPkgFilterCourse] = useState<string>('all');
  const [pkgFilterStatus, setPkgFilterStatus] = useState<'all' | 'active' | 'draft'>('all');
  const [pkgSearch, setPkgSearch] = useState<string>('');

  // Bộ đề đang được chọn
  const selectedPackage = useMemo(() => {
    return examPackages.find((p) => p.id === selectedPackageId) || examPackages[0] || INITIAL_EXAM_PACKAGES[0];
  }, [examPackages, selectedPackageId]);

  // Bộ lọc câu hỏi trong bộ đề đang chọn
  const [questionSearch, setQuestionSearch] = useState('');
  const filteredQuestions = useMemo(() => {
    if (!selectedPackage || !selectedPackage.questions) return [];
    return selectedPackage.questions.filter((q) => {
      const matchSearch =
        q.text.toLowerCase().includes(questionSearch.toLowerCase()) ||
        (q.explanation || '').toLowerCase().includes(questionSearch.toLowerCase()) ||
        q.options.some((opt) => opt.toLowerCase().includes(questionSearch.toLowerCase()));
      return matchSearch;
    });
  }, [selectedPackage, questionSearch]);

  // Bộ lọc danh sách các bộ đề
  const filteredPackages = useMemo(() => {
    return examPackages.filter((pkg) => {
      if (pkgFilterCourse !== 'all' && pkg.courseId !== pkgFilterCourse) return false;
      if (pkgFilterStatus === 'active' && !pkg.isActive) return false;
      if (pkgFilterStatus === 'draft' && pkg.isActive) return false;
      if (pkgSearch.trim()) {
        const term = pkgSearch.toLowerCase();
        const matchTitle = pkg.title.toLowerCase().includes(term);
        const matchDesc = pkg.description.toLowerCase().includes(term);
        const matchCourse = (pkg.courseTitle || '').toLowerCase().includes(term);
        if (!matchTitle && !matchDesc && !matchCourse) return false;
      }
      return true;
    });
  }, [examPackages, pkgFilterCourse, pkgFilterStatus, pkgSearch]);

  // Modal tạo / chỉnh sửa thông tin bộ đề
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ExamPackage | null>(null);
  const [packageForm, setPackageForm] = useState<{
    title: string;
    courseId: string;
    description: string;
    durationMinutes: number;
    maxScore: number;
    difficulty: 'Cơ bản' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao 9+';
    isActive: boolean;
  }>({
    title: '',
    courseId: COURSES_DATA[0].id,
    description: '',
    durationMinutes: 45,
    maxScore: 100,
    difficulty: 'Thông hiểu',
    isActive: false,
  });

  // Modal thêm / sửa câu hỏi trong bộ đề đang chọn
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState<Omit<Question, 'id'>>({
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  });

  // Chuyển sang xem và điều chỉnh từng câu hỏi của một bộ đề
  const handleOpenQuestionsForPackage = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    setExamViewMode('questions');
    setQuestionSearch('');
  };

  // Quay lại danh sách tất cả các bộ đề
  const handleBackToPackages = () => {
    setExamViewMode('packages');
  };

  // Mở modal tạo bộ đề mới
  const handleOpenCreatePackageModal = () => {
    setEditingPackage(null);
    setPackageForm({
      title: `Bộ Đề Số 0${examPackages.length + 1}: Kiểm Tra Đánh Giá Năng Lực Chuyên Đề`,
      courseId: COURSES_DATA[0].id,
      description: 'Bộ đề thi phục vụ kiểm tra kiến thức, rà soát bẫy điểm và nâng cao kỹ năng tư duy làm bài trắc nghiệm.',
      durationMinutes: 45,
      maxScore: 100,
      difficulty: 'Thông hiểu',
      isActive: false,
    });
    setIsPackageModalOpen(true);
  };

  // Mở modal chỉnh sửa thông tin bộ đề
  const handleOpenEditPackageModal = (pkg: ExamPackage) => {
    setEditingPackage(pkg);
    setPackageForm({
      title: pkg.title,
      courseId: pkg.courseId,
      description: pkg.description,
      durationMinutes: pkg.durationMinutes,
      maxScore: pkg.maxScore,
      difficulty: pkg.difficulty || 'Thông hiểu',
      isActive: pkg.isActive,
    });
    setIsPackageModalOpen(true);
  };

  // Lưu thông tin bộ đề (tạo mới hoặc cập nhật)
  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageForm.title.trim()) {
      alert('Vui lòng nhập tiêu đề bộ đề thi.');
      return;
    }
    const course = COURSES_DATA.find((c) => c.id === packageForm.courseId);
    const courseTitle = course ? course.title : 'Chuyên đề Vật lý';

    if (editingPackage) {
      const updated: ExamPackage = {
        ...editingPackage,
        title: packageForm.title,
        courseId: packageForm.courseId,
        courseTitle,
        description: packageForm.description,
        durationMinutes: Number(packageForm.durationMinutes) || 45,
        maxScore: Number(packageForm.maxScore) || 100,
        difficulty: packageForm.difficulty,
        isActive: packageForm.isActive,
      };
      saveExamPackage(updated);
      const freshPkgs = getAllExamPackages();
      setExamPackages(freshPkgs);
      setNotice({
        type: 'success',
        message: `Đã cập nhật cấu hình bộ đề: "${updated.title}".`,
      });
    } else {
      // Sao chép mẫu câu hỏi từ đề gốc của chuyên đề được chọn
      const templateQuestions = course?.officialExam?.questions || [];
      const newPkg: ExamPackage = {
        id: `pkg-${Date.now()}`,
        title: packageForm.title,
        courseId: packageForm.courseId,
        courseTitle,
        description: packageForm.description,
        durationMinutes: Number(packageForm.durationMinutes) || 45,
        maxScore: Number(packageForm.maxScore) || 100,
        difficulty: packageForm.difficulty,
        totalQuestions: templateQuestions.length,
        questions: JSON.parse(JSON.stringify(templateQuestions)),
        isActive: packageForm.isActive,
        updatedAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      saveExamPackage(newPkg);
      const freshPkgs = getAllExamPackages();
      setExamPackages(freshPkgs);
      setSelectedPackageId(newPkg.id);
      setNotice({
        type: 'success',
        message: `Đã thêm bộ đề mới: "${newPkg.title}". Nhấn "Soạn câu hỏi" để bắt đầu điều chỉnh từng câu hỏi.`,
      });
    }
    setIsPackageModalOpen(false);
  };

  // Kích hoạt bộ đề làm đề chính thức
  const handleSetActivePackage = (pkgId: string) => {
    setActiveExamPackage(pkgId);
    setExamPackages(getAllExamPackages());
    setNotice({
      type: 'success',
      message: 'Đã kích hoạt bộ đề này làm đề thi chính thức cho học sinh trên website.',
    });
  };

  // Nhân bản bộ đề
  const handleDuplicatePackage = (pkgId: string) => {
    const dup = duplicateExamPackage(pkgId);
    if (dup) {
      setExamPackages(getAllExamPackages());
      setNotice({
        type: 'success',
        message: `Đã nhân bản thành công bộ đề: "${dup.title}".`,
      });
    }
  };

  // Xóa bộ đề
  const handleDeletePackage = (pkg: ExamPackage) => {
    if (examPackages.length <= 1) {
      alert('Hệ thống cần giữ lại ít nhất 1 bộ đề thi.');
      return;
    }
    if (!window.confirm(`Cô có chắc chắn muốn xóa bộ đề "${pkg.title}" không? Toàn bộ các câu hỏi trong bộ đề này sẽ bị xóa.`)) return;
    deleteExamPackage(pkg.id);
    const freshPkgs = getAllExamPackages();
    setExamPackages(freshPkgs);
    if (selectedPackageId === pkg.id) {
      setSelectedPackageId(freshPkgs[0]?.id || '');
    }
    setNotice({
      type: 'success',
      message: `Đã xóa bộ đề "${pkg.title}".`,
    });
  };

  // Khôi phục tất cả bộ đề về mặc định ban đầu
  const handleResetAllPackages = () => {
    if (!window.confirm('Cô có chắc chắn muốn khôi phục toàn bộ danh sách Bộ đề về dữ liệu chuẩn ban đầu của hệ thống?')) return;
    resetAllExamPackages();
    const fresh = getAllExamPackages();
    setExamPackages(fresh);
    setSelectedPackageId(fresh[0]?.id || '');
    setExamViewMode('packages');
    setNotice({
      type: 'success',
      message: 'Đã khôi phục toàn bộ ngân hàng bộ đề về trạng thái mặc định ban đầu.',
    });
  };

  // Mở modal câu hỏi
  const handleOpenQuestionModal = (q?: Question) => {
    if (q) {
      setEditingQuestion(q);
      setQuestionForm({
        text: q.text,
        options: [...q.options],
        correctIndex: q.correctIndex,
        explanation: q.explanation || '',
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: '',
      });
    }
    setIsQuestionModalOpen(true);
  };

  // Lưu câu hỏi vào bộ đề đang chọn
  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.text.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi.');
      return;
    }
    if (questionForm.options.some((opt) => !opt.trim())) {
      alert('Vui lòng điền đủ 4 phương án A, B, C, D.');
      return;
    }

    let updatedQuestions: Question[];
    if (editingQuestion) {
      updatedQuestions = selectedPackage.questions.map((q) =>
        q.id === editingQuestion.id ? { ...editingQuestion, ...questionForm } : q
      );
    } else {
      const newQ: Question = {
        id: `q-custom-${Date.now()}`,
        ...questionForm,
      };
      updatedQuestions = [...selectedPackage.questions, newQ];
    }

    const updatedPackage: ExamPackage = {
      ...selectedPackage,
      questions: updatedQuestions,
      totalQuestions: updatedQuestions.length,
    };

    saveExamPackage(updatedPackage);
    setExamPackages(getAllExamPackages());
    setIsQuestionModalOpen(false);
    setNotice({
      type: 'success',
      message: editingQuestion ? 'Đã cập nhật câu hỏi thành công.' : 'Đã thêm câu hỏi mới vào bộ đề.',
    });
  };

  // Xóa câu hỏi khỏi bộ đề đang chọn
  const handleDeleteQuestion = (questionId: string) => {
    if (!window.confirm('Cô có chắc chắn muốn xóa câu hỏi này khỏi bộ đề không?')) return;
    const updatedQuestions = selectedPackage.questions.filter((q) => q.id !== questionId);
    const updatedPackage: ExamPackage = {
      ...selectedPackage,
      questions: updatedQuestions,
      totalQuestions: updatedQuestions.length,
    };
    saveExamPackage(updatedPackage);
    setExamPackages(getAllExamPackages());
    setNotice({
      type: 'success',
      message: 'Đã xóa câu hỏi khỏi bộ đề.',
    });
  };

  // Khôi phục câu hỏi của riêng bộ đề này
  const handleResetCurrentPackageQuestions = () => {
    if (!window.confirm(`Cô có chắc chắn muốn khôi phục danh sách câu hỏi của bộ đề "${selectedPackage.title}" về bộ câu hỏi gốc?`)) return;
    const course = COURSES_DATA.find((c) => c.id === selectedPackage.courseId);
    const templateQuestions = course?.officialExam?.questions || [];
    const updatedPackage: ExamPackage = {
      ...selectedPackage,
      questions: JSON.parse(JSON.stringify(templateQuestions)),
      totalQuestions: templateQuestions.length,
    };
    saveExamPackage(updatedPackage);
    setExamPackages(getAllExamPackages());
    setNotice({
      type: 'success',
      message: `Đã khôi phục ${templateQuestions.length} câu hỏi chuẩn cho bộ đề "${selectedPackage.title}".`,
    });
  };

  // ==================== SỔ ĐIỂM HỌC SINH ====================
  const [grades, setGrades] = useState<StudentGradeRecord[]>(() => getAllStudentGrades());
  const [gradeSearch, setGradeSearch] = useState('');
  const [gradeFilterClass, setGradeFilterClass] = useState('all');
  // Lọc theo khóa học
  const [gradeFilterCourse, setGradeFilterCourse] = useState('all');
  // Tổng số bài học trên toàn bộ nền tảng (mẫu số cho cột Tiến độ)
  const totalPlatformLessonsCount = COURSES_DATA.reduce(
    (sum, c) => sum + c.modules.reduce((mSum, m) => mSum + m.lessons.length, 0),
    0
  );
  const [gradeFilterStatus, setGradeFilterStatus] = useState<'all' | 'Đạt' | 'Chưa đạt'>('all');
  const [gradeSortBy, setGradeSortBy] = useState<'scoreDesc' | 'scoreAsc' | 'dateDesc' | 'nameAsc'>('scoreDesc');
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);

  // Grade edit/add modal
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<StudentGradeRecord | null>(null);
  const [gradeForm, setGradeForm] = useState<Omit<StudentGradeRecord, 'id'>>({
    studentId: '',
    studentName: '',
    schoolName: '',
    className: '',
    examTitle: selectedPackage?.title || 'Đề kiểm tra đánh giá năng lực',
    score: 85,
    maxScore: 100,
    score10: 8.5,
    correctCount: 42,
    totalQuestions: 50,
    completionTime: '15 phút 00 giây',
    submittedAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    status: 'Đạt',
    gradeClassification: 'Giỏi',
    notes: '',
  });

  // Print sheet modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filtered and sorted grades
  const filteredGrades = useMemo(() => {
    return grades
      .filter((g) => {
        const matchSearch =
          g.studentName.toLowerCase().includes(gradeSearch.toLowerCase()) ||
          g.schoolName.toLowerCase().includes(gradeSearch.toLowerCase()) ||
          g.studentId.toLowerCase().includes(gradeSearch.toLowerCase()) ||
          g.className.toLowerCase().includes(gradeSearch.toLowerCase());
        const matchStatus = gradeFilterStatus === 'all' || g.status === gradeFilterStatus;
        const matchClass = gradeFilterClass === 'all' || g.gradeClassification === gradeFilterClass;
        // Lọc theo khóa học (3 khóa Vật lí 10)
        const matchCourse =
          gradeFilterCourse === 'all' ||
          (g.courseId || '') === gradeFilterCourse ||
          (g.examTitle || '').includes(
            gradeFilterCourse === 'course-phys-10-bai1'
              ? 'Bài 1'
              : gradeFilterCourse === 'course-phys-10-bai2'
              ? 'Bài 2'
              : 'Bài 3'
          );
        return matchSearch && matchStatus && matchClass && matchCourse;
      })
      .sort((a, b) => {
        if (gradeSortBy === 'scoreDesc') return b.score10 - a.score10;
        if (gradeSortBy === 'scoreAsc') return a.score10 - b.score10;
        if (gradeSortBy === 'nameAsc') return a.studentName.localeCompare(b.studentName);
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
  }, [grades, gradeSearch, gradeFilterStatus, gradeFilterClass, gradeFilterCourse, gradeSortBy]);

  // Grade statistics
  const gradeStats = useMemo(() => {
    const total = grades.length;
    if (total === 0) return { total: 0, avg: 0, passRate: 0, excellentRate: 0, maxScore: 0 };
    const sumScore = grades.reduce((acc, g) => acc + g.score10, 0);
    const passedCount = grades.filter((g) => g.status === 'Đạt').length;
    const excellentCount = grades.filter((g) => g.gradeClassification === 'Xuất sắc' || g.gradeClassification === 'Giỏi').length;
    const maxScore = Math.max(...grades.map((g) => g.score10));
    return {
      total,
      avg: Number((sumScore / total).toFixed(2)),
      passRate: Math.round((passedCount / total) * 100),
      excellentRate: Math.round((excellentCount / total) * 100),
      maxScore,
    };
  }, [grades]);

  // Open grade modal
  const handleOpenGradeModal = (g?: StudentGradeRecord) => {
    if (g) {
      setEditingGrade(g);
      setGradeForm({
        studentId: g.studentId,
        studentName: g.studentName,
        schoolName: g.schoolName,
        className: g.className,
        courseId: g.courseId,
        examTitle: g.examTitle,
        score: g.score,
        maxScore: g.maxScore,
        score10: g.score10,
        correctCount: g.correctCount,
        totalQuestions: g.totalQuestions,
        completionTime: g.completionTime,
        submittedAt: g.submittedAt,
        status: g.status,
        gradeClassification: g.gradeClassification,
        notes: g.notes || '',
      });
    } else {
      setEditingGrade(null);
      setGradeForm({
        studentId: `HS-2026-${Math.floor(100 + Math.random() * 900)}`,
        studentName: '',
        schoolName: 'THPT Chuyên Hà Nội - Amsterdam',
        className: '12 Lý',
        courseId: selectedPackage?.courseId || COURSES_DATA[0].id,
        examTitle: selectedPackage?.title || 'Đề kiểm tra đánh giá năng lực',
        score: 85,
        maxScore: selectedPackage?.maxScore || 100,
        score10: 8.5,
        correctCount: Math.round((selectedPackage?.questions?.length || 50) * 0.84),
        totalQuestions: selectedPackage?.questions?.length || 50,
        completionTime: '15 phút 00 giây',
        submittedAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'Đạt',
        gradeClassification: 'Giỏi',
        notes: '',
      });
    }
    setIsGradeModalOpen(true);
  };

  // Save grade
  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeForm.studentName.trim()) {
      alert('Vui lòng nhập họ và tên học sinh.');
      return;
    }

    const score10 = Number(gradeForm.score10);
    let gradeClassification: StudentGradeRecord['gradeClassification'] = 'Trung bình';
    let status: 'Đạt' | 'Chưa đạt' = 'Đạt';

    if (score10 >= 9.0) gradeClassification = 'Xuất sắc';
    else if (score10 >= 8.0) gradeClassification = 'Giỏi';
    else if (score10 >= 6.5) gradeClassification = 'Khá';
    else if (score10 >= 5.0) gradeClassification = 'Trung bình';
    else {
      gradeClassification = 'Yếu';
      status = 'Chưa đạt';
    }

    const record: StudentGradeRecord = {
      id: editingGrade ? editingGrade.id : `grd-${Date.now()}`,
      ...gradeForm,
      score10,
      score: Math.round(score10 * 10),
      gradeClassification,
      status,
    };

    saveStudentGrade(record);
    setGrades(getAllStudentGrades());
    setIsGradeModalOpen(false);
    setNotice({
      type: 'success',
      message: editingGrade ? 'Đã cập nhật bảng điểm học sinh.' : 'Đã nhập điểm mới thành công.',
    });
  };

  // Delete grade
  const handleDeleteGrade = (gradeId: string) => {
    if (!window.confirm('Cô có chắc muốn xóa bản ghi điểm này không?')) return;
    deleteStudentGrade(gradeId);
    setGrades(getAllStudentGrades());
    setSelectedGradeIds((prev) => prev.filter((id) => id !== gradeId));
    setNotice({
      type: 'success',
      message: 'Đã xóa bản ghi điểm khỏi sổ điểm.',
    });
  };

  // Bulk delete
  const handleBulkDeleteGrades = () => {
    if (selectedGradeIds.length === 0) return;
    if (!window.confirm(`Cô có chắc muốn xóa ${selectedGradeIds.length} bản ghi điểm đã chọn?`)) return;
    selectedGradeIds.forEach((id) => deleteStudentGrade(id));
    setGrades(getAllStudentGrades());
    setSelectedGradeIds([]);
    setNotice({
      type: 'success',
      message: 'Đã xóa các bản ghi điểm được chọn.',
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    exportGradesToCSV(filteredGrades);
    setNotice({
      type: 'success',
      message: `Đã xuất thành công ${filteredGrades.length} bản ghi điểm ra tệp Microsoft Excel (CSV).`,
    });
  };

  // Toggle select all grades
  const handleToggleSelectAllGrades = () => {
    if (selectedGradeIds.length === filteredGrades.length) {
      setSelectedGradeIds([]);
    } else {
      setSelectedGradeIds(filteredGrades.map((g) => g.id));
    }
  };

  // Toggle select single grade
  const handleToggleSelectGrade = (id: string) => {
    setSelectedGradeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ==================== CÀI ĐẶT HỆ THỐNG ====================
  const [siteSettings, setSiteSettings] = useState({
    siteTitle: 'Lớp học Vật lý Cô Trần Lê Ngọc Trâm',
    academicYear: '2026-2027',
    gradingScale: '10',
    passThreshold: '5.0',
    adminEmail: 'cotranlengoctram.vatly@gmail.com',
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice({
      type: 'success',
      message: 'Đã lưu cấu hình hệ thống thành công.',
    });
  };

  return (
    <div className="min-h-screen bg-[#f0f0f1] text-[#2c3338] font-sans flex flex-col selection:bg-[#2271b1] selection:text-white">
      
      {/* ==================== 1. WORDPRESS ADMIN BAR (TOP) ==================== */}
      <header className="bg-[#1d2327] text-[#c3c4c7] h-8 px-3 flex items-center justify-between text-xs z-30 select-none shadow-xs border-b border-[#2c3338]">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-300 hover:text-white p-1"
            title="Mở menu quản trị"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* WordPress-style Brand Icon & Site Link */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#2271b1] text-white font-bold flex items-center justify-center text-[10px] shadow-inner">
              W
            </div>
            <span className="font-semibold text-white hidden sm:inline">
              Lớp học Vật lý Cô Trần Lê Ngọc Trâm
            </span>
          </div>

          {/* Visit Site Button (Exits Management back to student app) */}
          <button
            onClick={onBackToApp}
            className="flex items-center gap-1 text-[#c3c4c7] hover:text-white hover:bg-[#2c3338] px-2 py-0.5 rounded transition"
            title="Quay lại giao diện học sinh trên website chính"
          >
            <ExternalLink className="w-3 h-3 text-[#72aee6]" />
            <span>Xem website</span>
          </button>

          {/* Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-emerald-400 pl-2 border-l border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Hệ thống: Trực tuyến (/m@nagement)</span>
          </div>
        </div>

        {/* User profile & Exit */}
        <div className="flex items-center gap-3">
          {/* Quick Add Menu */}
          <button
            onClick={() => {
              setActiveMenu('exercises');
              setExamViewMode('packages');
              handleOpenCreatePackageModal();
            }}
            className="hidden sm:flex items-center gap-1 text-[#c3c4c7] hover:text-white hover:bg-[#2c3338] px-2 py-0.5 rounded transition"
          >
            <FolderPlus className="w-3 h-3 text-[#72aee6]" />
            <span>+ Thêm bộ đề</span>
          </button>

          <button
            onClick={() => {
              setActiveMenu('grades');
              handleOpenGradeModal();
            }}
            className="hidden sm:flex items-center gap-1 text-[#c3c4c7] hover:text-white hover:bg-[#2c3338] px-2 py-0.5 rounded transition"
          >
            <PlusCircle className="w-3 h-3 text-[#72aee6]" />
            <span>+ Nhập điểm</span>
          </button>

          {/* User badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            <div className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px] font-bold">
              T
            </div>
            <span className="hidden md:inline text-slate-200 font-medium">Chào, Cô Trần Lê Ngọc Trâm</span>
          </div>

          {/* Return to website */}
          <button
            onClick={onBackToApp}
            className="text-xs bg-[#2271b1] hover:bg-[#135e96] text-white px-2.5 py-0.5 rounded font-medium transition"
          >
            Thoát quản trị
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* ==================== 2. WORDPRESS LEFT SIDEBAR ==================== */}
        <aside
          className={`bg-[#1d2327] text-[#c3c4c7] transition-all duration-200 flex flex-col justify-between shrink-0 z-20 ${
            sidebarCollapsed ? 'w-12' : 'w-52 md:w-56'
          } ${mobileMenuOpen ? 'fixed inset-y-8 left-0 shadow-2xl block' : 'hidden md:flex'}`}
        >
          {/* Top navigation items */}
          <div className="py-2">
            {/* 1. Bảng tin (Dashboard) */}
            <button
              onClick={() => {
                setActiveMenu('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium transition text-left relative ${
                activeMenu === 'dashboard'
                  ? 'bg-[#2271b1] text-white font-semibold'
                  : 'hover:bg-[#2c3338] hover:text-white'
              }`}
              title="Bảng tin tổng quan"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0 text-[#72aee6]" />
              {!sidebarCollapsed && <span>Bảng tin (Dashboard)</span>}
            </button>

            {/* 2. Đề thi & Bài tập (Exercises / Quizzes) */}
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setActiveMenu('exercises');
                  setExamViewMode('packages');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium transition text-left relative group ${
                  activeMenu === 'exercises'
                    ? 'bg-[#2271b1] text-white font-semibold shadow-xs'
                    : 'hover:bg-[#2c3338] hover:text-white text-[#c3c4c7]'
                }`}
                title="Quản lý từng bộ đề và điều chỉnh câu hỏi"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BookOpen className={`w-4 h-4 shrink-0 ${activeMenu === 'exercises' ? 'text-white' : 'text-[#72aee6]'}`} />
                  {!sidebarCollapsed && <span className="truncate">Bộ Đề & Câu Hỏi</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full transition ${
                    activeMenu === 'exercises'
                      ? 'bg-white text-[#2271b1]'
                      : 'bg-[#2c3338] text-[#72aee6] border border-[#72aee6]/30 group-hover:border-[#72aee6]'
                  }`}>
                    {examPackages.length}
                  </span>
                )}
              </button>

              {/* Sub-menu when in exercises menu and sidebar is expanded */}
              {activeMenu === 'exercises' && !sidebarCollapsed && (
                <div className="pl-9 pr-2 py-1 space-y-1 bg-[#15191c]/80 border-y border-[#2c3338]">
                  <button
                    onClick={() => setExamViewMode('packages')}
                    className={`w-full text-left py-1 px-2 rounded text-[11px] transition flex items-center justify-between ${
                      examViewMode === 'packages'
                        ? 'text-white font-semibold bg-[#2271b1]/30 text-[#72aee6]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Tất cả bộ đề</span>
                    <span className="text-[10px] font-mono">({examPackages.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      if (selectedPackage) {
                        setExamViewMode('questions');
                      }
                    }}
                    className={`w-full text-left py-1 px-2 rounded text-[11px] transition flex items-center justify-between ${
                      examViewMode === 'questions'
                        ? 'text-white font-semibold bg-[#2271b1]/30 text-[#72aee6]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Soạn từng câu hỏi</span>
                    <span className="text-[10px] font-mono">({selectedPackage?.questions?.length || 0})</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Sổ Điểm Điện Tử (Grades) */}
            <button
              onClick={() => {
                setActiveMenu('grades');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium transition text-left relative ${
                activeMenu === 'grades'
                  ? 'bg-[#2271b1] text-white font-semibold'
                  : 'hover:bg-[#2c3338] hover:text-white'
              }`}
              title="Sổ điểm điện tử & học sinh"
            >
              <GraduationCap className="w-4 h-4 shrink-0 text-[#72aee6]" />
              {!sidebarCollapsed && <span>Sổ Điểm Điện Tử</span>}
            </button>

            {/* 4. Cài đặt (Settings) */}
            <button
              onClick={() => {
                setActiveMenu('settings');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium transition text-left relative ${
                activeMenu === 'settings'
                  ? 'bg-[#2271b1] text-white font-semibold'
                  : 'hover:bg-[#2c3338] hover:text-white'
              }`}
              title="Cài đặt hệ thống"
            >
              <Settings className="w-4 h-4 shrink-0 text-[#72aee6]" />
              {!sidebarCollapsed && <span>Cài đặt hệ thống</span>}
            </button>
          </div>

          {/* Bottom collapse button */}
          <div className="border-t border-[#2c3338] p-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-[#a7aaad] hover:text-white hover:bg-[#2c3338] rounded transition"
              title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 mx-auto" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>Thu gọn menu</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ==================== 3. WORDPRESS MAIN CONTENT CANVAS ==================== */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f0f0f1]">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* WordPress Notice Banner */}
            {notice && (
              <div
                className={`p-3.5 bg-white border-l-4 shadow-xs rounded-r text-xs flex items-center justify-between gap-3 ${
                  notice.type === 'success'
                    ? 'border-l-[#00a32a] text-slate-800'
                    : notice.type === 'warning'
                    ? 'border-l-[#dba617] text-slate-800'
                    : 'border-l-[#72aee6] text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {notice.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#00a32a] shrink-0" />}
                  {notice.type === 'warning' && <AlertCircle className="w-4 h-4 text-[#dba617] shrink-0" />}
                  {notice.type === 'info' && <ShieldCheck className="w-4 h-4 text-[#2271b1] shrink-0" />}
                  <span>{notice.message}</span>
                </div>
                <button
                  onClick={() => setNotice(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  title="Đóng thông báo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ==================== VIEW 1: BẢNG TIN (DASHBOARD) ==================== */}
            {activeMenu === 'dashboard' && (
              <div className="space-y-6">
                {/* WordPress Heading */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c3c4c7] pb-4">
                  <div>
                    <h1 className="text-2xl font-normal text-[#1d2327] tracking-tight">
                      Bảng Tin Quản Trị Hệ Thống
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      Tổng quan trạng thái ngân hàng đề thi, sổ điểm điện tử và hoạt động của học sinh
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={onBackToApp}
                      className="px-3 py-1.5 text-xs font-semibold text-[#2271b1] border border-[#2271b1] rounded bg-white hover:bg-[#2271b1] hover:text-white transition shadow-2xs"
                    >
                      Xem website chính
                    </button>
                    <button
                      onClick={() => setActiveMenu('exercises')}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2271b1] hover:bg-[#135e96] rounded transition shadow-2xs"
                    >
                      Quản lý Đề thi
                    </button>
                  </div>
                </div>

                {/* WordPress Welcome Panel */}
                <div className="bg-white border border-[#c3c4c7] rounded-sm p-5 shadow-xs">
                  <h2 className="text-base font-semibold text-[#1d2327] mb-1">
                    Chào mừng Cô Trần Lê Ngọc Trâm đến với Bảng Quản Trị Lớp Học!
                  </h2>
                  <p className="text-xs text-slate-500 mb-4 max-w-2xl">
                    Tại đây Cô có thể cấu hình ngân hàng câu hỏi đề thi trắc nghiệm, quản lý thời gian làm bài, theo dõi tiến độ nộp bài của học sinh và xuất bảng điểm trực tiếp ra file Excel.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-2">Bước đầu tiên</h4>
                      <button
                        onClick={() => {
                          setActiveMenu('exercises');
                          setExamViewMode('packages');
                          handleOpenCreatePackageModal();
                        }}
                        className="inline-flex items-center gap-1.5 text-[#2271b1] hover:underline font-medium"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Tạo bộ đề thi mới</span>
                      </button>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-2">Các bước tiếp theo</h4>
                      <button
                        onClick={() => {
                          setActiveMenu('exercises');
                          setExamViewMode('packages');
                        }}
                        className="inline-flex items-center gap-1.5 text-[#2271b1] hover:underline font-medium"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Quản lý ngân hàng bộ đề & soạn câu hỏi</span>
                      </button>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-2">Báo cáo & Sổ sách</h4>
                      <button
                        onClick={() => {
                          setActiveMenu('grades');
                        }}
                        className="inline-flex items-center gap-1.5 text-[#2271b1] hover:underline font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Xuất sổ điểm điện tử ra Excel (CSV)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* At a Glance Metric Cards (WordPress Widget Style) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1 */}
                  <div
                    onClick={() => {
                      setActiveMenu('exercises');
                      setExamViewMode('packages');
                    }}
                    className="bg-white border border-[#c3c4c7] p-4 rounded-sm shadow-xs flex items-center gap-4 cursor-pointer hover:border-[#2271b1] transition"
                  >
                    <div className="w-11 h-11 rounded bg-blue-50 text-[#2271b1] flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#1d2327]">
                        {examPackages.length} <span className="text-xs font-normal text-slate-500">bộ đề</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {examPackages.reduce((sum, p) => sum + (p.questions?.length || 0), 0)} câu hỏi trong hệ thống
                      </div>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white border border-[#c3c4c7] p-4 rounded-sm shadow-xs flex items-center gap-4">
                    <div className="w-11 h-11 rounded bg-emerald-50 text-[#00a32a] flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#1d2327]">
                        {gradeStats.total}
                      </div>
                      <div className="text-xs text-slate-500">Lượt nộp bài đánh giá</div>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-white border border-[#c3c4c7] p-4 rounded-sm shadow-xs flex items-center gap-4">
                    <div className="w-11 h-11 rounded bg-amber-50 text-[#dba617] flex items-center justify-center shrink-0">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#1d2327]">
                        {gradeStats.avg}/10
                      </div>
                      <div className="text-xs text-slate-500">Điểm trung bình toàn lớp</div>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="bg-white border border-[#c3c4c7] p-4 rounded-sm shadow-xs flex items-center gap-4">
                    <div className="w-11 h-11 rounded bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#1d2327]">
                        {gradeStats.passRate}%
                      </div>
                      <div className="text-xs text-slate-500">Tỷ lệ học sinh đạt chuẩn</div>
                    </div>
                  </div>
                </div>

                {/* 2-Column WordPress Meta-Boxes */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Hoạt động gần đây (Recent Submissions) */}
                  <div className="lg:col-span-2 bg-white border border-[#c3c4c7] rounded-sm shadow-xs">
                    <div className="px-4 py-3 border-b border-[#c3c4c7] flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#1d2327]">
                        Hoạt động làm bài mới nhất của học sinh
                      </h3>
                      <button
                        onClick={() => setActiveMenu('grades')}
                        className="text-xs text-[#2271b1] hover:underline"
                      >
                        Xem tất cả ({grades.length})
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {grades.slice(0, 5).map((grade) => (
                        <div key={grade.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs transition">
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <span>{grade.studentName}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">
                                {grade.className} • {grade.schoolName}
                              </span>
                            </div>
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              {grade.examTitle} • Nộp lúc {grade.submittedAt}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                              grade.gradeClassification === 'Xuất sắc'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : grade.gradeClassification === 'Giỏi'
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {grade.score10.toFixed(1)} / 10
                            </span>
                            <button
                              onClick={() => {
                                setActiveMenu('grades');
                                handleOpenGradeModal(grade);
                              }}
                              className="text-slate-400 hover:text-[#2271b1]"
                              title="Xem và sửa điểm"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Phổ điểm & Thao tác nhanh */}
                  <div className="space-y-6">
                    {/* Widget 1: Phổ điểm */}
                    <div className="bg-white border border-[#c3c4c7] rounded-sm shadow-xs p-4">
                      <h3 className="text-sm font-semibold text-[#1d2327] border-b border-[#c3c4c7] pb-2 mb-3">
                        Phổ điểm đánh giá
                      </h3>
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <div className="flex justify-between text-slate-600 mb-1">
                            <span>Xuất sắc (9.0 - 10):</span>
                            <span className="font-semibold text-slate-900">
                              {grades.filter((g) => g.gradeClassification === 'Xuất sắc').length} học sinh
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-amber-500 h-full rounded-full" 
                              style={{ width: `${(grades.filter((g) => g.gradeClassification === 'Xuất sắc').length / (grades.length || 1)) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-600 mb-1">
                            <span>Giỏi (8.0 - 8.9):</span>
                            <span className="font-semibold text-slate-900">
                              {grades.filter((g) => g.gradeClassification === 'Giỏi').length} học sinh
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full rounded-full" 
                              style={{ width: `${(grades.filter((g) => g.gradeClassification === 'Giỏi').length / (grades.length || 1)) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-600 mb-1">
                            <span>Khá & Trung bình (5.0 - 7.9):</span>
                            <span className="font-semibold text-slate-900">
                              {grades.filter((g) => g.gradeClassification === 'Khá' || g.gradeClassification === 'Trung bình').length} học sinh
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full" 
                              style={{ width: `${(grades.filter((g) => g.gradeClassification === 'Khá' || g.gradeClassification === 'Trung bình').length / (grades.length || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Widget 2: Đề thi đang kích hoạt */}
                    <div className="bg-white border border-[#c3c4c7] rounded-sm shadow-xs p-4">
                      <div className="flex items-center justify-between border-b border-[#c3c4c7] pb-2 mb-3">
                        <h3 className="text-sm font-semibold text-[#1d2327]">
                          Bộ đề đang kích hoạt
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Chính thức
                        </span>
                      </div>
                      
                      {(() => {
                        const activePkg = examPackages.find((p) => p.isActive) || examPackages[0];
                        if (!activePkg) return null;
                        return (
                          <>
                            <div className="text-xs space-y-1.5 text-slate-600">
                              <div>
                                <span className="font-semibold text-slate-800">Tên bộ đề: </span>
                                <span className="text-[#2271b1] font-semibold">{activePkg.title}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-800">Chuyên đề: </span>
                                <span>{activePkg.courseTitle}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-800">Thời gian: </span>
                                <span>{activePkg.durationMinutes} phút</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-800">Tổng câu hỏi: </span>
                                <span className="font-bold text-slate-900">{activePkg.questions?.length || 0} câu</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-800">Thang điểm: </span>
                                <span>{activePkg.maxScore} điểm</span>
                              </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                              <button
                                onClick={() => {
                                  setActiveMenu('exercises');
                                  setExamViewMode('packages');
                                }}
                                className="flex-1 py-1.5 text-xs text-slate-700 border border-[#8c8f94] rounded hover:bg-slate-50 transition font-medium"
                              >
                                Xem tất cả bộ đề
                              </button>
                              <button
                                onClick={() => handleOpenQuestionsForPackage(activePkg.id)}
                                className="flex-1 py-1.5 text-xs text-white bg-[#2271b1] hover:bg-[#135e96] rounded transition font-medium shadow-2xs"
                              >
                                Soạn câu hỏi →
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== VIEW 2: QUẢN LÝ TỪNG BỘ ĐỀ RỒI MỚI ĐẾN ĐIỀU CHỈNH CÂU HỎI ==================== */}
            {activeMenu === 'exercises' && (
              <div className="space-y-4">
                {examViewMode === 'packages' ? (
                  /* ==================== CẤP 1: DANH SÁCH TỪNG BỘ ĐỀ THI ==================== */
                  <div className="space-y-4">
                    {/* WordPress Heading with inline actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c3c4c7] pb-4">
                      <div>
                        <h1 className="text-2xl font-normal text-[#1d2327] tracking-tight flex items-center gap-2">
                          <span>Quản lý Ngân hàng Bộ Đề Thi</span>
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                          Cô có thể tạo từng bộ đề độc lập cho từng chuyên đề, sau đó bấm <span className="font-bold text-[#2271b1]">"Soạn câu hỏi"</span> để điều chỉnh chi tiết từng câu hỏi.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleOpenCreatePackageModal}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2271b1] hover:bg-[#135e96] rounded shadow-xs transition flex items-center gap-1.5"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>+ Thêm bộ đề mới</span>
                        </button>
                        <button
                          onClick={handleResetAllPackages}
                          className="px-2.5 py-1.5 text-xs text-amber-700 border border-amber-300 rounded bg-amber-50 hover:bg-amber-100 transition flex items-center gap-1.5"
                          title="Khôi phục toàn bộ danh sách bộ đề về mặc định ban đầu"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Khôi phục gốc</span>
                        </button>
                      </div>
                    </div>

                    {/* WordPress Status Tabs / Filter Pills */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-[#c3c4c7]/60 pb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPkgFilterStatus('all')}
                          className={`pb-1 px-1 font-medium transition border-b-2 ${
                            pkgFilterStatus === 'all'
                              ? 'border-[#2271b1] text-[#2271b1] font-bold'
                              : 'border-transparent text-slate-600 hover:text-[#2271b1]'
                          }`}
                        >
                          Tất cả ({examPackages.length})
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => setPkgFilterStatus('active')}
                          className={`pb-1 px-1 font-medium transition border-b-2 ${
                            pkgFilterStatus === 'active'
                              ? 'border-[#2271b1] text-[#2271b1] font-bold'
                              : 'border-transparent text-slate-600 hover:text-[#2271b1]'
                          }`}
                        >
                          Đang kích hoạt ({examPackages.filter((p) => p.isActive).length})
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => setPkgFilterStatus('draft')}
                          className={`pb-1 px-1 font-medium transition border-b-2 ${
                            pkgFilterStatus === 'draft'
                              ? 'border-[#2271b1] text-[#2271b1] font-bold'
                              : 'border-transparent text-slate-600 hover:text-[#2271b1]'
                          }`}
                        >
                          Bản nháp / Dự phòng ({examPackages.filter((p) => !p.isActive).length})
                        </button>
                      </div>

                      {/* Course Filter & Search */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-medium">Chuyên đề:</span>
                          <select
                            value={pkgFilterCourse}
                            onChange={(e) => setPkgFilterCourse(e.target.value)}
                            className="bg-white border border-[#8c8f94] rounded px-2.5 py-1 text-xs text-slate-800 focus:border-[#2271b1] outline-hidden"
                          >
                            <option value="all">Tất cả chuyên đề</option>
                            {COURSES_DATA.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="relative w-48 sm:w-56">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Tìm kiếm bộ đề..."
                            value={pkgSearch}
                            onChange={(e) => setPkgSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#c3c4c7] rounded focus:border-[#2271b1] outline-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    {/* WordPress List Table for Exam Packages */}
                    <div className="bg-white border border-[#c3c4c7] rounded-sm shadow-xs overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#f6f7f7] text-[#2c3338] border-b border-[#c3c4c7] font-semibold">
                            <th className="py-2.5 px-3 w-12 text-center">STT</th>
                            <th className="py-2.5 px-4 min-w-[280px]">Tên Bộ Đề & Quản lý</th>
                            <th className="py-2.5 px-3 w-40">Chuyên đề</th>
                            <th className="py-2.5 px-3 w-28 text-center">Số câu hỏi</th>
                            <th className="py-2.5 px-3 w-36">Thời gian & Điểm</th>
                            <th className="py-2.5 px-3 w-28 text-center">Mức độ</th>
                            <th className="py-2.5 px-3 w-36 text-center">Trạng thái</th>
                            <th className="py-2.5 px-4 w-44 text-right">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#c3c4c7]">
                          {filteredPackages.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-10 text-center text-slate-500">
                                Không tìm thấy bộ đề nào phù hợp với bộ lọc hiện tại. Cô có thể nhấn "+ Thêm bộ đề mới" để tạo đề mới.
                              </td>
                            </tr>
                          ) : (
                            filteredPackages.map((pkg, idx) => {
                              const diffBadgeColor = 
                                pkg.difficulty === 'Vận dụng cao 9+' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                pkg.difficulty === 'Vận dụng' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                pkg.difficulty === 'Thông hiểu' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                'bg-emerald-50 text-emerald-800 border-emerald-200';

                              return (
                                <tr key={pkg.id} className="hover:bg-[#f6f7f7] transition group">
                                  <td className="py-3.5 px-3 text-center text-slate-400 font-medium">
                                    #{idx + 1}
                                  </td>
                                  
                                  {/* Title & Row Actions (WordPress style) */}
                                  <td className="py-3.5 px-4">
                                    <button
                                      onClick={() => handleOpenQuestionsForPackage(pkg.id)}
                                      className="font-bold text-slate-900 hover:text-[#2271b1] text-left text-sm block transition leading-snug"
                                    >
                                      {pkg.title}
                                    </button>
                                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                                      {pkg.description || 'Chưa có mô tả bổ sung cho bộ đề này.'}
                                    </p>
                                    
                                    {/* Sub-actions on hover */}
                                    <div className="flex items-center gap-2 mt-2 text-[11px]">
                                      <button
                                        onClick={() => handleOpenQuestionsForPackage(pkg.id)}
                                        className="font-semibold text-[#2271b1] hover:underline"
                                      >
                                        Soạn câu hỏi ({pkg.questions?.length || 0} câu)
                                      </button>
                                      <span className="text-slate-300">|</span>
                                      <button
                                        onClick={() => handleOpenEditPackageModal(pkg)}
                                        className="text-slate-600 hover:text-[#2271b1] hover:underline"
                                      >
                                        Sửa thông số
                                      </button>
                                      <span className="text-slate-300">|</span>
                                      <button
                                        onClick={() => handleDuplicatePackage(pkg.id)}
                                        className="text-slate-600 hover:text-[#2271b1] hover:underline"
                                        title="Nhân bản thành bộ đề mới để tùy biến"
                                      >
                                        Nhân bản
                                      </button>
                                      <span className="text-slate-300">|</span>
                                      <button
                                        onClick={() => handleDeletePackage(pkg)}
                                        className="text-[#b32d2e] hover:underline"
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  </td>

                                  {/* Course */}
                                  <td className="py-3.5 px-3 text-slate-700">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                                      {pkg.courseTitle}
                                    </span>
                                  </td>

                                  {/* Questions count */}
                                  <td className="py-3.5 px-3 text-center">
                                    <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded bg-blue-50 text-[#2271b1] border border-blue-200 text-xs">
                                      {pkg.questions?.length || 0} câu
                                    </span>
                                  </td>

                                  {/* Duration & Max score */}
                                  <td className="py-3.5 px-3 text-slate-700">
                                    <div className="font-semibold text-slate-900">{pkg.durationMinutes} phút</div>
                                    <div className="text-[11px] text-slate-500">Thang {pkg.maxScore} điểm</div>
                                  </td>

                                  {/* Difficulty */}
                                  <td className="py-3.5 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${diffBadgeColor}`}>
                                      {pkg.difficulty || 'Thông hiểu'}
                                    </span>
                                  </td>

                                  {/* Active Status */}
                                  <td className="py-3.5 px-3 text-center">
                                    {pkg.isActive ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Đang kích hoạt</span>
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleSetActivePackage(pkg.id)}
                                        className="px-2.5 py-1 rounded text-[11px] font-medium border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition"
                                        title="Kích hoạt bộ đề này làm bài thi chính thức cho học sinh"
                                      >
                                        Kích hoạt đề này
                                      </button>
                                    )}
                                  </td>

                                  {/* Action button */}
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      onClick={() => handleOpenQuestionsForPackage(pkg.id)}
                                      className="px-3 py-1.5 text-xs font-semibold rounded bg-[#2271b1] hover:bg-[#135e96] text-white shadow-xs transition inline-flex items-center gap-1.5"
                                    >
                                      <FileEdit className="w-3.5 h-3.5" />
                                      <span>Soạn câu hỏi</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* ==================== CẤP 2: ĐIỀU CHỈNH TỪNG CÂU HỎI TRONG BỘ ĐỀ ==================== */
                  <div className="space-y-4">
                    {/* Top bar with back button & breadcrumbs */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c3c4c7] pb-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          onClick={handleBackToPackages}
                          className="px-3 py-1 text-xs font-semibold text-slate-700 border border-[#8c8f94] rounded bg-white hover:bg-slate-100 transition flex items-center gap-1.5 shadow-2xs"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Quay lại Danh sách Bộ đề</span>
                        </button>
                        
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <span>/</span>
                          <span className="text-slate-600">Bộ đề:</span>
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {selectedPackage.title}
                          </span>
                        </div>
                      </div>

                      {/* Header Actions for Questions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleOpenQuestionModal()}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2271b1] hover:bg-[#135e96] rounded shadow-xs transition flex items-center gap-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>+ Thêm câu hỏi mới</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditPackageModal(selectedPackage)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded bg-white hover:bg-slate-100 transition flex items-center gap-1.5"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Cấu hình bộ đề</span>
                        </button>
                        <button
                          onClick={handleResetCurrentPackageQuestions}
                          className="px-2.5 py-1.5 text-xs text-amber-700 border border-amber-300 rounded bg-amber-50 hover:bg-amber-100 transition"
                          title="Khôi phục lại danh sách câu hỏi gốc của bộ đề này"
                        >
                          ↺ Khôi phục câu hỏi gốc
                        </button>
                      </div>
                    </div>

                    {/* Selected Package Banner Overview */}
                    <div className="bg-white border border-[#c3c4c7] p-3.5 rounded-sm shadow-xs">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{selectedPackage.title}</span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#2271b1] border border-blue-200">
                              {selectedPackage.courseTitle}
                            </span>
                            {selectedPackage.isActive ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Đề chính thức trên website
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Bản dự phòng
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {selectedPackage.description}
                          </p>
                        </div>

                        {/* Quick switch package dropdown */}
                        <div className="flex items-center gap-2 shrink-0 text-xs">
                          <label className="text-slate-500 font-medium">Đổi bộ đề:</label>
                          <select
                            value={selectedPackageId}
                            onChange={(e) => {
                              setSelectedPackageId(e.target.value);
                              setQuestionSearch('');
                            }}
                            className="bg-[#f6f7f7] border border-[#8c8f94] rounded px-2 py-1 text-xs text-slate-800 focus:bg-white focus:border-[#2271b1] outline-hidden font-medium"
                          >
                            {examPackages.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title} ({p.questions?.length || 0} câu)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Package Quick Stats Pill Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <BookOpen className="w-3.5 h-3.5 text-[#2271b1]" />
                          <span>Tổng số: <strong className="text-slate-900">{selectedPackage.questions?.length || 0} câu hỏi</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-[#2271b1]" />
                          <span>Thời gian: <strong className="text-slate-900">{selectedPackage.durationMinutes} phút</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Award className="w-3.5 h-3.5 text-[#2271b1]" />
                          <span>Thang điểm: <strong className="text-slate-900">{selectedPackage.maxScore} điểm</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#2271b1]" />
                          <span>Mức độ: <strong className="text-slate-900">{selectedPackage.difficulty || 'Thông hiểu'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Filter and search bar for questions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 border border-[#c3c4c7] rounded-sm text-xs">
                      <div className="text-slate-600 flex items-center gap-2">
                        <span className="font-semibold text-slate-800">Danh sách câu hỏi</span>
                        <span>•</span>
                        <span>Hiển thị {filteredQuestions.length} / {selectedPackage.questions?.length || 0} câu</span>
                      </div>

                      <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Tìm nội dung câu hỏi, phương án, lời giải..."
                          value={questionSearch}
                          onChange={(e) => setQuestionSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 text-xs bg-[#f6f7f7] border border-[#c3c4c7] rounded focus:bg-white focus:border-[#2271b1] outline-hidden"
                        />
                      </div>
                    </div>

                    {/* WordPress Question Table (wp-list-table) */}
                    <div className="bg-white border border-[#c3c4c7] rounded-sm shadow-xs overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#f6f7f7] text-[#2c3338] border-b border-[#c3c4c7] font-semibold">
                            <th className="py-2.5 px-3 w-12 text-center">STT</th>
                            <th className="py-2.5 px-4 min-w-[320px]">Nội dung câu hỏi & 4 Phương án trả lời</th>
                            <th className="py-2.5 px-4 min-w-[220px]">Lời giải chi tiết & Phương pháp</th>
                            <th className="py-2.5 px-4 w-32 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#c3c4c7]">
                          {filteredQuestions.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-slate-500">
                                {selectedPackage.questions?.length === 0
                                  ? 'Bộ đề này hiện chưa có câu hỏi nào. Cô hãy bấm nút "+ Thêm câu hỏi mới" ở trên để bắt đầu soạn đề.'
                                  : 'Không tìm thấy câu hỏi nào phù hợp với từ khóa tìm kiếm.'}
                              </td>
                            </tr>
                          ) : (
                            filteredQuestions.map((q, idx) => (
                              <tr key={q.id} className="hover:bg-[#f6f7f7] transition group">
                                <td className="py-3 px-3 text-center text-slate-500 font-medium">
                                  #{idx + 1}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-semibold text-slate-900 mb-2 leading-relaxed text-[13px]">
                                    {q.text}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                                    {q.options.map((opt, optIdx) => {
                                      const isCorrect = optIdx === q.correctIndex;
                                      return (
                                        <div
                                          key={optIdx}
                                          className={`px-2 py-1 rounded flex items-center gap-1.5 ${
                                            isCorrect
                                              ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-300'
                                              : 'bg-slate-50 text-slate-600 border border-slate-200'
                                          }`}
                                        >
                                          <span className="font-bold">
                                            {String.fromCharCode(65 + optIdx)}.
                                          </span>
                                          <span className="flex-1">{opt}</span>
                                          {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-slate-600 leading-relaxed text-[11px]">
                                  {q.explanation || 'Chưa có lời giải chi tiết.'}
                                </td>
                                <td className="py-3 px-4 text-right align-top">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleOpenQuestionModal(q)}
                                      className="text-[#2271b1] hover:underline font-medium"
                                      title="Chỉnh sửa câu hỏi này"
                                    >
                                      Chỉnh sửa
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                      onClick={() => handleDeleteQuestion(q.id)}
                                      className="text-[#b32d2e] hover:underline font-medium"
                                      title="Xóa câu hỏi khỏi bộ đề"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================== VIEW 3: SỔ ĐIỂM ĐIỆN TỬ ==================== */}
            {activeMenu === 'grades' && (
              <div className="space-y-4">
                {/* WordPress Heading with inline actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c3c4c7] pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-normal text-[#1d2327] tracking-tight">
                      Sổ Điểm Điện Tử Toàn Website
                    </h1>
                    <button
                      onClick={() => handleOpenGradeModal()}
                      className="px-2.5 py-1 text-xs font-semibold text-[#2271b1] border border-[#2271b1] rounded bg-white hover:bg-[#2271b1] hover:text-white transition"
                    >
                      + Nhập điểm thủ công
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-600 rounded bg-emerald-50 hover:bg-emerald-600 hover:text-white transition flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Xuất Excel (.csv)</span>
                    </button>
                    <button
                      onClick={() => setIsPrintModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-300 rounded bg-white hover:bg-slate-100 transition flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>In bảng điểm A4</span>
                    </button>
                  </div>

                  {/* Quick summary numbers */}
                  <div className="text-xs text-slate-500">
                    Tổng cộng: <span className="font-bold text-slate-900">{grades.length}</span> học sinh đã nộp bài
                  </div>
                </div>

                {/* Filter and Bulk Action Bar */}
                <div className="bg-white p-3 border border-[#c3c4c7] rounded-sm space-y-3 text-xs">
                  {/* Status pills like WordPress */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2.5">
                    <button
                      onClick={() => {
                        setGradeFilterStatus('all');
                        setGradeFilterClass('all');
                      }}
                      className={`font-semibold ${
                        gradeFilterStatus === 'all' && gradeFilterClass === 'all'
                          ? 'text-[#2271b1]'
                          : 'text-slate-600 hover:text-[#2271b1]'
                      }`}
                    >
                      Tất cả ({grades.length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => {
                        setGradeFilterStatus('Đạt');
                        setGradeFilterClass('all');
                      }}
                      className={`font-medium ${
                        gradeFilterStatus === 'Đạt' ? 'text-[#2271b1]' : 'text-slate-600 hover:text-[#2271b1]'
                      }`}
                    >
                      Đạt chuẩn ({grades.filter((g) => g.status === 'Đạt').length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => {
                        setGradeFilterStatus('all');
                        setGradeFilterClass('Xuất sắc');
                      }}
                      className={`font-medium ${
                        gradeFilterClass === 'Xuất sắc' ? 'text-[#2271b1]' : 'text-slate-600 hover:text-[#2271b1]'
                      }`}
                    >
                      Xuất sắc ({grades.filter((g) => g.gradeClassification === 'Xuất sắc').length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => {
                        setGradeFilterStatus('all');
                        setGradeFilterClass('Giỏi');
                      }}
                      className={`font-medium ${
                        gradeFilterClass === 'Giỏi' ? 'text-[#2271b1]' : 'text-slate-600 hover:text-[#2271b1]'
                      }`}
                    >
                      Giỏi ({grades.filter((g) => g.gradeClassification === 'Giỏi').length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => {
                        setGradeFilterStatus('Chưa đạt');
                        setGradeFilterClass('all');
                      }}
                      className={`font-medium ${
                        gradeFilterStatus === 'Chưa đạt' ? 'text-rose-600 font-bold' : 'text-slate-600 hover:text-rose-600'
                      }`}
                    >
                      Cần cải thiện ({grades.filter((g) => g.status === 'Chưa đạt').length})
                    </button>
                  </div>

                  {/* Filter tools & search */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      {/* Bulk actions */}
                      {selectedGradeIds.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleBulkDeleteGrades}
                            className="px-2 py-1 bg-rose-50 border border-rose-300 text-rose-700 rounded font-medium hover:bg-rose-100"
                          >
                            Xóa {selectedGradeIds.length} mục đã chọn
                          </button>
                        </div>
                      )}

                      {/* Sort dropdown */}
                      <select
                        value={gradeSortBy}
                        onChange={(e) => setGradeSortBy(e.target.value as any)}
                        className="bg-white border border-[#c3c4c7] rounded px-2.5 py-1 text-slate-700 outline-hidden"
                      >
                        <option value="scoreDesc">Sắp xếp: Điểm cao nhất</option>
                        <option value="scoreAsc">Sắp xếp: Điểm thấp nhất</option>
                        <option value="dateDesc">Sắp xếp: Mới nộp gần nhất</option>
                        <option value="nameAsc">Sắp xếp: Tên học sinh A-Z</option>
                      </select>

                      {/* Filter by course */}
                      <select
                        value={gradeFilterCourse}
                        onChange={(e) => setGradeFilterCourse(e.target.value)}
                        className="bg-white border border-[#c3c4c7] rounded px-2.5 py-1 text-slate-700 outline-hidden"
                      >
                        <option value="all">Khóa học: Tất cả</option>
                        <option value="course-phys-10-bai1">Bài 1 – Làm quen với Vật lí</option>
                        <option value="course-phys-10-bai2">Bài 2 – Các quy tắc an toàn</option>
                        <option value="course-phys-10-bai3">Bài 3 – Sai số</option>
                      </select>
                    </div>

                    {/* Search box */}
                    <div className="relative w-full md:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm học sinh, trường, lớp..."
                        value={gradeSearch}
                        onChange={(e) => setGradeSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-xs bg-[#f6f7f7] border border-[#c3c4c7] rounded focus:bg-white focus:border-[#2271b1] outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Grades Table (wp-list-table) */}
                <div className="bg-white border border-[#c3c4c7] rounded-sm shadow-xs overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#f6f7f7] text-[#2c3338] border-b border-[#c3c4c7] font-semibold">
                        <th className="py-2.5 px-3 w-8 text-center">
                          <button
                            onClick={handleToggleSelectAllGrades}
                            className="text-slate-500 hover:text-slate-800"
                            title="Chọn tất cả"
                          >
                            {selectedGradeIds.length === filteredGrades.length && filteredGrades.length > 0 ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[#2271b1]" />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 w-28">Mã HS</th>
                        <th className="py-2.5 px-4 min-w-[180px]">Họ và tên học sinh</th>
                        <th className="py-2.5 px-4 min-w-[180px]">Trường & Lớp</th>
                        <th className="py-2.5 px-4 min-w-[200px]">Đề kiểm tra</th>
                        <th className="py-2.5 px-3 text-center">Điểm (Thang 10)</th>
                        <th className="py-2.5 px-3 text-center">Số câu đúng</th>
                        <th className="py-2.5 px-3 text-center">Thời gian</th>
                        <th className="py-2.5 px-3 text-center">Xếp loại</th>
                        <th className="py-2.5 px-3 text-center w-32">Tiến độ</th>
                        <th className="py-2.5 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c3c4c7]">
                      {filteredGrades.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-500">
                            Không có kết quả điểm số nào thỏa mãn bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        filteredGrades.map((grade) => {
                          const isSelected = selectedGradeIds.includes(grade.id);
                          return (
                            <tr
                              key={grade.id}
                              className={`hover:bg-[#f6f7f7] transition ${isSelected ? 'bg-blue-50/50' : ''}`}
                            >
                              <td className="py-3 px-3 text-center">
                                <button
                                  onClick={() => handleToggleSelectGrade(grade.id)}
                                  className="text-slate-500 hover:text-slate-800"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-[#2271b1]" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                                {grade.studentId}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-900">
                                {grade.studentName}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                <div>{grade.className}</div>
                                <div className="text-[11px] text-slate-400">{grade.schoolName}</div>
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                <div className="line-clamp-1">{grade.examTitle}</div>
                                <div className="text-[11px] text-slate-400">{grade.submittedAt}</div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded font-bold text-xs ${
                                  grade.score10 >= 9.0
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : grade.score10 >= 8.0
                                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                    : grade.score10 >= 6.5
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : grade.score10 >= 5.0
                                    ? 'bg-slate-100 text-slate-800'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {grade.score10.toFixed(1)}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-600 font-medium">
                                {grade.correctCount}/{grade.totalQuestions}
                              </td>
                              <td className="py-3 px-3 text-center text-slate-500 text-[11px]">
                                {grade.completionTime}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                  grade.status === 'Đạt'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {grade.gradeClassification}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                {(() => {
                                  // Tiến độ bài học thực tế của học sinh này trên nền tảng
                                  const progress = getStudentOverallProgress(
                                    grade.studentId,
                                    totalPlatformLessonsCount
                                  );
                                  const pct = progress.percent;
                                  const barColor =
                                    pct >= 100
                                      ? 'bg-emerald-500'
                                      : pct >= 50
                                      ? 'bg-[#2271b1]'
                                      : pct > 0
                                      ? 'bg-amber-500'
                                      : 'bg-slate-300';
                                  return (
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${barColor}`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-semibold text-slate-600">
                                        {progress.completed}/{progress.total} bài • {pct}%
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenGradeModal(grade)}
                                    className="text-[#2271b1] hover:underline font-medium"
                                  >
                                    Sửa
                                  </button>
                                  <span className="text-slate-300">|</span>
                                  <button
                                    onClick={() => handleDeleteGrade(grade.id)}
                                    className="text-[#b32d2e] hover:underline font-medium"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom pagination / total summary */}
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Hiển thị {filteredGrades.length} của {grades.length} mục</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="text-[#2271b1] hover:underline flex items-center gap-1 font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Xuất file Excel</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== VIEW 4: CÀI ĐẶT HỆ THỐNG ==================== */}
            {activeMenu === 'settings' && (
              <div className="space-y-6">
                <div className="border-b border-[#c3c4c7] pb-4">
                  <h1 className="text-2xl font-normal text-[#1d2327] tracking-tight">
                    Cài Đặt Hệ Thống & Thang Điểm
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Cấu hình thông tin lớp học, thang điểm chuẩn và cơ chế truy cập an toàn
                  </p>
                </div>

                <div className="bg-white border border-[#c3c4c7] rounded-sm p-6 shadow-xs max-w-3xl">
                  <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        Tên website / Lớp học:
                      </label>
                      <input
                        type="text"
                        value={siteSettings.siteTitle}
                        onChange={(e) => setSiteSettings({ ...siteSettings, siteTitle: e.target.value })}
                        className="w-full sm:w-96 px-3 py-1.5 border border-[#8c8f94] rounded text-xs focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] outline-hidden"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Tên hiển thị trên thanh tiêu đề và các bản in bảng điểm học sinh.
                      </p>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        Niên khóa giảng dạy:
                      </label>
                      <input
                        type="text"
                        value={siteSettings.academicYear}
                        onChange={(e) => setSiteSettings({ ...siteSettings, academicYear: e.target.value })}
                        className="w-full sm:w-96 px-3 py-1.5 border border-[#8c8f94] rounded text-xs focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        Thang điểm quy đổi chuẩn:
                      </label>
                      <input
                        type="text"
                        disabled
                        value="Thang 10 (Chấm trên thang 100 và quy đổi tương đương)"
                        className="w-full sm:w-96 px-3 py-1.5 border border-slate-200 bg-slate-100 text-slate-500 rounded text-xs cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        Điểm đạt chuẩn tối thiểu:
                      </label>
                      <input
                        type="text"
                        value={siteSettings.passThreshold}
                        onChange={(e) => setSiteSettings({ ...siteSettings, passThreshold: e.target.value })}
                        className="w-28 px-3 py-1.5 border border-[#8c8f94] rounded text-xs focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] outline-hidden"
                      />
                      <span className="ml-2 text-slate-500">/ 10.0</span>
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <div className="bg-sky-50 border border-sky-200 p-3.5 rounded text-sky-900 text-xs flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-[#2271b1] shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold mb-0.5">Bảo mật truy cập quản trị</div>
                          <div className="text-slate-600 leading-relaxed text-[11px]">
                            Site management đã được ẩn hoàn toàn khỏi thanh điều hướng của học sinh. Để vào trang này, Cô chỉ cần gõ đường dẫn <strong>/m@nagement</strong> trên thanh địa chỉ hoặc ấn tổ hợp phím tắt <strong>Alt + M</strong>.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#2271b1] hover:bg-[#135e96] text-white font-semibold rounded text-xs transition shadow-xs"
                      >
                        Lưu thay đổi cài đặt
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ==================== MODAL: THÊM / CHỈNH SỬA CÂU HỎI ==================== */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#c3c4c7] rounded shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-3.5 bg-[#f6f7f7] border-b border-[#c3c4c7] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[#1d2327]">
                {editingQuestion ? 'Chỉnh sửa câu hỏi trắc nghiệm' : 'Thêm câu hỏi mới vào ngân hàng đề'}
              </h3>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Nội dung câu hỏi: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                  className="w-full px-3 py-2 border border-[#8c8f94] rounded focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-2">
                  4 Phương án trả lời (Chọn radio để đặt đáp án đúng): <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 w-12">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={questionForm.correctIndex === idx}
                          onChange={() => setQuestionForm({ ...questionForm, correctIndex: idx })}
                          className="text-[#2271b1] focus:ring-[#2271b1]"
                        />
                        <span>{String.fromCharCode(65 + idx)}.</span>
                      </label>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...questionForm.options];
                          newOpts[idx] = e.target.value;
                          setQuestionForm({ ...questionForm, options: newOpts });
                        }}
                        placeholder={`Nội dung phương án ${String.fromCharCode(65 + idx)}...`}
                        className={`flex-1 px-3 py-1.5 border rounded focus:border-[#2271b1] outline-hidden ${
                          questionForm.correctIndex === idx
                            ? 'border-emerald-500 bg-emerald-50/50 font-medium'
                            : 'border-[#8c8f94]'
                        }`}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Lời giải chi tiết & Phương pháp tư duy:
                </label>
                <textarea
                  rows={3}
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Giải thích tại sao chọn đáp án trên, công thức áp dụng..."
                  className="w-full px-3 py-2 border border-[#8c8f94] rounded focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1] outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-3.5 py-1.5 border border-[#8c8f94] rounded text-slate-700 hover:bg-slate-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-semibold rounded transition shadow-xs"
                >
                  Lưu câu hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: TẠO MỚI / CHỈNH SỬA THÔNG TIN BỘ ĐỀ ==================== */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#c3c4c7] rounded shadow-2xl max-w-lg w-full">
            <div className="px-5 py-3.5 bg-[#f6f7f7] border-b border-[#c3c4c7] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-[#1d2327]">
                  {editingPackage ? 'Chỉnh sửa thông số Bộ đề thi' : 'Tạo mới Bộ đề thi & Bài kiểm tra'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {editingPackage ? `Mã bộ đề: ${editingPackage.id}` : 'Khởi tạo bộ đề độc lập trong ngân hàng đề'}
                </p>
              </div>
              <button
                onClick={() => setIsPackageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Tên Bộ Đề Thi: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={packageForm.title}
                  onChange={(e) => setPackageForm({ ...packageForm, title: e.target.value })}
                  placeholder="Ví dụ: Bộ Đề 01: Dao Động Cơ Chuẩn ĐGNL..."
                  className="w-full px-3 py-1.5 border border-[#8c8f94] rounded focus:border-[#2271b1] outline-hidden font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Chuyên đề môn học:
                  </label>
                  <select
                    value={packageForm.courseId}
                    onChange={(e) => setPackageForm({ ...packageForm, courseId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#8c8f94] rounded focus:border-[#2271b1] outline-hidden bg-white"
                  >
                    {COURSES_DATA.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Mức độ phân loại:
                  </label>
                  <select
                    value={packageForm.difficulty}
                    onChange={(e) => setPackageForm({ ...packageForm, difficulty: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-[#8c8f94] rounded focus:border-[#2271b1] outline-hidden bg-white"
                  >
                    <option value="Cơ bản">Cơ bản (Dành cho ôn tập nền tảng)</option>
                    <option value="Thông hiểu">Thông hiểu (Mục tiêu 6-7 điểm)</option>
                    <option value="Vận dụng">Vận dụng (Mục tiêu 8 điểm)</option>
                    <option value="Vận dụng cao 9+">Vận dụng cao 9+ (Phân hóa xuất sắc)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Mô tả / Hướng dẫn trọng tâm cho học sinh:
                </label>
                <textarea
                  rows={2}
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  placeholder="Ghi chú kiến thức trọng tâm, bẫy điểm thường gặp..."
                  className="w-full px-3 py-1.5 border border-[#8c8f94] rounded focus:border-[#2271b1] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Thời lượng làm bài (phút):
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={packageForm.durationMinutes}
                    onChange={(e) => setPackageForm({ ...packageForm, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-[#8c8f94] rounded focus:border-[#2271b1] outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Thang điểm tối đa:
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={packageForm.maxScore}
                    onChange={(e) => setPackageForm({ ...packageForm, maxScore: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-[#8c8f94] rounded focus:border-[#2271b1] outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={packageForm.isActive}
                    onChange={(e) => setPackageForm({ ...packageForm, isActive: e.target.checked })}
                    className="rounded text-[#2271b1] focus:ring-[#2271b1] w-4 h-4"
                  />
                  <span className="font-semibold text-slate-800">
                    Kích hoạt bộ đề này làm Đề Thi Chính Thức trên website ngay
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6 mt-0.5">
                  Khi kích hoạt, học sinh truy cập bài thi của chuyên đề này sẽ làm trực tiếp bộ đề này.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="px-3.5 py-1.5 border border-[#8c8f94] rounded text-slate-700 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-semibold rounded transition shadow-xs"
                >
                  {editingPackage ? 'Lưu thay đổi' : 'Tạo bộ đề'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: NHẬP / CHỈNH SỬA ĐIỂM HỌC SINH ==================== */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#c3c4c7] rounded shadow-2xl max-w-lg w-full">
            <div className="px-5 py-3.5 bg-[#f6f7f7] border-b border-[#c3c4c7] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[#1d2327]">
                {editingGrade ? 'Chỉnh sửa điểm học sinh' : 'Nhập điểm học sinh mới'}
              </h3>
              <button
                onClick={() => setIsGradeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Mã học sinh:
                  </label>
                  <input
                    type="text"
                    value={gradeForm.studentId}
                    onChange={(e) => setGradeForm({ ...gradeForm, studentId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[#8c8f94] rounded font-mono text-xs focus:border-[#2271b1] outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Họ và tên học sinh: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={gradeForm.studentName}
                    onChange={(e) => setGradeForm({ ...gradeForm, studentName: e.target.value })}
                    placeholder="VD: Nguyễn Văn An"
                    className="w-full px-2.5 py-1.5 border border-[#8c8f94] rounded text-xs focus:border-[#2271b1] outline-hidden font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Trường THPT:
                  </label>
                  <input
                    type="text"
                    value={gradeForm.schoolName}
                    onChange={(e) => setGradeForm({ ...gradeForm, schoolName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[#8c8f94] rounded text-xs focus:border-[#2271b1] outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Lớp học:
                  </label>
                  <input
                    type="text"
                    value={gradeForm.className}
                    onChange={(e) => setGradeForm({ ...gradeForm, className: e.target.value })}
                    placeholder="VD: 12A1"
                    className="w-full px-2.5 py-1.5 border border-[#8c8f94] rounded text-xs focus:border-[#2271b1] outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Đề kiểm tra:
                </label>
                <input
                  type="text"
                  value={gradeForm.examTitle}
                  onChange={(e) => setGradeForm({ ...gradeForm, examTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#8c8f94] rounded text-xs focus:border-[#2271b1] outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Điểm (Thang 10):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={10}
                    value={gradeForm.score10}
                    onChange={(e) => setGradeForm({ ...gradeForm, score10: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-[#8c8f94] rounded text-xs focus:border-[#2271b1] outline-hidden font-bold text-[#2271b1]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Số câu đúng:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={gradeForm.totalQuestions}
                    value={gradeForm.correctCount}
                    onChange={(e) => setGradeForm({ ...gradeForm, correctCount: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-[#8c8f94] rounded text-xs focus:border-[#2271b1] outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Thời gian hoàn thành:
                  </label>
                  <input
                    type="text"
                    value={gradeForm.completionTime}
                    onChange={(e) => setGradeForm({ ...gradeForm, completionTime: e.target.value })}
                    placeholder="VD: 14 phút 20 giây"
                    className="w-full px-2.5 py-1.5 border border-[#8c8f94] rounded text-xs focus:border-[#2271b1] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Nhận xét của giáo viên:
                </label>
                <input
                  type="text"
                  value={gradeForm.notes || ''}
                  onChange={(e) => setGradeForm({ ...gradeForm, notes: e.target.value })}
                  placeholder="Ghi chú năng lực hoặc bài tập cần rèn thêm..."
                  className="w-full px-2.5 py-1.5 border border-[#8c8f94] rounded text-xs focus:border-[#2271b1] outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-3.5 py-1.5 border border-[#8c8f94] rounded text-slate-700 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white font-semibold rounded transition shadow-xs"
                >
                  Lưu điểm số
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: IN BẢNG ĐIỂM SƯ PHẠM A4 ==================== */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full p-8 text-slate-900 my-8">
            <div className="flex items-center justify-between border-b pb-4 mb-6">
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <Printer className="w-4 h-4 text-blue-600" />
                <span>Xem trước bản in A4 tiêu chuẩn sư phạm</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#2271b1] text-white rounded text-xs font-semibold hover:bg-[#135e96] transition flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In ra giấy / Lưu PDF</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable A4 Content */}
            <div className="space-y-6 text-xs">
              <div className="text-center space-y-1">
                <h4 className="font-bold uppercase tracking-wider text-xs">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </h4>
                <p className="font-semibold italic text-[11px]">Độc lập - Tự do - Hạnh phúc</p>
                <div className="w-24 h-0.5 bg-slate-800 mx-auto my-1"></div>
              </div>

              <div className="flex justify-between items-start text-xs border-b border-slate-200 pb-3">
                <div>
                  <p className="font-bold">LỚP HỌC VẬT LÝ THẦY TQT</p>
                  <p className="text-slate-600">Niên khóa: 2026 - 2027</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-[#1d2327]">BẢNG ĐIỂM KIỂM TRA TOÀN DIỆN</p>
                  <p className="text-slate-500 text-[11px]">
                    Ngày in: {new Date().toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              {/* Statistics summary */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded border border-slate-200 text-center">
                <div>
                  <span className="text-slate-500">Tổng học sinh:</span>{' '}
                  <strong className="text-slate-900">{filteredGrades.length}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Điểm trung bình:</span>{' '}
                  <strong className="text-slate-900">{gradeStats.avg}/10</strong>
                </div>
                <div>
                  <span className="text-slate-500">Tỷ lệ đạt chuẩn:</span>{' '}
                  <strong className="text-emerald-700">{gradeStats.passRate}%</strong>
                </div>
                <div>
                  <span className="text-slate-500">Điểm cao nhất:</span>{' '}
                  <strong className="text-blue-700">{gradeStats.maxScore}/10</strong>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-1.5 text-center w-8">STT</th>
                    <th className="border border-slate-300 p-1.5 text-left">Họ và tên học sinh</th>
                    <th className="border border-slate-300 p-1.5 text-left">Trường / Lớp</th>
                    <th className="border border-slate-300 p-1.5 text-center">Đúng/Tổng</th>
                    <th className="border border-slate-300 p-1.5 text-center">Điểm (10)</th>
                    <th className="border border-slate-300 p-1.5 text-center">Xếp loại</th>
                    <th className="border border-slate-300 p-1.5 text-left">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGrades.map((g, i) => (
                    <tr key={g.id}>
                      <td className="border border-slate-300 p-1 text-center">{i + 1}</td>
                      <td className="border border-slate-300 p-1 font-semibold">{g.studentName}</td>
                      <td className="border border-slate-300 p-1">
                        {g.className} - {g.schoolName}
                      </td>
                      <td className="border border-slate-300 p-1 text-center">
                        {g.correctCount}/{g.totalQuestions}
                      </td>
                      <td className="border border-slate-300 p-1 text-center font-bold">
                        {g.score10.toFixed(1)}
                      </td>
                      <td className="border border-slate-300 p-1 text-center">
                        {g.gradeClassification}
                      </td>
                      <td className="border border-slate-300 p-1 text-[10px] text-slate-600">
                        {g.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 pt-8 text-center text-xs">
                <div>
                  <p className="font-semibold text-slate-700">BAN CHUYÊN MÔN</p>
                  <p className="text-[10px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
                  <div className="h-14"></div>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">GIÁO VIÊN BỘ MÔN</p>
                  <p className="text-[10px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
                  <div className="h-14 flex items-center justify-center font-bold text-slate-800">
                    Cô Trần Lê Ngọc Trâm
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
