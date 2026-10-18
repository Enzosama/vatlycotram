import { Post, StudentGradeRecord, OfficialExam, Question, MiniQuiz, ExamPackage } from '../types';
import { COURSES_DATA } from '../data/coursesData';

const STORAGE_KEYS = {
  POSTS: 'tqt_management_posts_v1',
  STUDENT_GRADES: 'tqt_student_grades_v1',
  CUSTOM_EXAMS: 'tqt_custom_exams_v1',
  CUSTOM_QUIZZES: 'tqt_custom_quizzes_v1',
  EXAM_PACKAGES: 'tqt_exam_packages_v2',
};

// ==================== BÀI VIẾT & THÔNG BÁO ====================
export const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    title: 'Thông báo Lịch Thi Thử Đánh Giá Năng Lực & Tốt Nghiệp THPT Đợt 1',
    summary: 'Kế hoạch tổ chức kỳ thi thử chuyên đề Dao Động Cơ & Sóng Cơ Học trực tuyến dành cho toàn bộ học sinh năm học 2026-2027.',
    content: `Kính gửi toàn thể các em học sinh Lớp học Vật lý TQT,

Nhằm giúp các em làm quen với cấu trúc đề thi mới nhất của Bộ Giáo Dục và các kỳ thi Đánh giá năng lực Đại học Quốc gia, Cô Trần Lê Ngọc Trâm thông báo lịch kiểm tra định kỳ Đợt 1 như sau:

1. THỜI GIAN VÀ HÌNH THỨC:
- Thời gian mở đề: Từ 19:30 Thứ 7 đến 22:00 Chủ nhật hàng tuần.
- Thời lượng làm bài: 45 phút (40 câu hỏi trắc nghiệm khách quan).
- Hình thức: Làm bài trực tiếp trên website tại mục "Thi đánh giá năng lực".

2. CẤU TRÚC ĐỀ THI:
- 40% câu hỏi Nhận biết & Thông hiểu: Công thức cơ bản, phương trình li độ, vận tốc, chu kỳ con lắc lò xo và con lắc đơn.
- 40% câu hỏi Vận dụng: Bài toán đồ thị dao động, mối liên hệ năng lượng thế năng - động năng, bài toán va chạm.
- 20% câu hỏi Vận dụng cao: Ghép lò xo thay đổi độ cứng, dao động tắt dần có lực cản, truyền sóng âm và giao thoa sóng cơ.

3. QUY ĐỊNH XẾP HẠNG TOP 5:
- Hệ thống tự động ghi nhận thời gian và điểm số chính xác đến từng giây.
- 5 học sinh có điểm số cao nhất và thời gian hoàn thành sớm nhất sẽ được vinh danh trên Bảng Xếp Hạng trang chủ và nhận tài liệu độc quyền từ Cô.

Chúc các em ôn tập hiệu quả và đạt điểm số tối đa!`,
    category: 'Thông báo',
    author: 'Cô Trần Lê Ngọc Trâm',
    authorRole: 'Giáo viên Chuyên đề Vật lý',
    createdAt: '10/09/2026 08:30',
    status: 'published',
    pinned: true,
    views: 482,
    tags: ['Thi thử', 'Lịch thi', 'Vật lý 12', 'Top 5'],
    attachments: [
      { name: 'Ke_hoach_thi_thu_Dot_1_2026.pdf', url: '#', size: '1.4 MB', type: 'pdf' },
      { name: 'Bang_quy_doi_diem_chuan_THPT.pdf', url: '#', size: '850 KB', type: 'pdf' }
    ]
  },
  {
    id: 'post-2',
    title: 'Chuyên đề 9+: 5 Bẫy Lừa Kinh Điển Trong Đồ Thị Dao Động Điều Hòa',
    summary: 'Phân tích các lỗi sai phổ biến về xác định pha ban đầu, chu kỳ từ đồ thị x-t, v-t và đồ thị động năng thế năng.',
    content: `Trong quá trình chấm bài và giải đáp thắc mắc, Cô nhận thấy có đến 70% học sinh mất điểm oan ở các câu đồ thị từ 7.5 trở lên. Dưới đây là 5 điểm bẫy cần khắc phục ngay:

BẪY 1: Nhầm lẫn chu kỳ dao động T và chu kỳ biến thiên năng lượng T' = T/2.
- Li độ x, vận tốc v, gia tốc a biến thiên với chu kỳ T (tần số góc ω).
- Động năng Wđ và Thế năng Wt biến thiên tuần hoàn với chu kỳ T' = T/2 (tần số góc 2ω).
=> Khi đề bài cho đồ thị năng lượng theo thời gian, khoảng cách giữa 2 đỉnh liên tiếp là T/2 chứ không phải T!

BẪY 2: Xác định sai chiều chuyển động tại vị trí x = 0 (VTCB).
- Nếu đồ thị đi từ âm lên dương qua VTCB: v > 0 => pha dao động φ = -π/2.
- Nếu đồ thị đi từ dương xuống âm qua VTCB: v < 0 => pha dao động φ = +π/2.

BẪY 3: Đơn vị trên các trục tọa độ.
- Trục li độ thường dùng cm hoặc mm.
- Trục thời gian có thể là ms (mili-giây) hoặc s. Nếu không đổi về giây, tính chu kỳ và tần số góc sẽ sai lệch 1000 lần.

BẪY 4: Đồ thị thế năng theo li độ Wt(x).
- Đồ thị là một parabol có bề lõm hướng lên, đỉnh tại gốc tọa độ (Wt min = 0 khi x = 0).
- Bề rộng của đáy parabol tương ứng với 2 lần biên độ dao động (từ -A đến +A).

BẪY 5: Đồ thị lực kéo về và lực đàn hồi con lắc lò xo treo thẳng đứng.
- Lực kéo về luôn hướng về VTCB: Fkv = -kx.
- Lực đàn hồi hướng về vị trí lò xo không biến dạng: Fdh = -k(Δl0 + x).
- Điểm Fdh = 0 chỉ xảy ra khi A ≥ Δl0.

Các em hãy lưu lại bài viết và vẽ lại sơ đồ vào vở chuyên đề nhé!`,
    category: 'Bí kíp học tập',
    author: 'Cô Trần Lê Ngọc Trâm',
    authorRole: 'Giáo viên Chuyên đề Vật lý',
    createdAt: '08/09/2026 14:15',
    status: 'published',
    pinned: true,
    views: 890,
    tags: ['Bí kíp 9+', 'Đồ thị', 'Dao động cơ', 'Mẹo giải nhanh'],
  },
  {
    id: 'post-3',
    title: 'Kỹ Thuật Bấm Máy Tính Casio fx-880BTG / 580VNX Giải Mạch RLC Nối Tiếp',
    summary: 'Phương pháp biểu diễn số phức trong điện xoay chiều, tìm điện áp tức thời và công suất cực trị chỉ trong 30 giây.',
    content: `Phương pháp số phức (Complex Mode) là vũ khí tối thượng giúp rút ngắn 80% thời gian làm các bài toán tổng hợp dao động và mạch xoay chiều RLC.

1. CÀI ĐẶT MÁY TÍNH:
- Máy fx-580VNX: MENU -> 2 (Số phức: Complex) -> SHIFT MENU -> 2 -> 2 (Đơn vị góc: Radian).
- Máy fx-880BTG: HOME -> Số phức -> Cài đặt -> Đơn vị góc -> Radian.

2. CÔNG THỨC CHUYỂN ĐỔI:
- Cường độ dòng điện i = I0 ∠ φi = u / Z_phức.
- Trở kháng phức: Z = R + (ZL - ZC)i.
- Điện áp hai đầu đoạn mạch u = i * Z_phức = U0 ∠ φu.

3. VÍ DỤ MINH HỌA:
Cho mạch RLC nối tiếp có R = 50 Ω, L = 1/π H, C = 10^-4 / (2π) F. Đặt điện áp u = 100√2 cos(100πt + π/6) (V). Viết biểu thức i?
- ZL = 100 Ω, ZC = 200 Ω.
- Nhập máy: (100√2 ∠ (π/6)) / (50 + (100 - 200)i).
- Kết quả hiển thị: 2 ∠ (0.927 rad).
=> Biểu thức tức thời: i = 2 cos(100πt + 0.927) (A).

Xem thêm video bài giảng chi tiết ở Chương Điện Xoay Chiều trên hệ thống.`,
    category: 'Tài liệu hướng dẫn',
    author: 'Cô Trần Lê Ngọc Trâm',
    authorRole: 'Giáo viên Chuyên đề Vật lý',
    createdAt: '05/09/2026 16:45',
    status: 'published',
    pinned: false,
    views: 654,
    tags: ['Casio', 'Điện xoay chiều', 'Thủ thuật máy tính'],
  },
  {
    id: 'post-4',
    title: 'Quy Chế Học Tập & Điều Kiện Mở Khóa Bài Học Tuần Tự (2026-2027)',
    summary: 'Hướng dẫn lộ trình mở bài mới sau khi hoàn thành bài cũ, quy chuẩn đạt bài tập củng cố và bài thi đánh giá năng lực.',
    content: `Nhằm đảm bảo học sinh học vững chắc từng mắt xích kiến thức, hệ thống áp dụng cơ chế học tuần tự nghiêm ngặt:

1. QUY TẮC MỞ KHÓA BÀI HỌC:
- Mọi học sinh bắt đầu từ Bài 1 của mỗi khóa học.
- Bài tiếp theo chỉ được mở khóa khi và chỉ khi học sinh đã học xong video bài trước và nhấn nút "Đánh dấu đã học xong".
- Tránh tình trạng nhảy cóc kiến thức dẫn đến mất gốc ở các phần chuyên sâu.

2. ĐIỀU KIỆN LÀM BÀI THI BENCHMARK:
- Khuyến nghị học sinh hoàn thành ít nhất 80% số bài học trong khóa trước khi làm bài thi chính thức.
- Điểm thi chính thức sẽ được lưu lại trong sổ điểm điện tử của lớp và tham gia xét thưởng Top 5 hàng tháng.

Mọi thắc mắc về tài khoản học tập các em liên hệ trực tiếp Cô Trần Lê Ngọc Trâm qua nhóm học tập lớp.`,
    category: 'Thông báo',
    author: 'Ban Quản Trị',
    authorRole: 'Quản trị hệ thống',
    createdAt: '01/09/2026 09:00',
    status: 'published',
    pinned: false,
    views: 410,
    tags: ['Nội quy', 'Lộ trình', 'Quy chế'],
  }
];

