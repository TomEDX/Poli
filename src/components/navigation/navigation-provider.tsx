"use client";

import { useSyncExternalStore } from "react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

import { LeaveGuardProvider } from "@/components/leave-guard";
import { sidebarStorageKey } from "./sidebar-preference";

const listeners = new Set<() => void>();

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  // Open by default; the server always renders it open, the attribute on <html> says otherwise.
  const open = useSyncExternalStore(subscribe, isOpenNow, () => true);

  return (
    <TooltipProvider>
      <SidebarProvider open={open} onOpenChange={storeOpen}>
        <LeaveGuardProvider>{children}</LeaveGuardProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function isOpenNow() {
  return document.documentElement.dataset.sidebar !== "folded";
}

function storeOpen(open: boolean) {
  if (open) delete document.documentElement.dataset.sidebar;
  else document.documentElement.dataset.sidebar = "folded";
  try {
    localStorage.setItem(sidebarStorageKey, open ? "open" : "folded");
  } catch {
    // Storage refused (private browsing): the choice holds until the page is reloaded.
  }
  for (const listener of listeners) listener();
}
