import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ExternalLink, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Footer } from '@/components/common/Footer';
import { DocsSidebar } from '@/components/common/DocsSidebar';
import { knowledgeBaseGuides } from '@/content/knowledgeBase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect } from 'react';

export default function DocumentationHub() {
  const { language } = useLanguage();

  useEffect(() => {
    document.title = 'PenDoc Documentation Hub';
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <DocsSidebar />

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-lg">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <nav className="flex items-center gap-1 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <span className="mx-1">/</span>
              <span className="text-foreground font-medium">Documentation</span>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-10">
            <section className="rounded-3xl border border-border bg-card/50 p-8 md:p-10">
              <Badge variant="outline" className="mb-4">Knowledge Base</Badge>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">PenDoc Documentation</h1>
              <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
                Product documentation for both penetration testers and client portal users. Use these guides to understand workflows,
                artifacts, collaboration patterns, remediation tracking, and delivery best practices across the PenDoc platform.
              </p>
            </section>

            <section className="grid md:grid-cols-2 gap-6">
              {knowledgeBaseGuides.map((guide) => {
                const Icon = guide.audience === 'Pentesters' ? BookOpen : Users;
                const title = language === 'ru' && guide.titleRu ? guide.titleRu : guide.title;
                const summary = language === 'ru' && guide.summaryRu ? guide.summaryRu : guide.summary;
                return (
                  <Card key={guide.slug} className="border-border/70 shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="secondary">{guide.readingTime}</Badge>
                      </div>
                      <CardTitle className="text-2xl">{title}</CardTitle>
                      <CardDescription>{summary}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{guide.audience}</Badge>
                        <Badge variant="outline">Updated {guide.updatedAt}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{guide.description}</p>
                      <Button asChild className="w-full sm:w-auto">
                        <Link to={`/docs/${guide.slug}`}>
                          <FileText className="h-4 w-4 mr-2" />
                          Open guide
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            <section className="rounded-3xl border border-border bg-muted/20 p-8">
              <h2 className="text-2xl font-bold mb-3">Public learning resources</h2>
              <p className="text-muted-foreground max-w-3xl leading-relaxed mb-4">
                PenDoc also publishes public educational articles on penetration testing, vulnerability management, scanners, standards,
                and reporting. Article links are featured on the landing page for search visibility and content discovery.
              </p>
              <Button variant="outline" asChild>
                <Link to="/">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View featured articles on the home page
                </Link>
              </Button>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