export function getStoredPosts(): Post[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_POSTS;
}

export function savePost(post: Post): void {
  try {
    const posts = getStoredPosts();
    const index = posts.findIndex(p => p.id === post.id);
    if (index >= 0) {
      posts[index] = { ...post, updatedAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) };
    } else {
      posts.unshift(post);
    }
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
  } catch (e) {
    console.error(e);
  }
}

export function deletePost(id: string): void {
  try {
    const posts = getStoredPosts().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
  } catch (e) {
    console.error(e);
  }
}

export function togglePinPost(id: string): void {
  try {
    const posts = getStoredPosts().map(p => p.id === id ? { ...p, pinned: !p.pinned } : p);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
  } catch (e) {
    console.error(e);
  }
}

// ==================== QUẢN LÝ ĐIỂM SỐ TOÀN BỘ WEBSITE ====================

// Dữ liệu điểm giả đã được xoá — hệ thống giờ chỉ hiển thị điểm thật từ bài nộp của học sinh.
// Để khôi phục dữ liệu mẫu, thêm lại vào đây và cập nhật getAllStudentGrades().
export const INITIAL_STUDENT_GRADES: StudentGradeRecord[] = [];

export function getAllStudentGrades(): StudentGradeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_GRADES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_STUDENT_GRADES;
}

