import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';

function noteImagePath(source: string): string | undefined {
  try {
    const url = new URL(source);
    const storage = new URL(SUPABASE_URL);
    const prefix = '/storage/v1/object/public/note-images/';
    if (url.origin === storage.origin && url.pathname.startsWith(prefix)) {
      const path = decodeURIComponent(url.pathname.slice(prefix.length));
      if (/^[0-9a-f-]{36}\/[\w.-]+$/i.test(path)) return path;
    }
  } catch {
    // External images and inline images are handled by the normal viewer.
  }
}

export async function resolveNoteImage(source: string): Promise<string | undefined> {
  const path = noteImagePath(source);
  if (!path) return source;
  const { data } = await supabase.storage.from('note-images').createSignedUrl(path, 60);
  return data?.signedUrl;
}

export async function materializeNoteImages(html: string, inline = false): Promise<string> {
  if (!html.includes('/note-images/')) return html;
  const document = new DOMParser().parseFromString(html, 'text/html');
  const images = Array.from(document.querySelectorAll<HTMLImageElement>('img[src]'));
  await Promise.all(images.map(async (image) => {
    const path = noteImagePath(image.getAttribute('src') ?? '');
    if (!path) return;
    image.removeAttribute('src');
    if (!inline) {
      const { data } = await supabase.storage.from('note-images').createSignedUrl(path, 60);
      if (data?.signedUrl) image.src = data.signedUrl;
      return;
    }

    const { data } = await supabase.storage.from('note-images').download(path);
    if (!data || !/^image\/(png|jpeg|gif|webp)$/.test(data.type)) return;
    const encoded = await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(data);
    });
    if (encoded) image.src = encoded;
  }));
  return document.doctype || /<html[\s>]/i.test(html)
    ? '<!doctype html>\n' + document.documentElement.outerHTML
    : document.body.innerHTML;
}
