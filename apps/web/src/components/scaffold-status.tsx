"use client";

import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";

export function ScaffoldStatus() {
  const { socketHint, setSocketHint } = useUiStore();

  return (
    <div className="space-y-3 border-t border-border pt-6">
      <p className="text-sm text-muted-foreground">
        Zustand scaffold: <span className="text-foreground">{socketHint}</span>
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setSocketHint("Client store ready — Socket.IO gameplay not wired yet.")}
      >
        Touch client store
      </Button>
    </div>
  );
}
