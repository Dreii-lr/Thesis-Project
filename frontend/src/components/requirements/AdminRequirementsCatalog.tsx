'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  Info,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import Modal from '@/src/components/ui/Modal';
import {
  adminCreateRequirement,
  adminDeleteRequirement,
  adminGetRequirementStats,
  adminListRequirements,
  adminReorderRequirements,
  adminSeedDefaultRequirements,
  adminToggleRequirementStatus,
  adminUpdateRequirement,
  type RequirementCreatePayload,
  type RequirementItem,
  type RequirementStats,
  type RequirementUpdatePayload,
} from '@/src/lib/requirements-api';
import { RequirementIcon } from './RequirementShared';

export default function AdminRequirementsCatalog() {
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [stats, setStats] = useState<RequirementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<RequirementItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RequirementItem | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [reordering, setReordering] = useState(false);
  const lock = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, statsData] = await Promise.all([
        adminListRequirements(true),
        adminGetRequirementStats().catch(() => null),
      ]);
      // Sort by order_index ascending
      const sorted = [...data].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setRequirements(sorted);
      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load requirements catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Seed defaults handler
  const handleSeedDefaults = async () => {
    if (lock.current || seeding) return;
    lock.current = true;
    setSeeding(true);
    setNotice('');
    setError('');
    try {
      const res = await adminSeedDefaultRequirements();
      const count = res.active_count ?? res.created_count ?? 0;
      setNotice(`DepEd ALS default requirements synchronized (${count} active in database).`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed default requirements.');
    } finally {
      lock.current = false;
      setSeeding(false);
    }
  };

  // Toggle active/inactive
  const handleToggleStatus = async (item: RequirementItem) => {
    if (lock.current) return;
    lock.current = true;
    try {
      await adminToggleRequirementStatus(item.requirement_id);
      setNotice(`Requirement "${item.title}" is now ${item.is_active ? 'inactive (archived)' : 'active'}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle requirement status.');
    } finally {
      lock.current = false;
    }
  };

  // Move Up / Down
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (lock.current || reordering) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= requirements.length) return;

    lock.current = true;
    setReordering(true);
    const newItems = [...requirements];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    // Reassign order_index based on new sequence
    const payloadItems = newItems.map((item, idx) => ({
      requirement_id: item.requirement_id,
      order_index: idx + 1,
    }));

    try {
      await adminReorderRequirements(payloadItems);
      setRequirements(newItems.map((item, idx) => ({ ...item, order_index: idx + 1 })));
      setNotice('Display order updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder requirements.');
      await loadData();
    } finally {
      lock.current = false;
      setReordering(false);
    }
  };

  // Filtered requirements
  const filtered = requirements.filter(item => {
    const matchesSearch = [item.title, item.code, item.description || '', ...(item.accepted_document_types || [])]
      .join(' ')
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && item.is_active) ||
      (statusFilter === 'inactive' && !item.is_active);

    return matchesSearch && matchesStatus;
  });

  const totalCount = stats?.total_requirements ?? requirements.length;
  const activeCount = stats?.active_requirements ?? requirements.filter(r => r.is_active).length;
  const mandatoryCount = stats?.mandatory_requirements ?? requirements.filter(r => r.is_required).length;
  const conditionalCount = stats?.conditional_requirements ?? requirements.filter(r => r.is_conditional).length;

  return (
    <div className="space-y-6">
      {/* ── Page Header / Sub-banner ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Requirements Master Catalog</h2>
          <p className="mt-1 text-sm text-slate-500">
            Define, customize, and manage student enrollment requirements. The single source of truth for all learner categories.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={seeding || loading}
            title="Initialize standard DepEd ALS Birth Proof, School Records, and Valid ID requirements"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2 text-xs font-semibold text-blue-700 shadow-xs hover:bg-blue-100 disabled:opacity-50"
          >
            <Sparkles size={14} className={seeding ? 'animate-spin' : 'text-blue-600'} />
            {seeding ? 'Seeding...' : 'Seed ALS Defaults'}
          </button>
          <button
            type="button"
            onClick={() => {
              setNotice('');
              setEditing('new');
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Requirement
          </button>
        </div>
      </div>

      {/* ── Status Messages ── */}
      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 shadow-xs">
          <Check size={16} className="shrink-0 text-emerald-600" />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            className="ml-auto rounded-lg px-2 py-0.5 text-emerald-700 hover:bg-emerald-100 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 shadow-xs">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="ml-auto rounded-lg px-2 py-0.5 text-rose-700 hover:bg-rose-100 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Metric Highlights ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Defined</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{loading ? '—' : totalCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">In database catalog</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Active Checklists</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600">{loading ? '—' : activeCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">Visible to learners</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Mandatory</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-blue-600">{loading ? '—' : mandatoryCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">Required for enrollment</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Conditional / Assistance</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-amber-600">{loading ? '—' : conditionalCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">Alternative proof allowed</p>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
          <input
            type="search"
            aria-label="Search requirements"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, slug code, or document types..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Status:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All ({requirements.length})</option>
            <option value="active">Active Only ({activeCount})</option>
            <option value="inactive">Archived Only ({totalCount - activeCount})</option>
          </select>
        </div>
      </div>

      {/* ── Requirements List ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-14 text-center">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <p className="mt-3 text-xs font-medium text-slate-500">Loading requirements catalog…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FileCheck2 size={28} strokeWidth={1.5} />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-800">No requirements found</h3>
          <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
            {requirements.length === 0
              ? 'No requirements are configured yet. Initialize standard DepEd ALS requirements or create a custom one.'
              : 'No requirements match your search or status filter.'}
          </p>
          <div className="mt-5 flex gap-2">
            {requirements.length === 0 && (
              <button
                type="button"
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Sparkles size={14} />
                Seed DepEd ALS Defaults
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setEditing('new');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus size={14} />
              Add Custom Requirement
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === filtered.length - 1;

            return (
              <article
                key={item.requirement_id || item.code}
                className={`group relative rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                  item.is_active ? 'border-slate-200/90 bg-white hover:border-blue-200' : 'border-slate-200 bg-slate-50/60 opacity-80'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                        item.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-500'
                      }`}
                    >
                      <RequirementIcon id={item.code} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-600">
                          #{item.order_index ?? index + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono text-slate-500">
                          code: {item.code}
                        </span>
                        {item.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            <span className="size-1.5 rounded-full bg-slate-400" />
                            Archived / Inactive
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
                      )}

                      {/* Policy badges */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                            item.is_required
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.is_required ? 'Mandatory for enrollment' : 'Optional'}
                        </span>
                        {item.is_conditional && (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                            Conditional (alternative proof accepted)
                          </span>
                        )}
                        {item.allow_assistance && (
                          <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 border border-purple-200">
                            Teacher assistance allowed
                          </span>
                        )}
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                          Max 10 MB · PDF, JPG, PNG, WebP
                        </span>
                      </div>

                      {/* Accepted document variations */}
                      {item.accepted_document_types && item.accepted_document_types.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[11px] font-semibold text-slate-500">Accepted Document Variations:</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {item.accepted_document_types.map(docType => (
                              <span
                                key={docType}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700"
                              >
                                <Check size={11} className="text-blue-600" />
                                {docType}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Guidance excerpt */}
                      {item.guidance && (
                        <p className="mt-2.5 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-5 text-slate-500 border border-slate-100">
                          <span className="font-semibold text-slate-600">Guidance for learners: </span>
                          {item.guidance}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:self-start">
                    {/* Reordering */}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        disabled={isFirst || reordering}
                        onClick={() => handleMoveOrder(index, 'up')}
                        title="Move Up in checklist"
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={isLast || reordering}
                        onClick={() => handleMoveOrder(index, 'down')}
                        title="Move Down in checklist"
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    {/* Toggle status */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      title={item.is_active ? 'Click to archive' : 'Click to activate'}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                        item.is_active
                          ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {item.is_active ? 'Archive' : 'Activate'}
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setNotice('');
                        setEditing(item);
                      }}
                      title="Edit requirement"
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-blue-600 hover:bg-blue-50"
                    >
                      <Pencil size={15} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => {
                        setNotice('');
                        setError('');
                        setDeleting(item);
                      }}
                      title="Delete requirement"
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {editing && (
        <RequirementFormModal
          key={editing === 'new' ? 'new' : editing.requirement_id}
          initial={editing === 'new' ? null : editing}
          totalExisting={requirements.length}
          onClose={() => setEditing(null)}
          onSaved={savedItem => {
            setEditing(null);
            setNotice(
              editing === 'new'
                ? `Requirement "${savedItem.title}" created successfully.`
                : `Requirement "${savedItem.title}" updated successfully.`
            );
            void loadData();
          }}
        />
      )}

      {/* ── Delete / Archive Modal ── */}
      {deleting && (
        <RequirementDeleteModal
          key={deleting.requirement_id}
          item={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={mode => {
            setDeleting(null);
            setNotice(
              mode === 'permanent'
                ? `Requirement "${deleting.title}" permanently deleted.`
                : `Requirement "${deleting.title}" archived successfully.`
            );
            void loadData();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Modal Component (Create / Edit)
// ─────────────────────────────────────────────────────────────────────────────

function RequirementFormModal({
  initial,
  totalExisting,
  onClose,
  onSaved,
}: {
  initial: RequirementItem | null;
  totalExisting: number;
  onClose: () => void;
  onSaved: (item: RequirementItem) => void;
}) {
  const isEditing = Boolean(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [title, setTitle] = useState(initial?.title || '');
  const [code, setCode] = useState(initial?.code || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [guidance, setGuidance] = useState(initial?.guidance || '');
  const [documentTypes, setDocumentTypes] = useState<string[]>(initial?.accepted_document_types || []);
  const [newTypeInput, setNewTypeInput] = useState('');
  const [isRequired, setIsRequired] = useState(initial ? initial.is_required : true);
  const [isConditional, setIsConditional] = useState(initial ? initial.is_conditional : false);
  const [allowAssistance, setAllowAssistance] = useState(initial ? initial.allow_assistance : false);
  const [sampleDocumentUrl, setSampleDocumentUrl] = useState(initial?.sample_document_url || '');
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? totalExisting + 1);
  const [isActive, setIsActive] = useState(initial ? initial.is_active : true);

  const lock = useRef(false);

  // Auto-generate code from title if new
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing && !code) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setCode(slug);
    }
  };

  // Add document type tag
  const handleAddDocumentType = () => {
    const clean = newTypeInput.trim();
    if (!clean) return;
    if (documentTypes.some(t => t.toLowerCase() === clean.toLowerCase())) {
      setNewTypeInput('');
      return;
    }
    setDocumentTypes([...documentTypes, clean]);
    setNewTypeInput('');
  };

  const handleDocumentTypeKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDocumentType();
    }
  };

  const handleRemoveDocumentType = (typeToRemove: string) => {
    setDocumentTypes(documentTypes.filter(t => t !== typeToRemove));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (lock.current || pending) return;

    const cleanTitle = title.trim();
    const cleanCode = code.trim().toLowerCase();

    if (!cleanTitle) {
      setError('Title is required.');
      return;
    }
    if (!cleanCode) {
      setError('Unique slug code is required (e.g. birth, school, identity).');
      return;
    }
    if (documentTypes.length === 0) {
      setError('Please add at least one accepted document variation.');
      return;
    }

    lock.current = true;
    setPending(true);
    setError('');

    try {
      if (isEditing && initial) {
        const payload: RequirementUpdatePayload = {
          title: cleanTitle,
          code: cleanCode,
          description: description.trim() || undefined,
          guidance: guidance.trim() || undefined,
          accepted_document_types: documentTypes,
          is_required: isRequired,
          is_conditional: isConditional,
          allow_assistance: allowAssistance,
          sample_document_url: sampleDocumentUrl.trim() || undefined,
          order_index: Number(orderIndex) || 1,
          is_active: isActive,
        };
        const updated = await adminUpdateRequirement(initial.requirement_id, payload);
        onSaved(updated);
      } else {
        const payload: RequirementCreatePayload = {
          title: cleanTitle,
          code: cleanCode,
          description: description.trim() || undefined,
          guidance: guidance.trim() || undefined,
          accepted_document_types: documentTypes,
          is_required: isRequired,
          is_conditional: isConditional,
          allow_assistance: allowAssistance,
          sample_document_url: sampleDocumentUrl.trim() || undefined,
          order_index: Number(orderIndex) || 1,
          is_active: isActive,
        };
        const created = await adminCreateRequirement(payload);
        onSaved(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save requirement.');
    } finally {
      lock.current = false;
      setPending(false);
    }
  };

  const inputClass =
    'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50';

  return (
    <Modal title={isEditing ? 'Edit Requirement Definition' : 'Add New Student Requirement'} onClose={onClose} pending={pending}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title & Code */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-700">Requirement Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="e.g. Birth / date-of-birth proof"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Unique Slug Code *</label>
            <input
              type="text"
              required
              value={code}
              onChange={e => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              placeholder="e.g. birth, school, valid_id"
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-slate-700">Short Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Submit one accepted document showing your name and date of birth."
            className={inputClass}
          />
        </div>

        {/* Accepted Document Variations (Tag Manager) */}
        <div>
          <label className="text-xs font-semibold text-slate-700">Accepted Document Variations *</label>
          <p className="text-[11px] text-slate-400">Documents that satisfy this requirement (students choose one)</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {documentTypes.map(type => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800"
              >
                <span>{type}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDocumentType(type)}
                  className="rounded p-0.5 text-blue-500 hover:bg-blue-100 hover:text-blue-800"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newTypeInput}
              onChange={e => setNewTypeInput(e.target.value)}
              onKeyDown={handleDocumentTypeKeyDown}
              placeholder="Type document name (e.g. PSA Birth Certificate) and press Enter"
              className={`${inputClass} !mt-0 flex-1`}
            />
            <button
              type="button"
              onClick={handleAddDocumentType}
              disabled={!newTypeInput.trim()}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Guidance instructions */}
        <div>
          <label className="text-xs font-semibold text-slate-700">Learner Guidance & Instructions</label>
          <textarea
            rows={2}
            value={guidance}
            onChange={e => setGuidance(e.target.value)}
            placeholder="e.g. An accepted alternative completes this requirement. Ensure all corners are visible."
            className={inputClass}
          />
        </div>

        {/* Policy Checkboxes */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={e => setIsRequired(e.target.checked)}
              className="mt-0.5 size-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Mandatory requirement</span> — learner must submit this for completion.
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isConditional}
              onChange={e => setIsConditional(e.target.checked)}
              className="mt-0.5 size-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Conditional / Exemption Allowed</span> — learner can submit alternative proof.
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={allowAssistance}
              onChange={e => setAllowAssistance(e.target.checked)}
              className="mt-0.5 size-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Teacher Assistance Allowed</span> — students can trigger assistance requests.
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="mt-0.5 size-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Active status</span> — immediately visible on student enrollment checklists.
            </span>
          </label>
        </div>

        {/* Upload Policy & Display Order */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <span className="font-semibold text-slate-800">Upload Policy:</span> Standardized to 10 MB maximum size. Accepted formats: PDF, JPG, PNG, WebP.
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Display Order</label>
            <input
              type="number"
              min={1}
              value={orderIndex}
              onChange={e => setOrderIndex(Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        {/* Optional Template URL */}
        <div>
          <label className="text-xs font-semibold text-slate-700">Sample Document / Form Template URL (Optional)</label>
          <input
            type="url"
            value={sampleDocumentUrl}
            onChange={e => setSampleDocumentUrl(e.target.value)}
            placeholder="https://example.com/forms/deped-undertaking.pdf"
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-xs font-semibold text-rose-600">
            {error}
          </p>
        )}

        {/* Modal Actions */}
        <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            {pending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Requirement'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete / Archive Modal Component
// ─────────────────────────────────────────────────────────────────────────────

function RequirementDeleteModal({
  item,
  onClose,
  onDeleted,
}: {
  item: RequirementItem;
  onClose: () => void;
  onDeleted: (mode: 'archive' | 'permanent') => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  const handleAction = async (permanent: boolean) => {
    if (lock.current || pending) return;
    lock.current = true;
    setPending(true);
    setError('');

    try {
      await adminDeleteRequirement(item.requirement_id, permanent);
      onDeleted(permanent ? 'permanent' : 'archive');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete requirement.');
    } finally {
      lock.current = false;
      setPending(false);
    }
  };

  return (
    <Modal title={`Delete "${item.title}"?`} onClose={onClose} pending={pending}>
      <div className="space-y-4">
        <p className="text-xs leading-6 text-slate-600">
          How would you like to remove this requirement definition from the master catalog?
        </p>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          <div className="flex items-start gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">
              1
            </span>
            <div className="text-xs">
              <p className="font-semibold text-slate-800">Archive / Soft Deactivate (Recommended)</p>
              <p className="mt-0.5 text-slate-500">
                Immediately hides this requirement from new student enrollment checklists while safely preserving all historical learner files and review decisions.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 border-t border-slate-200/80 pt-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 text-xs font-bold">
              2
            </span>
            <div className="text-xs">
              <p className="font-semibold text-slate-800">Permanent Database Delete</p>
              <p className="mt-0.5 text-rose-600">
                Permanently wipes this requirement definition from the catalog. This cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs font-semibold text-rose-600">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleAction(false)}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {pending ? 'Processing...' : 'Archive Requirement'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleAction(true)}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {pending ? 'Processing...' : 'Permanently Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
