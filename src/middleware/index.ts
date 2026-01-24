import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client.ts";

// Public paths - Auth pages and API endpoints
const PUBLIC_PATHS = [
  // Auth pages
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/reset-password",
  "/auth/reset-password/confirm",
  "/auth/verify/check",
  "/auth/verify/success",
  "/auth/verify/error",
];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Create Supabase server instance with cookie management
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Store Supabase instance in locals for use in pages and API routes
  locals.supabase = supabase;

  // Check if route is public (starts with /auth/)
  const isPublicRoute = PUBLIC_PATHS.some((path) => url.pathname.startsWith(path));

  // IMPORTANT: Always get user session first before any other operations
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // User is authenticated - set user in locals
    locals.user = {
      email: user.email ?? "",
      id: user.id,
    };
    locals.isAuthenticated = true;

    // If authenticated user tries to access auth pages, redirect to home
    if (isPublicRoute && url.pathname !== "/auth/verify/success" && url.pathname !== "/auth/verify/error") {
      const returnUrl = url.searchParams.get("returnUrl") || "/";
      return redirect(returnUrl);
    }
  } else if (!isPublicRoute) {
    // User is not authenticated and trying to access protected route
    // Redirect to sign-in with returnUrl
    const returnUrl = encodeURIComponent(url.pathname + url.search);
    return redirect(`/auth/sign-in?returnUrl=${returnUrl}`);
  }

  return next();
});
