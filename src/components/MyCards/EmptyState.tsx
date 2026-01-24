import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

/**
 * EmptyState component displays when user has no saved cards
 */
export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-primary/5 py-16 text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-4">
        <FileText className="size-8 text-primary" />
      </div>
      <h2 className="mb-2 text-xl font-semibold">No cards yet</h2>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        Get started by generating AI proposals from text or creating cards manually.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <a href="/">
            <Plus className="size-4" />
            Generate Cards
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/">Create Manually</a>
        </Button>
      </div>
    </div>
  );
}
