"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useOptionalAuth } from "@/src/context/AuthContext";
import {
  DocumentServiceError,
  generateLessonForMaterial,
  getLessonsByMaterial,
  type GeneratedLessonItem,
  type MaterialItem,
} from "./document-processor-api";

type Phase =
  | "checking"
  | "idle"
  | "processing"
  | "partial"
  | "ready"
  | "failed"
  | "unknown";
export interface LessonGenerationState {
  phase: Phase;
  pending: boolean;
  lessons: GeneratedLessonItem[];
  completed: number;
  total: number;
  message: string;
  subjectId?: string;
}
interface Attempt {
  startedAt: number;
  subjectId: string;
  failed?: boolean;
}
interface Entry {
  material: MaterialItem;
  owner: string;
  state: LessonGenerationState;
  attempt: Attempt | null;
  request?: Promise<void>;
  read?: Promise<LessonGenerationState>;
  timer?: ReturnType<typeof setTimeout>;
  watchers: number;
  checks: number;
  deleted: boolean;
  verifiedTopics?: string;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const PREFIX = "als-lesson-generation:v1:";
const MAX_CHECKS = 60;
function key(owner: string, id: string) {
  return `${PREFIX}${encodeURIComponent(owner)}:${encodeURIComponent(id)}`;
}
function notify() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readAttempt(owner: string, id: string): Attempt | null {
  try {
    const value = JSON.parse(localStorage.getItem(key(owner, id)) || "null");
    return value &&
      Number.isFinite(value.startedAt) &&
      typeof value.subjectId === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
function saveAttempt(entry: Entry) {
  try {
    const storageKey = key(entry.owner, entry.material.id);
    if (entry.attempt)
      localStorage.setItem(storageKey, JSON.stringify(entry.attempt));
    else localStorage.removeItem(storageKey);
  } catch {
    /* Same-page monitoring still works when storage is unavailable. */
  }
}

export function normalizeLessonTopic(value?: string | null) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/^\d+\.\s*/, "")
    .replace(/[:.,;]+$/, "")
    .trim();
}
export function lessonMatchesTopic(lesson: GeneratedLessonItem, topic: string) {
  const normalized = normalizeLessonTopic(topic);
  return Boolean(
    normalized &&
    (normalizeLessonTopic(lesson.main_topic) === normalized ||
      normalizeLessonTopic(lesson.lesson_title) === normalized),
  );
}
function ensure(owner: string, material: MaterialItem): Entry {
  const storageKey = key(owner, material.id);
  let entry = entries.get(storageKey);
  if (!entry) {
    const attempt = readAttempt(owner, material.id);
    entry = {
      material,
      owner,
      attempt,
      watchers: 0,
      checks: 0,
      deleted: false,
      state: {
        phase: "checking",
        pending: Boolean(attempt && !attempt.failed),
        lessons: [],
        total: material.structured_records.length,
        completed: 0,
        subjectId: attempt?.subjectId,
        message: "Checking saved lesson content…",
      },
    };
    entries.set(storageKey, entry);
  }
  entry.material = material;
  return entry;
}
function update(entry: Entry, patch: Partial<LessonGenerationState>) {
  if (entry.deleted) return;
  entry.state = { ...entry.state, ...patch };
  notify();
}
function topicKey(material: MaterialItem) {
  return JSON.stringify(
    material.structured_records.map((topic) =>
      normalizeLessonTopic(topic.main_topic),
    ),
  );
}
function canCheckAutomatically() {
  return (
    (typeof document === "undefined" || document.visibilityState !== "hidden") &&
    (typeof navigator === "undefined" || navigator.onLine !== false)
  );
}
function schedule(entry: Entry) {
  clearTimeout(entry.timer);
  if (
    !entry.watchers ||
    !entry.state.pending ||
    entry.deleted ||
    !canCheckAutomatically() ||
    entry.checks >= MAX_CHECKS
  )
    return;
  entry.timer = setTimeout(() => {
    if (entry.watchers && entry.state.pending && !entry.deleted)
      void checkLessonGeneration(entry.owner, entry.material, { automatic: true });
  }, Math.min(30000, 4000 * 2 ** Math.floor(entry.checks / 5)));
}

export async function checkLessonGeneration(
  owner: string,
  material: MaterialItem,
  { automatic = false }: { automatic?: boolean } = {},
): Promise<LessonGenerationState> {
  const entry = ensure(owner, material);
  // Explicit refreshes still fetch edited content. Lifecycle checks reuse only
  // fully verified results for the same set of topics.
  if (
    entry.deleted ||
    (automatic &&
      (!canCheckAutomatically() ||
        (entry.state.phase === "ready" &&
          !entry.attempt &&
          entry.verifiedTopics === topicKey(material))))
  )
    return entry.state;
  if (entry.read) return entry.read;
  const read = (async () => {
    try {
      const response = await getLessonsByMaterial(material.id, {
        timeoutMs: 8000,
      });
      if (entry.deleted) return entry.state;
      const lessons = response.lessons.filter(
        (lesson) => lesson.material_id === material.id,
      );
      const completed = entry.material.structured_records.filter((topic) =>
        lessons.some(
          (lesson) =>
            lesson.content && lessonMatchesTopic(lesson, topic.main_topic),
        ),
      ).length;
      const total = entry.material.structured_records.length;
      if (total > 0 && completed === total) {
        entry.verifiedTopics = topicKey(entry.material);
        entry.attempt = null;
        saveAttempt(entry);
        update(entry, {
          phase: "ready",
          pending: false,
          lessons,
          completed,
          total,
          message: "Lesson content is ready to review.",
        });
      } else if (entry.request) {
        update(entry, {
          phase: "processing",
          pending: true,
          lessons,
          completed,
          total,
          message:
            "Generating lesson content. You can return to the module dashboard.",
        });
      } else if (entry.attempt && !entry.attempt.failed) {
        update(entry, {
          phase: entry.checks >= MAX_CHECKS ? "unknown" : "checking",
          pending: true,
          lessons,
          completed,
          total,
          message:
            "Checking saved results from your earlier request. The service cannot confirm whether that request is still running. A new generation will not be started automatically.",
        });
      } else {
        update(entry, {
          phase: entry.attempt?.failed
            ? "failed"
            : completed
              ? "partial"
              : "idle",
          pending: false,
          lessons,
          completed,
          total,
          message: entry.attempt?.failed
            ? entry.state.phase === "failed"
              ? entry.state.message
              : "The generation request failed. Saved content is still available; review it before retrying."
            : completed
              ? "Some topics have saved content. Review them before generating again."
              : "No saved lesson content yet.",
        });
      }
    } catch (error) {
      // Retain the last verified content. An unavailable read is never an empty lesson list.
      update(entry, {
        phase: "unknown",
        message:
          error instanceof Error
            ? error.message
            : "Saved content could not be checked. Please try again.",
      });
    } finally {
      entry.checks += 1;
      if (entry.checks >= MAX_CHECKS && entry.state.pending && !entry.request)
        update(entry, {
          phase: "unknown",
          message:
            "Automatic checking has paused. The service cannot confirm this request's status. Use Check progress to look for saved results.",
        });
      schedule(entry);
    }
    return entry.state;
  })();
  const tracked = read.finally(() => {
    if (entry.read === tracked) entry.read = undefined;
  });
  entry.read = tracked;
  return tracked;
}

export async function startLessonGeneration(
  owner: string,
  material: MaterialItem,
  subjectId = "",
): Promise<void> {
  const entry = ensure(owner, material);
  if (!owner)
    throw new Error("Sign in again before generating lesson content.");
  if (
    entry.request ||
    entry.state.pending ||
    entry.state.phase === "unknown" ||
    entry.state.phase === "checking"
  )
    throw new Error(
      "Check the existing generation request before starting another.",
    );
  if (entry.state.phase === "ready") return;
  let surfacedError: Error | null = null;
  const run = async () => {
    // Recheck storage after acquiring the browser lock to cover other tabs.
    const existing = readAttempt(owner, material.id);
    if (existing && !existing.failed)
      throw new Error(
        "This module already has a generation request. Check its progress instead.",
      );
    entry.attempt = { startedAt: Date.now(), subjectId };
    entry.checks = 0;
    saveAttempt(entry);
    update(entry, {
      phase: "processing",
      pending: true,
      subjectId,
      message: "Generating lesson content…",
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);
    try {
      await generateLessonForMaterial(material.id, {
        signal: controller.signal,
      });
      if (controller.signal.aborted)
        throw new Error(
          "The generation connection ended before completion could be verified.",
        );
      // An HTTP success can arrive before the transaction is visible to GETs.
      // Only verified saved lessons may clear the pending attempt.
    } catch (error) {
      // Saved content can be verified while the POST connection is still open.
      // A later connection error must not undo that confirmed result.
      if (entry.deleted || (entry.state.phase === "ready" && !entry.attempt))
        return;
      // When the backend returns 409 Conflict (e.g., another module is currently
      // generating content), clear the attempt so this module stays idle and
      // surface the backend message to the user.
      if (error instanceof DocumentServiceError && error.status === 409) {
        entry.attempt = null;
        saveAttempt(entry);
        const msg =
          error.message ||
          "Lesson content generation is currently in progress. Please wait for the generation of content to finish.";
        update(entry, {
          phase: "idle",
          pending: false,
          message: msg,
        });
        surfacedError = new Error(msg);
        return;
      }
      // A network disconnect is ambiguous. Only an explicit rejection marks a
      // failed request; never automatically issue another potentially paid POST.
      const rejected =
        error instanceof DocumentServiceError &&
        error.status >= 400 &&
        error.status < 500;
      if (rejected && entry.attempt) entry.attempt.failed = true;
      saveAttempt(entry);
      const msg =
        error instanceof Error
          ? error.message
          : "Generation could not be verified.";
      update(entry, {
        phase: rejected ? "failed" : "unknown",
        pending: !rejected,
        message: msg,
      });
      if (rejected) {
        surfacedError = new Error(msg);
      }
    } finally {
      clearTimeout(timeout);
    }
  };
  const request = Promise.resolve(
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request(
          key(owner, material.id),
          { ifAvailable: true },
          async (lock) => {
            if (!lock)
              throw new Error("Generation is already running in another tab.");
            await run();
          },
        )
      : run(),
  );
  const tracked = request.finally(async () => {
    // A poll started before the POST completed may contain an older snapshot.
    // Let it settle, then verify unless saved content is already confirmed ready.
    if (entry.read) await entry.read;
    if (entry.request === tracked) entry.request = undefined;
    if (!entry.deleted) {
      await checkLessonGeneration(owner, entry.material, { automatic: true });
    }
  });
  entry.request = tracked;
  schedule(entry);
  await tracked;
  if (surfacedError) throw surfacedError;
}

export function forgetLessonGeneration(owner: string, materialId: string) {
  const entry = entries.get(key(owner, materialId));
  if (entry) {
    entry.deleted = true;
    clearTimeout(entry.timer);
    entry.attempt = null;
    saveAttempt(entry);
    entries.delete(key(owner, materialId));
    notify();
  }
}
export function hasPendingLessonGeneration(
  owner: string,
  material: MaterialItem,
) {
  const entry = entries.get(key(owner, material.id));
  const attempt = entry?.attempt || readAttempt(owner, material.id);
  return Boolean(entry?.request || (attempt && !attempt.failed));
}

export function isLessonGenerationActive(
  owner: string,
  material: MaterialItem,
) {
  return Boolean(entries.get(key(owner, material.id))?.request);
}

export function useLessonGeneration(
  material: MaterialItem | null,
  observeOnly = false,
) {
  const user = useOptionalAuth()?.user;
  const owner = String(user?.user_id || user?.id || "");
  const state = useSyncExternalStore(
    subscribe,
    () => (owner && material ? ensure(owner, material).state : null),
    () => null,
  );
  useEffect(() => {
    if (!owner || !material) return;
    const entry = ensure(owner, material);
    entry.watchers += 1;
    if (
      !observeOnly ||
      entry.attempt ||
      entry.request ||
      entry.state.phase !== "checking"
    )
      void checkLessonGeneration(owner, material, { automatic: true });
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== key(owner, material.id)) return;
      entry.attempt = readAttempt(owner, material.id);
      entry.checks = 0;
      void checkLessonGeneration(owner, material, { automatic: true });
    };
    const reconnect = () => {
      if (!canCheckAutomatically()) {
        clearTimeout(entry.timer);
        return;
      }
      if (
        !entry.state.pending &&
        !entry.attempt &&
        entry.state.phase !== "checking" &&
        entry.state.phase !== "unknown" &&
        (entry.state.phase !== "ready" ||
          entry.verifiedTopics === topicKey(entry.material))
      )
        return;
      if (entry.checks >= MAX_CHECKS) entry.checks = 0;
      void checkLessonGeneration(owner, entry.material, { automatic: true });
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", reconnect);
    window.addEventListener("focus", reconnect);
    document.addEventListener("visibilitychange", reconnect);
    return () => {
      entry.watchers -= 1;
      if (!entry.watchers) clearTimeout(entry.timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", reconnect);
      window.removeEventListener("focus", reconnect);
      document.removeEventListener("visibilitychange", reconnect);
      // The shared generation POST belongs to the workflow, not this page.
    };
  }, [owner, material, observeOnly]);
  return { owner, state };
}
