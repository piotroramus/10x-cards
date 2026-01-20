/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: {
        id: string;
        email: string;
      };
      isAuthenticated?: boolean;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly PUBLIC_SUPABASE_URL: string; // Client-side accessible Supabase URL
  readonly PUBLIC_SUPABASE_KEY: string; // Client-side accessible Supabase anon key
  readonly OPENROUTER_API_KEY: string;
  readonly DEV?: boolean; // Astro development mode flag
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
