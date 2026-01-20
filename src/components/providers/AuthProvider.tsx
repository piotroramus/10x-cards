import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// Create Supabase client for client-side auth
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider manages Supabase authentication state client-side
 * Handles token refresh automatically and provides auth methods
 * 
 * In development mode with DISABLE_AUTH, provides mock authenticated state
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if auth is disabled (for development/testing)
  // Note: Client-side can only access PUBLIC_ prefixed env vars
  // Check PUBLIC_DISABLE_AUTH or if we're in development
  // We'll check localhost inside useEffect since window isn't available during SSR
  const disableAuth = import.meta.env.PUBLIC_DISABLE_AUTH === "true" || 
                      (typeof import.meta.env.DEV !== "undefined" && import.meta.env.DEV);

  useEffect(() => {
    // Re-check disableAuth inside useEffect to ensure it's evaluated correctly
    // Also check if we're on localhost (client-side only check)
    const isDevMode = import.meta.env.PUBLIC_DISABLE_AUTH === "true" || 
                      (typeof import.meta.env.DEV !== "undefined" && import.meta.env.DEV) ||
                      (typeof window !== "undefined" && 
                       (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"));
    
    if (isDevMode) {
      // Development mode: provide mock authenticated state
      console.warn("⚠️  AUTHENTICATION DISABLED - Development mode only!");
      const mockUser = {
        id: import.meta.env.PUBLIC_MOCK_USER_ID || "00000000-0000-0000-0000-000000000000",
        email: "dev@example.com",
        // Add minimal required User properties
      } as User;

      const mockSession = {
        access_token: "mock-token",
        refresh_token: "mock-refresh",
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: "bearer",
        user: mockUser,
      } as Session;

      setUser(mockUser);
      setSession(mockSession);
      setLoading(false);
      return;
    }

    // Normal auth flow: Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [disableAuth]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const getToken = () => {
    if (disableAuth) {
      // In dev mode, return null (API client will omit Authorization header)
      // Backend will handle DISABLE_AUTH mode
      return null;
    }
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  };

  const value: AuthContextValue = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Gets the current session token for API calls (synchronous)
 * Note: This may return null if session hasn't loaded yet
 * For React components, prefer using useAuth().getToken() instead
 * @returns Bearer token string or null if not authenticated
 */
export function getAuthTokenSync(): string | null {
  // This is a synchronous fallback - may not work if session hasn't loaded
  // Prefer using useAuth().getToken() in React components
  try {
    const session = supabase.auth.getSession();
    // getSession returns a promise, so we can't use it synchronously
    // This is a limitation - components should use useAuth hook instead
    return null;
  } catch {
    return null;
  }
}

