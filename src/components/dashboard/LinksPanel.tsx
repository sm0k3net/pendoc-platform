import { ExternalLink, FileCode, BookOpen, Search, ShieldCheck, Wrench, Rss, MailWarning } from 'lucide-react';

const services = [
  { 
    name: 'PenDoc Tools', 
    url: 'https://tools.pendoc.org/',
    description: 'Security testing utilities and helpers',
    icon: Wrench,
  },
  { 
    name: 'PenDoc IDE', 
    url: 'https://ide.pendoc.org/',
    description: 'Online integrated development environment',
    icon: FileCode,
  },
  { 
    name: 'PenDoc Scan', 
    url: 'https://scan.pendoc.org/',
    description: 'Scanning workflows and assessment operations',
    icon: Search,
  },
  { 
    name: 'PenDoc Bin', 
    url: 'https://bin.pendoc.org/',
    description: 'Secure code & text sharing',
    icon: FileCode,
  },
  { 
    name: 'PenDoc Cheatsheets', 
    url: 'https://cheatsheets.pendoc.org/',
    description: 'Security testing references',
    icon: BookOpen,
  },
  { 
    name: 'PenDoc Feed', 
    url: 'https://feed.pendoc.org/',
    description: 'Security feed and latest updates',
    icon: Rss,
  },
  { 
    name: 'PenDoc Phish', 
    url: 'https://phish.pendoc.org/',
    description: 'Phishing simulation and awareness workflows',
    icon: MailWarning,
  },
];

export function ServicesPanel() {
  return (
    <div className="p-2 space-y-2">
      <div className="px-2 py-1.5 rounded-md border border-border/60 bg-background/60 text-xs text-muted-foreground flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        Official PenDoc service endpoints
      </div>
      {services.map((service) => (
        <a
          key={service.url}
          href={service.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <service.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 font-medium text-sm">
                <span className="truncate">{service.name}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground truncate">{service.description}</p>
              <p className="text-[11px] text-primary/80 truncate mt-0.5">{service.url.replace('https://', '')}</p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
