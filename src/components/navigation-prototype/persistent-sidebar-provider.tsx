"use client";

import { useEffect, useState } from "react";

import { SidebarProvider } from "@/components/ui/sidebar";

// PROTOTYPE (navigation). The pages are prerendered, so the stored choice is read in the browser:
// a collapsed sidebar opens for an instant before folding back. The real version must avoid that.
export function PersistentSidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (document.cookie.split("; ").includes("sidebar_state=false")) setOpen(false);
  }, []);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      {children}
    </SidebarProvider>
  );
}
