import { sanitizeHtml } from './sanitize';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatInlineMarkdown(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, '$1<em>$2</em>')
    .replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1<em>$2</em>');
}

function renderParagraphBlock(block: string): string {
  const escaped = escapeHtml(block).replace(/\n/g, '<br />');
  return `<p>${formatInlineMarkdown(escaped)}</p>`;
}

export function formatRichText(value: string | null | undefined): string {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return sanitizeHtml(trimmed);
  }

  const codeBlocks: string[] = [];
  const protectedText = trimmed.replace(/```([\w-]+)?\n([\s\S]*?)```/g, (_match, language, code) => {
    const replacement = `<pre><code class="language-${escapeHtml(language || 'text')}">${escapeHtml(code.trim())}</code></pre>`;
    codeBlocks.push(replacement);
    return `@@CODE_BLOCK_${codeBlocks.length - 1}@@`;
  });

  const blocks = protectedText.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  const html = blocks.map((block) => {
    if (/^@@CODE_BLOCK_\d+@@$/.test(block)) {
      const index = Number(block.match(/\d+/)?.[0] || 0);
      return codeBlocks[index] || '';
    }

    const lines = block.split('\n').map((line) => line.trimRight()).filter(Boolean);

    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      const items = lines.map((line) => `<li>${formatInlineMarkdown(escapeHtml(line.replace(/^[-*]\s+/, '')))}</li>`).join('');
      return `<ul>${items}</ul>`;
    }

    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      const items = lines.map((line) => `<li>${formatInlineMarkdown(escapeHtml(line.replace(/^\d+\.\s+/, '')))}</li>`).join('');
      return `<ol>${items}</ol>`;
    }

    if (lines.length === 1 && /^#{1,4}\s+/.test(lines[0])) {
      const level = Math.min((lines[0].match(/^#+/)?.[0].length || 1), 4);
      const text = lines[0].replace(/^#{1,4}\s+/, '');
      return `<h${level}>${formatInlineMarkdown(escapeHtml(text))}</h${level}>`;
    }

    if (lines.every((line) => /^>\s?/.test(line))) {
      const quote = lines.map((line) => line.replace(/^>\s?/, '')).join('<br />');
      return `<blockquote><p>${formatInlineMarkdown(escapeHtml(quote))}</p></blockquote>`;
    }

    return renderParagraphBlock(block);
  }).join('');

  const restored = html.replace(/@@CODE_BLOCK_(\d+)@@/g, (_match, index) => codeBlocks[Number(index)] || '');
  return sanitizeHtml(restored);
}
