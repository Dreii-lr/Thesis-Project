'use client';

import { Student } from '@/src/data/mockStudents';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function OverviewTab({ student }: { student: Student }) {
  // Use recent quizzes as activity feed
  const recentActivity = student.quizzes?.slice(0, 3) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Overall Readiness</p>
          <div className="text-2xl font-semibold text-gray-900 mb-3">{student.readinessScore || 0}%</div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-1000" 
              style={{ width: `${student.readinessScore || 0}%` }}
            />
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Active Subject</p>
          <div className="text-base font-semibold text-gray-900">Scientific Literacy</div>
          <div className="text-sm text-gray-500 mt-1">Module 4</div>
        </div>

        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">System Note</p>
          <div className="text-sm font-medium text-gray-900 mt-1">Requires review in Math.</div>
          <button className="text-sm text-blue-600 mt-2 hover:underline">View details</button>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Recent Records</h3>
        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((quiz) => (
              <div key={quiz.id} className="flex gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="mt-0.5">
                  {quiz.status === 'Passed' ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : (
                    <XCircle size={18} className="text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {quiz.type}: {quiz.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{quiz.date}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded h-fit ${
                  quiz.status === 'Passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {quiz.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No recent activity recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}