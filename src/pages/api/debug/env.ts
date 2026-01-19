import type { APIContext } from "astro";

export const prerender = false;

/**
 * Debug endpoint to check environment variables
 * Only use in development!
 */
export async function GET(context: APIContext): Promise<Response> {
  // Only allow in development
  if (import.meta.env.PROD) {
    return new Response("Not available in production", { status: 404 });
  }

  const envCheck = {
    OPENROUTER_API_KEY: import.meta.env.OPENROUTER_API_KEY
      ? `${import.meta.env.OPENROUTER_API_KEY.substring(0, 10)}...` // Show first 10 chars
      : "NOT SET",
    SUPABASE_URL: import.meta.env.SUPABASE_URL ? "SET" : "NOT SET",
    SUPABASE_KEY: import.meta.env.SUPABASE_KEY ? "SET" : "NOT SET",
    DISABLE_AUTH: import.meta.env.DISABLE_AUTH || "false",
  };

  return new Response(JSON.stringify(envCheck, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
