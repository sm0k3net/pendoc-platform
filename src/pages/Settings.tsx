import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, User, Lock, Palette, Key, Activity, Upload, Camera, Bell, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ApiTokensManager } from '@/components/dashboard/ApiTokensManager';
import { AuditLogViewer } from '@/components/settings/AuditLogViewer';
import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { useIsMobile } from '@/hooks/use-mobile';

interface Profile {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function Settings() {
  const { user, loading } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Profile fields
  const [profile, setProfile] = useState<Profile>({
    display_name: null,
    first_name: null,
    last_name: null,
    username: null,
    avatar_url: null,
  });

  const passwordStrength = newPassword.length >= 14 ? 'Strong' : newPassword.length >= 8 ? 'Moderate' : newPassword.length > 0 ? 'Weak' : null;

  const settingsTabs = [
    { value: 'profile', icon: User, label: t.settings.profile, helper: t.ui?.profileInformation || 'Profile' },
    { value: 'account', icon: Lock, label: t.settings.account, helper: t.ui?.updateEmailDesc || 'Security' },
    { value: 'notifications', icon: Bell, label: t.notifications?.title || t.settings.notifications || 'Notifications', helper: 'Alerts' },
    { value: 'activity', icon: Activity, label: t.activity?.title || 'Activity', helper: 'Audit' },
    { value: 'api', icon: Key, label: t.settings.apiAccess || 'API & Integrations', helper: 'Access' },
    { value: 'appearance', icon: Palette, label: t.settings.appearance, helper: 'Theme' },
  ];

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?mode=login');
    }
    if (user) {
      setEmail(user.email || '');
      fetchProfile();
    }
  }, [user, loading, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, first_name, last_name, username, avatar_url')
      .eq('id', user.id)
      .single();
    
    if (!error && data) {
      setProfile(data);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: profile.display_name,
        first_name: profile.first_name,
        last_name: profile.last_name,
        username: profile.username,
      })
      .eq('id', user.id);
    
    if (error) {
      if (error.code === '23505') {
        toast({ title: t.ui?.usernameAlreadyTaken || 'Username already taken', description: t.ui?.chooseAnotherUsername || 'Please choose a different username', variant: 'destructive' });
      } else {
        toast({ title: t.settings.error, description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: t.settings.saved });
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;
    
    setUploadingAvatar(true);
    
    // Delete old avatar if exists
    if (profile.avatar_url) {
      const oldPath = profile.avatar_url.split('/').pop();
      if (oldPath) {
        await supabase.storage.from('avatars').remove([`${user.id}/${oldPath}`]);
      }
    }
    
    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });
    
    if (uploadError) {
      toast({ title: t.ui?.avatarUploadError || 'Error uploading avatar', description: uploadError.message, variant: 'destructive' });
      setUploadingAvatar(false);
      return;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);
    
    if (updateError) {
      toast({ title: t.settings.error, description: updateError.message, variant: 'destructive' });
    } else {
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({ title: t.ui?.avatarUpdated || 'Avatar updated successfully' });
    }
    
    setUploadingAvatar(false);
  };

  const handleUpdateEmail = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      toast({ title: t.settings.error, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.settings.saved, description: t.ui?.checkEmailConfirm || 'Check your email to confirm the change.' });
    }
    setSaving(false);
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: t.ui?.passwordsDoNotMatch || 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: t.settings.error, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.settings.saved });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-mono">{t.common.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm px-4 py-3 sm:h-14 sm:py-0 flex items-center">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="shrink-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.ui?.backToDashboard || 'Back to Dashboard'}
        </Button>
        <div className="flex items-center gap-2 ml-4 min-w-0">
          <Shield className="h-5 w-5 text-primary" />
          <div className="min-w-0">
            <div className="font-bold truncate">{t.settings.title}</div>
            <div className="hidden sm:block text-xs text-muted-foreground">Personal preferences, security, notifications, and activity</div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto py-5 sm:py-8 px-4">
        <Tabs defaultValue="profile" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="space-y-4">
              <Card className="bg-muted/20 border-border/70 shadow-sm animate-fade-in">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row lg:flex-col xl:flex-row xl:items-center">
                    <Avatar className="h-14 w-14 ring-2 ring-primary/10">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10">
                        {profile.first_name?.[0] || profile.display_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || t.ui?.profileInformation || 'Profile'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground leading-5">
                    {t.ui?.updatePersonalInfo || 'Update your personal information and avatar'}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-border bg-background/60 p-3">
                      <div className="text-muted-foreground">Theme</div>
                      <div className="mt-1 font-semibold capitalize">{theme}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/60 p-3">
                      <div className="text-muted-foreground">Language</div>
                      <div className="mt-1 font-semibold uppercase">{language}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <TabsList className={`h-auto rounded-xl border border-border bg-muted/30 p-2 ${isMobile ? 'flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap' : 'flex flex-col items-stretch gap-1 lg:sticky lg:top-4'}`}>
                {settingsTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className={`${isMobile ? 'min-w-[140px] justify-start gap-2 rounded-lg px-3 py-2.5' : 'justify-start gap-3 rounded-lg px-3 py-3'} transition-all duration-200 data-[state=active]:shadow-sm`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex flex-col items-start text-left leading-tight">
                        <span>{tab.label}</span>
                        {!isMobile && <span className="text-[11px] font-normal text-muted-foreground">{tab.helper}</span>}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <div className="space-y-6 animate-fade-in">
              <TabsContent value="profile" className="space-y-6">
                <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>{t.ui?.profileInformation || 'Profile Information'}</CardTitle>
                <CardDescription>{t.ui?.updatePersonalInfo || 'Update your personal information and avatar'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl bg-primary/10">
                        {profile.first_name?.[0] || profile.display_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{t.ui?.profilePhoto || 'Profile Photo'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t.ui?.photoHint || 'JPG, PNG or GIF. Max 5MB.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                      >
                        {uploadingAvatar ? <Upload className="h-4 w-4 mr-2 animate-pulse" /> : <Camera className="h-4 w-4 mr-2" />}
                        {uploadingAvatar ? 'Uploading…' : (t.ui?.changePhoto || 'Change photo')}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t.ui?.firstName || 'First Name'}</Label>
                    <Input
                      id="firstName"
                      value={profile.first_name || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t.ui?.lastName || 'Last Name'}</Label>
                    <Input
                      id="lastName"
                      value={profile.last_name || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Doe"
                    />
                  </div>
                </div>


                <div className="space-y-2">
                  <Label htmlFor="username">{t.ui?.username || 'Username'}</Label>
                  <Input
                    id="username"
                    value={profile.username || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                    placeholder="johndoe"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.ui?.usernameHint || 'Lowercase letters, numbers, and underscores only'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">{t.ui?.displayName || 'Display Name'}</Label>
                  <Input
                    id="displayName"
                    value={profile.display_name || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>

                <Button variant="cyber" onClick={handleUpdateProfile} disabled={saving} className="w-full sm:w-auto">
                  {saving ? t.dashboard.saving : t.settings.save}
                </Button>
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="account" className="space-y-6">
                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <CardTitle>{t.settings.changeEmail}</CardTitle>
                    <CardDescription>{t.ui?.updateEmailDesc || 'Update your email address'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t.settings.email}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <Button variant="cyber" onClick={handleUpdateEmail} disabled={saving} className="w-full sm:w-auto">
                      {t.settings.save}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <CardTitle>{t.settings.changePassword}</CardTitle>
                    <CardDescription>{t.ui?.updatePasswordDesc || 'Update your password'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">{t.settings.newPassword}</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      {passwordStrength && (
                        <div className="text-xs text-muted-foreground">
                          Password strength: <span className={`font-medium ${passwordStrength === 'Strong' ? 'text-green-500' : passwordStrength === 'Moderate' ? 'text-yellow-500' : 'text-red-500'}`}>{passwordStrength}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t.settings.confirmNewPassword}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <Button variant="cyber" onClick={handleUpdatePassword} disabled={saving} className="w-full sm:w-auto">
                      {t.settings.save}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <NotificationPreferences />
              </TabsContent>

              <TabsContent value="activity">
                <AuditLogViewer />
              </TabsContent>

              <TabsContent value="api">
                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <CardTitle>{t.ui?.apiAccess || 'API Access'}</CardTitle>
                    <CardDescription>{t.ui?.apiAccessDesc || 'Manage API tokens for programmatic access to your data'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ApiTokensManager />

                    <div className="pt-4 border-t border-border">
                      <h4 className="font-medium mb-2">{t.ui?.documentation || 'Documentation'}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t.ui?.documentationDesc || 'Learn how to use the PenDoc API and integrate with your workflows.'}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate('/api-docs')}>
                          <Key className="h-4 w-4 mr-2" />
                          {t.ui?.apiReference || 'API Reference'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate('/docs')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t.ui?.penDocDocumentation || 'PenDoc Documentation'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appearance" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="border-border/70 shadow-sm">
                    <CardHeader>
                      <CardTitle>{t.settings.theme}</CardTitle>
                      <CardDescription>{t.ui?.chooseTheme || 'Choose your preferred theme'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark')}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="dark" id="dark" />
                          <Label htmlFor="dark">{t.settings.dark}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="light" id="light" />
                          <Label htmlFor="light">{t.settings.light}</Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>

                  <Card className="border-border/70 shadow-sm">
                    <CardHeader>
                      <CardTitle>{t.settings.language}</CardTitle>
                      <CardDescription>{t.ui?.chooseLanguage || 'Choose your preferred language'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup value={language} onValueChange={(v) => setLanguage(v as 'en' | 'ru')}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="en" id="en" />
                          <Label htmlFor="en">🇬🇧 English</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="ru" id="ru" />
                          <Label htmlFor="ru">🇷🇺 Русский</Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
