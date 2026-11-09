"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

import { administration, isActiveLink, type NavLink } from "./links";

// PROTOTYPE (navigation). Links keep ?variant= so the chosen admin variant survives navigation.
export function NavLinks({ links }: { links: NavLink[] }) {
  return (
    <Suspense fallback={<LinkList links={links} pathname={null} variant={null} />}>
      <ActiveNavLinks links={links} />
    </Suspense>
  );
}

export function AdministrationLink() {
  return <NavLinks links={[administration]} />;
}

function ActiveNavLinks({ links }: { links: NavLink[] }) {
  return <LinkList links={links} pathname={usePathname()} variant={useSearchParams().get("variant")} />;
}

function LinkList({ links, pathname, variant }: { links: NavLink[]; pathname: string | null; variant: string | null }) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {links.map((link) => {
        const active = pathname !== null && isActiveLink(pathname, link.href);
        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              tooltip={link.label}
              isActive={active}
              onClick={() => setOpenMobile(false)}
              render={
                <Link
                  href={variant ? `${link.href}?variant=${variant}` : link.href}
                  aria-current={active ? "page" : undefined}
                />
              }
            >
              <link.icon />
              <span>{link.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
