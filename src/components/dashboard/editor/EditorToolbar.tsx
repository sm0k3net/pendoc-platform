import { Editor } from '@tiptap/react';
import { useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Link,
  Image,
  Table,
  TableIcon,
  Trash2,
  Plus,
  FileInput,
  Bug,
  Columns2,
  Columns3,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface EditorToolbarProps {
  editor: Editor;
  onAddImage: (url: string) => void;
  onAddLink: (url: string) => void;
  content?: string;
  fileName?: string;
  fileType?: string;
  onInsertContent?: (content: string) => void;
  onInsertSection?: (columns: number) => void;
}

interface FileToImport {
  id: string;
  name: string;
  content: string;
}

import { AIAssistantDialog } from '../dialogs/AIAssistantDialog';

export function EditorToolbar({ editor, onAddImage, onAddLink, content, fileName, fileType, onInsertContent, onInsertSection }: EditorToolbarProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<FileToImport[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (importDialogOpen && user) {
      fetchAvailableFiles();
    }
  }, [importDialogOpen, user]);

  const fetchAvailableFiles = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('files')
      .select('id, name, content')
      .not('content', 'is', null)
      .order('name');

    setAvailableFiles(data || []);
  };

  const handleAddImage = () => {
    if (imageUrl) {
      onAddImage(imageUrl);
      setImageUrl('');
      setImageDialogOpen(false);
    }
  };

  const handleAddLink = () => {
    if (linkUrl) {
      onAddLink(linkUrl);
      setLinkUrl('');
      setLinkDialogOpen(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      // Generate unique filename within user's folder
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Upload to the private note-images bucket
      const { data, error } = await supabase.storage
        .from('note-images')
        .upload(filePath, file, {
          cacheControl: '0',
          upsert: false
        });

      if (error) throw error;

      // Persist a stable object reference. The editor signs it for each viewer.
      const { data: urlData } = supabase.storage
        .from('note-images')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        onAddImage(urlData.publicUrl);
        setImageDialogOpen(false);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      // Fall back to base64 if storage fails
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onAddImage(reader.result);
          setImageDialogOpen(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImportFiles = () => {
    if (selectedFiles.size === 0) return;

    const filesToImport = availableFiles.filter(f => selectedFiles.has(f.id));
    
    filesToImport.forEach((file, index) => {
      // Clean and format the content properly
      let cleanContent = file.content || '';
      
      // If content is HTML, use it directly
      // If it's plain text, preserve structure but clean up
      if (!cleanContent.includes('<')) {
        // Plain text - convert to proper HTML preserving structure
        cleanContent = cleanContent
          // Normalize line endings
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          // Trim each line but preserve indentation
          .split('\n')
          .map(line => line.trimEnd())
          .join('\n')
          // Remove excessive blank lines
          .replace(/\n{4,}/g, '\n\n\n')
          .trim();
        
        // Convert to paragraphs
        cleanContent = cleanContent
          .split(/\n\n+/)
          .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
          .join('');
      }
      
      // Add separator between multiple files
      if (index > 0) {
        editor.commands.insertContent('<hr>');
      }
      
      // Insert the cleaned content directly (no file name wrapper)
      editor.commands.insertContent(cleanContent);
    });

    setSelectedFiles(new Set());
    setImportDialogOpen(false);
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const ToolButton = ({ 
    onClick, 
    isActive = false, 
    children,
    title
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode;
    title?: string;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={title}
      className={cn(
        'h-8 w-8 p-0',
        isActive && 'bg-accent text-accent-foreground'
      )}
    >
      {children}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 border-b border-border bg-muted/30 overflow-x-auto">
      {/* Text formatting */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </ToolButton>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Headings */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolButton>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Lists */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolButton>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Block elements */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title="Code Block"
      >
        <Code className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus className="h-4 w-4" />
      </ToolButton>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Table */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Table">
            <TableIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <Table className="h-4 w-4 mr-2" />
            Insert Table
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Column Before
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Column After
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Column
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Row Before
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Row After
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Row
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Table
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Column Sections */}
      {onInsertSection && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert Section">
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onInsertSection(1)}>
              <Minus className="h-4 w-4 mr-2" />
              Single Column
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsertSection(2)}>
              <Columns2 className="h-4 w-4 mr-2" />
              Two Columns
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsertSection(3)}>
              <Columns3 className="h-4 w-4 mr-2" />
              Three Columns
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="w-px h-6 bg-border mx-1" />

      {/* Import Files */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Import from files"
          >
            <FileInput className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import from Files</DialogTitle>
            <DialogDescription>
              Select files to import their content into this document
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px] pr-4">
            {availableFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No files available to import
              </div>
            ) : (
              <div className="space-y-2">
                {availableFiles.map(file => (
                  <div key={file.id} className="flex items-start space-x-2 p-2 hover:bg-accent rounded-lg">
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                      id={`file-${file.id}`}
                    />
                    <label
                      htmlFor={`file-${file.id}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {file.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <Button 
            onClick={handleImportFiles} 
            disabled={selectedFiles.size === 0}
            className="w-full"
          >
            Import {selectedFiles.size > 0 && `(${selectedFiles.size})`}
          </Button>
        </DialogContent>
      </Dialog>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Link */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 w-8 p-0', editor.isActive('link') && 'bg-accent text-accent-foreground')}
            title="Link"
          >
            <Link className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
            <Button onClick={handleAddLink} className="w-full">Add Link</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Image">
            <Image className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                placeholder="https://example.com/image.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-upload">Upload Image</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
            <Button onClick={handleAddImage} className="w-full">Add from URL</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Assistant */}
      <AIAssistantDialog
        content={content || ''}
        fileName={fileName}
        fileType={fileType}
        onInsertContent={onInsertContent}
      />

      <div className="flex-1" />

      {/* Undo/Redo */}
      <ToolButton
        onClick={() => editor.chain().focus().undo().run()}
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().redo().run()}
        title="Redo"
      >
        <Redo className="h-4 w-4" />
      </ToolButton>
    </div>
  );
}
