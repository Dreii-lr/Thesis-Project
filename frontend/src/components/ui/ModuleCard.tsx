import Link from 'next/link';

interface ModuleCardProps {
  id: string;
  title: string;
  subtitle: string;
  fileCount: number;
}

export default function ModuleCard({ id, title, subtitle, fileCount }: ModuleCardProps) {
  return (
    <Link href={`/teacher/generate-content/${id}`}>
      <div className="block border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer bg-white">
        <h3 className="text-[16px] font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-[13px] text-gray-500 mb-4">{subtitle}</p>
        <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold tracking-wide bg-blue-50 text-blue-600 uppercase">
          {fileCount} FILES
        </span>
      </div>
    </Link>
  );
}