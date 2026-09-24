'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { Student, WrittenActivity } from '@/src/data/mockStudents';
import SubmissionModal from '@/src/components/ui/teacher/SubmissionModal';

export default function WrittenActivitiesTab({ student }: { student: Student }) {
  const activities = student.writtenActivities || [];
  
  const [selectedActivity, setSelectedActivity] = useState<WrittenActivity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = (activity: WrittenActivity) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <select className="appearance-none bg-transparent border-b border-gray-300 text-gray-700 text-sm pl-0 pr-8 py-2 focus:outline-none focus:border-gray-900 transition-colors cursor-pointer font-medium">
                <option>All Modules</option>
              </select>
              <ChevronDown size={14} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            <div className="relative">
              <select className="appearance-none bg-transparent border-b border-gray-300 text-gray-700 text-sm pl-0 pr-8 py-2 focus:outline-none focus:border-gray-900 transition-colors cursor-pointer font-medium">
                <option>Any Status</option>
              </select>
              <ChevronDown size={14} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by title..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Activity List */}
        {activities.length > 0 ? (
          <div className="flex flex-col gap-3">
            {activities.map((activity) => {
              const statusColors = activity.status === 'REVIEWED' || activity.status === 'GRADED' 
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' 
                : 'bg-amber-50 text-amber-700 ring-amber-600/20';

              return (
                <div 
                  key={activity.id} 
                  onClick={() => handleOpenModal(activity)}
                  className="group relative flex flex-col md:flex-row md:items-center justify-between p-5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all cursor-pointer gap-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        {activity.type}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="text-[12px] font-medium text-gray-500">
                        {activity.subject}
                      </span>
                    </div>
                    
                    <h4 className="text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {activity.title}
                    </h4>
                    
                    <p className="text-[13px] text-gray-500">
                      Submitted on {activity.date}
                    </p>
                  </div>

                  <div className="flex items-center gap-5 shrink-0 md:ml-auto mt-2 md:mt-0">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full ring-1 ring-inset ${statusColors}`}>
                      {activity.status}
                    </span>
                    <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all hidden md:block" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 border border-gray-200 border-dashed rounded-xl bg-gray-50/50">
            <p className="text-sm font-medium text-gray-900">No written activities</p>
            <p className="text-sm text-gray-500 mt-1">There are currently no activities matching your criteria.</p>
          </div>
        )}

        {/* Pagination Footer */}
        {activities.length > 0 && (
          <div className="pt-6 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
            <p className="text-[13px] text-gray-500">
              Showing <span className="font-medium text-gray-900">1</span> to <span className="font-medium text-gray-900">{activities.length}</span> of <span className="font-medium text-gray-900">{activities.length}</span> results
            </p>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-900 bg-gray-100 rounded-md">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <SubmissionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        activity={selectedActivity} 
      />
    </>
  );
}