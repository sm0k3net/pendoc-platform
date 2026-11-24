import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Shield,
  Globe,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
  Menu,
  X,
  ExternalLink,
  Code,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { knowledgeBaseGuides, knowledgeBaseArticles, KnowledgeBaseEntry } from '@/content/knowledgeBase';

function slugifyHeading(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface DocsSidebarProps {
  currentEntry?: KnowledgeBaseEntry;
}

interface NavItemProps {
  to: string;
  label: string;
  isActive: boolean;
  icon?: React.ReactNode;
  onNav: () => void;
  indent?: boolean;
}

function NavItem({ to, label, isActive, icon, onNav, indent }: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onNav}
      className={`
        flex items-center gap-2 rounded-lg py-1.5 text-sm leading-snug transition-colors
        ${indent ? 'px-5' : 'px-3'}
        ${isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        }
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
      {label}
    </p>
  );
}

export function DocsSidebar({ currentEntry }: DocsSidebarProps) {
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  const isOnArticle = location.pathname.startsWith('/articles/');
  const [articlesOpen, setArticlesOpen] = useState(isOnArticle);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const closeMobile = () => setMobileOpen(false);

  const ui =
    language === 'ru'
      ? {
          home: 'Главная',
          docsHub: 'Документация',
          guides: 'Гайды',
          articles: 'Статьи',
          onThisPage: 'На этой странице',
          apiDocs: 'API Документация',
          platform: 'Войти в платформу',
        }
      : {
          home: 'Home',
          docsHub: 'Documentation',
          guides: 'Guides',
          articles: 'Articles',
          onThisPage: 'On this page',
          apiDocs: 'API Docs',
          platform: 'Go to platform',
        };

  // Language-aware sections for TOC
  const tocSections =
    currentEntry
      ? language === 'ru' && currentEntry.sectionsRu?.length
        ? currentEntry.sectionsRu
        : currentEntry.sections
      : [];

  const SidebarContent = () => (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top: logo + language toggle */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
        <Link to="/" className="flex items-center gap-2" onClick={closeMobile}>
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold tracking-tight">PenDoc</span>
        </Link>
        <button
          onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          title={language === 'en' ? 'Switch to Russian' : 'Переключить на английский'}
        >
          <Globe className="h-3 w-3" />
          {language.toUpperCase()}
        </button>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <NavItem to="/" label={ui.home} isActive={isActive('/')} onNav={closeMobile} />
        <NavItem
          to="/docs"
          label={ui.docsHub}
          isActive={isActive('/docs')}
          icon={<BookOpen className="h-3.5 w-3.5" />}
          onNav={closeMobile}
        />

        {/* Guides */}
        <SectionLabel label={ui.guides} />
        {knowledgeBaseGuides.map((guide) => {
          const title =
            language === 'ru' && guide.titleRu ? guide.titleRu : guide.title;
          return (
            <NavItem
              key={guide.slug}
              to={`/docs/${guide.slug}`}
              label={title}
              isActive={isActive(`/docs/${guide.slug}`)}
              icon={<FileText className="h-3.5 w-3.5" />}
              onNav={closeMobile}
            />
          );
        })}

        {/* Articles — collapsible */}
        <button
          onClick={() => setArticlesOpen((v) => !v)}
          className="flex w-full items-center justify-between pb-1 pl-3 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          <span>{ui.articles}</span>
          {articlesOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        {articlesOpen &&
          knowledgeBaseArticles.map((article) => (
            <NavItem
              key={article.slug}
              to={`/articles/${article.slug}`}
              label={article.title}
              isActive={isActive(`/articles/${article.slug}`)}
              icon={<FileText className="h-3.5 w-3.5" />}
              onNav={closeMobile}
              indent
            />
          ))}

        {/* On this page TOC */}
        {tocSections.length > 0 && (
          <div className="mt-2 border-t border-border/40 pt-2">
            <SectionLabel label={ui.onThisPage} />
            {tocSections.map((section) => (
              <a
                key={section.title}
                href={`#${slugifyHeading(section.title)}`}
                onClick={closeMobile}
                className="flex items-center gap-2 truncate rounded-lg px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
                <span className="truncate">{section.title}</span>
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom links */}
      <div className="shrink-0 space-y-0.5 border-t border-border/60 px-2 py-3">
        <NavItem
          to="/api-docs"
          label={ui.apiDocs}
          isActive={isActive('/api-docs')}
          icon={<Code className="h-3.5 w-3.5" />}
          onNav={closeMobile}
        />
        <Link
          to="/auth?mode=login"
          onClick={closeMobile}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{ui.platform}</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed left-3 top-3 z-50 rounded-lg border border-border bg-card p-2 shadow-md lg:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card
          transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
