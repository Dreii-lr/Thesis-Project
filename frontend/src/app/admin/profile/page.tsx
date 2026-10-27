import { Suspense } from 'react';
import AccountProfilePage from '@/src/components/profile/AccountProfilePage';

export default function Page() {
  return <Suspense fallback={<p role="status" className="p-8 text-sm text-slate-500">Opening your profile…</p>}><AccountProfilePage role="admin" /></Suspense>;
}
