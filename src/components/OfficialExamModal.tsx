import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  Trophy,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Flag,
  Send,
  Wifi,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course, Question, TrueFalseStatement } from '../types';
import { registerOfficialExamResult, DEFAULT_STUDENT, hasCompletedExam } from '../utils/storage';
import { getSessionStudent } from '../utils/auth';
import { SCHOOLS } from '../data/studentAccounts';
import { getEffectiveCourseExam } from '../utils/managementStorage';

const SCHOOL_NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  SCHOOLS.map((s) => [s.code, s.name])
);

interface OfficialExamModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onExamCompleted: (result: { score: number; maxScore: number; isTop5: boolean; rank: number; completionTime: string; courseId: string }) => void;
}

// ── Helpers chấm điểm ──────────────────────────────────────────────
type AnswerState = Record<string, unknown>;

const normalizeText = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,/g, '.') // "3,1" ↔ "3.1"
    .replace(/\.(?=\d)/g, '.');

/** Chấm 1 câu hỏi → trả về điểm (theo scale 10, sau đó quy về 100) */
function gradeQuestion(q: Question, answer: AnswerState): number {
  const pts = q.points ?? 0.5;

  if (q.type === 'true_false_group' && q.trueFalseStatements) {
    const userMap = (answer as Record<string, boolean>) || {};
    const correctCount = q.trueFalseStatements.filter((s: TrueFalseStatement) => userMap[s.id] === s.isCorrect).length;
    // Thang điểm lũy tiến: 1→0.2, 2→0.5, 3→1.0, 4→2.0 (tối đa 2đ/câu)
    const SCALE = [0, 0.2, 0.5, 1.0, 2.0];
    return Math.min(SCALE[correctCount] ?? 0, 2.0);
  }

  if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
    const userText = normalizeText(String(answer ?? ''));
    if (!userText) return 0;
    const acceptable = [q.shortAnswer, ...(q.acceptableAnswers ?? [])]
      .filter(Boolean)
      .map((a) => normalizeText(String(a)));
    return acceptable.includes(userText) ? pts : 0;
  }

  // multiple_choice (mặc định)
  return (answer as unknown as number) === q.correctIndex ? pts : 0;
}

