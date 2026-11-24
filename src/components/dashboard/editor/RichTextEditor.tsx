import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { useEffect, useCallback, useRef } from 'react';
import { NoteImageView } from './NoteImageView';
import { EditorToolbar } from './EditorToolbar';
import { Section, SectionColumn } from './SectionExtension';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  fileName?: string;
  fileType?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Start writing...', fileName, fileType }: RichTextEditorProps) {
  const isInitialMount = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.extend({
        addNodeView() {
          return ReactNodeViewRenderer(NoteImageView);
        },
      }).configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Section,
      SectionColumn,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-3 overflow-hidden break-words',
      },
      handlePaste(view, event) {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;

        const items = Array.from(clipboard.items || []);
        const imageItems = items.filter((item) => item.type.startsWith('image/'));
        if (imageItems.length === 0) return false;

        event.preventDefault();

        imageItems.forEach((item, index) => {
          const file = item.getAsFile();
          if (!file) return;

          const reader = new FileReader();
          reader.onload = () => {
            const src = typeof reader.result === 'string' ? reader.result : '';
            if (!src) return;

            const { schema } = view.state;
            const imageNode = schema.nodes.image?.create({ src });
            if (!imageNode) return;

            let tr = view.state.tr.replaceSelectionWith(imageNode);
            if (index < imageItems.length - 1 && schema.nodes.paragraph) {
              tr = tr.insert(tr.selection.to + 1, schema.nodes.paragraph.create());
            }
            view.dispatch(tr);
          };
          reader.readAsDataURL(file);
        });

        return true;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && isInitialMount.current) {
      isInitialMount.current = false;
      if (content && content !== editor.getHTML()) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  // Reset on content change from external source
  useEffect(() => {
    if (editor && !isInitialMount.current && content !== editor.getHTML()) {
      const currentPos = editor.state.selection.anchor;
      editor.commands.setContent(content || '');
      // Try to restore cursor position
      try {
        editor.commands.setTextSelection(Math.min(currentPos, editor.state.doc.content.size));
      } catch {
        // Ignore if position is invalid
      }
    }
  }, [content]);

  const addImage = useCallback((url: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addLink = useCallback((url: string) => {
    if (editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const insertContent = useCallback((newContent: string) => {
    if (editor) {
      editor.chain().focus().insertContent(newContent).run();
    }
  }, [editor]);

  const insertSection = useCallback((columns: number) => {
    if (editor) {
      editor.chain().focus().insertSection(columns).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full border border-border rounded-lg overflow-hidden bg-card">
      <EditorToolbar 
        editor={editor} 
        onAddImage={addImage} 
        onAddLink={addLink}
        content={content}
        fileName={fileName}
        fileType={fileType}
        onInsertContent={insertContent}
        onInsertSection={insertSection}
      />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
