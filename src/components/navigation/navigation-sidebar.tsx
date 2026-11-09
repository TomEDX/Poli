"use client";

import { cn } from "cn";
import { ChevronDown, Globe, type LucideIcon, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useId, useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { useLeaveGuard } from "./leave-guard";
import { adminGroups, isActiveLink, type NavLink, type NavSection, rubriques, sectionOf, transparencyLinks } from "./links";

/** The sidebar shared by the public site and the administration; its links come as children. */
export function NavigationSidebar({ subtitle, children }: { subtitle?: string; children: React.ReactNode }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-12 flex-row items-center justify-between border-b px-2 sidebar-folded:justify-center">
        <NavigationLink
          href="/"
          className="w-fit truncate rounded-sm px-2 font-heading font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sidebar-folded:hidden"
        >
          Poli. {subtitle && <span className="font-normal text-muted-foreground">{subtitle}</span>}
        </NavigationLink>
        <SidebarTrigger className="hidden md:inline-flex" />
      </SidebarHeader>
      {children}
      <SidebarRail />
    </Sidebar>
  );
}

/** On phones the sidebar is a drawer, opened from this band at the top of the page. */
export function MobileBar() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:hidden">
      <SidebarTrigger />
      <NavigationLink href="/" className="font-heading font-semibold">
        Poli.
      </NavigationLink>
    </header>
  );
}

/** A visitor's links: the rubriques at the top, the method and sources at the bottom. */
export function VisitorNavigation() {
  return (
    <>
      <SidebarContent>
        <SidebarGroup>
          <NavLinks links={rubriques} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavLinks links={transparencyLinks} />
      </SidebarFooter>
    </>
  );
}

/**
 * An editor's links, in two sections, one open at a time. `area` is the section of the layout,
 * open while the page's path is not yet known.
 */
export function EditorNavigation({ area, footer }: { area: NavSection; footer?: React.ReactNode }) {
  return (
    <Suspense fallback={<EditorSections pathname={null} area={area} footer={footer} />}>
      <CurrentEditorSections area={area} footer={footer} />
    </Suspense>
  );
}

// Below a route with an id, the path is only known at request time: the links are prerendered
// without the active one, which streams in.
function NavLinks({ links }: { links: NavLink[] }) {
  return (
    <Suspense fallback={<LinkList links={links} pathname={null} />}>
      <CurrentLinkList links={links} />
    </Suspense>
  );
}

function CurrentLinkList({ links }: { links: NavLink[] }) {
  return <LinkList links={links} pathname={usePathname()} />;
}

function LinkList({ links, pathname }: { links: NavLink[]; pathname: string | null }) {
  return (
    <SidebarMenu>
      {links.map((link) => {
        const active = pathname !== null && isActiveLink(pathname, link.href);
        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              tooltip={link.label}
              isActive={active}
              render={<NavigationLink href={link.href} aria-current={active ? "page" : undefined} />}
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

// On phones the drawer closes once a link is followed.
function NavigationLink({ href, onClick, ...props }: React.ComponentProps<typeof Link> & { href: string }) {
  const { setOpenMobile } = useSidebar();
  const holdBack = useLeaveGuard();

  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        setOpenMobile(false);
        holdBack(event, href);
      }}
      {...props}
    />
  );
}

function CurrentEditorSections({ area, footer }: { area: NavSection; footer?: React.ReactNode }) {
  return <EditorSections pathname={usePathname()} area={area} footer={footer} />;
}

function EditorSections({
  pathname,
  area,
  footer,
}: {
  pathname: string | null;
  area: NavSection;
  footer?: React.ReactNode;
}) {
  const current = pathname === null ? area : sectionOf(pathname);
  const [open, setOpen] = useState<NavSection | null>(current);
  // Each page opens the section that holds it; the editor's last choice is not kept.
  const [openedFor, setOpenedFor] = useState(pathname);
  if (openedFor !== pathname) {
    setOpenedFor(pathname);
    setOpen(current);
  }

  return (
    <>
      <SidebarContent className="gap-0">
        <SidebarGroup>
          <Section
            label="Site public"
            icon={Globe}
            open={open === "site"}
            holdsCurrentPage={current === "site"}
            onOpenChange={(opened) => setOpen(opened ? "site" : null)}
          >
            <LinkList links={[...rubriques, ...transparencyLinks]} pathname={pathname} />
          </Section>
        </SidebarGroup>
        <SidebarSeparator className="mx-0" />
        <SidebarGroup>
          <Section
            label="Administration"
            icon={Settings}
            open={open === "admin"}
            holdsCurrentPage={current === "admin"}
            onOpenChange={(opened) => setOpen(opened ? "admin" : null)}
          >
            {adminGroups.map((group) => (
              <div key={group.label} className="flex flex-col">
                <p className="px-2 pt-2 pb-1 text-xs font-medium text-sidebar-foreground/70">{group.label}</p>
                <LinkList links={group.links} pathname={pathname} />
              </div>
            ))}
          </Section>
        </SidebarGroup>
      </SidebarContent>
      {footer && <SidebarFooter>{footer}</SidebarFooter>}
    </>
  );
}

// A folded sidebar keeps only the icon of each section, the current one highlighted; clicking it
// opens the sidebar on that section.
function Section({
  label,
  icon: Icon,
  open,
  holdsCurrentPage,
  onOpenChange,
  children,
}: {
  label: string;
  icon: LucideIcon;
  open: boolean;
  holdsCurrentPage: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const { state, isMobile, setOpen: setSidebarOpen } = useSidebar();
  const bodyId = useId();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={label}
            aria-expanded={open}
            aria-controls={bodyId}
            data-current={holdsCurrentPage || undefined}
            className="font-medium sidebar-folded:data-current:bg-sidebar-accent sidebar-folded:data-current:text-sidebar-accent-foreground"
            onClick={() => {
              if (state === "collapsed" && !isMobile) {
                setSidebarOpen(true);
                onOpenChange(true);
              } else {
                onOpenChange(!open);
              }
            }}
          >
            <Icon />
            <span>{label}</span>
            <ChevronDown
              className={cn("ml-auto transition-transform duration-200 ease-out motion-reduce:transition-none", open && "rotate-180")}
            />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      {/* The height goes from 0 to the content's own through a grid row; a folded section is
          inert, so its links are out of the Tab order. */}
      <div
        id={bodyId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none sidebar-folded:hidden",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-1 ml-3 flex flex-col gap-1 border-l pl-1">{children}</div>
        </div>
      </div>
    </>
  );
}
