import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'iframe', 'object', 'embed', 'base', 'link', 'meta'],
    FORBID_ATTR: ['style', 'srcset', 'ping'],
  });
}

// Reports retain print styles in an isolated preview. An embedded policy also
// travels with standalone downloads and prevents script and form execution.
export function standaloneReport(html: string): string {
  const report = new DOMParser().parseFromString(html, 'text/html');
  report.querySelectorAll('base, meta[http-equiv], script, iframe, object, embed, form, link').forEach((node) => node.remove());
  const policy = report.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
  report.head.prepend(policy);
  return '<!doctype html>\n' + report.documentElement.outerHTML;
}
