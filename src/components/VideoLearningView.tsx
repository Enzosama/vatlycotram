import React, { useState, useRef } from 'react';
import { 
  Play, 
  PlayCircle,
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  ChevronDown, 
  ChevronUp,
  BrainCircuit,
  HelpCircle, 
  ArrowRight, 
  ArrowLeft, 
  Award,
  Sparkles,
  Info,
  Maximize,
  AlertCircle,
  ExternalLink,
  X,
  Check,
  RefreshCw,
  StickyNote,
  Trash2,
  Pencil,
  Download,
  Search,
  XCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course, Lesson, CourseModule } from '../types';
import { InteractiveQuizView } from './InteractiveQuizView';
import { 
  parseVideoSource, 
  getCustomLessonVideos, 
  saveCustomLessonVideo 
} from '../utils/videoUtils';
import { getSessionStudent } from '../utils/auth';
import { getCurrentStudent, hasCompletedExam } from '../utils/storage';

/** Một ghi chú cá nhân gắn với mốc thời gian trong video. */
interface NoteItem {
  id: string;
  /** Mốc thời gian dạng "m:ss" để nhảy tới đó trong video */
  time: string;
  /** Thời điểm nộp ISO, dùng để sắp xếp và hiển thị ngày */
  createdAt: string;
  text: string;
}

const NOTES_KEY = 'edulearn_lesson_notes_v1';

type NotesStore = Record<string, NoteItem[]>;

function notesKeyFor(studentId: string, lessonId: string): string {
  return `${studentId}::${lessonId}`;
}

/** Đọc ghi chú của 1 học sinh cho 1 bài học. */
function loadNotes(studentId: string, lessonId: string): NoteItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const store = JSON.parse(raw) as NotesStore;
    const list = store?.[notesKeyFor(studentId, lessonId)];
    return Array.isArray(list) ? list.filter((n) => n && typeof n.text === 'string') : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

/** Ghi toàn bộ danh sách ghi chú của 1 học sinh cho 1 bài học. */
function persistNotes(studentId: string, lessonId: string, notes: NoteItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    let store: NotesStore = {};
    if (raw) {
      const parsed = JSON.parse(raw) as NotesStore;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) store = parsed;
    }
    store[notesKeyFor(studentId, lessonId)] = notes;
    localStorage.setItem(NOTES_KEY, JSON.stringify(store));
  } catch (e) {
    console.error(e);
  }
}

interface VideoLearningViewProps {
  course: Course;
  activeLessonId: string;
  completedLessons: string[];
  onSelectLesson: (lessonId: string) => void;
  onCompleteLesson: (lessonId: string) => void;
  onOpenOfficialExam?: () => void;
  onOpenNotebookLM?: () => void;
}

