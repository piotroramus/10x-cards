import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "../db/database.types.ts";

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: false, // Must be false so browser JS can read cookies for client-side auth
  sameSite: "lax",
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
}) => {
  // Use PUBLIC_ prefixed vars (accessible on both server and client)
  // Fall back to non-prefixed for backward compatibility
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY;

  // Validate environment variables
  if (!supabaseUrl || !supabaseKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push("PUBLIC_SUPABASE_URL or SUPABASE_URL");
    if (!supabaseKey) missingVars.push("PUBLIC_SUPABASE_KEY or SUPABASE_KEY");
    
    console.error(
      `❌ Missing required environment variables: ${missingVars.join(", ")}`,
      "\nPlease add to your .env file:",
      "\n  PUBLIC_SUPABASE_URL=your_supabase_url",
      "\n  PUBLIC_SUPABASE_KEY=your_supabase_anon_key",
      "\n\n(Or use SUPABASE_URL and SUPABASE_KEY for backward compatibility)",
    );
    
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}. ` +
      "Please check your .env file and restart the dev server."
    );
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  return supabase;
};
