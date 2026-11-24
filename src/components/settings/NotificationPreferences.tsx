import { useState, useEffect, useCallback } from 'react';
import { Bell, Mail, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface NotificationPrefs {
  email_enabled: boolean;
  email_vulnerability_added: boolean;
  email_vulnerability_updated: boolean;
  email_vulnerability_removed: boolean;
  email_report_generated: boolean;
  email_comment_reply: boolean;
  email_project_created: boolean;
  email_retest_requested: boolean;
}

const defaultPrefs: NotificationPrefs = {
  email_enabled: true,
  email_vulnerability_added: true,
  email_vulnerability_updated: true,
  email_vulnerability_removed: true,
  email_report_generated: true,
  email_comment_reply: true,
  email_project_created: true,
  email_retest_requested: true,
};

export function NotificationPreferences() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPrefs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPrefs({
          email_enabled: data.email_enabled,
          email_vulnerability_added: data.email_vulnerability_added,
          email_vulnerability_updated: data.email_vulnerability_updated,
          email_vulnerability_removed: data.email_vulnerability_removed,
          email_report_generated: data.email_report_generated,
          email_comment_reply: data.email_comment_reply,
          email_project_created: data.email_project_created,
          email_retest_requested: data.email_retest_requested,
        });
      } else {
        // Create default preferences
        const { error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id, ...defaultPrefs });
        if (insertError) console.error('Error creating prefs:', insertError);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: user.id, ...prefs }, { onConflict: 'user_id' });

      if (error) throw error;
      toast({ title: t.settings.saved });
    } catch (error: unknown) {
      toast({ title: t.settings.error, description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-sm animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t.notifications?.title || 'Email Notifications'}
        </CardTitle>
        <CardDescription>
          {t.notifications?.description || 'Configure which email notifications you want to receive'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Email delivery</div>
            <div className="mt-2 text-lg font-semibold">{prefs.email_enabled ? 'Enabled' : 'Paused'}</div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Active triggers</div>
            <div className="mt-2 text-lg font-semibold">{Object.values(prefs).filter(Boolean).length - (prefs.email_enabled ? 1 : 0)}</div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Channel</div>
            <div className="mt-2 text-lg font-semibold">Email</div>
          </div>
        </div>

        {/* Master toggle */}
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/60 p-4">
          <div className="space-y-0.5">
            <Label htmlFor="email_enabled" className="font-medium">
              {t.notifications?.enableEmails || 'Enable email notifications'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t.notifications?.enableEmailsDesc || 'Receive email notifications for important events'}
            </p>
          </div>
          <Switch
            id="email_enabled"
            checked={prefs.email_enabled}
            onCheckedChange={() => handleToggle('email_enabled')}
          />
        </div>

        {prefs.email_enabled && (
          <>
            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t.notifications?.eventTypes || 'Event types'}
              </h4>

              <div className="grid gap-3">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <div>
                    <Label htmlFor="email_vulnerability_added">
                      {t.notifications?.vulnerabilityAdded || 'Vulnerability added'}
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">Receive updates when new vulnerabilities are added to tracked projects.</p>
                  </div>
                  <Switch
                    id="email_vulnerability_added"
                    checked={prefs.email_vulnerability_added}
                    onCheckedChange={() => handleToggle('email_vulnerability_added')}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <div>
                    <Label htmlFor="email_vulnerability_updated">
                      {t.notifications?.vulnerabilityUpdated || 'Vulnerability updated'}
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">Stay informed when severity, evidence, or status changes.</p>
                  </div>
                  <Switch
                    id="email_vulnerability_updated"
                    checked={prefs.email_vulnerability_updated}
                    onCheckedChange={() => handleToggle('email_vulnerability_updated')}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <div>
                    <Label htmlFor="email_vulnerability_removed">
                      {t.notifications?.vulnerabilityRemoved || 'Vulnerability removed'}
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">Track remediation closures and removed findings.</p>
                  </div>
                  <Switch
                    id="email_vulnerability_removed"
                    checked={prefs.email_vulnerability_removed}
                    onCheckedChange={() => handleToggle('email_vulnerability_removed')}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <div>
                    <Label htmlFor="email_report_generated">
                      {t.notifications?.reportGenerated || 'Report generated'}
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">Get notified when client-facing deliverables are ready.</p>
                  </div>
                  <Switch
                    id="email_report_generated"
                    checked={prefs.email_report_generated}
                    onCheckedChange={() => handleToggle('email_report_generated')}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <div>
                    <Label htmlFor="email_comment_reply">
                      {t.notifications?.commentReply || 'Comment or reply'}
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">Follow collaboration activity across findings and reviews.</p>
                  </div>
                  <Switch
                    id="email_comment_reply"
                    checked={prefs.email_comment_reply}
                    onCheckedChange={() => handleToggle('email_comment_reply')}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <div>
                    <Label htmlFor="email_project_created">
                      {t.notifications?.projectCreated || 'Project created'}
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">Know when new engagements are opened in your workspace.</p>
                  </div>
                  <Switch
                    id="email_project_created"
                    checked={prefs.email_project_created}
                    onCheckedChange={() => handleToggle('email_project_created')}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <div>
                    <Label htmlFor="email_retest_requested">
                      {t.notifications?.retestRequested || 'Re-test requested'}
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">Receive retest requests quickly so remediation validation does not stall.</p>
                  </div>
                  <Switch
                    id="email_retest_requested"
                    checked={prefs.email_retest_requested}
                    onCheckedChange={() => handleToggle('email_retest_requested')}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="pt-4">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.dashboard.saving}
              </>
            ) : (
              t.settings.save
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
