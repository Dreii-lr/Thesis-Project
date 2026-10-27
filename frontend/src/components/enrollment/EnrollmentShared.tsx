import { AlertCircle, ClipboardList, Clock3, FileCheck2, Globe, Info, UserCheck, UserRound, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { APPLICATION_LABELS, type ApplicationStatus, type EnrollmentApplication } from '@/src/lib/enrollment';
import { ProfileFields } from '@/src/components/profile/ProfileShared';
import { formatRequirementDate } from '@/src/lib/requirements';

export { profileButtonClass as buttonClass, profilePrimaryClass as primaryClass, profileInputClass as fieldClass, ProfileMessage } from '@/src/components/profile/ProfileShared';
export function EnrollmentNotice({ staff = false }: { staff?: boolean }) {
  return <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"><Info size={17} className="mt-1 shrink-0" /><p><strong>Frontend application preview.</strong> Use sample documents. Applications and files stay in this browser; review them from the teacher or admin workspace on this browser. No document authentication or cross-device delivery runs.{staff ? ' Manual mapping and account creation save real learner records in the system.' : ' This preview does not submit an official enrollment application.'}</p></div>;
}
export function ApplicationBadge({ status, active = false }: { status: ApplicationStatus; active?: boolean }) {
  const Icon = active ? UserCheck : status === 'MAPPED' ? FileCheck2 : status === 'CORRECTION' ? AlertCircle : status === 'DRAFT' ? ClipboardList : Clock3;
  return <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${active ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : status === 'CORRECTION' ? 'border-rose-100 bg-rose-50 text-rose-700' : status === 'MAPPED' ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-amber-100 bg-amber-50 text-amber-800'}`}><Icon size={12} />{active ? 'Account active' : APPLICATION_LABELS[status]}</span>;
}
export function EnrollmentStats({ items }: { items: { label: string; value: number | string; detail: string; icon?: LucideIcon }[] }) {
  const icons = [Globe, FileCheck2, UserCheck];
  return <div className="grid gap-3 sm:grid-cols-3">{items.map((item, index) => { const Icon = item.icon || icons[index % icons.length]; return <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-white p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-slate-500">{item.label}</p><Icon size={18} className="text-blue-500" /></div><p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{item.value}</p><p className="mt-2 text-[11px] leading-5 text-slate-400">{item.detail}</p></div>; })}</div>;
}
export function ApplicationSummary({ application }: { application: EnrollmentApplication }) {
  const d = application.details;
  return <div className="space-y-6"><SummarySection title="Learner details"><ProfileFields fields={[["Full name", [d.first_name, d.middle_name, d.last_name, d.suffix].filter(Boolean).join(' ')], ['Birth date', d.birth_date], ['Gender', d.gender], ['Nationality', d.nationality], ['Civil status', d.civil_status], ['Religion', d.religion], ['Existing LRN', d.lrn_number || 'Needs staff assistance'], ['Guardian / support person', d.guardian_name], ['Guardian contact', d.guardian_contact_no]]} /></SummarySection><SummarySection title="Contact and address"><ProfileFields fields={[["Contact number", d.contact_no], ['Available email', d.email], ['Residential address', [d.street_building_no, d.barangay, d.municipality, d.province].filter(Boolean).join(', ')]]} /></SummarySection><SummarySection title="Education background"><ProfileFields fields={[["Formal schooling", d.schooling === 'never' ? 'Never attended formal school' : 'Previously attended'], ['Last school attended', d.last_school], ['Last grade completed', d.last_grade], ['Previous ALS participation', d.previous_als], ['Learning availability', d.availability], ['Preferred modality', d.modality === 'BLENDED' ? 'Blended' : 'Face-to-face']]} /></SummarySection></div>;
}
export function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-xl border border-slate-200 p-4 sm:p-5"><h3 className="flex items-center gap-2 text-xs font-semibold text-slate-800"><UserRound size={15} className="text-blue-600" />{title}</h3>{children}</section>;
}
export function ApplicationHistory({ application }: { application: EnrollmentApplication }) {
  return <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Application history · {application.history.length} updates</summary><ol className="mt-4 space-y-4">{application.history.map(event => <li key={event.id} className="border-l-2 border-blue-100 pl-3"><p className="text-xs leading-6 text-slate-600">{event.message}</p><p className="mt-1 text-[10px] text-slate-400">{event.actor} · {formatRequirementDate(event.at)}</p></li>)}</ol></details>;
}
