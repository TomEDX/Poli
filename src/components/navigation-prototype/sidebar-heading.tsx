"use client";

import Link from "next/link";

import { SidebarHeader, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

// PROTOTYPE (navigation). The logo always leads to the public home page.
export function SidebarHeading({ subtitle }: { subtitle?: string }) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarHeader className="h-12 flex-row items-center justify-between border-b px-2 group-data-[collapsible=icon]:justify-center">
      <Link
        href="/"
        className="w-fit truncate rounded-sm px-2 font-heading font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 group-data-[collapsible=icon]:hidden"
        onClick={() => setOpenMobile(false)}
      >
        Poli. {subtitle && <span className="font-normal text-muted-foreground">{subtitle}</span>}
      </Link>
      <SidebarTrigger className="hidden md:inline-flex" />
    </SidebarHeader>
  );
}

// On phones the sidebar is a drawer: this bar opens it.
export function MobileBar() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:hidden">
      <SidebarTrigger />
      <Link href="/" className="font-heading font-semibold">
        Poli.
      </Link>
    </header>
  );
}
