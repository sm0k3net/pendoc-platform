import { Node, mergeAttributes } from '@tiptap/core';

// Section Container Extension
export const Section = Node.create({
  name: 'section',
  group: 'block',
  content: 'sectionColumn+',
  
  addAttributes() {
    return {
      columns: {
        default: 2,
        parseHTML: element => parseInt(element.getAttribute('data-columns') || '2'),
        renderHTML: attributes => ({
          'data-columns': attributes.columns,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="section"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const columns = HTMLAttributes['data-columns'] || 2;
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'section',
      class: `section-container grid gap-4 my-4 p-4 border border-dashed border-border rounded-lg`,
      style: `grid-template-columns: repeat(${columns}, 1fr)`,
    }), 0];
  },

  addCommands() {
    return {
      insertSection: (columns: number = 2) => ({ commands, editor }) => {
        // Create columns content
        const columnsContent = Array(columns).fill(null).map(() => ({
          type: 'sectionColumn',
          content: [{ type: 'paragraph' }],
        }));

        return commands.insertContent({
          type: 'section',
          attrs: { columns },
          content: columnsContent,
        });
      },
      setSectionColumns: (columns: number) => ({ commands, state }) => {
        const { selection } = state;
        const node = selection.$anchor.parent;
        
        if (node.type.name === 'section') {
          return commands.updateAttributes('section', { columns });
        }
        return false;
      },
    };
  },
});

// Section Column Extension
export const SectionColumn = Node.create({
  name: 'sectionColumn',
  group: 'block',
  content: 'block+',
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="section-column"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'section-column',
      class: 'section-column p-3 bg-muted/30 rounded min-h-[100px]',
    }), 0];
  },
});

// Declare module augmentation for TypeScript
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    section: {
      insertSection: (columns?: number) => ReturnType;
      setSectionColumns: (columns: number) => ReturnType;
    };
  }
}
