"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  Download,
  Eye,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Modal from "@/src/components/ui/Modal";
import {
  getMaterials,
  DocumentServiceError,
  parseModuleDocument,
  type MaterialItem,
  type StructuresProcessedLessons,
} from "@/src/lib/document-processor-api";
import type { UserCategoryItem } from "@/src/lib/user-categories-api";
import { programMatches, validateIlaFile } from "@/src/lib/lesson-workflow";

export default function IlaUploadModal({
  category,
  onClose,
  onUploaded,
}: {
  category: UserCategoryItem;
  onClose: () => void;
  onUploaded: (result: { filename: string; isExisting: boolean }) => void;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [preview, setPreview] = useState(false);
  const [parsed, setParsed] = useState<StructuresProcessedLessons | null>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [materialId, setMaterialId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploadUncertain, setUploadUncertain] = useState(false);
  const [dragging, setDragging] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const reviewLock = useRef(false);

  const objectUrl = useRef("");
  useEffect(
    () => () => {
      controller.current?.abort();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  function choose(candidate?: File) {
    if (!candidate || busy) return;
    const issue = validateIlaFile(candidate);
    setError(issue || "");
    if (issue) return;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(candidate);
    setFileUrl(objectUrl.current);
    setFile(candidate);
    setParsed(null);
    setMaterials([]);
    setMaterialId("");
    setPreview(false);
    setUploadUncertain(false);
  }

  async function review() {
    if (!file || busy || uploadUncertain || reviewLock.current) return;
    reviewLock.current = true;
    setPreview(true);
    setBusy(true);
    setError("");
    const abort = new AbortController();
    controller.current = abort;
    let uploadConfirmed = Boolean(parsed);
    try {
      const result =
        parsed || (await parseModuleDocument(file, { signal: abort.signal }));
      setParsed(result);
      uploadConfirmed = true;
      if (!parsed)
        onUploaded({
          filename: result.filename || file.name,
          isExisting: Boolean(result.is_existing),
        });
      // The parser can return one material ID or a document containing several strands.
      const items = result.document_id
        ? await getMaterials({
            documentId: result.document_id,
            pageSize: 100,
            signal: abort.signal,
          })
        : [];
      setMaterials(items);
      const first = items.find((item) =>
        programMatches(item.als_program, category),
      );
      setMaterialId(first?.id || result.materials_id || "");
      if (!items.length && !result.materials_id)
        throw new Error(
          "The document was uploaded, but no curriculum material was returned. Refresh the dashboard to review it.",
        );
    } catch (err) {
      if (!abort.signal.aborted) {
        const uncertain =
          !uploadConfirmed &&
          err instanceof DocumentServiceError &&
          err.outcomeUnknown;
        if (uncertain) setUploadUncertain(true);
        setError(
          uncertain
            ? "The upload could not be confirmed. The document may already be saved. Close this window and refresh the module library before uploading it again."
            : err instanceof Error
              ? err.message
              : "Could not review the document.",
        );
      }
    } finally {
      reviewLock.current = false;
      if (!abort.signal.aborted) setBusy(false);
    }
  }

  const selected = materials.find((item) => item.id === materialId);
  const program = selected?.als_program || parsed?.als_program;
  const mismatch = Boolean(parsed && !programMatches(program, category));
  const records = selected?.structured_records || parsed?.records || [];
  const goal = selected?.main_learning_goal || parsed?.main_learning_goal;

  return (
    <Modal title="Upload an ALS ILA document" onClose={onClose} pending={busy}>
      <p className="-mt-2 mb-5 text-sm leading-6 text-slate-500">
        {category.name} · Review your source document, then prepare a lesson
        draft.
      </p>
      <ol
        aria-label="Upload progress"
        className="mb-6 flex items-center gap-3 text-xs font-semibold"
      >
        {["Upload", "Review", "Draft"].map((label, index) => (
          <li
            key={label}
            className={`flex items-center gap-2 ${index === (parsed ? 1 : 0) ? "text-blue-700" : "text-slate-400"}`}
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-slate-100">
              {index === 0 && parsed ? <Check size={12} /> : index + 1}
            </span>
            {label}
            {index < 2 && <ArrowRight size={12} />}
          </li>
        ))}
      </ol>
      {!file ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (event.dataTransfer.files.length !== 1) {
              setError("Upload one ILA document at a time.");
              return;
            }
            choose(event.dataTransfer.files[0]);
          }}
          className={`flex w-full flex-col items-center rounded-2xl border-2 border-dashed p-9 text-center transition ${dragging ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-400"}`}
        >
          <span className="mb-4 rounded-2xl bg-white p-4 text-blue-600 shadow-sm">
            <UploadCloud size={28} />
          </span>
          <span className="font-semibold text-slate-800">
            Drop your ILA document here
          </span>
          <span className="mt-1 text-sm text-slate-500">
            or click to browse files
          </span>
          <span className="mt-4 text-xs text-slate-400">
            PDF, DOCX, PNG, JPG · Up to 50 MB
          </span>
        </button>
      ) : (
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <FileText className="shrink-0 text-blue-600" size={25} />
            <div className="min-w-0">
              <p className="break-all text-sm font-semibold">{file.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {file.size < 1024 * 1024
                  ? `${Math.max(1, Math.ceil(file.size / 1024))} KB`
                  : `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                {parsed?.is_existing ? " · Previously uploaded document" : ""}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <button
              disabled={busy || uploadUncertain}
              onClick={review}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-blue-700 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Eye size={14} />
              )}
              {busy ? "Extracting curriculum…" : "Preview & review"}
            </button>
            <a
              href={fileUrl}
              download={file.name}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2"
            >
              <Download size={14} />
              Download
            </a>
            <button
              disabled={busy}
              onClick={() => {
                setFile(null);
                setFileUrl("");
                URL.revokeObjectURL(objectUrl.current);
                objectUrl.current = "";
                setParsed(null);
                setPreview(false);
                setError("");
                setUploadUncertain(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-rose-600 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Remove
            </button>
          </div>
          {parsed && (
            <p className="mt-3 text-xs text-slate-500">
              The uploaded document is saved in your library. Removing it here
              only clears this selection.
            </p>
          )}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {preview && file && (
        <div className="mt-5 space-y-4">
          {/\.(pdf|png|jpe?g)$/i.test(file.name) ? (
            <iframe
              title={`Source document: ${file.name}`}
              src={fileUrl}
              sandbox=""
              className="h-60 w-full rounded-xl border border-slate-200 bg-slate-50"
            />
          ) : (
            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              Review the extracted DOCX curriculum below, or download the
              original to view its layout.
            </p>
          )}
          {materials.length > 1 && (
            <label className="block text-xs font-semibold">
              Curriculum material
              <select
                value={materialId}
                onChange={(event) => setMaterialId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm"
              >
                {materials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.learning_strand || item.main_learning_goal || item.id}{" "}
                    · {item.als_program}
                  </option>
                ))}
              </select>
            </label>
          )}
          {goal && (
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Learning goal
              </p>
              <p className="mt-2 text-sm text-blue-950">{goal}</p>
            </div>
          )}
          {parsed && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <BookOpen size={16} />
                Digitized lessons & topics ({records.length})
              </h3>
              <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                {records.map((record, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <h4 className="text-sm font-semibold">
                      {record.main_topic || `Lesson ${index + 1}`}
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {record.sub_topics?.map((topic, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-white px-2 py-1 text-xs text-slate-600"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {[
                        record.delivery_mode,
                        record.duration,
                        record.expected_output,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Flexible duration"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      {mismatch && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
        >
          This document belongs to {program || "an unidentified program"}.
          Choose a document for {category.name}, or open its program dashboard.
        </p>
      )}
      {parsed && !busy && !records.length && !error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-6 text-amber-800"
        >
          No lesson topics were extracted. Choose an ILA document with
          curriculum topics before continuing to a draft.
        </p>
      )}
      {parsed && !busy && records.length > 0 && !error && !mismatch && (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-6 text-blue-800"
        >
          <Check size={15} className="mt-1 shrink-0" />
          {parsed.is_existing
            ? "Existing curriculum loaded."
            : "Upload complete."}{" "}
          {records.length} {records.length === 1 ? "topic is" : "topics are"}{" "}
          ready for your review.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-5">
        <button
          disabled={busy}
          onClick={onClose}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 disabled:opacity-50"
        >
          Close
        </button>
        {!parsed ? (
          <button
            disabled={!file || busy || uploadUncertain}
            onClick={review}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Review document
          </button>
        ) : (
          <button
            disabled={
              busy ||
              !materialId ||
              !records.length ||
              mismatch ||
              Boolean(error)
            }
            onClick={() =>
              router.push(
                `/teacher/lesson-content/${encodeURIComponent(materialId)}?program=${encodeURIComponent(category.code.toLowerCase())}`,
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Continue to draft
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </Modal>
  );
}
