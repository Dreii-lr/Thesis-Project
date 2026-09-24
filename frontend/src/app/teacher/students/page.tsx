'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, ExternalLink } from 'lucide-react';
import { useStudents } from '@/src/context/StudentContext';

export default function StudentsListPage() {
  const { students } = useStudents();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || student.lrn.includes(searchQuery);
  });

  const getStatus = (id: string) => {
    const statuses = [
      { label: 'Active', bg: 'bg-green-100 text-green-800' },
      { label: 'Needs Review', bg: 'bg-amber-100 text-amber-800' },
      { label: 'Intervention', bg: 'bg-red-100 text-red-800' },
      { label: 'Inactive', bg: 'bg-gray-100 text-gray-800' },
    ];
    return statuses[id.charCodeAt(id.length - 1) % statuses.length];
  };

  return (
    <div className="w-full h-full flex flex-col p-6 lg:p-8 bg-gray-50/30">
      
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Students</h1>
          <p className="text-gray-500 text-sm">
            View and monitor your class roster.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/teacher/create-account/add-student"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Learner
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-gray-200 rounded-lg flex flex-col overflow-hidden flex-1 min-w-0">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search students..." 
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
            />
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">LRN</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const status = getStatus(student.id);
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors bg-white">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{student.firstName} {student.lastName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.lrn}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.bg}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <Link 
                          href={`/teacher/students/${student.id}`}
                          className="inline-flex text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-blue-50"
                          title="View Profile"
                        >
                          <ExternalLink size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between text-sm text-gray-500 bg-gray-50 mt-auto">
          <span>Showing {filteredStudents.length} entries</span>
        </div>
      </div>
    </div>
  );
}