// src/components/ui/teacher/lesson-content/TiptapEditor.tsx
"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { ResizableImage } from "@/src/components/ui/teacher/lesson-content/ResizableImageExtension";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading2,
  ImagePlus,
  Link2,
  Undo,
  Redo,
} from "lucide-react";

interface TiptapEditorProps {
  content: JSONContent;
  editable?: boolean;
  onChange?: (json: JSONContent) => void;
  onImageUpload?: (file: File) => Promise<string>;
}

export default function TiptapEditor({
  content,
  editable = true,
  onChange,
  onImageUpload,
}: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${
          editable
            ? "min-h-[300px] rounded-b-xl px-5 py-4"
            : "min-h-0 px-0 py-0"
        } w-full bg-white text-[14px] leading-7 text-slate-700 focus:outline-none sm:text-[15px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_p]:mb-4`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  useEffect(() => {
    if (editor && content) {
      const currentJson = JSON.stringify(editor.getJSON());
      const incomingJson = JSON.stringify(content);
      if (currentJson !== incomingJson) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  if (!editor) return null;

  // Aligns either the selected image OR the current paragraph/heading
  const handleAlignment = (
    alignment: "left" | "center" | "right" | "justify",
  ) => {
    if (editor.isActive("image")) {
      if (alignment !== "justify") {
        editor
          .chain()
          .focus()
          .updateAttributes("image", { align: alignment })
          .run();
      }
    } else {
      editor.chain().focus().setTextAlign(alignment).run();
    }
  };

  const isAlignmentActive = (
    alignment: "left" | "center" | "right" | "justify",
  ) => {
    if (editor.isActive("image")) {
      return editor.getAttributes("image").align === alignment;
    }
    return editor.isActive({ textAlign: alignment });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (onImageUpload) {
        const uploadedUrl = await onImageUpload(file);
        editor
          .chain()
          .focus()
          .setImage({ src: uploadedUrl, alt: file.name })
          .run();
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            editor
              .chain()
              .focus()
              .setImage({ src: reader.result, alt: file.name })
              .run();
          }
        };
        reader.readAsDataURL(file);
      }
    } finally {
      e.target.value = "";
    }
  };

  const handleAddImageUrl = () => {
    const url = window.prompt("Enter image URL:");
    if (url && url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
    }
  };

  const btnClass = (isActive: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
      isActive
        ? "bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-200"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
    }`;

  if (!editable) {
    return <EditorContent editor={editor} />;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border-b border-slate-200 bg-slate-50/80 px-2.5 py-1.5">
        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive("bold"))}
          title="Bold"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive("italic"))}
          title="Italic"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btnClass(editor.isActive("underline"))}
          title="Underline"
        >
          <UnderlineIcon size={15} />
        </button>

        <div className="mx-1 h-4 w-[1px] bg-slate-200" />

        {/* Alignment (Works for both Text and Selected Image) */}
        <button
          type="button"
          onClick={() => handleAlignment("left")}
          className={btnClass(isAlignmentActive("left"))}
          title="Align Left"
        >
          <AlignLeft size={15} />
        </button>
        <button
          type="button"
          onClick={() => handleAlignment("center")}
          className={btnClass(isAlignmentActive("center"))}
          title="Align Center"
        >
          <AlignCenter size={15} />
        </button>
        <button
          type="button"
          onClick={() => handleAlignment("right")}
          className={btnClass(isAlignmentActive("right"))}
          title="Align Right"
        >
          <AlignRight size={15} />
        </button>
        <button
          type="button"
          onClick={() => handleAlignment("justify")}
          className={btnClass(isAlignmentActive("justify"))}
          title="Justify Text"
        >
          <AlignJustify size={15} />
        </button>

        <div className="mx-1 h-4 w-[1px] bg-slate-200" />

        {/* Headings & Lists */}
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={btnClass(editor.isActive("heading", { level: 2 }))}
          title="Heading"
        >
          <Heading2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive("bulletList"))}
          title="Bullet List"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive("orderedList"))}
          title="Numbered List"
        >
          <ListOrdered size={15} />
        </button>

        <div className="mx-1 h-4 w-[1px] bg-slate-200" />

        {/* Image Controls */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={btnClass(false)}
          title="Upload Image from Computer"
        >
          <ImagePlus size={15} />
        </button>
        <button
          type="button"
          onClick={handleAddImageUrl}
          className={btnClass(false)}
          title="Insert Image URL"
        >
          <Link2 size={15} />
        </button>

        <div className="mx-1 h-4 w-[1px] bg-slate-200" />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
          title="Undo"
        >
          <Undo size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
          title="Redo"
        >
          <Redo size={15} />
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
