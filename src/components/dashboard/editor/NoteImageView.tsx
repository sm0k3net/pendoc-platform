import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { resolveNoteImage } from '@/lib/noteImages';

export function NoteImageView({ node }: NodeViewProps) {
  const { src, alt, title } = node.attrs;
  const [image, setImage] = useState<{ source: string; url?: string }>();

  useEffect(() => {
    let mounted = true;
    void resolveNoteImage(src).then(
      (url) => { if (mounted) setImage({ source: src, url }); },
      () => { if (mounted) setImage({ source: src }); },
    );
    return () => { mounted = false; };
  }, [src]);

  return (
    <NodeViewWrapper as="div" className="my-4">
      {image?.source === src && image.url
        ? <img className="max-w-full h-auto rounded-lg" src={image.url} alt={alt ?? ''} title={title} referrerPolicy="no-referrer" />
        : <span className="text-sm text-muted-foreground">{alt || 'Image unavailable'}</span>}
    </NodeViewWrapper>
  );
}
