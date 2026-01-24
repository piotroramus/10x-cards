import React from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

/**
 * AppHeader component displays user info and sign-out button
 * Requires AuthProvider context
 */
export function AppHeader() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error("Sign out error:", error);
      return;
    }
    // Redirect to sign-in page after successful sign-out
    window.location.href = "/auth/sign-in";
  };

  if (!user) {
    return null;
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold">Lang Memo</h1>

          <nav className="flex items-center gap-1">
            <a
              href="/"
              className="relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground aria-[current=page]:text-primary aria-[current=page]:after:absolute aria-[current=page]:after:bottom-0 aria-[current=page]:after:left-0 aria-[current=page]:after:right-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-primary aria-[current=page]:after:rounded-full"
              aria-current={typeof window !== "undefined" && window.location.pathname === "/" ? "page" : undefined}
            >
              Generate
            </a>
            <a
              href="/cards"
              className="relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground aria-[current=page]:text-primary aria-[current=page]:after:absolute aria-[current=page]:after:bottom-0 aria-[current=page]:after:left-0 aria-[current=page]:after:right-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-primary aria-[current=page]:after:rounded-full"
              aria-current={typeof window !== "undefined" && window.location.pathname === "/cards" ? "page" : undefined}
            >
              My Cards
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