export const OfficialExamModal: React.FC<OfficialExamModalProps> = ({
  course,
  isOpen,
  onClose,
  onExamCompleted,
}) => {
  const exam = getEffectiveCourseExam(course.id);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(exam.durationMinutes * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  // Cảnh báo khi thoát fullscreen (ESC) trước khi nộp bài
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [scoreResult, setScoreResult] = useState<{
    score: number;
    maxScore: number;
    correctCount: number;
    totalCount: number;
    isTop5: boolean;
    rank: number;
    timeTakenSeconds: number;
    perQuestion: { id: string; earned: number; max: number }[];
  } | null>(null);

  // Thông tin thí sinh
  const session = getSessionStudent();
  const studentId = session?.id || DEFAULT_STUDENT.id;
  const studentName = session?.name || DEFAULT_STUDENT.name;
  const schoolName = session
    ? SCHOOL_NAME_BY_CODE[session.schoolCode] || DEFAULT_STUDENT.school
    : DEFAULT_STUDENT.school;
  const studentClass = session?.className || DEFAULT_STUDENT.className;

  // Khoá "làm duy nhất 1 lần": nếu đã nộp bài → không cho mở lại đề
  const alreadyDone = hasCompletedExam(studentId, course.id);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || isSubmitted) return;
    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSubmitted]);

  // Đếm số câu đã trả lời (theo từng loại câu hỏi) — PHẢI nằm trước early return để tuân thủ Rules of Hooks
  const answeredCount = useMemo(() => {
    return exam.questions.filter((q) => {
      const a = answers[q.id];
      if (a === undefined || a === null || a === '') return false;
      if (q.type === 'true_false_group' && q.trueFalseStatements) {
        const m = (a as Record<string, boolean>) || {};
        return q.trueFalseStatements.every((s) => m[s.id] !== undefined);
      }
      return true;
    }).length;
  }, [answers, exam.questions]);

  // ── Fullscreen: tự phóng to toàn màn hình khi vào chế độ kiểm tra ──
  useEffect(() => {
    if (!isOpen || alreadyDone) return;
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) void el.requestFullscreen();
      else if ((el as any).webkitRequestFullscreen) void (el as any).webkitRequestFullscreen();
    } catch (e) {
      console.error(e); // Trình duyệt chặn → bỏ qua, đề thi vẫn hiện bình thường
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Thoát fullscreen khi đóng modal / rời khỏi đề
  useEffect(() => {
    if (isOpen) return;
    return () => {
      try {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          if (document.exitFullscreen) void document.exitFullscreen();
          else if ((document as any).webkitExitFullscreen) void (document as any).webkitExitFullscreen();
        }
      } catch (e) {
        console.error(e);
      }
    };
  }, [isOpen]);

  // ── Cảnh báo thoát chế độ kiểm tra (ESC → thoát fullscreen) ──
  useEffect(() => {
    if (!isOpen || alreadyDone || isSubmitted) return;
    const handler = () => {
      const fsEl = document.fullscreenElement || (document as any).webkitFullscreenElement;
      if (!fsEl && !showExitWarning) setShowExitWarning(true);
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, alreadyDone, isSubmitted, showExitWarning]);

  // ── Chặn copy / cut / paste / chuột phải / chọn text trong lúc kiểm tra ──
  useEffect(() => {
    if (!isOpen || alreadyDone || isSubmitted) return;
    const blockEvent = (e: Event) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && ['c', 'x', 'v', 'a', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('paste', blockEvent);
    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('selectstart', blockEvent);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('cut', blockEvent);
      document.removeEventListener('paste', blockEvent);
      document.removeEventListener('contextmenu', blockEvent);
      document.removeEventListener('selectstart', blockEvent);
      document.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, alreadyDone, isSubmitted]);

  if (!isOpen) return null;

  // Đã nộp bài rồi → không cho mở lại đề thi, hiện banner "đã hoàn thành"
  if (alreadyDone && !isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
        <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 p-6 text-center">
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4 bg-emerald-100">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Bạn đã hoàn thành bài kiểm tra này</h3>
          <p className="text-xs text-slate-600 mb-5">
            Mỗi học sinh chỉ được làm bài kiểm tra cuối bài <strong>duy nhất 1 lần</strong>. Kết quả của bạn đã được ghi nhận vào hệ thống.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmitExam = () => {
    if (isSubmitted) return;

    let totalEarned = 0;
    let maxTotal = 0;
    let correctCount = 0;
    const perQuestion: { id: string; earned: number; max: number }[] = [];

    exam.questions.forEach((q) => {
      const max = q.points ?? 0.5;
      const earned = gradeQuestion(q, answers[q.id] as AnswerState);
      totalEarned += earned;
      maxTotal += max;
      if (earned >= max) correctCount++;
      perQuestion.push({ id: q.id, earned, max });
    });

    // Quy điểm về thang 100
    const finalScore = maxTotal > 0 ? Math.round((totalEarned / maxTotal) * exam.maxScore) : 0;
    const timeTaken = exam.durationMinutes * 60 - timeRemainingSeconds;

    const result = registerOfficialExamResult({
      studentId,
      studentName,
      schoolName,
      className: studentClass,
      avatar: DEFAULT_STUDENT.avatar,
      score: finalScore,
      maxScore: exam.maxScore,
      correctCount,
      totalQuestions: exam.questions.length,
      timeSeconds: timeTaken,
      examTitle: exam.title,
      courseId: course.id,
    });

    setScoreResult({
      score: finalScore,
      maxScore: exam.maxScore,
      correctCount,
      totalCount: exam.questions.length,
      isTop5: result.isTop5,
      rank: result.rank,
      timeTakenSeconds: timeTaken,
      perQuestion,
    });
    setIsSubmitted(true);

    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    const timeFormatted = `${minutes}m ${seconds}s`;

    if (result.isTop5) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    onExamCompleted({
      score: finalScore,
      maxScore: exam.maxScore,
      isTop5: result.isTop5,
      rank: result.rank,
      completionTime: timeFormatted,
      courseId: course.id,
    });
  };

  const currentQ = exam.questions[currentQuestionIndex];

  // Màu lưới điều hướng
  const getCellStyle = (idx: number, q: Question) => {
    const isAnswered = (() => {
      const a = answers[q.id];
      if (a === undefined || a === null || a === '') return false;
      if (q.type === 'true_false_group' && q.trueFalseStatements) {
        const m = (a as Record<string, boolean>) || {};
        return q.trueFalseStatements.every((s) => m[s.id] !== undefined);
      }
      return true;
    })();
    const isCurrent = idx === currentQuestionIndex;
    if (isCurrent) return 'bg-emerald-500 text-white ring-2 ring-emerald-300';
    if (flaggedQuestions.has(idx)) return 'bg-amber-400 text-slate-900';
    if (isAnswered) return 'bg-blue-600 text-white';
    return 'bg-slate-200 text-slate-500';
  };

  const toggleFlag = (idx: number) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ── Render đáp án theo loại câu ─────────────────────────────────
  const renderAnswerArea = (q: Question, readOnly: boolean, isCorrect?: boolean, userPick?: unknown) => {
    if (q.type === 'true_false_group' && q.trueFalseStatements) {
      const userMap = (answers[q.id] as Record<string, boolean>) || {};
      return (
        <div className="space-y-2">
          {q.trueFalseStatements.map((s) => {
            const picked = userMap[s.id];
            const pickedCorrect = picked === s.isCorrect;
            return (
              <div
                key={s.id}
                className={`flex items-start gap-3 p-3 rounded-lg border text-xs sm:text-sm ${
                  readOnly
                    ? pickedCorrect
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-red-50 border-red-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <span className="font-bold shrink-0 mt-0.5 w-6">{s.label}</span>
                <span className="flex-1 leading-relaxed">{s.statement}</span>
                <div className="flex gap-1.5 shrink-0">
                  {!readOnly && (
                    <>
                      <button
                        onClick={() => setAnswers((p) => ({ ...p, [q.id]: { ...(p[q.id] as object), [s.id]: true } }))}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                          picked === true ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white border-slate-300 text-slate-600 hover:border-emerald-400'
                        }`}
                      >
                        Đúng
                      </button>
                      <button
                        onClick={() => setAnswers((p) => ({ ...p, [q.id]: { ...(p[q.id] as object), [s.id]: false } }))}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                          picked === false ? 'bg-rose-500 text-white border-rose-600' : 'bg-white border-slate-300 text-slate-600 hover:border-rose-400'
                        }`}
                      >
                        Sai
                      </button>
                    </>
                  )}
                  {readOnly && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pickedCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                      {picked === undefined ? 'Chưa chọn' : pickedCorrect ? 'Đúng' : 'Sai'}
                    </span>
                  )}
                </div>
                {readOnly && (
                  <span className={`text-[10px] font-bold shrink-0 ${s.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ĐA: {s.isCorrect ? 'Đúng' : 'Sai'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
      return (
        <div>
          <input
            type="text"
            disabled={readOnly}
            value={String(answers[q.id] ?? '')}
            onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
            placeholder="Nhập đáp số / đáp án của bạn..."
            className={`w-full sm:w-72 px-3.5 py-2 rounded-lg border text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
              readOnly ? 'bg-slate-100 text-slate-700' : 'bg-white border-slate-300'
            }`}
          />
          {readOnly && (
            <p className="text-[11px] text-slate-500 mt-1.5">
              Đáp án đúng: <strong className="text-emerald-700">{q.shortAnswer}</strong>
            </p>
          )}
        </div>
      );
    }

    // multiple_choice
    return (
      <div className="space-y-2">
        {q.options.map((opt, optIdx) => {
          const isSelected = answers[q.id] === optIdx;
          return (
            <button
              key={optIdx}
              disabled={readOnly}
              onClick={() => setAnswers((p) => ({ ...p, [q.id]: optIdx }))}
              className={`w-full text-left p-3 rounded-lg border text-xs sm:text-sm transition flex items-center justify-between gap-3 ${
                readOnly
                  ? optIdx === q.correctIndex
                    ? 'bg-emerald-50 border-emerald-300'
                    : isSelected
                    ? 'bg-red-50 border-red-300'
                    : 'bg-white border-slate-200'
                  : isSelected
                  ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center shrink-0 ${
                  isSelected || (readOnly && optIdx === q.correctIndex) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span>{opt}</span>
              </div>
              {readOnly && optIdx === q.correctIndex && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {readOnly && isSelected && optIdx !== q.correctIndex && <X className="w-4 h-4 text-red-500 shrink-0" />}
            </button>
          );
        })}
      </div>
    );
  };

  const now = new Date();
  const examDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  // ── MÀN HÌNH KẾT QUẢ ────────────────────────────────────────────
  if (isSubmitted && scoreResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 overflow-y-auto">
        <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
          <div className="bg-blue-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold">Kết quả: {exam.title}</h2>
              <p className="text-xs text-blue-200">Thí sinh: {studentName} • SBD: {studentId}</p>
            </div>
            <button onClick={onClose} className="p-1 text-blue-200 hover:text-white hover:bg-white/20 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 bg-slate-100 border border-slate-200">
                {scoreResult.isTop5 ? <Trophy className="w-8 h-8 text-amber-600" /> : <CheckCircle2 className="w-8 h-8 text-blue-700" />}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">
                {scoreResult.isTop5 ? 'Lọt vào Top 5 hệ thống!' : 'Hoàn thành bài kiểm tra'}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mb-6">
                {scoreResult.isTop5
                  ? `Chúc mừng! Bạn đứng Hạng #${scoreResult.rank} trên Bảng Xếp Hạng.`
                  : 'Điểm số đã được lưu vào hệ thống.'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto mb-8">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Điểm (thang 10)</span>
                  <span className="text-xl font-bold text-slate-900">{(scoreResult.score / 10).toFixed(1)}</span>
                  <span className="text-xs text-slate-400">/10</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Số câu đúng hoàn toàn</span>
                  <span className="text-xl font-bold text-emerald-700">{scoreResult.correctCount}</span>
                  <span className="text-xs text-slate-400">/{scoreResult.totalCount}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Xếp hạng</span>
                  <span className={`text-xl font-bold ${scoreResult.isTop5 ? 'text-amber-700' : 'text-slate-800'}`}>#{scoreResult.rank}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Thời gian</span>
                  <span className="text-sm font-semibold text-slate-800 mt-1 block">
                    {Math.floor(scoreResult.timeTakenSeconds / 60)}m {scoreResult.timeTakenSeconds % 60}s
                  </span>
                </div>
              </div>
            </div>

            {/* Review đáp án chi tiết */}
            <div className="text-left border-t border-slate-200 pt-6 mt-2">
              <h4 className="text-sm font-bold text-slate-900 mb-4">Chi tiết đáp án & Giải thích</h4>
              <div className="space-y-4">
                {exam.questions.map((q, idx) => {
                  const pq = scoreResult.perQuestion[idx];
                  const full = pq.earned >= pq.max;
                  return (
                    <div key={q.id} className={`p-4 rounded-xl border text-xs ${full ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-bold text-slate-900">
                          Câu {idx + 1}: {q.text}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${full ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                          {full ? 'Đúng' : `${pq.earned.toFixed(1)}/${pq.max}đ`}
                        </span>
                      </div>
                      {renderAnswerArea(q, true)}
                      <p className="text-[11px] text-slate-700 bg-white/70 p-2.5 rounded-lg border border-slate-200 mt-2">
                        <strong className="text-blue-700">Lời giải:</strong> {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <button onClick={onClose} className="flex items-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-medium">
                Xem Bảng Xếp Hạng <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MÀN HÌNH LÀM BÀI ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
      <div className="min-h-full flex flex-col">
        {/* Header — xanh đậm */}
        <div className="bg-blue-900 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10">
          <div className="flex items-center gap-4 sm:gap-6 text-xs">
            <div>
              <span className="text-blue-300">Họ tên: </span>
              <span className="font-semibold">{studentName}</span>
            </div>
            <div>
              <span className="text-blue-300">SBD: </span>
              <span className="font-mono font-semibold">{studentId}</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-blue-300">Môn: </span>
              <span className="font-semibold">VẬT LÍ</span>
            </div>
            <div className="hidden md:block">
              <span className="text-blue-300">Ngày thi: </span>
              <span className="font-semibold">{examDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-300">
              <Wifi className="w-3.5 h-3.5" /> Đang kết nối
            </span>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
              timeRemainingSeconds < 180 ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-800 text-white'
            }`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeRemainingSeconds)}
            </div>
            <button
              id="btn-submit-official-exam"
              onClick={() => setShowSubmitConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-white/60 text-white text-xs font-bold rounded-lg hover:bg-white/10 transition"
            >
              <Send className="w-3.5 h-3.5" /> NỘP BÀI
            </button>
          </div>
        </div>

        {/* Navigation bar — trắng */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentQuestionIndex((p) => Math.max(0, p - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
            </button>
            <button
              onClick={() => setCurrentQuestionIndex((p) => Math.min(exam.questions.length - 1, p + 1))}
              disabled={currentQuestionIndex === exam.questions.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              Tiếp theo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs text-slate-600 font-medium">
            Số câu đã trả lời: <strong className="text-blue-700">{answeredCount}/{exam.questions.length}</strong>
          </span>
          <button
            onClick={() => toggleFlag(currentQuestionIndex)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              flaggedQuestions.has(currentQuestionIndex)
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Flag className="w-3.5 h-3.5" /> Đánh dấu
          </button>
        </div>

        {/* Content 2 cột */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">
          {/* Cột trái: đề thi */}
          <div className="p-4 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
              {currentQ.sectionTitle && (
                <div className="mb-3 pb-3 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">{currentQ.sectionTitle}</span>
                </div>
              )}
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed mb-2">
                <span className="text-blue-600 mr-2 font-bold">Câu {currentQuestionIndex + 1}:</span>
                {currentQ.text}
              </h3>
              {currentQ.passage && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {currentQ.passage}
                </div>
              )}
              {currentQ.type !== 'multiple_choice' && (
                <p className="text-[11px] text-slate-500 mb-3 italic">
                  {currentQ.type === 'true_false_group'
                    ? 'Chọn Đúng hoặc Sai cho từng ý a), b), c), d).'
                    : 'Nhập đáp số chính xác theo yêu cầu đề bài.'}
                </p>
              )}
              {renderAnswerArea(currentQ, false)}
            </div>

            {/* Lưới điều hướng câu hỏi (mobile hiển thị dưới) */}
            <div className="lg:hidden mt-4 bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-700 mb-3">Danh sách câu hỏi</p>
              <div className="flex flex-wrap gap-2">
                {exam.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-9 h-9 rounded-full text-xs font-bold transition ${getCellStyle(idx, q)}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cột phải: lưới điều hướng (desktop sticky) */}
          <div className="hidden lg:block bg-white border-l border-slate-200 p-4 overflow-y-auto">
            <p className="text-xs font-bold text-slate-700 mb-3">Danh sách câu hỏi</p>
            <div className="grid grid-cols-5 gap-2">
              {exam.questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  title={flaggedQuestions.has(idx) ? `Câu ${idx + 1}: Đã đánh dấu` : `Câu ${idx + 1}`}
                  className={`w-9 h-9 rounded-full text-xs font-bold transition ${getCellStyle(idx, q)}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-[11px]">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-600"></span> Đã trả lời</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-200"></span> Chưa trả lời</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Đang làm</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400"></span> Đánh dấu</div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay cảnh báo: thoát chế độ kiểm tra → yêu cầu quay lại làm bài */}
      {showExitWarning && (
        <div className="fixed inset-0 z-[70] bg-slate-900/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4 bg-amber-100">
              <ShieldAlert className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Bạn đang trong chế độ kiểm tra!</h3>
            <p className="text-xs text-slate-600 mb-5">
              Bài kiểm tra phải được thực hiện ở chế độ toàn màn hình. Vui lòng quay lại và tiếp tục làm bài.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowExitWarning(false);
                  try {
                    const el = document.documentElement;
                    if (el.requestFullscreen) void el.requestFullscreen();
                    else if ((el as any).webkitRequestFullscreen) void (el as any).webkitRequestFullscreen();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="w-full px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-bold"
              >
                Quay lại làm bài
              </button>
              <button
                onClick={() => {
                  setShowExitWarning(false);
                  handleSubmitExam();
                }}
                className="w-full px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận nộp bài */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" /> Xác nhận nộp bài
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Bạn đã trả lời <strong>{answeredCount}/{exam.questions.length}</strong> câu.
              {answeredCount < exam.questions.length && ' Các câu chưa trả lời sẽ được tính 0 điểm.'}
            </p>
            {answeredCount < exam.questions.length && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 text-[11px] text-amber-800">
                Câu chưa làm:{' '}
                {exam.questions
                  .map((q, i) => ({ q, i }))
                  .filter(({ q }) => {
                    const a = answers[q.id];
                    if (a === undefined || a === null || a === '') return true;
                    if (q.type === 'true_false_group' && q.trueFalseStatements) {
                      const m = (a as Record<string, boolean>) || {};
                      return !q.trueFalseStatements.every((s) => m[s.id] !== undefined);
                    }
                    return false;
                  })
                  .map(({ i }) => i + 1)
                  .join(', ')}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSubmitConfirm(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50">
                Tiếp tục làm bài
              </button>
              <button onClick={() => { setShowSubmitConfirm(false); handleSubmitExam(); }} className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold">
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
