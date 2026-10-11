import React from 'react';
import { 
  Play,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { Course } from '../types';

interface CourseCatalogProps {
  courses: Course[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  completedLessons: string[];
  onStartCourse: (course: Course) => void;
  onOpenNotebookLM?: (mindmapId?: string) => void;
  onOpenOfficialExam?: (course: Course) => void;
  // Học sinh đang xem — dùng để tính tiến độ riêng của học sinh đó
  studentId?: string;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({
  courses,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  completedLessons,
  onStartCourse,
  studentId,
}) => {
  // Filter courses — lọc theo danh mục (nếu có) và từ khóa tìm kiếm
  const filteredCourses = courses.filter((c) => {
    const matchCategory = selectedCategory === 'Tất cả' || c.category === selectedCategory;
    const matchSearch =
      searchQuery === '' ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructor.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Calculate course progress
  const getCourseProgress = (course: Course) => {
    const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const courseLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const completed = courseLessonIds.filter((id) => completedLessons.includes(id)).length;
    const percent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    return { completed, totalLessons, percent };
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Hero — sạch, tập trung, giữ nhận diện brand xanh */}
      <div className="mb-8 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Khối accent tinh tế bên phải (2 màu thay vì gradient 3 màu tràn) */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full blur-3xl opacity-60 -translate-y-1/3 translate-x-1/4 pointer-events-none" />

        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold mb-3 border border-blue-100">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Học kì I và II lớp 10</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Chuyên Đề Trọng Tâm &amp; Bài Giảng Trực Tuyến
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            Hệ thống bài giảng video môn Vật lý được tổ chức tuần tự theo từng chuyên đề. Sau khi xem đầy đủ video và hoàn thành bài tập, hệ thống sẽ tự động mở khóa bài học tiếp theo.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onStartCourse(courses[0])}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Bắt đầu học bài</span>
            </button>
          </div>
        </div>
      </div>

      {/* Courses Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Danh Sách Chuyên Đề Môn Vật Lý
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân phối theo chương trình Vật lí 10 • Năm học 2026-2027
          </p>
        </div>
        <div className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
          Tổng số: {filteredCourses.length} chuyên đề
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const { completed, totalLessons, percent } = getCourseProgress(course);

          return (
            <div
              key={course.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col group"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />

                {/* Progress bar overlay on thumbnail if started */}
                {percent > 0 && (
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-900/30">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Category + Level inline (bỏ badge chồng chéo trên ảnh) */}
                  <div className="flex items-center gap-2 mb-2 text-[11px] text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                      {course.category}
                    </span>
                    <span>{course.level}</span>
                  </div>

                  <h3
                    onClick={() => onStartCourse(course)}
                    className="text-[15px] font-semibold text-slate-900 group-hover:text-blue-700 transition cursor-pointer line-clamp-2 mb-1.5 leading-snug"
                  >
                    {course.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                    {course.subtitle}
                  </p>

                  {/* Instructor */}
                  <div className="flex items-center gap-2 mb-3 text-xs text-slate-600">
                    <img
                      src={course.instructor.avatar}
                      alt={course.instructor.name}
                      className="w-6 h-6 rounded-full object-cover border border-slate-200"
                    />
                    <span className="truncate font-medium">{course.instructor.name}</span>
                  </div>

                  <div className="flex items-center justify-between mb-4 py-2 px-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      Số bài học:
                    </span>
                    <span className="font-semibold text-blue-800">
                      {totalLessons} bài
                    </span>
                  </div>

                  {/* Progress text nếu đã bắt đầu */}
                  {percent > 0 && (
                    <div className="mb-4 text-[11px] text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        Đã học {percent}% ({completed}/{totalLessons} bài)
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onStartCourse(course)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{percent > 0 ? 'Tiếp tục học bài' : 'Bắt đầu bài học'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
