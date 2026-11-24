import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Bug,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  FileSearch,
  FileText,
  FolderTree,
  GitCompare,
  Globe,
  Layers,
  Lock,
  Play,
  Shield,
  Sparkles,
  Target,
  Upload,
  Users,
  Zap,
  BarChart3,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { Footer } from '@/components/common/Footer';
import { knowledgeBaseArticles, knowledgeBaseGuides } from '@/content/knowledgeBase';

const DEMO_EMAIL = 'info@pendoc.org';

export function LandingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const featureIcons = useMemo(
    () => [FolderTree, Bug, Upload, FileText, Users, Globe],
    []
  );

  const aiFeatureIcons = useMemo(
    () => [Target, Layers, FileSearch, GitCompare, Eye, Bot],
    []
  );

  const platformServices = useMemo(
    () => [
      { name: 'tools.pendoc.org', description: 'Security utilities and helper tooling', url: 'https://tools.pendoc.org', icon: Shield },
      { name: 'ide.pendoc.org', description: 'Browser-based workspace for technical operations', url: 'https://ide.pendoc.org', icon: Terminal },
      { name: 'scan.pendoc.org', description: 'Scanning workflows and assessment execution', url: 'https://scan.pendoc.org', icon: FileSearch },
      { name: 'bin.pendoc.org', description: 'Secure snippets and payload sharing', url: 'https://bin.pendoc.org', icon: Layers },
      { name: 'cheatsheets.pendoc.org', description: 'Field references and pentest knowledge base', url: 'https://cheatsheets.pendoc.org', icon: BookOpen },
      { name: 'feed.pendoc.org', description: 'Security news and operational updates', url: 'https://feed.pendoc.org', icon: Globe },
      { name: 'phish.pendoc.org', description: 'Phishing simulation and awareness workflows', url: 'https://phish.pendoc.org', icon: Users },
    ],
    []
  );

  const stats = [
    { value: '4+', label: 'Scanner Integrations' },
    { value: 'AI', label: 'Powered Analysis' },
    { value: '∞', label: 'Projects & Reports' },
    { value: '100%', label: 'Client Portal' },
  ];

  const sectionLinks = [
    { label: 'Features', href: '#features' },
    { label: 'AI', href: '#ai-workflows' },
    { label: 'Workflow', href: '#workflow' },
    { label: 'Integrations', href: '#integrations' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">{t.landing.title}</span>
          </div>
          <nav className="hidden xl:flex items-center gap-1 rounded-full border border-border/60 bg-card/50 p-1">
            {sectionLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="hidden md:inline-flex text-muted-foreground hover:text-foreground" onClick={() => navigate('/api-docs')}>
              <BookOpen className="h-4 w-4 mr-1.5" />
              {t.landing.nav.apiDocs}
            </Button>
            <Button variant="ghost" size="sm" className="hidden lg:inline-flex text-muted-foreground hover:text-foreground" onClick={() => navigate('/docs')}>
              <BookOpen className="h-4 w-4 mr-1.5" />
              {t.landing.nav.docs}
            </Button>
            <div className="h-5 w-px bg-border mx-1 hidden md:block" />
            <LanguageToggle />
            <ThemeToggle />
            <div className="h-5 w-px bg-border mx-1" />
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate('/auth?mode=login')}>
              {t.landing.login}
            </Button>
            <Button size="sm" onClick={() => navigate('/auth?mode=signup')} className="font-semibold">
              <span className="hidden sm:inline">{t.landing.signup}</span>
              <span className="sm:hidden">{t.landing.nav.start}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-14 sm:py-20 lg:py-32">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-accent/6 rounded-full blur-[100px]" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]" />

          <div className="container mx-auto px-4 relative">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-scale-in">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold gradient-cyber">{t.landing.hero.badge}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold mb-4 tracking-tighter leading-[0.9]">
                <span className="gradient-cyber">{t.landing.hero.headline}</span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-muted-foreground font-medium mb-6 tracking-tight">
                {t.landing.hero.subheadline}
              </p>

              <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                {t.landing.hero.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <Button size="lg" onClick={() => navigate('/auth?mode=signup')} className="h-12 px-8 text-base font-semibold">
                  <Play className="mr-2 h-5 w-5" />
                  {t.landing.hero.primaryCta}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <a href={`mailto:${DEMO_EMAIL}?subject=PenDoc%20Demo%20Request`}>
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base w-full">
                    <Lock className="mr-2 h-5 w-5" />
                    {t.landing.hero.secondaryCta}
                  </Button>
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '200ms' }}>
                {t.landing.hero.trustItems.map((item) => (
                  <div className="flex items-center gap-2" key={item}>
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-y border-border/40 bg-card/40">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/40">
              {stats.map((stat) => (
                <div key={stat.label} className="py-8 px-4 text-center">
                  <div className="text-2xl md:text-3xl font-extrabold text-primary mb-1">{stat.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product Preview */}
        <section className="py-16 border-b border-border/40 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center max-w-6xl mx-auto">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-5">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">Built for the full engagement lifecycle</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                  One workspace for pentesters, one portal for clients, one source of truth.
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed mb-6">
                  Move from raw scanner output to attack paths, remediation strategy, and client-ready reporting without context switching.
                </p>

                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    {
                      icon: Shield,
                      title: 'Pentester Workspace',
                      description: 'Review findings, manage evidence, and shape deliverables inside a focused dashboard.',
                    },
                    {
                      icon: Bot,
                      title: 'AI-Guided Analysis',
                      description: 'Generate attack vectors, remediation strategy, and report content faster.',
                    },
                    {
                      icon: Users,
                      title: 'Client Portal',
                      description: 'Give clients a clear view of risk, retest status, reports, and progress.',
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-2xl border border-border bg-card/60 p-5">
                        <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-bold mb-2">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" />
                <div className="relative rounded-[1.75rem] border border-border/70 bg-card/85 shadow-2xl shadow-primary/10 overflow-hidden">
                  <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">PenDoc Workspace Preview</p>
                      <p className="text-xs text-muted-foreground">Attack path + project health + client visibility</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Live project state
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Open vulns', value: '18', tone: 'text-warning bg-warning/10' },
                        { label: 'Reports', value: '4', tone: 'text-cyan-500 bg-cyan-500/10' },
                        { label: 'Retests', value: '6', tone: 'text-emerald-500 bg-emerald-500/10' },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-border/60 bg-background/70 p-3">
                          <div className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${item.tone}`}>
                            {item.label}
                          </div>
                          <div className="mt-3 text-2xl font-extrabold tracking-tight">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="grid sm:grid-cols-[1.2fr_0.8fr] gap-3">
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-semibold">Attack Vector</p>
                            <p className="text-xs text-muted-foreground">AI-generated exploitation path</p>
                          </div>
                          <Badge className="bg-primary/15 text-primary border-primary/20">Updated 2m ago</Badge>
                        </div>
                        <div className="rounded-xl border border-dashed border-primary/25 bg-primary/5 p-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Target className="h-4 w-4 text-primary" />
                            Recon → Initial Access → Privilege Escalation
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-blue-500/10 text-blue-600 px-3 py-2 text-xs font-semibold">Recon</div>
                            <div className="rounded-lg bg-orange-500/10 text-orange-600 px-3 py-2 text-xs font-semibold">Exploit</div>
                            <div className="rounded-lg bg-red-500/10 text-red-600 px-3 py-2 text-xs font-semibold">Impact</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-3">
                        <p className="text-sm font-semibold">Client Portal Snapshot</p>
                        {[
                          { label: 'Critical findings', value: '3' },
                          { label: 'Pending retests', value: '2' },
                          { label: 'Shared reports', value: '4' },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                            <span className="text-xs text-muted-foreground">{item.label}</span>
                            <span className="text-sm font-bold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Audiences */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
              {t.landing.audiences.cards.map((audience, index) => (
                <div key={audience.title} className="group p-7 rounded-2xl border border-border bg-card/60 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {index === 0 ? <Users className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                    </div>
                    <h3 className="text-lg font-bold">{audience.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{audience.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-secondary/20 border-y border-border/40">
          <div className="container mx-auto px-4 max-w-6xl space-y-10">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-5">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Documentation and articles</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">Learn the platform and the practice</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Explore PenDoc product documentation and in-depth security articles covering penetration testing, vulnerability management, reporting, tools, and standards.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {knowledgeBaseGuides.map((guide) => (
                <div key={guide.slug} className="rounded-2xl border border-border bg-card/70 p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <Badge variant="outline">{guide.audience}</Badge>
                    <span className="text-xs text-muted-foreground">{guide.readingTime}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{guide.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{guide.summary}</p>
                  <Button asChild>
                    <Link to={`/docs/${guide.slug}`}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Open documentation
                    </Link>
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Featured articles</h3>
                  <p className="text-muted-foreground">Public knowledge-base articles written for search discovery and security education.</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/docs')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Documentation hub
                </Button>
              </div>

              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                {knowledgeBaseArticles.map((article) => (
                  <Link key={article.slug} to={`/articles/${article.slug}`} className="group rounded-2xl border border-border bg-background p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Badge variant="secondary">Article</Badge>
                      <span className="text-[11px] text-muted-foreground">{article.readingTime}</span>
                    </div>
                    <h4 className="font-bold leading-snug mb-2 group-hover:text-primary transition-colors">{article.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{article.summary}</p>
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                      Read article
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section id="features" className="py-20 bg-secondary/20 border-y border-border/40 scroll-mt-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">{t.landing.featuresSection.title}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.landing.featuresSection.description}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {t.landing.featuresSection.items.map((item, index) => {
                const Icon = featureIcons[index];
                return (
                  <div key={item.title} className="group relative p-7 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 animate-fade-in" style={{ animationDelay: `${index * 80}ms` }}>
                    <div className="mb-4 p-3 rounded-xl bg-primary/10 text-primary w-fit group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* AI Features */}
        <section id="ai-workflows" className="py-20 bg-background border-b border-border/40 scroll-mt-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-5">
                <Bot className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-accent">{t.landing.ai.badge}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">{t.landing.ai.title}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">{t.landing.ai.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {t.landing.ai.items.map((item, index) => {
                const Icon = aiFeatureIcons[index];
                return (
                  <div key={item.title} className="group p-5 rounded-2xl bg-card/60 border border-border/60 hover:border-accent/40 hover:bg-card transition-all text-center animate-fade-in" style={{ animationDelay: `${index * 70}ms` }}>
                    <div className="mx-auto mb-3 p-3 rounded-xl bg-accent/10 text-accent w-fit group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="py-20 bg-card/30 border-b border-border/40 scroll-mt-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">{t.landing.workflow.title}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.landing.workflow.description}</p>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-4 gap-6 relative">
                {/* Connector line (desktop) */}
                <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
                {/* Connector line (mobile) */}
                <div className="md:hidden absolute top-0 bottom-0 left-7 w-0.5 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20" />
                {t.landing.workflow.steps.map((step, index) => (
                  <div key={step.title} className="text-center md:text-center relative animate-fade-in flex md:flex-col items-center md:items-center gap-4 md:gap-0 pl-10 md:pl-0" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground font-extrabold text-xl flex items-center justify-center mx-auto mb-0 md:mb-4 shadow-lg shadow-primary/20 relative z-10 flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="text-left md:text-center">
                      <h3 className="text-base font-bold mb-2">{step.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Platform Services */}
        <section className="py-20 bg-background border-b border-border/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">PenDoc Service Ecosystem</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Access focused services for testing, operations, documentation, and intelligence.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {platformServices.map((service, index) => {
                const Icon = service.icon;
                return (
                  <a
                    key={service.name}
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-5 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-md transition-all animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{service.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{service.description}</p>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* Onboarding */}
        <section className="py-20 bg-secondary/20 border-b border-border/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-5">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Quick Start</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">Get Started in 15 Minutes</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                From account setup to actionable pentest deliverables.
              </p>
            </div>

            <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-5">
              {[
                { step: '1', title: 'Create Client & Project', desc: 'Define scope, model, and engagement details in your workspace.' },
                { step: '2', title: 'Import Findings & Validate', desc: 'Ingest scanner outputs, deduplicate, and enrich vulnerabilities.' },
                { step: '3', title: 'Generate AI-Enhanced Reports', desc: 'Build executive and technical reports, share with clients securely.' },
              ].map((item, index) => (
                <div key={item.step} className="p-6 rounded-2xl border border-border bg-card/60 hover:border-primary/30 transition-all animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-extrabold text-sm flex items-center justify-center mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section id="integrations" className="py-20 border-b border-border/40 bg-background scroll-mt-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">{t.landing.integrations.title}</h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">{t.landing.integrations.description}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 max-w-3xl mx-auto">
              {t.landing.integrations.tools.map((tool, index) => (
                <div key={tool.name} className="text-center p-6 rounded-2xl border border-border bg-card/50 hover:border-primary/40 hover:bg-card transition-all animate-fade-in" style={{ animationDelay: `${index * 80}ms` }}>
                  <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <ToolLogo name={tool.name} />
                  </div>
                  <div className="font-bold mb-0.5">{tool.name}</div>
                  <div className="text-xs text-muted-foreground">{tool.vendor}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-secondary/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">{t.landing.faq.title}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.landing.faq.description}</p>
            </div>
            <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-3">
                {t.landing.faq.items.map((faq, index) => {
                  const isOpen = openFaq === index;
                  const panelId = `landing-faq-panel-${index}`;
                  const buttonId = `landing-faq-button-${index}`;

                  return (
                    <div key={faq.question} className="border border-border rounded-2xl overflow-hidden bg-card/60 hover:border-primary/20 transition-colors animate-fade-in" style={{ animationDelay: `${index * 60}ms` }}>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/20 transition-colors"
                      >
                        <span className="font-semibold pr-4">{faq.question}</span>
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5 text-primary flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div id={panelId} role="region" aria-labelledby={buttonId} className="px-5 pb-5 text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight mb-2">{t.landing.faq.sidebarTitle}</h3>
                  <p className="text-sm text-muted-foreground leading-6 mb-5">
                    {t.landing.faq.sidebarDescription}
                  </p>
                  <div className="space-y-3 text-sm text-muted-foreground mb-5">
                    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                      <span>{t.landing.faq.guidesLabel}</span>
                      <span className="font-semibold text-foreground">{knowledgeBaseGuides.length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                      <span>{t.landing.faq.articlesLabel}</span>
                      <span className="font-semibold text-foreground">{knowledgeBaseArticles.length}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button asChild>
                      <Link to="/docs">
                        <BookOpen className="h-4 w-4 mr-2" />
                        {t.landing.faq.docsCta}
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to={`/articles/${knowledgeBaseArticles[0]?.slug ?? 'what-is-penetration-testing'}`}>
                        <FileText className="h-4 w-4 mr-2" />
                        {t.landing.faq.articleCta}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-primary/4 to-background" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="container mx-auto px-4 text-center relative">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-5 tracking-tight">{t.landing.finalCta.title}</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">{t.landing.finalCta.description}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
              <Button size="lg" onClick={() => navigate('/auth?mode=signup')} className="h-12 px-8 text-base font-semibold">
                <Play className="mr-2 h-5 w-5" />
                {t.landing.finalCta.primaryCta}
              </Button>
              <a href={`mailto:${DEMO_EMAIL}?subject=PenDoc%20Demo%20Request`}>
                <Button variant="outline" size="lg" className="h-12 px-8 text-base w-full">
                  <BookOpen className="mr-2 h-5 w-5" />
                  {t.landing.finalCta.secondaryCta}
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ToolLogo({ name }: { name: string }) {
  if (name === 'Nessus') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" focusable="false">
        <path d="M12 2 4 7v10l8 5 8-5V7l-8-5Zm0 3.1 5 2.9-5 2.9-5-2.9 5-2.9Zm-5 6.4 4 2.3v4.2l-4-2.5v-4Zm6 6.5v-4.2l4-2.3v4l-4 2.5Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === 'Acunetix') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" focusable="false">
        <path d="M12 3 3 21h18L12 3Zm0 4.6 5 10h-2.7l-2.3-4.2-2.3 4.2H7l5-10Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === 'Burp Suite') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" focusable="false">
        <path d="M4 4h10a6 6 0 1 1 0 12H9v4H4V4Zm5 7h5a1 1 0 1 0 0-2H9v2Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" focusable="false">
      <path d="M3 7h18v10H3V7Zm2 2v6h14V9H5Zm3 1h2v4H8v-4Zm4 0h2v4h-2v-4Z" fill="currentColor" />
    </svg>
  );
}
