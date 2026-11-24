import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteSeoConfig {
  title: string;
  description: string;
  robots: string;
  keywords: string;
}

const DEFAULT_SEO: RouteSeoConfig = {
  title: 'PenDoc | Penetration Testing Documentation Platform',
  description: 'Professional penetration testing documentation and reporting platform for security teams, consultants, and client-ready deliverables.',
  robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
  keywords: 'penetration testing platform, pentest reporting, vulnerability documentation, cybersecurity reporting, security assessments',
};

const ROUTE_SEO: Record<string, RouteSeoConfig> = {
  '/': DEFAULT_SEO,
  '/api-docs': {
    title: 'PenDoc API Documentation',
    description: 'Explore PenDoc API endpoints for projects, vulnerabilities, files, reports, and client collaboration workflows.',
    robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    keywords: 'penetration testing api, security reporting api, vulnerability management api, pentest api documentation',
  },
  '/docs': {
    title: 'PenDoc Documentation Hub',
    description: 'Public product documentation for penetration testers and client portal users, plus PenDoc knowledge-base resources.',
    robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    keywords: 'PenDoc documentation, penetration testing documentation platform, client portal guide, pentester guide',
  },
  '/privacy': {
    title: 'PenDoc Privacy Policy',
    description: 'Review how PenDoc collects, processes, and protects security testing data, account information, and client collaboration records.',
    robots: 'index,follow',
    keywords: 'PenDoc privacy policy, cybersecurity privacy, security testing data protection',
  },
  '/cookies': {
    title: 'PenDoc Cookies Policy',
    description: 'Learn how PenDoc uses cookies and similar technologies for authentication, preferences, and platform operations.',
    robots: 'index,follow',
    keywords: 'PenDoc cookies policy, cybersecurity platform cookies, security app preferences',
  },
  '/auth': {
    title: 'Sign In | PenDoc',
    description: 'Access your PenDoc workspace securely.',
    robots: 'noindex,nofollow,noarchive',
    keywords: 'PenDoc login',
  },
};

function setMeta(selector: string, attributeName: 'name' | 'property', attributeValue: string, content: string) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function setCanonical(url: string) {
  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }

  canonical.setAttribute('href', url);
}

export function RouteSeoManager() {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname;
    const isProtectedRoute = ['/dashboard', '/settings', '/client', '/assistant'].some((prefix) => pathname.startsWith(prefix));

    const config = ROUTE_SEO[pathname] || (isProtectedRoute
      ? {
          title: 'PenDoc Workspace',
          description: 'Secure PenDoc workspace.',
          robots: 'noindex,nofollow,noarchive',
          keywords: 'PenDoc workspace',
        }
      : {
          ...DEFAULT_SEO,
          title: pathname === '/not-found' ? 'Page Not Found | PenDoc' : DEFAULT_SEO.title,
          robots: pathname === '/not-found' ? 'noindex,nofollow,noarchive' : DEFAULT_SEO.robots,
        });

    const canonicalUrl = `${window.location.origin}${pathname}`;
    document.title = config.title;

    setMeta('meta[name="description"]', 'name', 'description', config.description);
    setMeta('meta[name="keywords"]', 'name', 'keywords', config.keywords);
    setMeta('meta[name="robots"]', 'name', 'robots', config.robots);
    setMeta('meta[property="og:title"]', 'property', 'og:title', config.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', config.description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', config.title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', config.description);
    setCanonical(canonicalUrl);
  }, [location.pathname]);

  return null;
}
