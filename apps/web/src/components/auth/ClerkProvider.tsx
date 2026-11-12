"use client";

import { ClerkProvider as ClerkRootProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <ClerkRootProvider>{children}</ClerkRootProvider>;
}
