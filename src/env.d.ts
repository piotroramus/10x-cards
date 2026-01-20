/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly DISABLE_AUTH?: string; // Set to "true" to disable authentication (development only, server-side)
  readonly MOCK_USER_ID?: string; // Mock user ID when DISABLE_AUTH=true (optional, server-side)
  readonly PUBLIC_DISABLE_AUTH?: string; // Set to "true" to disable authentication client-side (development only)
  readonly PUBLIC_MOCK_USER_ID?: string; // Mock user ID for client-side when PUBLIC_DISABLE_AUTH=true
  readonly DEV?: boolean; // Astro development mode flag
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
