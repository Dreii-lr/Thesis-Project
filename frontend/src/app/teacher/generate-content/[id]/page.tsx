'use client';

import { useState, useEffect, use } from 'react';
import { JSONContent } from '@tiptap/react';
import DocumentSidebar from '@/src/components/layout/teacher/generate-content/ContentSidebar';
import ContentHeader from '@/src/components/layout/teacher/generate-content/ContentHeader';
import TiptapEditor from '@/src/components/ui/teacher/generate-content/TiptapEditor';
import { Edit2, Check, X } from 'lucide-react';
import { mockModules, ContentFile, LessonFolder } from '@/src/data/mockModules';
import { processTiptapImagesForCloudinary } from '@/src/utils/cloudinaryUpload';
import {
  getFileTiptapJson,
  tiptapJsonToParagraphs,
  buildDatabasePayload,
} from '@/src/utils/tiptapJsonHelpers';
import { notFound } from 'next/navigation';

export default function DocumentViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const moduleId = resolvedParams.id;
  const initialModuleData = mockModules.find((module) => module.id === moduleId);

  if (!initialModuleData) {
    return notFound();
  }

  const [lessons, setLessons] = useState<LessonFolder[]>(initialModuleData.lessons);

  const firstLesson = lessons[0];
  const firstFile = firstLesson?.files[0];

  const [activeFileId, setActiveFileId] = useState<string>(firstFile?.id || '');
  const [activeLesson, setActiveLesson] = useState<LessonFolder | null>(firstLesson || null);
  const [activeContent, setActiveContent] = useState<ContentFile | null>(firstFile || null);

  // Tiptap JSON Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftJson, setDraftJson] = useState<JSONContent | null>(null);

  useEffect(() => {
    for (const lesson of lessons) {
      const foundFile = lesson.files.find((file) => file.id === activeFileId);
      if (foundFile) {
        setActiveLesson(lesson);
        setActiveContent(foundFile);
        break;
      }
    }
  }, [activeFileId, lessons]);

  // Helper to sync and log/send the full Database JSON whenever changes occur
  const syncToDatabase = async (updatedLessons: LessonFolder[]) => {
    const dbPayload = buildDatabasePayload(initialModuleData, updatedLessons);
    console.log('JSON Payload ready for DB Insertion/Update:', dbPayload);

    // Example API call to save JSON to your backend database:
    // await fetch(`/api/modules/${initialModuleData.id}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(dbPayload),
    // });

    return dbPayload;
  };

  // Rename Main Topic (Folder) from Sidebar
  const handleRenameLesson = (lessonId: string, newTitle: string) => {
    setLessons((prevLessons) => {
      const nextLessons = prevLessons.map((lesson) =>
        lesson.id === lessonId ? { ...lesson, title: newTitle } : lesson
      );
      syncToDatabase(nextLessons);
      return nextLessons;
    });
  };

  // Rename Sub-Topic (File) from Sidebar
  const handleRenameFile = (lessonId: string, fileId: string, newTitle: string) => {
    setLessons((prevLessons) => {
      const nextLessons = prevLessons.map((lesson) => {
        if (lesson.id !== lessonId) return lesson;

        const updatedFiles = lesson.files.map((file) =>
          file.id === fileId ? { ...file, title: newTitle } : file
        );

        return {
          ...lesson,
          sub_topics: updatedFiles.map((f) => f.title),
          files: updatedFiles,
        };
      });
      syncToDatabase(nextLessons);
      return nextLessons;
    });
  };

  const handleStartEdit = () => {
    if (!activeContent) return;
    // Feed the current file's Tiptap JSON into draft state
    setDraftJson(getFileTiptapJson(activeContent));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftJson(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
  if (!activeLesson || !activeContent || !draftJson) return;

  try {
    setIsSaving(true);

    // 1. Extract bytes from any newly inserted images in Tiptap & upload to Cloudinary
    const cleanJsonWithCloudinaryUrls = await processTiptapImagesForCloudinary(draftJson);

    // 2. Update state and send the clean JSON to your database
    setLessons((prevLessons) => {
      const nextLessons = prevLessons.map((lesson) => {
        if (lesson.id !== activeLesson.id) return lesson;

        return {
          ...lesson,
          files: lesson.files.map((file) =>
            file.id === activeContent.id
              ? {
                  ...file,
                  contentJson: cleanJsonWithCloudinaryUrls,
                  paragraphs: tiptapJsonToParagraphs(cleanJsonWithCloudinaryUrls),
                }
              : file
          ),
        };
      });

      syncToDatabase(nextLessons);
      return nextLessons;
    });

    setIsEditing(false);
  } catch (error) {
    console.error('Error uploading images or saving content:', error);
    alert('Failed to upload image to Cloudinary. Check your console/credentials.');
  } finally {
    setIsSaving(false);
  }
};

  

  // Optional: Download or inspect the full JSON file for DB insertion
  const handleExportDatabaseJson = () => {
    const dbPayload = buildDatabasePayload(initialModuleData, lessons);
    const blob = new Blob([JSON.stringify(dbPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${initialModuleData.id}-db-payload.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen overflow-hidden">
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <DocumentSidebar
          lessons={lessons}
          activeFileId={activeFileId}
          onFileSelect={(fileId) => {
            setActiveFileId(fileId);
            setIsEditing(false);
          }}
          onRenameLesson={handleRenameLesson}
          onRenameFile={handleRenameFile}
        />

        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/50">
          {activeContent && activeLesson ? (
            <>
              <ContentHeader onExportDatabaseJson={handleExportDatabaseJson} />

              <article className="min-h-0 flex-1 overflow-y-auto bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-8 sm:py-8 lg:px-10">
                <div className="mb-7 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="mb-1.5 text-[12px] font-medium text-blue-600">
                      {activeLesson.title}
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 lg:text-[28px]">
                      {activeContent.title}
                    </h1>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-start">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleCancelEdit}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-600 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[12px] font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Check size={14} />
                          {isSaving ? 'Uploading & Saving...' : 'Save Changes'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleStartEdit}
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Edit2 size={14} className="text-slate-400" />
                        Edit Content
                      </button>
                    )}
                  </div>
                </div>

                {/* Both Edit Mode and Read-Only Mode are powered directly by Tiptap JSON */}
                <TiptapEditor
                  content={isEditing && draftJson ? draftJson : getFileTiptapJson(activeContent)}
                  editable={isEditing}
                  onChange={(updatedJson) => setDraftJson(updatedJson)}
                />
              </article>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-400">
              Select a file from the outline to view content.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}