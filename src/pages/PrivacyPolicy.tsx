import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Server, Mail, Users, Database, Globe, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Footer } from '@/components/common/Footer';

export default function PrivacyPolicy() {
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
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground text-lg mb-8">
              Your privacy matters to us. This policy explains how PenDoc collects, uses, and protects your information.
            </p>
          </div>
          
          <div className="prose prose-invert max-w-none space-y-8">
            <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '100ms' }}>
              <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">Information We Collect</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <p>
                  PenDoc collects information necessary to provide our penetration testing documentation services:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Account Information:</strong> Email address, display name, and optional profile information when you create an account</li>
                  <li><strong>Project Data:</strong> Penetration testing documentation including projects, folders, files, vulnerability reports, and client information you create</li>
                  <li><strong>Imported Data:</strong> Vulnerability data from scanner reports (Nessus, Acunetix, Nmap) that you choose to upload</li>
                  <li><strong>Usage Data:</strong> Information about how you interact with our platform to improve our services</li>
                  <li><strong>API Usage:</strong> API tokens and request logs for programmatic access to your data</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">How We Use Your Information</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Provide, maintain, and improve our penetration testing documentation platform</li>
                  <li>Process and store your vulnerability documentation and project data</li>
                  <li>Generate security reports based on your documented findings</li>
                  <li>Enable collaboration features between team members and clients</li>
                  <li>Send essential service communications about your account</li>
                  <li>Ensure platform security and prevent abuse</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '250ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">Data Sharing</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <p>
                  We do not sell your personal information. Data sharing occurs only in these circumstances:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>With Your Consent:</strong> When you share projects with team members or grant clients access to the client portal</li>
                  <li><strong>Service Providers:</strong> Third-party services that help us operate (hosting, database services) under strict data protection agreements</li>
                  <li><strong>Legal Requirements:</strong> If required by law or to protect our legal rights</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">Data Security</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <p>
                  We implement industry-standard security measures appropriate for a security-focused platform:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Encryption in Transit:</strong> All data is transmitted using TLS/SSL encryption</li>
                  <li><strong>Secure Authentication:</strong> Password hashing and secure session management</li>
                  <li><strong>Row-Level Security:</strong> Database-level access controls ensure users only access their own data</li>
                  <li><strong>API Security:</strong> Token-based authentication with secure token storage</li>
                  <li><strong>Access Controls:</strong> Granular permissions for team collaboration and client access</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '350ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">Data Retention</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Your project data is retained as long as your account is active</li>
                  <li>You can delete projects, vulnerabilities, and files at any time</li>
                  <li>Account deletion removes all associated data permanently</li>
                  <li>Backup data is retained for up to 30 days for disaster recovery</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">Your Rights</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <p>You have the following rights regarding your data:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Access:</strong> View and export your data at any time through the platform</li>
                  <li><strong>Correction:</strong> Update your profile and project information</li>
                  <li><strong>Deletion:</strong> Delete individual items or your entire account</li>
                  <li><strong>Portability:</strong> Export projects as ZIP archives with all data</li>
                  <li><strong>Restriction:</strong> Contact us to restrict processing of your data</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '450ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">International Transfers</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <p>
                  Your data may be processed in countries outside your residence. We ensure appropriate 
                  safeguards are in place for any international data transfers, including standard 
                  contractual clauses where required.
                </p>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '500ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">Cookies & Tracking</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Essential Cookies:</strong> Required for authentication and session management</li>
                  <li><strong>Preference Cookies:</strong> Remember your theme and language settings</li>
                  <li>We do not use third-party advertising or tracking cookies</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '550ms' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold m-0">Contact Us</h2>
              </div>
              <div className="pl-12 space-y-3 text-muted-foreground">
                <p>
                  If you have questions about this Privacy Policy or want to exercise your data rights, contact us at:
                </p>
                <p>
                  <a href="mailto:privacy@pendoc.org" className="text-primary hover:underline">
                    privacy@pendoc.org
                  </a>
                </p>
                <p>
                  For general inquiries:{' '}
                  <a href="mailto:info@pendoc.org" className="text-primary hover:underline">
                    info@pendoc.org
                  </a>
                </p>
              </div>
            </section>

            <section className="mt-12 p-6 rounded-lg border border-border bg-card/50 animate-fade-in" style={{ animationDelay: '600ms' }}>
              <p className="text-sm text-muted-foreground">
                This Privacy Policy may be updated from time to time. We will notify you of any significant changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued 
                use of PenDoc after changes constitutes acceptance of the updated policy.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
