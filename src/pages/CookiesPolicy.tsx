import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Cookie, Lock, Settings, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Footer } from '@/components/common/Footer';

export default function CookiesPolicy() {
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
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Cookies Policy</h1>
            <p className="text-muted-foreground text-lg mb-8">
              This policy explains what cookies are, how PenDoc uses them, and how you can manage your preferences.
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '100ms' }}>
              <strong>Last updated:</strong>{' '}
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">What Are Cookies?</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <p>
                  Cookies are small text files stored on your device. They help websites function correctly, remember
                  your preferences, and improve the user experience.
                </p>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">How PenDoc Uses Cookies</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <p>We use cookies and similar technologies for the following purposes:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Essential cookies:</strong> Required for authentication, session management, and security.
                  </li>
                  <li>
                    <strong>Preference cookies:</strong> Remember your settings such as theme and language.
                  </li>
                  <li>
                    <strong>Operational cookies:</strong> Help maintain platform reliability (e.g., load balancing and
                    performance features).
                  </li>
                </ul>
                <p>
                  We do not use third-party advertising cookies, and we do not sell personal data.
                </p>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '250ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">Managing Cookies</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <p>
                  You can control cookies through your browser settings. Most browsers let you block cookies or delete
                  existing cookies.
                </p>
                <p>
                  Note: blocking essential cookies may prevent you from signing in or using parts of the platform.
                </p>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">Contact</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <p>
                  If you have questions about this Cookies Policy, contact us at{' '}
                  <a href="mailto:privacy@pendoc.org" className="text-primary hover:underline">
                    privacy@pendoc.org
                  </a>
                  .
                </p>
              </div>
            </section>

            <p className="text-muted-foreground">
              This Cookies Policy may be updated from time to time. We will post updates on this page and revise the
              “Last updated” date above.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
