// frontend/src/app/teacher/create-account/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Pencil, Loader2, RefreshCw } from 'lucide-react';
import { useStudents } from '@/src/context/StudentContext';
import { formatCategoryLevel } from '@/src/lib/students-api';

export default function CreateAccountPage() {
  const { students, isLoading, error, refreshStudents } = useStudents();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.first_name} ${student.middle_name} ${student.last_name} ${student.suffix}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    const studentId = (student.student_id || student.id || '').toLowerCase();
    const lrn = (student.personal_details?.lrn_number || '').toLowerCase();
    const email = (student.email || '').toLowerCase();

    return (
      fullName.includes(query) ||
      studentId.includes(query) ||
      lrn.includes(query) ||
      email.includes(query)
    );
  });

  return (
    <div className="w-full h-full flex flex-col p-6 lg:p-8">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Student Accounts
          </h1>
          <p className="text-gray-500 text-sm">
            Manage existing students or register a new learner.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshStudents}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <Link
            href="/teacher/create-account/add-student"
            className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shrink-0"
          >
            <Plus size={16} />
            Add Student
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300 min-w-0">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="relative w-full max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
            />
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  LRN
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Contact Number
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    <div className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-blue-600" />
                      Loading students from database...
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-blue-50/50 transition-colors group bg-white"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {student.student_id || student.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {student.first_name} {student.last_name} {student.suffix}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {student.personal_details.lrn_number || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatCategoryLevel(student.user_category)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {student.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {student.contact_details.contact_no || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <Link
                        href={`/teacher/create-account/${encodeURIComponent(
                          student.id
                        )}`}
                        className="inline-flex text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-blue-50"
                        title="Edit Student"
                      >
                        <Pencil size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}

              {!isLoading && filteredStudents.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-sm text-gray-400"
                  >
                    No student records found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-sm text-gray-500 mt-auto">
          <span>
            Showing {filteredStudents.length > 0 ? 1 : 0} to{' '}
            {filteredStudents.length} of {students.length} entries
          </span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded text-gray-400 cursor-not-allowed bg-white">
              Prev
            </button>
            <button className="px-3 py-1 border border-gray-200 rounded text-gray-400 cursor-not-allowed bg-white">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}