export function saveStudentGrade(record: StudentGradeRecord): void {
  try {
    const records = getAllStudentGrades();
    const existingIndex = records.findIndex(r => r.id === record.id);
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.unshift(record);
    }
    localStorage.setItem(STORAGE_KEYS.STUDENT_GRADES, JSON.stringify(records));
  } catch (e) {
    console.error(e);
  }
}

export function deleteStudentGrade(id: string): void {
  try {
    const records = getAllStudentGrades().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.STUDENT_GRADES, JSON.stringify(records));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Xuất danh sách điểm ra file CSV UTF-8 tương thích 100% Microsoft Excel tiếng Việt (có BOM)
 */
/**
 * Đọc % tiến độ bài học của 1 học sinh.
 * Đọc trực tiếp key localStorage để tránh circular import với utils/storage.ts
 * (storage.ts gọi saveStudentGrade của module này).
 */
function readStudentProgressPercent(studentId: string, totalLessons: number): number {
  if (typeof localStorage === 'undefined' || !studentId) return 0;
  try {
    const raw = localStorage.getItem(`edulearn_progress_${studentId}_v1`);
    if (!raw) return 0;
    const ids: string[] = JSON.parse(raw);
    if (totalLessons <= 0) return 0;
    return Math.round((ids.length / totalLessons) * 100);
  } catch (e) {
    return 0;
  }
}

export function exportGradesToCSV(records: StudentGradeRecord[], filename = 'Bang_Diem_Hoc_Sinh_Lop_Vat_Ly_TQT.csv'): void {
  // Tổng số bài học trên nền tảng — mẫu số để tính % tiến độ của từng học sinh
  const totalLessonsForProgress = COURSES_DATA.reduce(
    (sum, c) => sum + c.modules.reduce((mSum, m) => mSum + m.lessons.length, 0),
    0
  );  // Chuẩn hóa header và dữ liệu tiếng Việt có dấu
  const headers = [
    'STT',
    'Mã Học Sinh',
    'Họ Và Tên',
    'Trường Học',
    'Lớp',
    'Bài Kiểm Tra / Khóa Học',
    'Điểm Thang 10',
    'Điểm Thang 100',
    'Số Câu Đúng',
    'Tổng Số Câu',
    'Tiến Độ Bài Học (%)',
    'Xếp Loại',
    'Kết Quả',
    'Thời Gian Làm Bài',
    'Thời Gian Nộp',
    'Ghi Chú Giáo Viên'
  ];

  const rows = records.map((r, index) => [
    index + 1,
    `"${r.studentId}"`,
    `"${r.studentName}"`,
    `"${r.schoolName}"`,
    `"${r.className}"`,
    `"${r.examTitle.replace(/"/g, '""')}"`,
    r.score10.toFixed(1),
    r.score,
    r.correctCount,
    r.totalQuestions,
    readStudentProgressPercent(r.studentId, totalLessonsForProgress),
    `"${r.gradeClassification}"`,
    `"${r.status}"`,
    `"${r.completionTime}"`,
    `"${r.submittedAt}"`,
    `"${(r.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\r\n');

  // Thêm UTF-8 BOM (\uFEFF) để Excel hiển thị đúng dấu tiếng Việt không bị vỡ font
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==================== QUẢN LÝ BÀI TẬP & TỪNG BỘ ĐỀ THI ====================

// Các bộ đề mẫu cũ trỏ tới các khóa Vật lí 12/11 đã bị loại bỏ nên đã bị xoá.
// Bộ đề hiện được quản lý trực tiếp trong trang /m@nagement và lấy từ
// officialExam của từng khóa Vật lí 10.
export const INITIAL_EXAM_PACKAGES: ExamPackage[] = [];

export function getAllExamPackages(): ExamPackage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAM_PACKAGES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return INITIAL_EXAM_PACKAGES;
}

export function saveExamPackage(pkg: ExamPackage): void {
  try {
    const packages = getAllExamPackages();
    // update totalQuestions to match questions array length
    pkg.totalQuestions = pkg.questions.length;
    pkg.updatedAt = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    // If this package is set to active, deactivate other packages for the same course
    if (pkg.isActive) {
      packages.forEach(p => {
        if (p.courseId === pkg.courseId && p.id !== pkg.id) {
          p.isActive = false;
        }
      });
    }

    const idx = packages.findIndex(p => p.id === pkg.id);
    if (idx >= 0) {
      packages[idx] = pkg;
    } else {
      packages.unshift(pkg);
    }
    localStorage.setItem(STORAGE_KEYS.EXAM_PACKAGES, JSON.stringify(packages));
  } catch (e) {
    console.error(e);
  }
}

export function deleteExamPackage(id: string): void {
  try {
    const packages = getAllExamPackages().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.EXAM_PACKAGES, JSON.stringify(packages));
  } catch (e) {
    console.error(e);
  }
}

export function setActiveExamPackage(id: string): void {
  try {
    const packages = getAllExamPackages();
    const target = packages.find(p => p.id === id);
    if (!target) return;

    packages.forEach(p => {
      if (p.courseId === target.courseId) {
        p.isActive = (p.id === id);
      }
    });
    localStorage.setItem(STORAGE_KEYS.EXAM_PACKAGES, JSON.stringify(packages));
  } catch (e) {
    console.error(e);
  }
}

export function duplicateExamPackage(id: string): ExamPackage | null {
  try {
    const packages = getAllExamPackages();
    const source = packages.find(p => p.id === id);
    if (!source) return null;

    const newPkg: ExamPackage = {
      ...source,
      id: `pkg-${Date.now()}`,
      title: `${source.title} (Bản sao)`,
      isActive: false,
      updatedAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      questions: JSON.parse(JSON.stringify(source.questions))
    };

    packages.unshift(newPkg);
    localStorage.setItem(STORAGE_KEYS.EXAM_PACKAGES, JSON.stringify(packages));
    return newPkg;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function resetAllExamPackages(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXAM_PACKAGES, JSON.stringify(INITIAL_EXAM_PACKAGES));
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_EXAMS);
  } catch (e) {
    console.error(e);
  }
}

// Giữ lại các hàm cũ để tương thích với các component đã import
export function getCustomCourseExams(): Record<string, OfficialExam> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_EXAMS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {};
}

export function saveCourseExam(courseId: string, exam: OfficialExam): void {
  try {
    const current = getCustomCourseExams();
    current[courseId] = exam;
    localStorage.setItem(STORAGE_KEYS.CUSTOM_EXAMS, JSON.stringify(current));

    // Đồng bộ vào ExamPackage active tương ứng nếu có
    const packages = getAllExamPackages();
    const activePkg = packages.find(p => p.courseId === courseId && p.isActive);
    if (activePkg) {
      activePkg.title = exam.title;
      activePkg.description = exam.description;
      activePkg.durationMinutes = exam.durationMinutes;
      activePkg.maxScore = exam.maxScore;
      activePkg.questions = exam.questions;
      activePkg.totalQuestions = exam.questions.length;
      saveExamPackage(activePkg);
    }
  } catch (e) {
    console.error(e);
  }
}

export function resetCourseExam(courseId: string): void {
  try {
    // Xoá custom exam cũ của khóa này
    const current = getCustomCourseExams();
    delete current[courseId];
    localStorage.setItem(STORAGE_KEYS.CUSTOM_EXAMS, JSON.stringify(current));

    // Xoá luôn các bộ đề đang kích hoạt của khóa này để không bị "kẹt" đề cũ
    const packages = getAllExamPackages().filter(p => p.courseId !== courseId);
    localStorage.setItem(STORAGE_KEYS.EXAM_PACKAGES, JSON.stringify(packages));
  } catch (e) {
    console.error(e);
  }
}

export function getEffectiveCourseExam(courseId: string): OfficialExam {
  // 1. Kiểm tra gói đề đang kích hoạt (isActive: true) trong danh sách Bộ Đề
  const packages = getAllExamPackages();
  const activePkg = packages.find(p => p.courseId === courseId && p.isActive);
  if (activePkg) {
    return {
      id: activePkg.id,
      title: activePkg.title,
      description: activePkg.description,
      durationMinutes: activePkg.durationMinutes,
      totalQuestions: activePkg.questions.length,
      maxScore: activePkg.maxScore,
      questions: activePkg.questions,
      isOfficialExam: true
    };
  }

  // 2. Kiểm tra custom exam cũ
  const custom = getCustomCourseExams()[courseId];
  if (custom) return custom;

  // 3. Fallback theo dữ liệu gốc
  const course = COURSES_DATA.find(c => c.id === courseId);
  return course ? course.officialExam : COURSES_DATA[0].officialExam;
}
