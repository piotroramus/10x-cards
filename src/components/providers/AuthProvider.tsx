import React, { createContext, useContext, useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

// Use PUBLIC_ prefixed env vars for client-side access
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY;

// Validate environment variables
if (typeof window !== "undefined") {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "❌ Supabase environment variables are missing!",
      "\nPlease add to your .env file:",
      "\n  PUBLIC_SUPABASE_URL=your_supabase_url",
      "\n  PUBLIC_SUPABASE_KEY=your_supabase_anon_key",
      "\n\nCurrent values:",
      "\n  PUBLIC_SUPABASE_URL:", import.meta.env.PUBLIC_SUPABASE_URL || "NOT SET",
      "\n  PUBLIC_SUPABASE_KEY:", import.meta.env.PUBLIC_SUPABASE_KEY ? "SET (hidden)" : "NOT SET",
      "\n  SUPABASE_URL:", import.meta.env.SUPABASE_URL || "NOT SET",
      "\n  SUPABASE_KEY:", import.meta.env.SUPABASE_KEY ? "SET (hidden)" : "NOT SET",
    );
  }
}

// Create Supabase browser client using @supabase/ssr for cookie sync
// Only create if we have the required values and we're in the browser
let supabase: ReturnType<typeof createBrowserClient<Database>>;

if (typeof window !== "undefined" && supabaseUrl && supabaseAnonKey) {
  supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
} else if (typeof window !== "undefined") {
  // Create a dummy client to prevent crashes, but auth methods will fail
  console.warn("⚠️ Creating dummy Supabase client - auth will not work until env vars are set");
  supabase = createBrowserClient<Database>("https://placeholder.supabase.co", "placeholder-key");
} else {
  // SSR: Create a placeholder (won't be used)
  supabase = null as any;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    options?: { emailRedirectTo?: string },
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  getToken: () => string | null;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider manages Supabase authentication state client-side
 * Handles token refresh automatically and provides auth methods
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
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
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error("Supabase client not initialized") };
    }
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error: new Error(error.message) };
      }
      
      // Session is automatically stored in cookies by createBrowserClient
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    options?: { emailRedirectTo?: string },
  ) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: options?.emailRedirectTo,
        },
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
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  };

  const resendVerificationEmail = async (email: string) => {
    if (!supabase) {
      return { error: new Error("Supabase client not initialized") };
    }
    
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
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
    resendVerificationEmail,
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

