import React from 'react';
import { 
  Trophy,
  Award,
  Medal,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardViewProps {
  topStudents: LeaderboardEntry[];
  onTakeOfficialExam?: () => void;
  userScoreInfo?: {
    score: number;
    maxScore: number;
    rank?: number;
    completionTime?: string;
  } | null;
  // Gọi 1 lần khi mở trang Xếp hạng -> kéo dữ liệu backup từ Google Sheet về.
  onRestore?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  topStudents,
  userScoreInfo,
  onTakeOfficialExam,
  onRestore,
}) => {
  // Chỉ những học sinh đã có điểm thi mới tham gia xếp hạng.
  const graded = topStudents.filter((s) => (s.score10 ?? 0) > 0);
  const hasResults = graded.length > 0;
  // Bảng xếp hạng hiển thị tối đa 5, nút "Xem tất cả" để xem đầy đủ.
  const [showAll, setShowAll] = React.useState(false);
  const displayList = showAll ? graded : graded.slice(0, 5);
  const top5 = graded.slice(0, 5);

  // Khi mở trang Xếp hạng -> kéo dữ liệu backup từ Google Sheet về (khôi phục
  // khi Vercel sự cố / sau update git). Chỉ chạy 1 lần lúc mount.
  React.useEffect(() => {
    onRestore?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback khi ảnh đại diện lỗi (external host down/hỏng): ẩn ảnh, giữ chỗ tròn.
  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.visibility = 'hidden';
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: <Trophy className="w-4 h-4 text-amber-700" />,
          label: 'Hạng 1 - Thủ khoa',
          cardGlow: 'bg-amber-50/30 border-amber-300',
        };
      case 2:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: <Award className="w-4 h-4 text-slate-700" />,
          label: 'Hạng 2 - Á khoa 1',
          cardGlow: 'bg-white border-slate-200',
        };
      case 3:
        return {
          bg: 'bg-orange-50 text-orange-900 border-orange-200',
          icon: <Award className="w-4 h-4 text-orange-700" />,
          label: 'Hạng 3 - Á khoa 2',
          cardGlow: 'bg-white border-slate-200',
        };
      case 4:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <span className="font-bold text-xs text-slate-700">#4</span>,
          label: 'Hạng 4',
          cardGlow: 'bg-white border-slate-200',
        };
      case 5:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <span className="font-bold text-xs text-slate-700">#5</span>,
          label: 'Hạng 5',
          cardGlow: 'bg-white border-slate-200',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <span className="text-xs font-semibold">#{rank}</span>,
          label: `Hạng ${rank}`,
          cardGlow: 'bg-white border-slate-200',
        };
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold mb-3">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>BẢNG VINH DANH • BÀI KIỂM TRA CUỐI BÀI HỌC</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Top 5 <span className="text-blue-600">Học Sinh Xuất Sắc Nhất</span>
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Vinh danh học sinh có điểm bài kiểm tra cuối mỗi bài học cao nhất. Cùng điểm thì ai làm nhanh hơn xếp trước.
        </p>
      </div>

      {/* STRICT RULE BANNER: Chỉ tính bài kiểm tra cuối bài */}
      <div className="mb-8 rounded-2xl bg-sky-50/80 border border-sky-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-sky-950">
              Quy chế vinh danh
            </h2>
            <p className="text-xs text-sky-900/80 mt-1 leading-relaxed">
              Chỉ tính điểm bài kiểm tra cuối mỗi bài học. Mini-test trong video và câu hỏi luyện tập
              không được tính. Xếp hạng theo điểm cao nhất; nếu bằng điểm thì học sinh làm nhanh hơn xếp trước. Mỗi học sinh giữ điểm cao nhất trong các lần thi của mình.
            </p>
          </div>
        </div>
      </div>

      {/* User score status card if user has completed an official test */}
      {userScoreInfo && (
        <div className={`mb-8 p-4 rounded-xl border transition ${
          userScoreInfo.rank && userScoreInfo.rank <= 5
            ? 'bg-emerald-50/70 border-emerald-300'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                userScoreInfo.rank && userScoreInfo.rank <= 5 ? 'bg-emerald-700' : 'bg-slate-700'
              }`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Kết quả kiểm tra của bạn:{' '}
                  <span className="text-blue-800 font-bold text-sm">
                    {userScoreInfo.score}/{userScoreInfo.maxScore} điểm
                  </span>
                  {userScoreInfo.completionTime && (
                    <span className="text-slate-500 font-normal ml-2 text-[11px]">
                      (Thời gian làm bài: {userScoreInfo.completionTime})
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-600">
                  {userScoreInfo.rank && userScoreInfo.rank <= 5 ? (
                    <span className="text-emerald-800 font-medium flex items-center gap-1 mt-0.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-600" />
                      Chúc mừng! Bạn đang xếp Hạng #{userScoreInfo.rank} trong Top 5 học sinh dẫn đầu.
                    </span>
                  ) : (
                    <span>
                      Hạng hiện tại: #{userScoreInfo.rank || 'Ngoài top 5'}. Cần đạt tối thiểu{' '}
                      <strong className="text-slate-900">{top5[top5.length - 1]?.examScore || 95} điểm</strong> để vào Top 5.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP 5 PODIUM - VISUAL HIGHLIGHT FOR TOP 3 */}
      {!hasResults ? (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 items-center justify-center mb-4">
            <Trophy className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
            Chưa có học sinh nào hoàn thành bài kiểm tra cuối bài
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-5">
            Bảng vinh danh được tính từ kết quả bài kiểm tra cuối mỗi bài học. Các bài
            mini-test trong video và câu hỏi luyện tập không được tính vào xếp hạng.
          </p>
          {onTakeOfficialExam && (
            <button
              onClick={onTakeOfficialExam}
              className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-xs"
            >
              <Trophy className="w-4 h-4" />
              <span>Làm bài kiểm tra đầu tiên</span>
            </button>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 2nd Place */}
        {top5[1] && (
          <div className="order-2 md:order-1 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-full p-0.5 border border-slate-300 mb-3 relative">
              <img
                src={top5[1].avatar}
                alt={top5[1].studentName}
                onError={handleAvatarError}
                className="w-full h-full rounded-full object-cover"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-400 text-white flex items-center justify-center border-2 border-white">
                <Medal className="w-3 h-3" />
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 mb-1.5 border border-slate-200">
              Hạng 2 - Á khoa 1
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate max-w-full">
              {top5[1].studentName} {top5[1].isCurrentUser && <span className="text-xs text-blue-600">(Bạn)</span>}
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-full mb-3">
              {top5[1].schoolName}
            </p>
            <div className="mt-auto w-full pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block font-normal">Điểm thi</span>
                <span className="text-lg font-bold text-slate-900">{top5[1].examScore}</span>
                <span className="text-[10px] text-slate-400">/100</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-normal">Thời gian</span>
                <span className="font-medium text-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> {top5[1].completionTime}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 1st Place - Champion */}
        {top5[0] && (
          <div className="order-1 md:order-2 bg-amber-50/20 border-2 border-amber-300 rounded-xl p-4 sm:p-5 flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-full p-0.5 border-2 border-amber-400 mb-3 relative">
              <img
                src={top5[0].avatar}
                alt={top5[0].studentName}
                onError={handleAvatarError}
                className="w-full h-full rounded-full object-cover"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center border-2 border-white">
                <Medal className="w-3.5 h-3.5" />
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 mb-1.5 border border-amber-200">
              Hạng 1 - Thủ khoa
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-full">
              {top5[0].studentName} {top5[0].isCurrentUser && <span className="text-xs text-blue-600">(Bạn)</span>}
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-full mb-3">
              {top5[0].schoolName}
            </p>
            <div className="mt-auto w-full pt-3 border-t border-amber-200 flex items-center justify-between text-xs bg-amber-50/60 rounded-lg px-3 py-2">
              <div className="text-left">
                <span className="text-[10px] text-amber-800 font-semibold block">Điểm số</span>
                <span className="text-xl font-black text-amber-950">{top5[0].examScore}</span>
                <span className="text-xs text-amber-800 font-bold">/100</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block font-normal">Thời gian</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700" /> {top5[0].completionTime}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {top5[2] && (
          <div className="order-3 md:order-3 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-full p-0.5 border border-orange-200 mb-3 relative">
              <img
                src={top5[2].avatar}
                alt={top5[2].studentName}
                onError={handleAvatarError}
                className="w-full h-full rounded-full object-cover"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-400 text-white flex items-center justify-center border-2 border-white">
                <Medal className="w-3 h-3" />
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-900 mb-1.5 border border-orange-200">
              Hạng 3 - Á khoa 2
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate max-w-full">
              {top5[2].studentName} {top5[2].isCurrentUser && <span className="text-xs text-blue-600">(Bạn)</span>}
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-full mb-3">
              {top5[2].schoolName}
            </p>
            <div className="mt-auto w-full pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block font-normal">Điểm thi</span>
                <span className="text-lg font-bold text-slate-900">{top5[2].examScore}</span>
                <span className="text-[10px] text-slate-400">/100</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-normal">Thời gian</span>
                <span className="font-medium text-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> {top5[2].completionTime}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* DANH SÁCH XẾP HẠNG */}
      {hasResults && (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Bảng Xếp Hạng Chính Thức
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-normal">
              Đã có điểm: <strong className="text-slate-700">{graded.length}</strong> / 138
            </span>
            {graded.length > 5 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 px-2 py-1 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 transition"
              >
                {showAll ? 'Chỉ hiện Top 5' : 'Xem tất cả'}
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {displayList.map((student) => {
            const badge = getRankBadge(student.rank);
            return (
              <div
                key={student.id}
                className={`p-3 sm:p-4 sm:px-5 flex items-center justify-between gap-3 sm:gap-4 transition hover:bg-slate-50/80 ${
                  student.isCurrentUser ? 'bg-blue-50/50' : ''
                }`}
              >
                {/* Left: Rank + Avatar + Name + School */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${badge.bg}`}>
                    {student.rank === 1 ? (
                      <Medal className="w-4 h-4 text-amber-600" />
                    ) : student.rank === 2 ? (
                      <Medal className="w-4 h-4 text-slate-500" />
                    ) : student.rank === 3 ? (
                      <Medal className="w-4 h-4 text-orange-500" />
                    ) : (
                      `#${student.rank}`
                    )}
                  </div>

                  <img
                    src={student.avatar}
                    alt={student.studentName}
                    onError={handleAvatarError}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                        {student.studentName}
                      </h4>
                      {student.isCurrentUser && (
                        <span className="text-[10px] bg-blue-700 text-white font-medium px-1.5 py-0.2 rounded">
                          Bạn
                        </span>
                      )}
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-normal border border-slate-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã xác thực
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {student.schoolName}
                      {student.className ? ` • Lớp ${student.className}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate hidden md:block">
                      {student.examTitle} • Ngày thi: {student.submittedAt}
                    </p>
                  </div>
                </div>

                {/* Right: Score & Time */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right">
                  <div className="hidden sm:block">
                    <span className="text-[10px] text-slate-400 block font-normal">Thời gian</span>
                    <span className="text-xs font-medium text-slate-700 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {student.completionTime}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-normal">Điểm thi</span>
                    <div className="flex items-baseline justify-end gap-0.5">
                      <span className="text-lg font-bold text-slate-900">
                        {student.examScore}
                      </span>
                      <span className="text-xs text-slate-400">/100</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      Thang 10: <strong className="text-slate-700">{student.score10 ?? 0}</strong>
                      {student.totalQuestions
                        ? ` • ${student.correctCount ?? 0}/${student.totalQuestions} câu`
                        : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Note footer */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
        <AlertCircle className="w-4 h-4 text-slate-400" />
        <span>
          Xếp hạng chỉ tính điểm bài kiểm tra cuối mỗi bài học, không tính mini-test trong video.
          {hasResults ? ` Hiện có ${graded.length}/138 học sinh đã có điểm.` : ''}
        </span>
      </div>
    </div>
  );
};
