import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Bot,
  Sparkles,
  CheckCircle,
  Target,
  Users,
  ClipboardList,
  FileText,
  Layers,
  Database,
  Wrench,
  Lock,
  ArrowRight,
  ExternalLink,
  Workflow,
  Scan,
  Bug,
  Settings,
  GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Footer } from '@/components/common/Footer';

export default function Assistant() {
  const navigate = useNavigate();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImage, setGalleryImage] = useState<{ src: string; title: string } | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselCount, setCarouselCount] = useState(0);

  const galleryItems = useMemo(
    () => [
      {
        src: 'https://raw.githubusercontent.com/sm0k3net/static-data/refs/heads/main/website-img/ai-agent-1.png',
        title: 'Multi-Agent Orchestration',
      },
      {
        src: 'https://raw.githubusercontent.com/sm0k3net/static-data/refs/heads/main/website-img/ai-agent-2.png',
        title: 'Evidence-First Workflow',
      },
    ],
    [],
  );

  const openGallery = (src: string, title: string) => {
    setGalleryImage({ src, title });
    setGalleryOpen(true);
  };

  useEffect(() => {
    if (!carouselApi) return;

    setCarouselCount(carouselApi.scrollSnapList().length);
    setCarouselIndex(carouselApi.selectedScrollSnap());

    const onSelect = () => {
      setCarouselIndex(carouselApi.selectedScrollSnap());
    };

    carouselApi.on('select', onSelect);
    carouselApi.on('reInit', onSelect);
    return () => {
      carouselApi.off('select', onSelect);
      carouselApi.off('reInit', onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;
    if (carouselCount <= 1) return;

    const interval = setInterval(() => {
      if (!carouselApi) return;
      if (carouselApi.canScrollNext()) carouselApi.scrollNext();
      else carouselApi.scrollTo(0);
    }, 7000);

    return () => clearInterval(interval);
  }, [carouselApi, carouselCount]);

  const strengths = useMemo(
    () => [
      {
        icon: <Workflow className="h-5 w-5 text-primary" />,
        title: 'Multi-agent orchestration',
        description:
          'Coordinates specialized sub-agents across recon, scanning, manual verification, exploitation validation, QC, and reporting.',
      },
      {
        icon: <Database className="h-5 w-5 text-primary" />,
        title: 'Evidence-first workflow',
        description:
          'Persists large tool outputs and artifacts to prevent lost context and keep long engagements stable.',
      },
      {
        icon: <ClipboardList className="h-5 w-5 text-primary" />,
        title: 'Parallel task management',
        description:
          'Breaks work into trackable tasks, supports task claiming, notes, and artifact linking for team-grade collaboration.',
      },
      {
        icon: <FileText className="h-5 w-5 text-primary" />,
        title: 'Professional reporting',
        description:
          'Generates polished deliverables with evidence, reproduction steps, remediation guidance, and executive-ready summaries.',
      },
    ],
    [],
  );

  const workflow = useMemo(
    () => [
      {
        step: '01',
        title: 'Initialize scope',
        description: 'Define targets, in-scope assets, and rules of engagement.',
      },
      {
        step: '02',
        title: 'Recon & mapping',
        description: 'Discover domains, services, ports, and tech footprint.',
      },
      {
        step: '03',
        title: 'Discovery & enumeration',
        description: 'Enumerate endpoints, parameters, content, and attack surface.',
      },
      {
        step: '04',
        title: 'Automated scanning',
        description: 'Run template-driven and tool-driven scans aligned to the target stack.',
      },
      {
        step: '05',
        title: 'Manual verification',
        description: 'Reproduce, reduce false positives, and validate severity.',
      },
      {
        step: '06',
        title: 'Impact validation',
        description: 'Confirm real-world impact with minimal, documented proof.',
      },
      {
        step: '07',
        title: 'QC review',
        description: 'Review findings for accuracy, severity, and completeness.',
      },
      {
        step: '08',
        title: 'Report generation',
        description: 'Deliver HTML/Markdown/PDF reports with prioritized remediation.',
      },
    ],
    [],
  );

  const keyFeatures = useMemo(
    () => [
      {
        icon: <Target className="h-5 w-5" />,
        title: 'Methodology-aligned execution',
        description: 'Structured phases for consistent, repeatable assessment coverage.',
      },
      {
        icon: <Wrench className="h-5 w-5" />,
        title: 'Adaptive tool selection',
        description: 'Chooses scanners and checks based on recon and tech fingerprinting.',
      },
      {
        icon: <CheckCircle className="h-5 w-5" />,
        title: 'High-signal findings',
        description: 'Evidence, reproduction steps, remediation, and references by default.',
      },
      {
        icon: <Database className="h-5 w-5" />,
        title: 'Operational stability',
        description: 'Stores and summarizes large outputs to avoid context overflows.',
      },
      {
        icon: <Users className="h-5 w-5" />,
        title: 'Team-grade collaboration',
        description: 'Task claiming + notes + artifacts enable parallel workflows.',
      },
      {
        icon: <Layers className="h-5 w-5" />,
        title: 'Extensible tool layer',
        description: 'Tool wrappers make it easy to add scanners and utilities over time.',
      },
    ],
    [],
  );

  const manualApproach = useMemo(
    () => [
      {
        icon: <Users className="h-5 w-5 text-primary" />,
        title: 'Threat modeling & scoping',
        description:
          'Clarify business objectives, trust boundaries, and attacker paths. Define what “success” looks like before tools run.',
      },
      {
        icon: <Lock className="h-5 w-5 text-primary" />,
        title: 'Auth, session, and access control',
        description:
          'Verify identity, authorization, role boundaries, and session handling with targeted manual test cases.',
      },
      {
        icon: <Bug className="h-5 w-5 text-primary" />,
        title: 'Business logic & abuse cases',
        description:
          'Test workflows scanners miss: multi-step flows, pricing/limits, state machines, and privilege edge cases.',
      },
      {
        icon: <GitBranch className="h-5 w-5 text-primary" />,
        title: 'Validation & proof',
        description:
          'Reproduce findings, reduce false positives, and capture minimal evidence that proves impact without overstepping.',
      },
    ],
    [],
  );

  const whatItDoesCards = useMemo(
    () => [
      {
        icon: <Scan className="h-5 w-5 text-primary" />,
        title: 'Orchestrates tools',
        description:
          'Runs scanners and utilities through a unified interface, selecting checks based on recon and fingerprinting.',
      },
      {
        icon: <Database className="h-5 w-5 text-primary" />,
        title: 'Captures evidence',
        description:
          'Stores raw outputs, scan IDs, artifacts, and summaries so long engagements stay stable and auditable.',
      },
      {
        icon: <Workflow className="h-5 w-5 text-primary" />,
        title: 'Coordinates sub-agents',
        description:
          'Splits work across recon, scanning, manual testing, validation, QC, and reporting—without losing context.',
      },
      {
        icon: <FileText className="h-5 w-5 text-primary" />,
        title: 'Produces deliverables',
        description:
          'Generates polished reports with findings, reproduction steps, remediation guidance, and executive summaries.',
      },
    ],
    [],
  );

  const whatItDoesFlow = useMemo(
    () =>
      [
        { label: 'Scope', icon: <Target className="h-4 w-4" /> },
        { label: 'Recon', icon: <Scan className="h-4 w-4" /> },
        { label: 'Scan', icon: <Settings className="h-4 w-4" /> },
        { label: 'Verify', icon: <Bug className="h-4 w-4" /> },
        { label: 'Validate', icon: <CheckCircle className="h-4 w-4" /> },
        { label: 'QC', icon: <ClipboardList className="h-4 w-4" /> },
        { label: 'Report', icon: <FileText className="h-4 w-4" /> },
      ],
    [],
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <span className="text-lg sm:text-xl font-bold">PenDoc</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 lg:py-24">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-[520px] h-[520px] bg-primary/10 rounded-full blur-[110px] animate-pulse" />
            <div
              className="absolute bottom-1/4 right-1/4 w-[420px] h-[420px] bg-accent/10 rounded-full blur-[110px] animate-pulse"
              style={{ animationDelay: '1s' }}
            />
            <div
              className="absolute top-1/2 left-1/2 w-[320px] h-[320px] bg-purple-500/5 rounded-full blur-[90px] animate-pulse"
              style={{ animationDelay: '2s' }}
            />
          </div>

          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

          <div className="container mx-auto px-4 relative">
            <div className="max-w-5xl mx-auto text-center animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-base sm:text-lg font-semibold gradient-cyber animate-gradient-shift cyber-glow-text">
                  OWASP Helper Agent
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-5 tracking-tight leading-tight">
                <span className="text-foreground">AI-powered</span>{' '}
                <span className="gradient-cyber">security testing assistant</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                OWASP Helper is a multi-tool, evidence-first assistant designed for end-to-end web and infrastructure
                assessments—from reconnaissance to validation and professional reporting.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                <Button variant="cyber" size="xl" onClick={() => navigate('/auth?mode=signup')}>
                  Start Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button variant="cyber-outline" size="xl" onClick={() => navigate('/docs')}>
                  <ExternalLink className="h-5 w-5" />
                  Documentation
                </Button>
              </div>

              <div className="max-w-3xl mx-auto">
                <Card className="border-border/60 bg-card/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Lock className="h-5 w-5 text-primary" />
                      Intended use
                    </CardTitle>
                    <CardDescription>
                      Authorized security testing, internal security engineering, and defensive validation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Always obtain explicit permission before testing. OWASP Helper is designed to support structured,
                    repeatable security work—not to facilitate unauthorized activity.
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Strengths */}
        <section className="py-14">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-end justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">Core strengths</h2>
                  <p className="text-muted-foreground mt-2">Built for speed, rigor, and high-quality deliverables.</p>
                </div>
                <Badge variant="secondary" className="hidden sm:inline-flex">Evidence-first • Team-grade</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {strengths.map((item) => (
                  <Card key={item.title} className="border-border/60 bg-card/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">{item.icon}</div>
                        <CardTitle className="text-xl">{item.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="text-muted-foreground">{item.description}</CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Images */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between gap-6 mb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">See it in action</h2>
                  <p className="text-muted-foreground mt-2">Professional visuals with smooth interactions.</p>
                </div>
              </div>

              <div className="relative">
                <Carousel
                  setApi={setCarouselApi}
                  opts={{ loop: true, align: 'center' }}
                  className="max-w-5xl mx-auto"
                >
                  <CarouselContent>
                    {galleryItems.map((item) => (
                      <CarouselItem key={item.src}>
                        <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/30">
                          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <button
                            type="button"
                            onClick={() => openGallery(item.src, item.title)}
                            className="block w-full text-left"
                            aria-label={`Open image: ${item.title}`}
                          >
                            <div className="aspect-[16/9] w-full overflow-hidden">
                              <img
                                src={item.src}
                                alt={item.title}
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                                loading="lazy"
                              />
                            </div>
                            <div className="p-5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-base sm:text-lg font-semibold">{item.title}</div>
                                <Badge variant="outline" className="border-primary/30 text-primary">Zoom</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                Swipe or use arrows • Auto-advances
                              </div>
                            </div>
                          </button>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-3 sm:-left-12 bg-background/70 backdrop-blur" />
                  <CarouselNext className="right-3 sm:-right-12 bg-background/70 backdrop-blur" />
                </Carousel>

                {carouselCount > 1 ? (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    {Array.from({ length: carouselCount }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={
                          'h-2.5 w-2.5 rounded-full transition-all ' +
                          (i === carouselIndex
                            ? 'bg-primary shadow-[0_0_0_4px_rgba(59,130,246,0.12)]'
                            : 'bg-muted-foreground/30 hover:bg-muted-foreground/50')
                        }
                        aria-label={`Go to slide ${i + 1}`}
                        onClick={() => carouselApi?.scrollTo(i)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* What it does */}
        <section className="py-14">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">What it does</h2>
              <p className="text-muted-foreground mb-8 max-w-4xl">
                A unified, evidence-first workflow that combines automation with structure—so output stays consistent,
                traceable, and ready for professional reporting.
              </p>

              {/* Card table */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {whatItDoesCards.map((item) => (
                  <Card key={item.title} className="border-border/60 bg-card/30 group hover:bg-card/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">{item.icon}</div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">{item.description}</CardContent>
                  </Card>
                ))}
              </div>

              {/* Flow visualization */}
              <Card className="border-border/60 bg-card/30 mt-6 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Flow visualization</CardTitle>
                  <CardDescription>From scope to report, with evidence and QC in the loop.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                    {whatItDoesFlow.map((node, idx) => (
                      <div key={node.label} className="flex items-center gap-3 snap-start">
                        <div className="shrink-0">
                          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border/60 bg-background/40 backdrop-blur">
                            <span className="text-primary">{node.icon}</span>
                            <span className="font-medium">{node.label}</span>
                          </div>
                        </div>
                        {idx < whatItDoesFlow.length - 1 ? (
                          <div className="shrink-0 h-px w-10 bg-gradient-to-r from-primary/40 to-accent/40" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">Tip: scroll horizontally on mobile.</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="py-14">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Typical assessment workflow</h2>
              <p className="text-muted-foreground mb-8 max-w-3xl">
                A repeatable flow that scales from quick validations to full engagements.
              </p>

              <Card className="border-border/60 bg-card/30 overflow-hidden">
                <CardContent className="pt-6">
                  <div className="relative">
                    <div className="absolute left-0 right-0 top-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
                      {workflow.map((item) => (
                        <div key={item.step} className="snap-start shrink-0 w-[260px] sm:w-[300px]">
                          <Card className="border-border/60 bg-background/40 backdrop-blur group hover:bg-background/55 transition-colors">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant="outline"
                                  className="border-primary/30 text-primary font-mono group-hover:border-primary/60 transition-colors"
                                >
                                  {item.step}
                                </Badge>
                                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-[1.05] transition-transform">
                                  <ClipboardList className="h-4 w-4 text-primary" />
                                </div>
                              </div>
                              <CardTitle className="text-lg mt-3">{item.title}</CardTitle>
                              <CardDescription className="text-sm">{item.description}</CardDescription>
                            </CardHeader>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Tip: scroll the timeline horizontally.</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Key features */}
        <section className="py-14">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Key features</h2>
              <p className="text-muted-foreground mb-8 max-w-3xl">
                Website-friendly capabilities designed for operators and teams.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {keyFeatures.map((item) => (
                  <Card key={item.title} className="border-border/60 bg-card/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                          {item.icon}
                        </div>
                        <CardTitle className="text-xl">{item.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="text-muted-foreground">{item.description}</CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tooling + Manual */}
        <section className="py-14">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Supported tooling & manual approach</h2>
              <p className="text-muted-foreground mb-8 max-w-4xl">
                OWASP Helper combines tool orchestration with a structured manual testing mindset. Automation accelerates
                discovery; human validation and methodology ensure accuracy and impact.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border/60 bg-card/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Supported tooling
                    </CardTitle>
                    <CardDescription>Orchestrated scanners and utilities (environment-dependent).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="recon">
                        <AccordionTrigger>Recon & OSINT</AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>WHOIS / DNS (whois, dig-style lookups)</li>
                            <li>Certificate transparency (crt.sh enumeration)</li>
                            <li>Subdomain discovery (subfinder, amass)</li>
                            <li>Optional APIs: VirusTotal, Shodan, Hunter, SecurityTrails, HaveIBeenPwned</li>
                            <li>Search aggregation: SearXNG metasearch utilities</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="network">
                        <AccordionTrigger>Network & service enumeration</AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>Nmap port scanning and service fingerprinting</li>
                            <li>HTTP probing / tech detection (httpx, whatweb)</li>
                            <li>SSL/TLS assessment (sslyze, testssl)</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="web">
                        <AccordionTrigger>Web discovery & fuzzing</AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>Content discovery (gobuster, dirb, ffuf)</li>
                            <li>Parameter discovery (arjun, paramspider)</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="scanning">
                        <AccordionTrigger>Vulnerability scanning</AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>Template-based scanning (nuclei templates update/search)</li>
                            <li>Web server checks (nikto)</li>
                            <li>DAST where feasible (OWASP ZAP baseline/spider/active scan/report)</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="utils">
                        <AccordionTrigger>Application testing utilities</AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>HTTP requests (curl helper tooling)</li>
                            <li>Optional browser automation (Playwright-based browsing, screenshots, extraction)</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="intel">
                        <AccordionTrigger>Exploit research & CVE intelligence</AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>ExploitDB workflow (searchsploit search/examine/copy helpers)</li>
                            <li>CVE intelligence (NVD lookups, Vulners searches)</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="auth">
                        <AccordionTrigger>Credential testing (authorized only)</AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>Hydra protocol-specific credential testing helpers</li>
                            <li>Wordlists + SecLists path support (where installed)</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="reporting">
                        <AccordionTrigger>Reporting & evidence management</AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>Report mode: projects, scope items, findings, screenshots, tool outputs</li>
                            <li>Output formats: HTML / Markdown / PDF report generation</li>
                            <li>Session continuity: save/restore pentest sessions (where enabled)</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Manual approach
                    </CardTitle>
                    <CardDescription>How experienced testers confirm impact and reduce false positives.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {manualApproach.map((item) => (
                        <div key={item.title} className="rounded-lg border border-border/60 bg-background/40 p-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">{item.icon}</div>
                            <div className="font-semibold">{item.title}</div>
                          </div>
                          <div className="text-sm text-muted-foreground mt-2">{item.description}</div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                      <div className="font-semibold flex items-center gap-2">
                        <Bug className="h-4 w-4 text-primary" />
                        Common manual checkpoints
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Access control & privilege boundaries</span></div>
                        <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Session fixation / logout / refresh behavior</span></div>
                        <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Input handling & injection surfaces</span></div>
                        <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Security headers & misconfiguration review</span></div>
                        <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Business logic abuse & multi-step flows</span></div>
                        <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Evidence capture for reproducibility</span></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Advantages */}
        <section className="py-14 pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">AI pentest, upgraded</h2>
              <p className="text-muted-foreground mb-8 max-w-4xl">
                The best results come from AI acceleration plus professional validation—delivered through a collaborative
                PenDoc workflow.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-border/60 bg-card/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Scan className="h-5 w-5 text-primary" />
                      Faster coverage
                    </CardTitle>
                    <CardDescription>AI runs repeatable discovery and scanning at scale.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-muted-foreground space-y-2">
                    <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Consistent phase sequencing and checklists</span></div>
                    <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Tool selection adapts to target fingerprinting</span></div>
                    <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Evidence-first storage avoids “lost context”</span></div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Human-grade validation
                    </CardTitle>
                    <CardDescription>Real pentest engineers confirm impact and reduce noise.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-muted-foreground space-y-2">
                    <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Manual verification and exploitability checks</span></div>
                    <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Better severity accuracy and business context</span></div>
                    <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Clear reproduction steps and safe PoCs</span></div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      Collaboration in PenDoc
                    </CardTitle>
                    <CardDescription>Tasks, artifacts, QC, and reporting—together.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-muted-foreground space-y-2">
                    <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Parallel tasks with claiming and notes</span></div>
                    <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>Artifacts linked to findings for traceability</span></div>
                    <div className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /><span>QC-ready workflow and professional deliverables</span></div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-10">
                <Card className="border-border/60 bg-card/30">
                  <CardContent className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                      <div className="text-xl font-semibold">Ready to collaborate on a real engagement?</div>
                      <div className="text-muted-foreground mt-1">
                        Start a project, capture evidence, and deliver reports your clients can act on.
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="cyber" onClick={() => navigate('/auth?mode=signup')}>
                        Get started
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" asChild>
                        <Link to="/">Explore platform</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogContent className="max-w-5xl p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>{galleryImage?.title || 'Preview'}</DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-4">
              {galleryImage ? (
                <img
                  src={galleryImage.src}
                  alt={galleryImage.title}
                  className="w-full h-auto rounded-lg border border-border"
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
}
