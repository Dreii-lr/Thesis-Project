'use client';

interface AttendanceFiltersProps {
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  selectedSubject: string;
  setSelectedSubject: (subject: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  totalLearners: number;
  presentCount: number;
  absentCount: number;
}

export default function AttendanceFilters({
  selectedLevel, setSelectedLevel,
  selectedSubject, setSelectedSubject,
  selectedDate, setSelectedDate,
  totalLearners, presentCount, absentCount
}: AttendanceFiltersProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 shadow-sm flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center shrink-0">
      <div className="flex flex-wrap items-center gap-5 w-full lg:w-auto">
        
        {/* 1. Select Level */}
        <div className="flex flex-col gap-1.5 w-full sm:w-[200px]">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">1. Select Level</label>
          <select 
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            <option value="Junior High School">Junior High School</option>
            <option value="Elementary">Elementary</option>
          </select>
        </div>

        {/* 2. Select Subject */}
        <div className="flex flex-col gap-1.5 w-full sm:w-[240px]">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">2. Select Subject</label>
          <select 
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            <option value="LS1: Communication Skills">LS1: Communication Skills</option>
            <option value="LS2: Scientific Literacy">LS2: Scientific Literacy</option>
            <option value="LS3: Mathematical & Problem Solving">LS3: Mathematical & Problem Solving</option>
          </select>
        </div>

        {/* 3. Date */}
        <div className="flex flex-col gap-1.5 w-full sm:w-[180px]">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">3. Date</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Live Statistics Panel */}
      <div className="flex items-center gap-8 px-8 py-3 bg-gray-50 border border-gray-200 rounded-lg shrink-0">
        <div className="text-center">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total</p>
          <p className="text-2xl font-black text-gray-800 leading-none">{totalLearners}</p>
        </div>
        <div className="w-px h-10 bg-gray-200"></div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Present</p>
          <p className="text-2xl font-black text-emerald-500 leading-none">{presentCount}</p>
        </div>
        <div className="w-px h-10 bg-gray-200"></div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Absent</p>
          <p className="text-2xl font-black text-red-500 leading-none">{absentCount}</p>
        </div>
      </div>
    </div>
  );
}