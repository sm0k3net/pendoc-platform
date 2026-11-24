import { Link } from 'react-router-dom';
import { ExternalLink, Shield, Mail, BookOpen } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 py-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Branding & Copyright */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">PenDoc</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered penetration testing documentation, collaboration, and reporting.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                to="/docs"
                className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <BookOpen className="h-4 w-4" />
                Docs
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">
              © {currentYear} PenDoc
            </div>
          </div>

          {/* Platform */}
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-sm">Platform</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link
                to="/auth?mode=signup"
                className="hover:text-primary transition-colors"
              >
                Get Started
              </Link>
              <Link
                to="/auth?mode=login"
                className="hover:text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/api-docs"
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <BookOpen className="h-3 w-3" />
                API Documentation
              </Link>
              <Link
                to="/assistant"
                className="hover:text-primary transition-colors"
              >
                AI Security Assistant
              </Link>
            </div>
          </div>

          {/* Services */}
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-sm">Services</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a
                href="https://tools.pendoc.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                PenDoc Tools
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://ide.pendoc.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                PenDoc IDE
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://ai.pendoc.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                PenDoc AI
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://bin.pendoc.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                PenDoc Bin
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://cheatsheets.pendoc.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                PenDoc Cheatsheets
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://test.pendoc.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                Dummy Targets & Labs
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Contact & Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-sm">Contact & Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a
                href="mailto:info@pendoc.org"
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <Mail className="h-3 w-3" />
                info@pendoc.org
              </a>
              <a
                href="mailto:privacy@pendoc.org"
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <Mail className="h-3 w-3" />
                privacy@pendoc.org
              </a>
              <Link
                to="/privacy"
                className="hover:text-primary transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/cookies"
                className="hover:text-primary transition-colors"
              >
                Cookies Policy
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>Built for security professionals, by security professionals.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Shield className="h-4 w-4 text-primary" />
              Secure by design
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
