import { useMemo } from 'react';

interface FileViewerProps {
  content: string;
  fileName: string;
  mimeType?: string | null;
}

export function FileViewer({ content, fileName, mimeType }: FileViewerProps) {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  
  const viewerType = useMemo(() => {
    if (mimeType?.includes('json') || fileExtension === 'json') return 'json';
    if (mimeType?.includes('xml') || fileExtension === 'xml') return 'xml';
    if (mimeType?.includes('html') || fileExtension === 'html' || fileExtension === 'htm') return 'html';
    return 'text';
  }, [mimeType, fileExtension]);

  if (viewerType === 'json') {
    return <JsonViewer content={content} />;
  }

  if (viewerType === 'xml') {
    return <XmlViewer content={content} />;
  }

  if (viewerType === 'html') {
    return <HtmlViewer content={content} />;
  }

  return (
    <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words text-foreground">
      {content}
    </pre>
  );
}

function JsonViewer({ content }: { content: string }) {
  const parsedJson = useMemo(() => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }, [content]);

  if (!parsedJson) {
    return (
      <div className="p-4">
        <div className="text-destructive text-sm mb-2">Invalid JSON</div>
        <pre className="text-sm font-mono whitespace-pre-wrap break-words text-muted-foreground">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto">
      <JsonTree data={parsedJson} />
    </div>
  );
}

function JsonTree({ data, level = 0 }: { data: unknown; level?: number }) {
  const indent = level * 16;

  if (data === null) {
    return <span className="text-muted-foreground">null</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="text-warning">{data.toString()}</span>;
  }

  if (typeof data === 'number') {
    return <span className="text-accent">{data}</span>;
  }

  if (typeof data === 'string') {
    return <span className="text-primary">"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground">[]</span>;
    
    return (
      <div>
        <span className="text-muted-foreground">[</span>
        {data.map((item, index) => (
          <div key={index} style={{ marginLeft: indent + 16 }}>
            <JsonTree data={item} level={level + 1} />
            {index < data.length - 1 && <span className="text-muted-foreground">,</span>}
          </div>
        ))}
        <span className="text-muted-foreground" style={{ marginLeft: indent }}>]</span>
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-muted-foreground">{'{}'}</span>;
    
    return (
      <div>
        <span className="text-muted-foreground">{'{'}</span>
        {entries.map(([key, value], index) => (
          <div key={key} style={{ marginLeft: indent + 16 }}>
            <span className="text-terminal">"{key}"</span>
            <span className="text-muted-foreground">: </span>
            <JsonTree data={value} level={level + 1} />
            {index < entries.length - 1 && <span className="text-muted-foreground">,</span>}
          </div>
        ))}
        <span className="text-muted-foreground" style={{ marginLeft: indent }}>{'}'}</span>
      </div>
    );
  }

  return <span>{String(data)}</span>;
}

function XmlViewer({ content }: { content: string }) {
  const formattedXml = useMemo(() => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/xml');
      const errorNode = doc.querySelector('parsererror');
      
      if (errorNode) {
        return { error: true, content };
      }

      return { error: false, doc };
    } catch {
      return { error: true, content };
    }
  }, [content]);

  if (formattedXml.error) {
    return (
      <div className="p-4">
        <div className="text-destructive text-sm mb-2">Invalid XML</div>
        <pre className="text-sm font-mono whitespace-pre-wrap break-words text-muted-foreground">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto">
      <XmlTree node={formattedXml.doc?.documentElement!} />
    </div>
  );
}

function XmlTree({ node, level = 0 }: { node: Element; level?: number }) {
  const indent = level * 16;
  const hasChildren = node.childNodes.length > 0;
  const hasOnlyText = node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE;
  const attributes = Array.from(node.attributes);

  if (hasOnlyText) {
    return (
      <div style={{ marginLeft: indent }}>
        <span className="text-accent">&lt;{node.tagName}</span>
        {attributes.map(attr => (
          <span key={attr.name}>
            <span className="text-warning"> {attr.name}</span>
            <span className="text-muted-foreground">=</span>
            <span className="text-primary">"{attr.value}"</span>
          </span>
        ))}
        <span className="text-accent">&gt;</span>
        <span className="text-foreground">{node.textContent}</span>
        <span className="text-accent">&lt;/{node.tagName}&gt;</span>
      </div>
    );
  }

  if (!hasChildren) {
    return (
      <div style={{ marginLeft: indent }}>
        <span className="text-accent">&lt;{node.tagName}</span>
        {attributes.map(attr => (
          <span key={attr.name}>
            <span className="text-warning"> {attr.name}</span>
            <span className="text-muted-foreground">=</span>
            <span className="text-primary">"{attr.value}"</span>
          </span>
        ))}
        <span className="text-accent"> /&gt;</span>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: indent }}>
      <span className="text-accent">&lt;{node.tagName}</span>
      {attributes.map(attr => (
        <span key={attr.name}>
          <span className="text-warning"> {attr.name}</span>
          <span className="text-muted-foreground">=</span>
          <span className="text-primary">"{attr.value}"</span>
        </span>
      ))}
      <span className="text-accent">&gt;</span>
      {Array.from(node.childNodes).map((child, index) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          return <XmlTree key={index} node={child as Element} level={level + 1} />;
        }
        if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
          return (
            <div key={index} style={{ marginLeft: (level + 1) * 16 }} className="text-foreground">
              {child.textContent.trim()}
            </div>
          );
        }
        return null;
      })}
      <span className="text-accent">&lt;/{node.tagName}&gt;</span>
    </div>
  );
}

function HtmlViewer({ content }: { content: string }) {
  return (
    <div className="h-full w-full">
      <iframe
        srcDoc={content}
        className="w-full h-full border-0 bg-white"
        sandbox="allow-scripts"
        title="HTML Preview"
      />
    </div>
  );
}