export const VideoLearningView: React.FC<VideoLearningViewProps> = ({
  course,
  activeLessonId,
  completedLessons,
  onSelectLesson,
  onCompleteLesson,
  onOpenOfficialExam,
  onOpenNotebookLM,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'minitest' | 'notes'>('overview');
  const [isPlaying, setIsPlaying] = useState(true);
  // Controls hiện khi hover (desktop) hoặc tap (mobile)
  const [showControls, setShowControls] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [lockedAlertMessage, setLockedAlertMessage] = useState<string | null>(null);
  const [miniQuizAnswers, setMiniQuizAnswers] = useState<Record<string, number>>({});
  // Mini-test đã nộp VÀ đạt trên 50% (từ callback InteractiveQuizView) — điều kiện mở khóa bài mới
  const [miniQuizPassed, setMiniQuizPassed] = useState(false);
  const [userNote, setUserNote] = useState('');
  // ID học sinh đang hoạt động — ghi chú lưu riêng cho từng người
  const currentStudentId = getSessionStudent()?.id || getCurrentStudent().id;
  // Đã hoàn thành bài kiểm tra cuối bài của khóa này chưa (khoá làm duy nhất 1 lần)
  const [hasCompletedFinalExam, setHasCompletedFinalExam] = useState(() =>
    hasCompletedExam(currentStudentId, course.id)
  );
  // Ghi chú lưu theo từng bài học + từng học sinh, giữ lại khi tải lại trang
  const [notesList, setNotesList] = useState<NoteItem[]>(() => loadNotes(currentStudentId, activeLessonId));
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  const [noteMessage, setNoteMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Quản lý link video tùy chỉnh (YouTube / Google Drive) theo từng bài học
  const [customVideos, setCustomVideos] = useState<Record<string, string>>(() => getCustomLessonVideos());

  const videoRef = useRef<HTMLVideoElement>(null);
  // YouTube IFrame Player API — đo tiến độ xem thật qua getCurrentTime/getDuration
  const ytPlayerRef = useRef<any>(null);
  const ytIframeId = 'yt-player-' + course.id + '-' + activeLessonId;
  // Xác nhận "đã xem hết video" — bắt buộc trước khi được phép hoàn thành bài.
  // MP4/Drive proxy: tự tick qua onTimeUpdate ≥90%; YouTube: poll YT API ≥90%; NotebookLM: tick tay.
  const [videoWatched, setVideoWatched] = useState(false);
  const [watchedTickError, setWatchedTickError] = useState(false);
  // Thời lượng thực tế của video (đọc từ player khi metadata load)
  const [actualDuration, setActualDuration] = useState<string | null>(null);
  // Cảnh báo khi cố hoàn thành bài mà chưa nộp mini-test
  const [miniQuizError, setMiniQuizError] = useState(false);

  // Flatten all lessons to linear sequence to determine sequential unlocking
  const allLessons: Lesson[] = [];
  course.modules.forEach((mod) => {
    mod.lessons.forEach((l) => allLessons.push(l));
  });

  const currentLessonIndex = allLessons.findIndex((l) => l.id === activeLessonId);
  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];

  const effectiveVideoUrl = customVideos[currentLesson.id] || currentLesson.videoUrl;
  const videoSource = parseVideoSource(effectiveVideoUrl);

  // Đổi bài học hoặc đổi link video -> reset trạng thái đã xem
  React.useEffect(() => {
    setVideoWatched(false);
    setWatchedTickError(false);
    setActualDuration(null);
    setMiniQuizPassed(false);
  }, [currentLesson.id, effectiveVideoUrl]);

  // ── YouTube IFrame Player API: poll tiến độ xem, tự tick ≥90% ──
  // Chỉ chạy khi lesson là video YouTube. Load script 1 lần, poll 5s getCurrentTime/getDuration.
  React.useEffect(() => {
    if (videoSource.type !== 'youtube' || !videoSource.videoId) return;

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const startPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => {
        const p = ytPlayerRef.current;
        if (!p || cancelled || typeof p.getCurrentTime !== 'function') return;
        try {
          const t = p.getCurrentTime() as number;
          const d = p.getDuration() as number;
          if (d > 0 && t / d >= 0.9) {
            setVideoWatched(true);
            setActualDuration((prev) => prev ?? `${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, '0')}`);
            if (pollTimer) clearInterval(pollTimer);
          }
        } catch (e) {
          console.error(e);
        }
      }, 5000);
    };

    const initPlayer = () => {
      const YT = (window as any).YT;
      if (!YT || !YT.Player) return;
      ytPlayerRef.current = new YT.Player(ytIframeId, {
        videoId: videoSource.videoId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
        events: { onReady: startPolling },
      });
    };

    const w = window as any;
    if (w.YT && w.YT.Player) {
      initPlayer();
    } else {
      // Load script 1 lần, chờ onYouTubeIframeAPIReady
      if (!w.__ytApiLoading) {
        w.__ytApiLoading = true;
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const prevCb = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prevCb?.();
        if (!cancelled) initPlayer();
      };
    }

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      try {
        ytPlayerRef.current?.destroy?.();
      } catch (e) {
        console.error(e);
      }
      ytPlayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson.id, effectiveVideoUrl, videoSource.type, videoSource.videoId]);

  // Helper to check if a lesson is unlocked
  // "Mở bài mới sau khi học xong bài cũ": Lesson k is unlocked if k === 0 OR lesson k-1 is completed!
  const isLessonUnlocked = (lessonId: string): boolean => {
    const idx = allLessons.findIndex((l) => l.id === lessonId);
    if (idx <= 0) return true; // Lesson 0 is always open
    const prevLessonId = allLessons[idx - 1].id;
    return completedLessons.includes(prevLessonId);
  };

  const isCurrentLessonCompleted = completedLessons.includes(currentLesson.id);

  // Total progress
  const completedCount = allLessons.filter((l) => completedLessons.includes(l.id)).length;
  const progressPercent = Math.round((completedCount / allLessons.length) * 100);

  // Handle lesson click with lock check
  const handleLessonClick = (lesson: Lesson) => {
    if (isLessonUnlocked(lesson.id)) {
      onSelectLesson(lesson.id);
      setLockedAlertMessage(null);
      setMiniQuizAnswers({});
      setMiniQuizPassed(false);
    } else {
      setLockedAlertMessage(
        `Bài học "${lesson.title}" đang bị khóa! Theo nguyên tắc mở khóa tuần tự, bạn cần xem và hoàn thành bài học trước.`
      );
      setTimeout(() => setLockedAlertMessage(null), 5000);
    }
  };

  // Tick tay xác nhận "đã xem" — CHỈ dùng cho NotebookLM (artifact iframe, không phải video player, không đo được tiến độ).
  // Drive/YouTube đã chuyển sang đo tiến độ thật (auto-tick ≥90%) nên không cần nút này.
  const renderWatchedTickButton = () => (
    <div className="absolute bottom-3 right-3 z-20">
      {videoWatched ? (
        <span className="flex items-center gap-1.5 bg-emerald-600/95 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-lg">
          <CheckCircle2 className="w-3.5 h-3.5" /> Đã xem hết video
        </span>
      ) : (
        <button
          id="btn-tick-watched"
          onClick={() => setVideoWatched(true)}
          title="Bài dạng sơ đồ tư duy — vui lòng xem và xác nhận đã xem để tiếp tục"
          className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-white/30 shadow-lg transition"
        >
          <PlayCircle className="w-3.5 h-3.5" /> Đã xem hết video
        </button>
      )}
    </div>
  );

  // Controls overlay cho <video> (dùng chung cho MP4 trực tiếp và Drive proxy)
  const renderVideoControls = () => (
    <div
      onClick={() => setShowControls((v) => !v)}
      className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity flex flex-col justify-between p-3 sm:p-4 cursor-pointer ${
        showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
    >
      <div className="flex items-center justify-between pointer-events-auto">
        <span className="text-xs bg-black/60 px-2.5 py-1 rounded-md text-white font-medium">
          {currentLesson.title}
        </span>
        <span className="text-xs bg-blue-600/80 px-2 py-0.5 rounded text-white font-bold">
          {actualDuration || '—'}
        </span>
      </div>

      {/* Bottom control bar */}
      <div className="flex items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) videoRef.current.currentTime -= 10;
            }}
            className="p-1.5 text-slate-300 hover:text-white"
            title="Lùi 10 giây"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            className="p-1.5 text-slate-300 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/10 rounded-lg p-0.5 text-[11px] font-bold">
            {[1, 1.25, 1.5, 2].map((spd) => (
              <button
                key={spd}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeedChange(spd);
                }}
                className={`px-2 py-0.5 rounded transition ${
                  playbackSpeed === spd ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current?.requestFullscreen) {
                videoRef.current.requestFullscreen();
              }
            }}
            className="p-1.5 text-slate-300 hover:text-white"
            title="Toàn màn hình"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // Mark lesson completed & auto-advance
  const handleMarkCompleted = () => {
    // Bắt buộc xem ≥90% video mới được hoàn thành bài (MP4: tự tick qua onTimeUpdate ≥90%; iframe: tick tay)
    if (!videoWatched) {
      setWatchedTickError(true);
      return;
    }
    setWatchedTickError(false);

    // Bài có mini-test: phải nộp bài VÀ đạt trên 50% mới được hoàn thành
    if (currentLesson.miniQuiz && !miniQuizPassed) {
      setMiniQuizError(true);
      setTimeout(() => setMiniQuizError(false), 5000);
      return;
    }
    setMiniQuizError(false);

    onCompleteLesson(currentLesson.id);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    // Auto-advance to next lesson if available
    if (currentLessonIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentLessonIndex + 1];
      setTimeout(() => {
        onSelectLesson(nextLesson.id);
      }, 600);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleModuleCollapse = (moduleId: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  /** Lưu ghi chú xuống localStorage. */
  const commitNotes = (next: NoteItem[]) => {
    setNotesList(next);
    persistNotes(currentStudentId, activeLessonId, next);
  };

  const handleAddNote = () => {
    const text = userNote.trim();
    if (!text) {
      setNoteMessage({ type: 'err', text: 'Nội dung ghi chú không được để trống.' });
      return;
    }
    const seconds = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
    const timeFormatted = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
    const note: NoteItem = {
      id: 'n-' + Date.now(),
      time: timeFormatted,
      createdAt: new Date().toISOString(),
      text,
    };
    commitNotes([note, ...notesList]);
    setUserNote('');
    setNoteMessage({ type: 'ok', text: 'Đã lưu ghi chú.' });
  };

  /** Nhảy video tới mốc thời gian của ghi chú. */
  const seekToNote = (note: NoteItem) => {
    if (!videoRef.current) return;
    const [m, s] = note.time.split(':').map((v) => parseInt(v, 10) || 0);
    videoRef.current.currentTime = m * 60 + s;
    videoRef.current.play?.();
  };

  const handleStartEdit = (note: NoteItem) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
    setNoteMessage(null);
  };

  const handleSaveEdit = () => {
    const text = editingText.trim();
    if (!text) {
      setNoteMessage({ type: 'err', text: 'Nội dung ghi chú không được để trống.' });
      return;
    }
    commitNotes(notesList.map((n) => (n.id === editingNoteId ? { ...n, text } : n)));
    setEditingNoteId(null);
    setEditingText('');
    setNoteMessage({ type: 'ok', text: 'Đã cập nhật ghi chú.' });
  };

  const handleDeleteNote = (id: string) => {
    commitNotes(notesList.filter((n) => n.id !== id));
    if (editingNoteId === id) {
      setEditingNoteId(null);
      setEditingText('');
    }
    setNoteMessage({ type: 'ok', text: 'Đã xoá ghi chú.' });
  };

  const handleClearAllNotes = () => {
    if (notesList.length === 0) return;
    commitNotes([]);
    setEditingNoteId(null);
    setEditingText('');
    setNoteMessage({ type: 'ok', text: 'Đã xoá toàn bộ ghi chú của bài này.' });
  };

  /** Xuất ghi chú ra file .txt (UTF-8 có BOM để Excel/Word mở đúng dấu). */
  const handleExportNotes = () => {
    if (notesList.length === 0) return;
    const lines = [
      `Ghi chú bài học: ${currentLesson?.title || ''}`,
      `Học sinh: ${currentStudentId}`,
      `Xuất ngày: ${new Date().toLocaleString('vi-VN')}`,
      '',
    ];
    for (const n of notesList) {
      lines.push(`[${n.time}] ${n.text}`);
    }
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ghi-chu-' + (currentLesson?.title || 'bai-hoc').replace(/[^\p{L}\p{N}]+/gu, '-') + '.txt';
    link.click();
    URL.revokeObjectURL(url);
    setNoteMessage({ type: 'ok', text: 'Đã xuất ghi chú ra file.' });
  };

  // Lọc ghi chú theo từ khóa
  const filteredNotes = noteSearch.trim()
    ? notesList.filter((n) => n.text.toLowerCase().includes(noteSearch.trim().toLowerCase()))
    : notesList;

  return (
    <div className="bg-slate-900 text-white min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Learning Navigation Bar */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
            {course.category}
          </span>
          <span className="text-slate-600">|</span>
          <h1 className="text-xs sm:text-sm font-bold text-slate-200 truncate max-w-xs sm:max-w-md">
            {course.title}
          </h1>
        </div>

        {/* Progress status & Exam shortcut */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Tiến độ khóa học:</span>
            <div className="w-28 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="text-xs font-bold text-emerald-400">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Locked Alert Notice if user clicks a locked item */}
      {lockedAlertMessage && (
        <div className="bg-amber-500/90 text-slate-950 px-4 py-2.5 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-950 shrink-0" />
            <span>{lockedAlertMessage}</span>
          </div>
          <button onClick={() => setLockedAlertMessage(null)} className="font-bold text-sm">
            ✕
          </button>
        </div>
      )}

      {/* Main Video Stage & Curriculum Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Video Player & Tabs */}
        <div className="flex-1 flex flex-col bg-slate-950">
          {/* Video Container */}
          <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden group">
            {currentLesson.isFinalExam ? (
              /* Module đề cuối bài: panel hướng dẫn + nút mở đề thi (thay vì video) */
              <div className="w-full h-full bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex flex-col items-center justify-center text-center p-6 gap-4">
                <div className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                  <Award className="w-8 h-8 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Bài kiểm tra cuối bài</h3>
                  <p className="text-xs text-blue-200 mt-1 max-w-md">
                    {currentLesson.description}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-1">
                  {hasCompletedFinalExam ? (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/20 text-emerald-200 text-sm font-bold rounded-xl border border-emerald-400/40">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đã hoàn thành bài kiểm tra</span>
                    </div>
                  ) : (
                    <button
                      id="btn-start-final-exam"
                      onClick={onOpenOfficialExam}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-sm font-bold rounded-xl shadow-sm transition"
                    >
                      <Award className="w-4 h-4" />
                      <span>Bắt đầu làm bài kiểm tra</span>
                    </button>
                  )}
                  {currentLesson.mindmapUrl && (
                    <a
                      href={currentLesson.mindmapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/30 transition"
                    >
                      <BrainCircuit className="w-4 h-4" />
                      <span>Xem sơ đồ tư duy</span>
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-blue-300/80 mt-1">
                  Thời gian: 20 phút • 14 câu • Thang điểm 10
                </p>
              </div>
            ) : videoSource.type === 'youtube' ? (
              /* YouTube: phát qua IFrame Player API để ĐO tiến độ xem thật (poll ≥90%) */
              <div className="w-full h-full relative bg-black">
                <div id={ytIframeId} className="w-full h-full" />
              </div>
            ) : videoSource.type === 'googledrive' && videoSource.proxyUrl ? (
              /* Google Drive: phát qua <video> (proxy) để ĐO tiến độ xem thật — tự tick ≥90% */
              <div className="w-full h-full relative bg-black group">
                <video
                  ref={videoRef}
                  src={videoSource.proxyUrl}
                  poster={currentLesson.videoThumbnail}
                  className="w-full h-full object-contain"
                  playsInline
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    setVideoWatched(true);
                    setTimeout(() => handleMarkCompleted(), 400);
                  }}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    if (isFinite(v.duration) && v.duration > 0 && v.currentTime / v.duration >= 0.9) {
                      setVideoWatched(true);
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    const secs = Math.floor(e.currentTarget.duration);
                    if (isFinite(secs) && secs > 0) {
                      const m = Math.floor(secs / 60);
                      const s = secs % 60;
                      setActualDuration(`${m}:${String(s).padStart(2, '0')}`);
                    }
                  }}
                />
                {renderVideoControls()}
              </div>
            ) : videoSource.type === 'notebooklm' ? (
              <div className="w-full h-full relative bg-slate-950 flex flex-col">
                <iframe
                  key={videoSource.embedUrl}
                  src={videoSource.embedUrl}
                  title={currentLesson.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  allowFullScreen
                />
                {renderWatchedTickButton()}
                {/* Floating Top-Right Direct Open Button */}
                <div className="absolute top-3 right-3 z-20">
                  <a
                    href={videoSource.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-blue-600/95 hover:bg-blue-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-lg backdrop-blur-xs transition hover:scale-105"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở bài giảng trên Google NotebookLM</span>
                  </a>
                </div>
              </div>
            ) : (
              /* Video MP4 trực tiếp: đo tiến độ xem thật — tự tick ≥90% */
              <div className="w-full h-full relative bg-black group">
                <video
                  ref={videoRef}
                  src={effectiveVideoUrl}
                  poster={currentLesson.videoThumbnail}
                  className="w-full h-full object-contain"
                  playsInline
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    setVideoWatched(true);
                    // Tự động hoàn thành bài và chuyển sang bài tiếp theo khi xem hết video
                    setTimeout(() => handleMarkCompleted(), 400);
                  }}
                  onTimeUpdate={(e) => {
                    // Tự tick "đã xem" khi xem ≥90% video (không cần xem hết 100%)
                    const v = e.currentTarget;
                    if (isFinite(v.duration) && v.duration > 0 && v.currentTime / v.duration >= 0.9) {
                      setVideoWatched(true);
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    const secs = Math.floor(e.currentTarget.duration);
                    if (isFinite(secs) && secs > 0) {
                      const m = Math.floor(secs / 60);
                      const s = secs % 60;
                      setActualDuration(`${m}:${String(s).padStart(2, '0')}`);
                    }
                  }}
                />
                {renderVideoControls()}
              </div>
            )}
          </div>

          {/* Action Bar Under Video */}
          <div className="bg-slate-900 border-y border-slate-800 p-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Nút hoàn thành: chỉ hiện khi ĐÃ xem hết video và CHƯA hoàn thành.
                  Đã hoàn thành -> badge tĩnh. Chưa xem hết -> thông báo yêu cầu. */}
              {isCurrentLessonCompleted ? (
                <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đã hoàn thành</span>
                </span>
              ) : videoWatched ? (
                <button
                  id="btn-mark-lesson-complete"
                  onClick={handleMarkCompleted}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-sm bg-emerald-500 hover:bg-emerald-600 text-slate-950"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Hoàn thành &amp; bài tiếp</span>
                </button>
              ) : (
                <span
                  id="btn-mark-lesson-complete"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Xem hết video để hoàn thành bài</span>
                </span>
              )}

              {watchedTickError && (
                <span className="text-[11px] text-rose-400 font-medium">
                  Bạn cần xem hết video trước khi hoàn thành bài.
                </span>
              )}

              {miniQuizError && (
                <span className="text-[11px] text-rose-400 font-medium">
                  Hãy hoàn thành bài tập mini-test trước khi kết thúc bài học.
                </span>
              )}

              <button
                onClick={onOpenNotebookLM}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 transition"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                <span>Xem sơ đồ tư duy bài này</span>
              </button>
            </div>

            {/* Previous / Next Lesson controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentLessonIndex > 0) {
                    onSelectLesson(allLessons[currentLessonIndex - 1].id);
                  }
                }}
                disabled={currentLessonIndex === 0}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Bài trước</span>
              </button>

              <button
                onClick={() => {
                  if (currentLessonIndex < allLessons.length - 1) {
                    handleLessonClick(allLessons[currentLessonIndex + 1]);
                  }
                }}
                disabled={currentLessonIndex === allLessons.length - 1}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
              >
                <span>Bài kế tiếp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Under Video Content Tabs (Udemy style) */}
          <div className="flex-1 bg-white text-slate-900 p-3 sm:p-6">
            {/* Tabs header */}
            <div className="flex items-center gap-4 border-b border-slate-200 pb-2 mb-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`text-xs font-bold pb-2 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Tổng quan bài học & Trọng tâm
              </button>

              <button
                onClick={() => setActiveTab('minitest')}
                className={`text-xs font-bold pb-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'minitest'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Mini-Test Ôn Tập</span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`text-xs font-bold pb-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'notes'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                <span>Ghi chú cá nhân ({notesList.length})</span>
              </button>
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {currentLesson.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {currentLesson.description}
                  </p>
                </div>

                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Các điểm kiến thức cốt lõi của bài:</span>
                  </h4>
                  <ul className="space-y-2">
                    {currentLesson.keyPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0"></span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructor Info */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <img
                    src={course.instructor.avatar}
                    alt={course.instructor.name}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Giảng viên: {course.instructor.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {course.instructor.title}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Mini Test (Formative Practice - Explicitly Not Ranked) */}
            {activeTab === 'minitest' && (
              <div>
                {/* MANDATORY WARNING BANNER: Mini-test does not count in Leaderboard */}
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">
                      LUYỆN TẬP CỦNG CỐ:
                    </strong>
                    <span>
                      Hệ thống câu hỏi trắc nghiệm, điền khuyết, ghép nối và đúng/sai tương tác trực tiếp giúp bạn khắc sâu kiến thức ngay sau khi xem bài giảng.
                    </span>
                  </div>
                </div>

                {currentLesson.miniQuiz ? (
                  <InteractiveQuizView
                    quiz={currentLesson.miniQuiz}
                    lessonTitle={currentLesson.title}
                    isLessonCompleted={isCurrentLessonCompleted}
                    onCompleteLesson={handleMarkCompleted}
                    onQuizResult={(r) => setMiniQuizPassed(r.passed)}
                  />
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-xs">Bài học này không có bài tập tương tác trong video.</p>
                    <p className="text-[11px] mt-1 text-slate-500">
                      Hãy tiếp tục xem video và chuyển sang bài học tiếp theo!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Ghi chú cá nhân */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                {/* Ô nhập ghi chú mới — tự ghi nhận mốc thời gian hiện tại của video */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Nhập ghi chú tại thời điểm hiện tại của video..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  />
                  <button
                    onClick={handleAddNote}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shrink-0"
                  >
                    Lưu ghi chú
                  </button>
                </div>

                {noteMessage && (
                  <div
                    className={`flex items-start gap-2 p-2.5 rounded-lg border text-[11px] ${
                      noteMessage.type === 'ok'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {noteMessage.type === 'ok' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    )}
                    <span>{noteMessage.text}</span>
                  </div>
                )}

                {/* Thanh công cụ: tìm kiếm, xuất file, xoá hết */}
                {notesList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={noteSearch}
                        onChange={(e) => setNoteSearch(e.target.value)}
                        placeholder="Tìm trong ghi chú..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleExportNotes}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Xuất file</span>
                    </button>
                    <button
                      onClick={handleClearAllNotes}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 border border-rose-200 bg-white hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xoá hết</span>
                    </button>
                  </div>
                )}

                {/* Danh sách ghi chú */}
                {filteredNotes.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <StickyNote className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">
                      {notesList.length === 0
                        ? 'Chưa có ghi chú nào cho bài học này.'
                        : 'Không có ghi chú nào khớp từ khóa.'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Ghi chú được lưu theo từng bài và từng học sinh.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      >
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              rows={2}
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 resize-none"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleSaveEdit}
                                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition"
                              >
                                <Check className="w-3 h-3" />
                                <span>Lưu</span>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingText('');
                                }}
                                className="flex items-center gap-1 text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Huỷ</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <button
                              onClick={() => seekToNote(note)}
                              title="Nhảy tới mốc thời gian này trong video"
                              className="shrink-0 font-mono text-blue-600 font-bold bg-blue-100 hover:bg-blue-200 px-1.5 py-0.5 rounded text-[10px] transition"
                            >
                              {note.time}
                            </button>
                            <p className="flex-1 text-slate-700 whitespace-pre-wrap break-words">{note.text}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleStartEdit(note)}
                                title="Sửa ghi chú"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                title="Xoá ghi chú"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Udemy-Style Curriculum Accordion Sidebar */}
        <div className="w-full lg:w-96 lg:sticky lg:top-0 lg:h-screen lg:overflow-hidden bg-white border-l border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900">
                Nội dung khóa học (Curriculum)
              </h3>
              <span className="text-[11px] font-bold text-blue-600">
                {completedCount}/{allLessons.length} bài đã học
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Quy chế: <strong className="text-slate-700">Mở bài mới sau khi học xong bài cũ</strong>
            </p>
          </div>

          {/* Module List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {course.modules.map((mod, modIdx) => {
              const isCollapsed = collapsedModules[mod.id];
              const moduleCompletedCount = mod.lessons.filter((l) => completedLessons.includes(l.id)).length;

              return (
                <div key={mod.id} className="bg-white">
                  {/* Module Header Accordion */}
                  <button
                    onClick={() => toggleModuleCollapse(mod.id)}
                    className="w-full text-left p-3.5 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between gap-2 text-xs font-bold text-slate-800 transition"
                  >
                    <div className="min-w-0">
                      <p className="truncate">{mod.title}</p>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {moduleCompletedCount}/{mod.lessons.length} bài hoàn thành
                      </span>
                    </div>
                    {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                  </button>

                  {/* Lesson items in module */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-50">
                      {mod.lessons.map((lesson) => {
                        const isCurrent = lesson.id === activeLessonId;
                        const isCompleted = completedLessons.includes(lesson.id);
                        const isUnlocked = isLessonUnlocked(lesson.id);

                        return (
                          <div
                            key={lesson.id}
                            onClick={() => handleLessonClick(lesson)}
                            className={`p-2.5 sm:p-3 text-xs transition cursor-pointer flex items-start gap-2.5 ${
                              isCurrent
                                ? 'bg-blue-50/90 border-l-4 border-blue-600 font-bold text-blue-900'
                                : isUnlocked
                                ? 'hover:bg-slate-50 text-slate-800'
                                : 'opacity-60 bg-slate-50/40 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {/* Checkbox / Lock status */}
                            <div className="mt-0.5 shrink-0">
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : isUnlocked ? (
                                <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400">
                                  {lesson.id.split('-').pop()}
                                </div>
                              ) : (
                                <Lock className="w-4 h-4 text-slate-400" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={`truncate leading-snug ${isCurrent ? 'text-blue-950 font-bold' : ''}`}>
                                {lesson.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[11px]">
                                {lesson.isFinalExam && (
                                  <span className="text-slate-400">{lesson.duration}</span>
                                )}
                                {!isUnlocked && (
                                  <span className="text-amber-600 text-[10px] font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                    Cần học bài trước để mở
                                  </span>
                                )}
                                {lesson.isFinalExam && isUnlocked && (
                                  <span className="text-amber-700 text-[10px] font-bold bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                                    Đề thi
                                  </span>
                                )}
                                {lesson.miniQuiz && isUnlocked && !lesson.isFinalExam && (
                                  <span className="text-blue-600 text-[10px]">Mini-Quiz</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
