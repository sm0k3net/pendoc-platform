import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { auditNow, flushAuditLogs } from '@/lib/audit';
import { mapSupabaseError, logError } from '@/lib/errors';
import { clearCsrfToken, rotateCsrfToken } from '@/lib/csrf';
import { getPublicOrigin } from '@/lib/url';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Audit auth state changes
        if (event === 'SIGNED_IN' && session?.user) {
          auditNow({
            action: 'auth.login',
            success: true,
            details: { method: 'session_restore' },
          });
        } else if (event === 'SIGNED_OUT') {
          // Flush any pending audit logs before session ends
          flushAuditLogs();
        } else if (event === 'TOKEN_REFRESHED') {
          auditNow({
            action: 'auth.session_refresh',
            success: true,
          });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        const appError = mapSupabaseError(error, { email });
        logError(appError);
        
        await auditNow({
          action: 'auth.login',
          success: false,
          errorMessage: appError.userMessage,
          details: { email },
        });
        
        return { error: error as Error };
      }

      // Rotate CSRF token on successful login
      rotateCsrfToken();

      await auditNow({
        action: 'auth.login',
        success: true,
        details: { email, method: 'password' },
      });

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      logError(mapSupabaseError(error, { email }));
      return { error };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      // Use the current origin for the redirect URL
      const currentOrigin = getPublicOrigin();
      const redirectUrl = `${currentOrigin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { display_name: displayName },
        },
      });

      if (error) {
        const appError = mapSupabaseError(error, { email });
        logError(appError);
        
        await auditNow({
          action: 'auth.signup',
          success: false,
          errorMessage: appError.userMessage,
          details: { email },
        });
        
        return { error: error as Error };
      }

      await auditNow({
        action: 'auth.signup',
        success: true,
        details: { email },
      });

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Signup failed');
      logError(mapSupabaseError(error, { email }));
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await auditNow({
        action: 'auth.logout',
        success: true,
      });
      
      // Flush pending logs before signing out
      await flushAuditLogs();
      
      // Clear CSRF token on logout for security
      clearCsrfToken();
      
      await supabase.auth.signOut();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Logout failed');
      logError(mapSupabaseError(error));
      // Still try to sign out even if audit fails
      clearCsrfToken();
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
