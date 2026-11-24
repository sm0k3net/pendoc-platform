import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Info,
  Network,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Footer } from '@/components/common/Footer';
import { DocsSidebar } from '@/components/common/DocsSidebar';
import { getKnowledgeBaseEntry } from '@/content/knowledgeBase';
import { useLanguage } from '@/contexts/LanguageContext';
import NotFound from './NotFound';

function slugifyHeading(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const calloutToneClasses = {
  info: 'border-primary/30 bg-primary/5 text-foreground',
  success: 'border-emerald-500/30 bg-emerald-500/5 text-foreground',
  warning: 'border-amber-500/30 bg-amber-500/5 text-foreground',
} as const;

const calloutToneIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
} as const;

function ensureMeta(selector: string, attribute: 'name' | 'property', key: string, value: string) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
}

export default function KnowledgeBaseEntryPage() {
  const { slug } = useParams();
  const { language } = useLanguage();
  const entry = slug ? getKnowledgeBaseEntry(slug) : null;

  const displayTitle = language === 'ru' && entry?.titleRu ? entry.titleRu : entry?.title ?? '';
  const displaySummary = language === 'ru' && entry?.summaryRu ? entry.summaryRu : entry?.summary ?? '';
  const displaySections = language === 'ru' && entry?.sectionsRu?.length ? entry.sectionsRu : entry?.sections ?? [];
  const hasRuContent = Boolean(entry?.sectionsRu?.length);

  useEffect(() => {
    if (!entry) return;

    const canonicalUrl = `${window.location.origin}/${entry.category === 'guide' ? 'docs' : 'articles'}/${entry.slug}`;
    document.title = `${displayTitle} | PenDoc`;
    ensureMeta('meta[name="description"]', 'name', 'description', entry.description);
    ensureMeta('meta[name="keywords"]', 'name', 'keywords', entry.keywords);
    ensureMeta('meta[name="robots"]', 'name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    ensureMeta('meta[property="og:title"]', 'property', 'og:title', `${entry.title} | PenDoc`);
    ensureMeta('meta[property="og:description"]', 'property', 'og:description', entry.description);
    ensureMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    ensureMeta('meta[name="twitter:title"]', 'name', 'twitter:title', `${entry.title} | PenDoc`);
    ensureMeta('meta[name="twitter:description"]', 'name', 'twitter:description', entry.description);
    if (entry.heroImage?.src) {
      ensureMeta('meta[property="og:image"]', 'property', 'og:image', entry.heroImage.src);
      ensureMeta('meta[name="twitter:image"]', 'name', 'twitter:image', entry.heroImage.src);
      ensureMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    }

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [entry]);

  if (!entry) {
    return <NotFound />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DocsSidebar currentEntry={entry} />

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-lg">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <nav className="flex items-center gap-1 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <span className="mx-1">/</span>
              <Link to="/docs" className="hover:text-foreground">Docs</Link>
              <span className="mx-1">/</span>
              <span className="text-foreground font-medium truncate max-w-[200px]">{displayTitle}</span>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" asChild>
                <Link to={entry.category === 'guide' ? '/docs' : '/'}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-8">
          <article className="mx-auto max-w-3xl space-y-8">

            {language === 'ru' && !hasRuContent && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <p className="text-sm text-muted-foreground">Эта статья пока доступна только на английском языке.</p>
              </div>
            )}

            <section className="rounded-3xl border border-border bg-card/50 p-8 md:p-10">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">{entry.category === 'guide' ? 'Documentation' : 'Article'}</Badge>
                <Badge variant="outline">{entry.audience}</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{displayTitle}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">{displaySummary}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{entry.readingTime}</span>
                <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4" />Updated {entry.updatedAt}</span>
              </div>

              {entry.highlights && entry.highlights.length > 0 && (
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {entry.highlights.map((highlight) => (
                    <div key={highlight} className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <p className="leading-6 text-foreground/90">{highlight}</p>
                    </div>
                  ))}
                </div>
              )}

              {entry.heroImage && (
                <figure className="mt-8 overflow-hidden rounded-2xl border border-border/70 bg-background/60">
                  <img src={entry.heroImage.src} alt={entry.heroImage.alt} className="h-64 w-full object-cover md:h-80" loading="eager" />
                  {(entry.heroImage.caption || entry.heroImage.sourceHref) && (
                    <figcaption className="flex flex-col gap-2 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                      <span>{entry.heroImage.caption}</span>
                      {entry.heroImage.sourceHref && entry.heroImage.sourceLabel && (
                        <a href={entry.heroImage.sourceHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                          <ExternalLink className="h-4 w-4" />
                          {entry.heroImage.sourceLabel}
                        </a>
                      )}
                    </figcaption>
                  )}
                </figure>
              )}
            </section>

            {displaySections.map((section) => {
              const CalloutIcon = section.callout ? calloutToneIcons[section.callout.tone] : null;

              return (
              <Card key={section.title} id={slugifyHeading(section.title)} className="scroll-mt-20 border-border/70 shadow-sm">
                <CardContent className="p-6 md:p-8 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
                    {section.summary && <p className="text-muted-foreground mt-2">{section.summary}</p>}
                  </div>

                  <div className="space-y-4 text-base leading-8 text-foreground/90">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>

                  {section.highlights && section.highlights.length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {section.highlights.map((highlight) => (
                        <div key={highlight} className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm leading-6 text-foreground/90">
                          {highlight}
                        </div>
                      ))}
                    </div>
                  )}

                  {section.callout && CalloutIcon && (
                    <div className={`rounded-2xl border p-4 ${calloutToneClasses[section.callout.tone]}`}>
                      <div className="flex items-start gap-3">
                        <CalloutIcon className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                          <h3 className="font-semibold">{section.callout.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.callout.content}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-2 list-disc pl-6 text-muted-foreground leading-7">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  )}

                  {section.steps && section.steps.length > 0 && (
                    <ol className="space-y-2 list-decimal pl-6 text-muted-foreground leading-7">
                      {section.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  )}

                  {section.flow && (
                    <div className="rounded-2xl border border-border/70 bg-background/60 p-5">
                      <h3 className="text-lg font-semibold tracking-tight">{section.flow.title}</h3>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {section.flow.steps.map((step, index) => (
                          <div key={step} className="relative rounded-2xl border border-border/70 bg-card px-4 py-4">
                            <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {index + 1}
                            </span>
                            <p className="text-sm leading-6 text-foreground/90">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {section.schema && (
                    <div className="rounded-2xl border border-border/70 bg-background/60 p-5">
                      <h3 className="text-lg font-semibold tracking-tight">{section.schema.title}</h3>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {section.schema.items.map((item) => (
                          <div key={item.name} className="rounded-2xl border border-border/70 bg-card p-4">
                            <h4 className="font-semibold">{item.name}</h4>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {section.image && (
                    <figure className="overflow-hidden rounded-2xl border border-border/70 bg-background/60">
                      <img src={section.image.src} alt={section.image.alt} className="h-56 w-full object-cover md:h-72" loading="lazy" />
                      {(section.image.caption || section.image.sourceHref) && (
                        <figcaption className="flex flex-col gap-2 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                          <span>{section.image.caption}</span>
                          {section.image.sourceHref && section.image.sourceLabel && (
                            <a href={section.image.sourceHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                              <ExternalLink className="h-4 w-4" />
                              {section.image.sourceLabel}
                            </a>
                          )}
                        </figcaption>
                      )}
                    </figure>
                  )}
                </CardContent>
              </Card>
            )})}

            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-6 md:p-8 space-y-5">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-3">References</h2>
                  <ul className="space-y-2 text-muted-foreground">
                    {entry.references.map((reference) => (
                      <li key={`${reference.label}-${reference.href}`}>
                        <a href={reference.href} target={reference.href.startsWith('http') ? '_blank' : undefined} rel={reference.href.startsWith('http') ? 'noopener noreferrer' : undefined} className="inline-flex items-center gap-2 text-primary hover:underline">
                          <ExternalLink className="h-4 w-4" />
                          {reference.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-3">Related to PenDoc</h2>
                  <p className="text-muted-foreground leading-7">
                    PenDoc helps teams turn assessment evidence into structured findings, shared client deliverables, remediation workflows, and professional reports that stay aligned with real project state.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button asChild>
                      <Link to="/auth?mode=signup">
                        <FileText className="h-4 w-4 mr-2" />
                        Try PenDoc
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/docs">
                        <Network className="h-4 w-4 mr-2" />
                        Documentation hub
                      </Link>
                    </Button>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-3">Hashtags</h2>
                  <div className="flex flex-wrap gap-2">
                    {entry.hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="inline-flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </article>
        </main>

        <Footer />
      </div>
    </div>
  );
}