'use client';

import React, { useState, useMemo } from 'react';
import { Task, mockSubjects } from '@/src/data/mockAssessment';
import { FileText, GraduationCap, ListTodo, Search, ChevronRight, ChevronLeft } from 'lucide-react';

export default function TaskDashboard({ tasks }: { tasks: Task[] }) {
  const [activeTab, setActiveTab] = useState('All Tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Filter Logic
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = selectedSubject === 'All Subjects' || task.subject === selectedSubject;
      
      let matchesTab = true;
      if (activeTab === 'Activities') matchesTab = task.type === 'Activity';
      if (activeTab === 'Quizzes') matchesTab = task.type === 'Quiz';
      if (activeTab === 'Exams') matchesTab = task.type === 'Exam';

      return matchesSearch && matchesSubject && matchesTab;
    });
    return filtered;
  }, [tasks, activeTab, searchQuery, selectedSubject]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedSubject, activeTab]);

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'Activity': return <FileText size={18} className="text-blue-600" />;
      case 'Exam': return <GraduationCap size={18} className="text-orange-600" />;
      case 'Quiz': return <ListTodo size={18} className="text-purple-600" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Activity': return 'ring-blue-200/50 text-blue-700 bg-blue-50';
      case 'Exam': return 'ring-orange-200/50 text-orange-700 bg-orange-50';
      case 'Quiz': return 'ring-purple-200/50 text-purple-700 bg-purple-50';
      default: return '';
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
      
      {/* Top Filters */}
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 bg-slate-50/30">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 w-fit">
            {['All Tasks', 'Activities', 'Quizzes', 'Exams'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full sm:w-48 bg-white border border-slate-200 text-[13px] font-semibold text-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 appearance-none shadow-sm cursor-pointer"
            >
              {mockSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 text-[13px] text-slate-900 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[380px]">
        <table className="w-full text-left text-[13px]">
          <thead className="text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100 bg-slate-50/50">
            <tr>
              <th className="px-6 py-4">Task Name & Subject</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Deadline</th>
              <th className="px-6 py-4 text-center">Submissions</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                  No tasks found matching your filters.
                </td>
              </tr>
            ) : paginatedTasks.map(task => (
              <tr key={task.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                <td className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                    {getTypeIcon(task.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{task.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{task.subject}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ring-1 ring-inset ${getTypeColor(task.type)}`}>
                    {task.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 whitespace-pre-line text-xs font-medium">
                  {task.deadline}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="font-bold text-slate-900 block">{task.submissions}</span>
                  {task.needsGrading ? (
                    <span className="text-[10px] font-semibold text-rose-500">{task.needsGrading} to grade</span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">Up to date</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md ring-1 ring-inset ${
                    task.status === 'Active' ? 'text-emerald-700 bg-emerald-50 ring-emerald-200/50' : 
                    task.status === 'Draft' ? 'text-slate-600 bg-slate-50 ring-slate-200/50' : 'text-blue-700 bg-blue-50 ring-blue-200/50'
                  }`}>
                    {task.status}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center justify-center">
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[12px] font-medium text-slate-500">
            Showing <span className="font-bold text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredTasks.length)}</span> of <span className="font-bold text-slate-900">{filteredTasks.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 transition-colors shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[13px] font-semibold text-slate-700 px-2">{currentPage} / {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 transition-colors shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}