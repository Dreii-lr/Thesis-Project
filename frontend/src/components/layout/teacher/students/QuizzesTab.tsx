'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronRight, X, Check, FileQuestion } from 'lucide-react';
import { Student } from '@/src/data/mockStudents';

export default function QuizzesTab({ student }: { student: Student }) {
  const quizzes = student.quizzes || [];
  
  // Track which quiz card is expanded
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  // Track if the "Show All" toggle is active for a specific quiz
  const [showAllMistakesFor, setShowAllMistakesFor] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    if (expandedQuizId === id) {
      setExpandedQuizId(null);
      setShowAllMistakesFor(null); // Reset limit when closing
    } else {
      setExpandedQuizId(id);
    }
  };

  const toggleShowAll = (id: string) => {
    setShowAllMistakesFor(prev => prev === id ? null : id);
  };

  if (quizzes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl">
        <FileQuestion size={40} className="mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No assessments recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {quizzes.map((quiz) => {
        const isNeedsReview = quiz.status === 'Needs Review' || quiz.status === 'Failed';
        const isExpanded = expandedQuizId === quiz.id;
        
        // Crisp, aesthetic colors
        const cardBg = isExpanded 
          ? (isNeedsReview ? 'bg-[#fffbfc] border-red-200 shadow-md' : 'bg-[#f4fcf7] border-emerald-200 shadow-md')
          : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md';
        
        const scoreBg = isNeedsReview ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100';
        const statusBadgeBg = isNeedsReview ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white';

        // Limit logic for mistakes
        const mistakeDetails = quiz.mistakeDetails || [];
        const isShowingAll = showAllMistakesFor === quiz.id;
        const visibleMistakes = isShowingAll ? mistakeDetails : mistakeDetails.slice(0, 3);
        const hiddenCount = mistakeDetails.length - visibleMistakes.length;

        return (
          <div key={quiz.id} className={`border rounded-xl p-5 flex flex-col transition-all duration-300 ${cardBg}`}>
            
            {/* Top Row (Always Visible) */}
            <div 
              className="flex flex-col md:flex-row md:items-center justify-between w-full cursor-pointer group"
              onClick={() => toggleExpand(quiz.id)}
            >
              
              <div className="flex items-center gap-5">
                {/* Score Box */}
                <div className={`w-[72px] h-[72px] rounded-xl flex flex-col items-center justify-center shrink-0 ${scoreBg}`}>
                  <span className="block text-2xl font-bold leading-none">{quiz.score}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Score</span>
                </div>
                
                {/* Content */}
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase tracking-wider">
                      {quiz.type}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${statusBadgeBg}`}>
                      {quiz.status}
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase tracking-wider">
                      {quiz.subject}
                    </span>
                  </div>
                  <h4 className="text-[16px] font-bold text-gray-900 leading-tight mb-0.5 group-hover:text-blue-600 transition-colors">
                    {quiz.title}
                  </h4>
                  <p className="text-[13px] text-gray-500 font-medium">
                    Taken on {quiz.date} <span className="mx-1">•</span> {quiz.totalItems} Total Items
                  </p>
                </div>
              </div>
              
              {/* Action / Mistakes indicator */}
              {quiz.mistakes ? (
                <div className="text-sm font-semibold text-gray-500 flex items-center gap-1.5 mt-4 md:mt-0 transition-colors">
                  <span className={isNeedsReview ? 'text-red-500' : 'text-emerald-500'}>
                    {quiz.mistakes} Error{quiz.mistakes > 1 ? 's' : ''}
                  </span>
                  <div className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-gray-100' : 'group-hover:bg-gray-100'}`}>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-600" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 mt-4 md:mt-0 self-end md:self-center transition-colors">
                  <ChevronRight size={20} />
                </div>
              )}
            </div>

            {/* Expanded Item Analysis Section */}
            {isExpanded && mistakeDetails.length > 0 && (
              <div className="w-full mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-bold text-[13px] text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <FileQuestion size={16} className="text-blue-500" /> 
                    Item Analysis Review
                  </h4>
                  <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full">
                    Showing incorrect answers
                  </span>
                </div>

                <div className="space-y-4">
                  {visibleMistakes.map((mistake) => (
                    <div key={mistake.questionNumber} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      
                      <div className="flex gap-3 items-start mb-4">
                        <span className="flex items-center justify-center bg-gray-100 text-gray-600 font-bold text-xs rounded w-7 h-7 shrink-0">
                          Q{mistake.questionNumber}
                        </span>
                        <h5 className="text-[14px] font-medium text-gray-900 leading-snug pt-0.5">
                          {mistake.question}
                        </h5>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
                        {/* Student Answer */}
                        <div className="bg-red-50/50 border border-red-100 rounded-lg p-3">
                          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            Student's Answer
                          </p>
                          <div className="flex items-start gap-2 text-sm text-gray-800 font-medium">
                            <X size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <span>{mistake.studentAnswer}</span>
                          </div>
                        </div>

                        {/* Correct Answer */}
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">
                            Correct Answer
                          </p>
                          <div className="flex items-start gap-2 text-sm text-gray-800 font-medium">
                            <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>{mistake.correctAnswer}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Show All Toggle */}
                {mistakeDetails.length > 3 && (
                  <div className="mt-5 text-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleShowAll(quiz.id);
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full transition-colors"
                    >
                      {isShowingAll ? 'Show less' : `View all ${mistakeDetails.length} errors`}
                      {isShowingAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                )}

              </div>
            )}
            
          </div>
        );
      })}
    </div>
  );
}