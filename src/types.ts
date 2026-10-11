export type QuestionType = 'multiple_choice' | 'fill_in_blank' | 'short_answer' | 'matching' | 'true_false_group';

export interface TrueFalseStatement {
  id: string;
  label: string; // e.g., 'a)', 'b)', 'c)', 'd)'
  statement: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface MatchingPair {
  leftKey: string;
  leftText: string;
  rightKey: string;
  rightText: string;
}

export interface Question {
  id: string;
  text: string;
  type?: QuestionType; // defaults to 'multiple_choice' if not provided
  options: string[];
  correctIndex: number;
  explanation: string;
  
  // Điền khuyết
  fillInBlanksAnswer?: string | string[];
  fillInBlanksPlaceholder?: string;
  
  // Trả lời ngắn (số hoặc chữ)
  shortAnswer?: string | number;
  acceptableAnswers?: string[];
  
  // Ghép nối (Matching)
  matchingPairs?: MatchingPair[];
  correctMatching?: Record<string, string>; // e.g. { '1': 'C', '2': 'D', '3': 'A', '4': 'B' }
  
  // Đúng / Sai nhiều ý
  trueFalseStatements?: TrueFalseStatement[];
  
  // Bổ sung thông tin phần / điểm
  sectionTitle?: string;
  passage?: string;
  points?: number;
}

export interface MiniQuiz {
  id: string;
  title: string;
  questions: Question[];
  // Strictly marked as practice/formative:
  isOfficialExam: false;
}

export interface LessonResource {
  name: string;
  type: 'pdf' | 'link' | 'code' | 'mindmap';
  url: string;
  size?: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string; // e.g., "14:25"
  videoUrl: string; // demo video or embedded
  videoThumbnail: string;
  description: string;
  keyPoints: string[];
  resources: LessonResource[];
  miniQuiz?: MiniQuiz;
  // Link sơ đồ tư duy NotebookLM của riêng bài học này (nếu có)
  mindmapUrl?: string;
  // Đánh dấu bài học này là bài kiểm tra cuối bài (mở đề thi chính thức, tính xếp hạng)
  isFinalExam?: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface OfficialExam {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  maxScore: number; // usually 100
  questions: Question[];
  isOfficialExam: true; // Used for Leaderboard eligibility
}

export interface ExamPackage {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  durationMinutes: number;
  maxScore: number;
  totalQuestions: number;
  questions: Question[];
  isActive: boolean;
  updatedAt: string;
  difficulty: 'Cơ bản' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao 9+';
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  instructor: {
    name: string;
    title: string;
    avatar: string;
  };
  thumbnail: string;
  category: 'Toán học' | 'Vật lý' | 'Lập trình' | 'Tiếng Anh' | 'Hóa học' | 'Lịch sử';
  rating: number;
  ratingCount: number;
  studentsCount: number;
  level: 'Cơ bản' | 'Trung cấp' | 'Nâng cao';
  lastUpdated: string;
  modules: CourseModule[];
  officialExam: OfficialExam;
  mindmapId: string;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  studentName: string;
  avatar: string;
  schoolName: string;
  examScore: number;
  maxScore: number;
  completionTime: string; // e.g. "12 phút 45 giây"
  submittedAt: string;
  examTitle: string;
  isCurrentUser?: boolean;
  // --- Bổ sung cho bảng xếp hạng theo dữ liệu thực tế ---
  /** Mã học sinh thật (khớp STUDENT_ACCOUNTS.id) — dùng để cập nhật đúng người khi có điểm mới */
  studentId?: string;
  /** Lớp, ví dụ "10/1" */
  className?: string;
  /** Điểm thang 10, ví dụ 8.5 */
  score10?: number;
  /** Thời gian làm bài tính bằng giây — dùng để so sánh thứ tự, không so chuỗi */
  timeSeconds?: number;
  /** Tổng số câu của đề đã làm (không hardcode) */
  totalQuestions?: number;
  /** Số câu làm đúng */
  correctCount?: number;
}

/** Một bài nộp thi chính thức của học sinh. */
export interface ExamSubmission {
  id: string;
  studentId: string;
  courseId: string;
  examTitle: string;
  score: number;
  maxScore: number;
  score10: number;
  correctCount: number;
  totalQuestions: number;
  completionTime: string;
  timeSeconds: number;
  submittedAt: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  summary?: string;
  category?: 'core' | 'concept' | 'detail' | 'formula' | 'source';
  citations?: string[];
  children?: MindMapNode[];
  isExpanded?: boolean;
}

export interface NotebookLMProject {
  id: string;
  title: string;
  courseId: string;
  subject: string;
  sourceCount: number;
  audioSummaryDuration: string; // e.g. "9 phút 15 giây"
  overview: string;
  keyInsights: string[];
  rootNode: MindMapNode;
  rawMarkdownExport?: string;
}

export type PostCategory = 'Thông báo' | 'Bí kíp học tập' | 'Lịch ôn thi' | 'Tài liệu hướng dẫn';

export interface PostAttachment {
  name: string;
  url: string;
  size?: string;
  type?: 'pdf' | 'doc' | 'link' | 'video';
}

export interface Post {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: PostCategory;
  author: string;
  authorRole: string;
  createdAt: string;
  updatedAt?: string;
  status: 'published' | 'draft';
  pinned?: boolean;
  views: number;
  tags: string[];
  attachments?: PostAttachment[];
}

export interface StudentGradeRecord {
  id: string;
  studentId: string;
  studentName: string;
  schoolName: string;
  className: string;
  courseId?: string;
  examTitle: string;
  score: number; // 0 - 100 or 0 - 10
  maxScore: number;
  score10: number; // converted to standard 10-point scale
  correctCount: number;
  totalQuestions: number;
  completionTime: string;
  submittedAt: string;
  status: 'Đạt' | 'Chưa đạt';
  gradeClassification: 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu';
  notes?: string;
}
