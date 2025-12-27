import { createClient } from "@supabase/supabase-js";
import { defineMiddleware } from "astro:middleware";

import type { Database } from "../db/database.types.ts";
import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware((context, next) => {
  // If auth is disabled, use service role key to bypass RLS for development
  const disableAuth = import.meta.env.DISABLE_AUTH === "true";
  
  if (disableAuth) {
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    // Use service role key if available, otherwise use anon key
    // Service role key bypasses RLS (development only!)
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    const key = serviceRoleKey || import.meta.env.SUPABASE_KEY;
    
    if (serviceRoleKey) {
      console.warn("⚠️  Using service role key - RLS is bypassed!");
    }
    
    const client = createClient<Database>(supabaseUrl, key);
    context.locals.supabase = client;
  } else {
    context.locals.supabase = supabaseClient;
  }
  
  return next();
});
