// src/utils/tiptapJsonHelpers.ts
import { JSONContent } from '@tiptap/react';
import { ContentFile, LessonFolder, Module } from '@/src/data/mockModules';

/**
 * Feeds Tiptap: Returns `file.contentJson` if already stored in DB,
 * or converts `file.paragraphs` into Tiptap's JSONContent format.
 */
export function getFileTiptapJson(file: ContentFile & { contentJson?: JSONContent }): JSONContent {
  if (file.contentJson && file.contentJson.type === 'doc') {
    return file.contentJson;
  }

  return {
    type: 'doc',
    content: file.paragraphs.map((text) => ({
      type: 'paragraph',
      content: text ? [{ type: 'text', text }] : [],
    })),
  };
}

/**
 * Extracts plain-text paragraphs from Tiptap JSONContent for backwards compatibility
 */
export function tiptapJsonToParagraphs(json: JSONContent): string[] {
  if (!json.content) return [];
  return json.content
    .map((node) =>
      node.content
        ?.map((child) => child.text || '')
        .join('') || ''
    )
    .filter(Boolean);
}

/**
 * Builds the complete JSON payload matching your database schema
 * for insertion, retrieval, and future modification.
 */
export function buildDatabasePayload(moduleData: Module, lessons: LessonFolder[]) {
  return {
    document_id: moduleData.id,
    materials_id: moduleData.materials_id ?? null,
    user_id: moduleData.user_id ?? null,
    filename: moduleData.filename ?? null,
    storage_url: moduleData.storage_url ?? null,
    storage_key: moduleData.storage_key ?? null,
    learner_name: moduleData.learner_name ?? null,
    cls_name: moduleData.cls_name ?? null,
    als_program: moduleData.als_program ?? null,
    learning_strand: moduleData.learning_strand ?? null,
    main_learning_goal: moduleData.main_learning_goal ?? null,
    records: lessons.map((lesson) => ({
      main_topic: lesson.title,
      sub_topics: lesson.files.map((f) => f.title),
      recognize_competencies: lesson.recognize_competencies ?? null,
      delivery_mode: lesson.delivery_mode ?? null,
      duration: lesson.duration ?? null,
      expected_output: lesson.expected_output ?? null,
      start_date: lesson.start_date ?? null,
      finished_date: lesson.finished_date ?? null,
      status: lesson.status ?? null,
      // Stores each sub-topic's Tiptap JSON so it can be retrieved & modified later
      sub_topic_contents: lesson.files.map((file) => ({
        id: file.id,
        title: file.title,
        tiptap_json: getFileTiptapJson(file),
        paragraphs: file.paragraphs,
      })),
    })),
  };
}