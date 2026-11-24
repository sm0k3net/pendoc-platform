import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Eye, EyeOff, ArrowLeft, Users, UserCheck, Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { getPublicOrigin } from '@/lib/url';

const invitationStorageKey = 'pendoc.pending-client-invitation';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  );
  const [userType, setUserType] = useState<'pentester' | 'client'>(
    searchParams.get('type') === 'client' ? 'client' : 'pentester'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Client-specific fields
  const [accessToken, setAccessToken] = useState(searchParams.get('invitation') ?? '');

  const { signIn, signUp, user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function completeSignIn() {
      const pending = sessionStorage.getItem(invitationStorageKey);
      if (pending) {
        const { data, error } = await supabase.rpc('accept_client_invitation', { p_token: pending });
        if (!active) return;
        if (error || !data) {
          sessionStorage.removeItem(invitationStorageKey);
          await supabase.auth.signOut();
          if (!active) return;
          toast({ title: 'Invitation could not be accepted', description: 'Check the address, token and expiration with your project owner.', variant: 'destructive' });
          return;
        }
        sessionStorage.removeItem(invitationStorageKey);
        navigate('/client', { replace: true });
        return;
      }

      if (searchParams.has('invitation')) return;
      const { data } = await supabase.from('client_access').select('id')
        .eq('client_user_id', user.id).eq('is_active', true).limit(1);
      if (!active) return;
      navigate(data?.length || searchParams.get('type') === 'client' ? '/client' : '/dashboard', { replace: true });
    }

    void completeSignIn();
    return () => { active = false; };
  }, [user, navigate, searchParams, toast]);

  const handleGoogleAuth = async () => {
    setLoading(true);
    const redirectTo = `${getPublicOrigin()}/auth`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    // Note: on success, Supabase redirects away immediately.
    if (error) {
      toast({
        title: 'Google sign-in failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handlePentesterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'signup' && password !== confirmPassword) {
      toast({
        title: t.auth.passwordMismatch,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { error } = mode === 'login' 
      ? await signIn(email, password)
      : await signUp(email, password, displayName);

    if (error) {
      toast({
        title: mode === 'login' ? t.auth.loginError : t.auth.signupError,
        description: error.message,
        variant: 'destructive',
      });
    } else if (mode === 'signup') {
      toast({
        title: 'Check your email',
        description: 'We sent you a confirmation link.',
      });
    }

    setLoading(false);
  };

  const handleClientLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const invitation = accessToken.trim();
    setLoading(true);

    try {
      if (user) {
        if (invitation) {
          const { data, error } = await supabase.rpc('accept_client_invitation', { p_token: invitation });
          if (error || !data) throw new Error('Use the verified email address on the invitation.');
        }
        navigate('/client', { replace: true });
        return;
      }

      if (invitation) sessionStorage.setItem(invitationStorageKey, invitation);
      else sessionStorage.removeItem(invitationStorageKey);

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${getPublicOrigin()}/auth?type=client`,
          shouldCreateUser: Boolean(invitation),
        },
      });
      if (error) throw error;
      toast({ title: 'Check your email', description: 'Open the sign-in link in this browser to continue.' });
    } catch {
      sessionStorage.removeItem(invitationStorageKey);
      toast({ title: 'Client sign-in could not be completed', description: 'Check the address and invitation, or contact your project owner.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <Shield className="h-24 w-24 text-primary mb-8 cyber-glow-text" />
          <h1 className="text-4xl font-bold mb-4 gradient-cyber">
            {t.landing.title}
          </h1>
          <p className="text-lg text-muted-foreground text-center max-w-md">
            {t.landing.subtitle}
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6 animate-fade-in">
            <div className="text-center lg:hidden mb-8">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold gradient-cyber">
                {t.landing.title}
              </h1>
            </div>

            {/* User Type Tabs - only show for login mode */}
            {mode === 'login' ? (
              <Tabs value={userType} onValueChange={(v) => setUserType(v as 'pentester' | 'client')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pentester" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Pentester
                  </TabsTrigger>
                  <TabsTrigger value="client" className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Client
                  </TabsTrigger>
                </TabsList>

                {/* Pentester Login */}
                <TabsContent value="pentester" className="space-y-6 mt-6">
                  <div className="space-y-2 text-center">
                    <h2 className="text-2xl font-bold">{t.auth.login}</h2>
                    <p className="text-sm text-muted-foreground">
                      Security professionals and pentesters
                    </p>
                  </div>

                  <form onSubmit={handlePentesterSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t.auth.email}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-secondary/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">{t.auth.password}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="bg-secondary/50 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button type="submit" variant="cyber" className="w-full" disabled={loading}>
                      {loading ? t.auth.loggingIn : t.auth.login}
                    </Button>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleAuth}
                      disabled={loading}
                    >
                      <Chrome className="mr-2 h-4 w-4" />
                      Continue with Google
                    </Button>
                  </form>

                  <div className="text-center text-sm">
                    <p className="text-muted-foreground">
                      {t.auth.noAccount}{' '}
                      <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className="text-primary hover:underline font-medium"
                      >
                        {t.auth.signup}
                      </button>
                    </p>
                  </div>
                </TabsContent>

                {/* Client Login */}
                <TabsContent value="client" className="space-y-6 mt-6">
                  <div className="space-y-2 text-center">
                    <h2 className="text-2xl font-bold">Client Access</h2>
                    <p className="text-sm text-muted-foreground">
                      Sign in using the email address on your invitation.
                    </p>
                  </div>

                  <form onSubmit={handleClientLogin} className="space-y-4">
                    {!user && (
                      <div className="space-y-2">
                        <Label htmlFor="clientEmail">Email address</Label>
                        <Input id="clientEmail" type="email" autoComplete="email" value={email}
                          onChange={(event) => setEmail(event.target.value)} required />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="accessToken">Invitation token</Label>
                      <div className="relative">
                        <Input
                          id="accessToken"
                          type={showPassword ? 'text' : 'password'}
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          placeholder="Required when accepting an invitation"
                          className="bg-secondary/50 pr-10 font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Returning clients can leave the token blank.
                      </p>
                    </div>

                    <Button type="submit" variant="cyber" className="w-full" disabled={loading}>
                      {loading ? 'Please wait…' : user ? 'Accept invitation' : 'Email me a sign-in link'}
                    </Button>
                  </form>

                  <div className="text-center text-sm">
                    <p className="text-muted-foreground">
                      Don't have an access token?{' '}
                      <span className="text-primary">Contact your project administrator</span>
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              /* Signup mode - only for pentesters */
              <div className="space-y-6">
                <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-bold">{t.auth.signup}</h2>
                  <p className="text-sm text-muted-foreground">
                    Create your pentester account
                  </p>
                </div>

                <form onSubmit={handlePentesterSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">{t.auth.displayName}</Label>
                    <Input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t.auth.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-secondary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">{t.auth.password}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-secondary/50 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-secondary/50"
                    />
                  </div>

                  <Button type="submit" variant="cyber" className="w-full" disabled={loading}>
                    {loading ? t.auth.signingUp : t.auth.signup}
                  </Button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                  >
                    <Chrome className="mr-2 h-4 w-4" />
                    Continue with Google
                  </Button>
                </form>

                <div className="text-center text-sm">
                  <p className="text-muted-foreground">
                    {t.auth.hasAccount}{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-primary hover:underline font-medium"
                    >
                      {t.auth.login}
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
