import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Mail, Plus, Trash2, Loader2, Save, Shield, Sun, Moon, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NotificationEmail {
  id: string;
  email: string;
  is_verified: boolean;
}

export default function ClientSettings() {
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientAccessId, setClientAccessId] = useState<string | null>(null);
  const [notificationEmails, setNotificationEmails] = useState<NotificationEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?mode=login&type=client');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchClientAccess();
    }
  }, [user]);

  const fetchClientAccess = async () => {
    try {
      const { data: clientAccess, error: accessError } = await supabase
        .from('client_access')
        .select('id')
        .eq('client_user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();

      if (accessError) throw accessError;

      if (!clientAccess) {
        navigate('/');
        return;
      }

      setClientAccessId(clientAccess.id);

      // Fetch notification emails
      const { data: emails, error: emailsError } = await supabase
        .from('client_notification_emails')
        .select('*')
        .eq('client_access_id', clientAccess.id)
        .order('created_at', { ascending: true });

      if (emailsError) throw emailsError;
      setNotificationEmails(emails || []);
    } catch (error) {
      console.error('Error fetching client access:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim() || !clientAccessId) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast({ title: 'Invalid email format', variant: 'destructive' });
      return;
    }

    // Check limit of 5 emails
    if (notificationEmails.length >= 5) {
      toast({ title: 'Maximum 5 notification emails allowed', variant: 'destructive' });
      return;
    }

    setAddingEmail(true);
    try {
      const { error } = await supabase
        .from('client_notification_emails')
        .insert({
          client_access_id: clientAccessId,
          email: newEmail.trim().toLowerCase(),
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'This email is already added', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: 'Email added successfully' });
      setNewEmail('');
      fetchClientAccess();
    } catch (error) {
      console.error('Error adding email:', error);
      toast({ title: 'Error adding email', variant: 'destructive' });
    } finally {
      setAddingEmail(false);
    }
  };

  const handleRemoveEmail = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('client_notification_emails')
        .delete()
        .eq('id', emailId);

      if (error) throw error;

      toast({ title: 'Email removed' });
      fetchClientAccess();
    } catch (error) {
      console.error('Error removing email:', error);
      toast({ title: 'Error removing email', variant: 'destructive' });
    }
  };


  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/client')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">Client Settings</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      <ScrollArea className="h-[calc(100dvh-56px)]">
        <div className="container max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Profile Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={user?.email || ''} disabled />
                <p className="text-xs text-muted-foreground">
                  Contact your project administrator to change your email address.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Appearance</CardTitle>
              <CardDescription>Customize how the dashboard looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-xs text-muted-foreground">Choose between light and dark mode</p>
                </div>
                <Select value={theme} onValueChange={(value: 'dark' | 'light') => setTheme(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Language</Label>
                  <p className="text-xs text-muted-foreground">Choose your preferred language</p>
                </div>
                <Select value={language} onValueChange={(value: 'en' | 'ru') => setLanguage(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Emails */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Notification Emails
              </CardTitle>
              <CardDescription>
                Add up to 5 additional email addresses to receive project notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email List */}
              {notificationEmails.length > 0 ? (
                <div className="space-y-2">
                  {notificationEmails.map((email) => (
                    <div key={email.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{email.email}</span>
                        {email.is_verified ? (
                          <Badge variant="outline" className="text-green-500 border-green-500 text-[10px]">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500 text-[10px]">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleRemoveEmail(email.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No additional notification emails</p>
                </div>
              )}

              {/* Add Email */}
              {notificationEmails.length < 5 && (
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <Button onClick={handleAddEmail} disabled={addingEmail || !newEmail.trim()}>
                    {addingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {5 - notificationEmails.length} email slots remaining
              </p>
            </CardContent>
          </Card>

          {/* Email Notification Preferences */}
          <NotificationPreferences />

          {/* Security Note - Password management removed for clients */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your account is managed by your project administrator. Access is provided through secure tokens. 
                Contact your administrator if you need to change your access credentials.
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
