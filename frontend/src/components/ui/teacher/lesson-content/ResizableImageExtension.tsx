// src/components/ui/teacher/lesson-content/ResizableImageExtension.tsx
'use client';

import { useState, useRef } from 'react';
import Image from '@tiptap/extension-image';
import {
  NodeViewWrapper,
  NodeViewProps,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

function ResizableImageNodeView({
  node,
  updateAttributes,
  selected,
  editor,
  deleteNode,
  getPos,
}: NodeViewProps) {
  const { src, alt, title, width = '60%', align = 'center' } = node.attrs;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const isEditable = editor.isEditable;

  // Reliable horizontal alignment inside Tiptap NodeView
  const alignmentMarginClass =
    align === 'left'
      ? 'mr-auto ml-0'
      : align === 'right'
      ? 'ml-auto mr-0'
      : 'mx-auto';

  const moveImagePosition = (direction: 'up' | 'down') => {
    if (typeof getPos !== 'function') return;
    const pos = getPos();
    if (typeof pos !== 'number') return;

    const { state, dispatch } = editor.view;
    const { doc, tr } = state;
    const $pos = doc.resolve(pos);
    const index = $pos.index(0);

    if (direction === 'up' && index > 0) {
      const prevNode = doc.child(index - 1);
      const targetPos = pos - prevNode.nodeSize;
      tr.delete(pos, pos + node.nodeSize);
      tr.insert(targetPos, node);
      dispatch(tr.scrollIntoView());
    } else if (direction === 'down' && index < doc.childCount - 1) {
      const nextNode = doc.child(index + 1);
      const targetPos = pos + nextNode.nodeSize;
      tr.delete(pos, pos + node.nodeSize);
      tr.insert(targetPos, node);
      dispatch(tr.scrollIntoView());
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imgRef.current) return;

    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = imgRef.current.clientWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(120, startWidth + deltaX);
      updateAttributes({ width: `${newWidth}px` });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <NodeViewWrapper
      as="div"
      className="my-5 block w-full"
      data-drag-image-wrapper
    >
      <div
        className={`group relative block max-w-full transition-all ${alignmentMarginClass} ${
          isEditable && (selected || isResizing)
            ? 'rounded-xl ring-2 ring-blue-500 ring-offset-2'
            : ''
        }`}
        style={{ width }}
      >
        {/* Floating Image Toolbar (w-max prevents squishing on small images) */}
        {isEditable && (
          <div
            className={`absolute -top-12 left-1/2 z-30 flex w-max -translate-x-1/2 items-center gap-0.5 rounded-xl border border-slate-200 bg-white/95 px-2 py-1 shadow-md backdrop-blur-xs transition-opacity ${
              selected
                ? 'opacity-100'
                : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'
            }`}
          >
            <div
              data-drag-handle
              className="flex cursor-grab items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
              title="Drag to move image position"
            >
              <GripVertical size={14} />
            </div>

            <button
              type="button"
              onClick={() => moveImagePosition('up')}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title="Move Image Up"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => moveImagePosition('down')}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title="Move Image Down"
            >
              <ArrowDown size={14} />
            </button>

            <div className="mx-1 h-4 w-[1px] bg-slate-200" />

            <button
              type="button"
              onClick={() => updateAttributes({ align: 'left' })}
              className={`rounded-md p-1.5 transition-colors ${
                align === 'left'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
              title="Align Image Left"
            >
              <AlignLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => updateAttributes({ align: 'center' })}
              className={`rounded-md p-1.5 transition-colors ${
                align === 'center'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
              title="Align Image Center"
            >
              <AlignCenter size={14} />
            </button>
            <button
              type="button"
              onClick={() => updateAttributes({ align: 'right' })}
              className={`rounded-md p-1.5 transition-colors ${
                align === 'right'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
              title="Align Image Right"
            >
              <AlignRight size={14} />
            </button>

            <div className="mx-1 h-4 w-[1px] bg-slate-200" />

            {(['25%', '50%', '75%', '100%'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateAttributes({ width: preset })}
                className={`rounded-md px-1.5 py-1 text-[11px] font-semibold transition-colors ${
                  width === preset
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
                title={`Resize to ${preset}`}
              >
                {preset}
              </button>
            ))}

            <div className="mx-1 h-4 w-[1px] bg-slate-200" />

            <button
              type="button"
              onClick={() => deleteNode()}
              className="rounded-md p-1.5 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
              title="Delete Image"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          title={title || ''}
          className="block h-auto w-full rounded-xl border border-slate-200 object-contain shadow-xs select-none"
          draggable={false}
        />

        {isEditable && (
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute right-2 bottom-2 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-md border border-white bg-blue-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
            title="Drag corner to resize"
          >
            <div className="h-2 w-2 border-r-2 border-b-2 border-white" />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '60%',
        parseHTML: (element) =>
          element.getAttribute('data-width') || element.style.width || '60%',
        renderHTML: (attributes) => ({
          'data-width': attributes.width,
          style: `width: ${attributes.width}`,
        }),
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => ({
          'data-align': attributes.align,
        }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
});