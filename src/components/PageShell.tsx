import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ChatWidget } from "./ChatWidget";
import { Toaster } from "sonner";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <Toaster richColors position="top-center" />
      <ChatWidget />
    </div>
  );
}
