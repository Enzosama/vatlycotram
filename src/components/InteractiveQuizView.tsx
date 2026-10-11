import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Check, 
  RotateCcw, 
  ArrowRight, 
  Award, 
  BookOpen,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MiniQuiz, Question, TrueFalseStatement } from '../types';

interface InteractiveQuizViewProps {
  quiz: MiniQuiz;
  lessonTitle: string;
  isLessonCompleted: boolean;
  onCompleteLesson: () => void;
}

// Chuẩn hóa chuỗi so sánh không phân biệt hoa thường và khoảng trắng
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]/g, '');
}

export const InteractiveQuizView: React.FC<InteractiveQuizViewProps> = ({
  quiz,
  lessonTitle,
  isLessonCompleted,
  onCompleteLesson,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [fillInBlanks, setFillInBlanks] = useState<Record<string, Record<number, string>>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, Record<string, string>>>({});
  const [trueFalseAnswers, setTrueFalseAnswers] = useState<Record<string, Record<string, boolean>>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Nhận biết bài kiểm tra thang điểm 10 cuối bài (14 câu)
  const isFinalExam10Scale = quiz.questions.length === 14;

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedOptions((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleFillInBlankChange = (questionId: string, blankIndex: number, value: string) => {
    if (isSubmitted) return;
    setFillInBlanks((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [blankIndex]: value,
      },
    }));
  };

  const handleShortAnswerChange = (questionId: string, value: string) => {
    if (isSubmitted) return;
    setShortAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMatchingChange = (questionId: string, leftKey: string, rightKey: string) => {
    if (isSubmitted) return;
    setMatchingAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [leftKey]: rightKey,
      },
    }));
  };

  const handleTrueFalseSelect = (questionId: string, statementId: string, value: boolean) => {
    if (isSubmitted) return;
    setTrueFalseAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [statementId]: value,
      },
    }));
  };

  // Tính điểm và kiểm tra kết quả
  const calculateResults = () => {
    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;

    quiz.questions.forEach((q) => {
      const qType = q.type || 'multiple_choice';
      const points = q.points !== undefined ? q.points : 1;
      maxScore += points;

      if (qType === 'multiple_choice') {
        if (selectedOptions[q.id] === q.correctIndex) {
          totalScore += points;
          correctCount++;
        }
      } else if (qType === 'fill_in_blank') {
        const answers = q.fillInBlanksAnswer;
        const userBlanks = fillInBlanks[q.id] || {};
        if (Array.isArray(answers)) {
          // Nhiều ô điền
          let allCorrect = true;
          // Có thể chấp nhận thứ tự đảo ngược nếu là 2 từ (như quan sát và suy luận chủ quan)
          const userVals = Object.values(userBlanks).map((v) => normalizeText(String(v || '')));
          const expectedVals = answers.map((a) => normalizeText(a));

          answers.forEach((ans, idx) => {
            const userVal = normalizeText(userBlanks[idx] || '');
            const directMatch = userVal.includes(normalizeText(ans));
            const reverseMatch = userVals.some((u) => u.includes(normalizeText(ans)));
            if (!directMatch && !reverseMatch) {
              allCorrect = false;
            }
          });

          if (allCorrect && userVals.length >= expectedVals.length) {
            totalScore += points;
            correctCount++;
          }
        } else if (typeof answers === 'string') {
          const userVal = normalizeText(userBlanks[0] || '');
          if (userVal.includes(normalizeText(answers))) {
            totalScore += points;
            correctCount++;
          }
        }
      } else if (qType === 'short_answer') {
        const userVal = normalizeText(shortAnswers[q.id] || '');
        const acceptable = [
          q.shortAnswer ? String(q.shortAnswer) : '',
          ...(q.acceptableAnswers || []),
        ].map((a) => normalizeText(a));

        if (userVal && acceptable.some((a) => userVal === a || userVal.includes(a))) {
          totalScore += points;
          correctCount++;
        }
      } else if (qType === 'matching') {
        const correctMap = q.correctMatching || {};
        const userMap = matchingAnswers[q.id] || {};
        const totalPairs = Object.keys(correctMap).length;
        let matchedPairs = 0;

        Object.entries(correctMap).forEach(([lKey, rKey]) => {
          if (userMap[lKey] === rKey) {
            matchedPairs++;
          }
        });

        if (totalPairs > 0 && matchedPairs === totalPairs) {
          totalScore += points;
          correctCount++;
        }
      } else if (qType === 'true_false_group') {
        const statements = q.trueFalseStatements || [];
        const userMap = trueFalseAnswers[q.id] || {};
        let correctStatements = 0;

        statements.forEach((st) => {
          if (userMap[st.id] === st.isCorrect) {
            correctStatements++;
          }
        });

        // Điểm lũy tiến chuẩn Bộ GD&ĐT cho câu 2.0 điểm
        if (points === 2.0 && statements.length === 4) {
          if (correctStatements === 1) totalScore += 0.2;
          else if (correctStatements === 2) totalScore += 0.5;
          else if (correctStatements === 3) totalScore += 1.0;
          else if (correctStatements === 4) {
            totalScore += 2.0;
            correctCount++;
          }
        } else {
          const ratio = statements.length > 0 ? correctStatements / statements.length : 0;
          totalScore += points * ratio;
          if (ratio === 1) correctCount++;
        }
      }
    });

    const roundedScore = Math.round(totalScore * 10) / 10;
    const percentage = Math.round((roundedScore / maxScore) * 100);

    return {
      totalScore: roundedScore,
      maxScore,
      percentage,
      correctCount,
    };
  };

  const results = isSubmitted ? calculateResults() : null;

  const handleSubmit = () => {
    setIsSubmitted(true);
    const res = calculateResults();
    if (res.percentage >= 70) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handleReset = () => {
    setSelectedOptions({});
    setFillInBlanks({});
    setShortAnswers({});
    setMatchingAnswers({});
    setTrueFalseAnswers({});
    setIsSubmitted(false);
  };

  return (
    <div className="space-y-6">
      {/* Title & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>{quiz.title}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {lessonTitle} • Tổng cộng {quiz.questions.length} câu hỏi luyện tập chuyên sâu
          </p>
        </div>

        {results && (
          <div className="flex items-center gap-3 bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-200">
            <Award className="w-5 h-5 text-blue-600" />
            <div>
              <span className="text-[11px] text-blue-700 block font-medium">Kết quả kiểm tra:</span>
              <span className="text-sm font-extrabold text-blue-900">
                {results.totalScore} / {results.maxScore} {isFinalExam10Scale ? 'điểm' : 'câu đúng'} ({results.percentage}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* List of Questions */}
      <div className="space-y-5">
        {quiz.questions.map((q, qIdx) => {
          const qType = q.type || 'multiple_choice';

          return (
            <div
              key={q.id}
              className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-xs shadow-2xs transition-all"
            >
              {/* Section Title if provided */}
              {q.sectionTitle && (
                <div className="mb-3 pb-2 border-b border-slate-200/70">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                    {q.sectionTitle}
                  </span>
                </div>
              )}

              {/* Passage / Context Text if provided */}
              {q.passage && (
                <div className="mb-3.5 p-3 bg-white rounded-xl border border-slate-200/80 text-slate-700 italic leading-relaxed text-[11.5px]">
                  {q.passage}
                </div>
              )}

              {/* Question Text */}
              <div className="flex items-start gap-2.5 mb-3.5">
                <span className="shrink-0 w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-extrabold flex items-center justify-center text-xs">
                  {qIdx + 1}
                </span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm leading-snug pt-0.5">
                  {q.text}
                </p>
              </div>

              {/* TYPE 1: MULTIPLE CHOICE */}
              {qType === 'multiple_choice' && (
                <div className="space-y-2 mb-3">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedOptions[q.id] === optIdx;
                    const isCorrect = optIdx === q.correctIndex;

                    let btnClass = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80';
                    if (isSubmitted) {
                      if (isCorrect) {
                        btnClass = 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900 ring-1 ring-emerald-500/30';
                      } else if (isSelected && !isCorrect) {
                        btnClass = 'bg-rose-50 border-rose-400 font-medium text-rose-800';
                      }
                    } else if (isSelected) {
                      btnClass = 'bg-blue-50 border-blue-600 font-bold text-blue-900 ring-1 ring-blue-600/30';
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={isSubmitted}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-3 ${btnClass}`}
                      >
                        <span className="leading-relaxed">{opt}</span>
                        {isSubmitted && isCorrect && (
                          <span className="shrink-0 flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            <Check className="w-3.5 h-3.5" /> Đúng
                          </span>
                        )}
                        {isSubmitted && isSelected && !isCorrect && (
                          <span className="shrink-0 flex items-center gap-1 text-[11px] text-rose-700 font-bold bg-rose-100/80 px-2 py-0.5 rounded-md">
                            <XCircle className="w-3.5 h-3.5" /> Sai
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TYPE 2: FILL IN BLANKS */}
              {qType === 'fill_in_blank' && (
                <div className="space-y-3 mb-3 bg-white p-3.5 rounded-xl border border-slate-200">
                  <p className="text-[11px] font-semibold text-slate-600">
                    Nhập câu trả lời của bạn vào các ô bên dưới:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Array.isArray(q.fillInBlanksAnswer) ? (
                      q.fillInBlanksAnswer.map((_, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2">
                          <span className="font-bold text-slate-700 shrink-0">({bIdx + 1}):</span>
                          <input
                            type="text"
                            disabled={isSubmitted}
                            value={fillInBlanks[q.id]?.[bIdx] || ''}
                            onChange={(e) => handleFillInBlankChange(q.id, bIdx, e.target.value)}
                            placeholder={`Điền vị trí (${bIdx + 1})...`}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-500 bg-slate-50 disabled:bg-slate-100 font-medium"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          disabled={isSubmitted}
                          value={fillInBlanks[q.id]?.[0] || ''}
                          onChange={(e) => handleFillInBlankChange(q.id, 0, e.target.value)}
                          placeholder={q.fillInBlanksPlaceholder || 'Nhập từ/cụm từ thích hợp...'}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-500 bg-slate-50 disabled:bg-slate-100 font-medium"
                        />
                      </div>
                    )}
                  </div>

                  {isSubmitted && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-blue-800">
                      <span>Đáp án chuẩn:</span>
                      <span className="bg-blue-100 px-2 py-0.5 rounded text-blue-900 font-bold">
                        {Array.isArray(q.fillInBlanksAnswer)
                          ? q.fillInBlanksAnswer.join(' & ')
                          : q.fillInBlanksAnswer}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TYPE 3: SHORT ANSWER */}
              {qType === 'short_answer' && (
                <div className="space-y-3 mb-3 bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <span className="text-slate-600 font-medium shrink-0">Đáp án của học sinh:</span>
                    <input
                      type="text"
                      disabled={isSubmitted}
                      value={shortAnswers[q.id] || ''}
                      onChange={(e) => handleShortAnswerChange(q.id, e.target.value)}
                      placeholder="Nhập câu trả lời (năm / số / kết quả tính toán)..."
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-500 bg-slate-50 disabled:bg-slate-100 font-medium"
                    />
                  </div>

                  {isSubmitted && (
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-800 pt-1">
                      <span>Đáp án chuẩn:</span>
                      <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded font-bold">
                        {q.shortAnswer}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TYPE 4: MATCHING (GHÉP NỐI) */}
              {qType === 'matching' && q.matchingPairs && (
                <div className="space-y-3 mb-3 bg-white p-4 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b border-slate-200">
                    <div>
                      <h5 className="font-bold text-slate-800 mb-2 text-[11.5px] uppercase tracking-wide">
                        Cột A (Nhân vật / Sự kiện / Mốc thời gian)
                      </h5>
                      <div className="space-y-1.5">
                        {q.matchingPairs.map((p) => (
                          <div key={p.leftKey} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-800 font-medium">
                            {p.leftText}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-bold text-slate-800 mb-2 text-[11.5px] uppercase tracking-wide">
                        Cột B (Thành tựu / Mô tả lịch sử)
                      </h5>
                      <div className="space-y-1.5">
                        {q.matchingPairs.map((p) => (
                          <div key={p.rightKey} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-700">
                            {p.rightText}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Matching selector */}
                  <div>
                    <h5 className="font-bold text-slate-800 mb-2 text-[11px]">
                      Chọn phương án ghép nối tương ứng:
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {q.matchingPairs.map((p) => {
                        const userRight = matchingAnswers[q.id]?.[p.leftKey] || '';
                        const expectedRight = q.correctMatching?.[p.leftKey];
                        const isPairCorrect = isSubmitted && userRight === expectedRight;

                        return (
                          <div key={p.leftKey} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="font-bold text-blue-900 shrink-0">Mục {p.leftKey} ghép:</span>
                            <select
                              disabled={isSubmitted}
                              value={userRight}
                              onChange={(e) => handleMatchingChange(q.id, p.leftKey, e.target.value)}
                              className={`w-full py-1 px-1.5 rounded text-xs font-bold border ${
                                isSubmitted
                                  ? isPairCorrect
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                                    : 'bg-rose-50 border-rose-400 text-rose-900'
                                  : 'bg-white border-slate-300 text-slate-800'
                              }`}
                            >
                              <option value="">--</option>
                              {q.matchingPairs?.map((opt) => (
                                <option key={opt.rightKey} value={opt.rightKey}>
                                  {opt.rightKey}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>

                    {isSubmitted && q.correctMatching && (
                      <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 font-semibold flex items-center gap-2">
                        <span>Đáp án ghép nối chuẩn:</span>
                        <span className="font-extrabold text-emerald-950">
                          {Object.entries(q.correctMatching)
                            .map(([l, r]) => `${l}-${r}`)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TYPE 5: TRUE / FALSE GROUP */}
              {qType === 'true_false_group' && q.trueFalseStatements && (
                <div className="space-y-2 mb-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Ý hỏi & Nhận định</th>
                          <th className="py-2.5 px-3 text-center w-20">Đúng</th>
                          <th className="py-2.5 px-3 text-center w-20">Sai</th>
                          {isSubmitted && <th className="py-2.5 px-3 w-28 text-center">Kết quả</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {q.trueFalseStatements.map((st) => {
                          const userChoice = trueFalseAnswers[q.id]?.[st.id];
                          const isChoiceCorrect = isSubmitted && userChoice === st.isCorrect;

                          return (
                            <tr key={st.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 text-slate-800 font-medium leading-relaxed">
                                <span className="font-bold text-blue-900 mr-1.5">{st.label}</span>
                                {st.statement}
                              </td>

                              {/* Đúng button */}
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  disabled={isSubmitted}
                                  onClick={() => handleTrueFalseSelect(q.id, st.id, true)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    userChoice === true
                                      ? 'bg-blue-600 text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  Đúng
                                </button>
                              </td>

                              {/* Sai button */}
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  disabled={isSubmitted}
                                  onClick={() => handleTrueFalseSelect(q.id, st.id, false)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    userChoice === false
                                      ? 'bg-rose-600 text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  Sai
                                </button>
                              </td>

                              {/* Feedback column */}
                              {isSubmitted && (
                                <td className="py-2.5 px-3 text-center">
                                  {isChoiceCorrect ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                      <Check className="w-3 h-3" /> Đúng ({st.isCorrect ? 'Đ' : 'S'})
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                                      <XCircle className="w-3 h-3" /> Sai (Đáp án: {st.isCorrect ? 'Đ' : 'S'})
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detailed Explanation upon submission */}
              {isSubmitted && (
                <div className="bg-white p-3 rounded-xl border border-blue-200 text-[11px] text-slate-700 leading-relaxed space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Hướng dẫn giải chi tiết:</span>
                  </div>
                  <p className="text-slate-600">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Footer Bar */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Kiểm tra kết quả</span>
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Làm lại bài luyện tập</span>
            </button>
          )}

          {isSubmitted && results && (
            <span className="text-xs font-semibold text-slate-700">
              Bạn đạt: <strong className="text-blue-700 font-extrabold">{results.totalScore}/{results.maxScore}</strong> {isFinalExam10Scale ? 'điểm' : 'câu đúng'}
            </span>
          )}
        </div>

        {/* Complete Lesson & Unlock Next */}
        <button
          onClick={onCompleteLesson}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            isLessonCompleted
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{isLessonCompleted ? 'Đã hoàn thành bài học này' : 'Hoàn thành bài & Mở khóa tiếp theo'}</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>
    </div>
  );
};
