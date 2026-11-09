"use client";

import { cn } from "cn";
import { ChevronDown, Globe, type LucideIcon, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { isActiveLink, type NavLink, rubriques, transparencyPages } from "@/components/navigation-prototype/links";
import { NavLinks } from "@/components/navigation-prototype/nav-links";
import { PrototypeSwitcher } from "@/components/navigation-prototype/prototype-switcher";
import { SidebarHeading } from "@/components/navigation-prototype/sidebar-heading";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { menuGroups } from "./admin-sidebar";

// PROTOTYPE (navigation), round 2: two foldable sections, "Site public" above "Administration",
// four ways to fold them. Switch with ?variant= and the floating bar. Round 1 (A, B, C) is the
// previous commit on this branch.
const variants = [
  { key: "A", name: "Deux sections indépendantes" },
  { key: "B", name: "Une section ouverte à la fois" },
  { key: "C", name: "Trois niveaux dans l'admin" },
  { key: "D", name: "Section fermée en rangée d'icônes" },
];

const siteLinks: NavLink[] = [...rubriques, ...transparencyPages];

export function AdminSidebarPrototype({ footer }: { footer: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<IndependentSections footer={footer} />}>
        <ChosenVariant footer={footer} />
      </Suspense>
      {process.env.NODE_ENV !== "production" && <PrototypeSwitcher variants={variants} />}
    </>
  );
}

function ChosenVariant({ footer }: { footer: React.ReactNode }) {
  const variant = useSearchParams().get("variant") ?? "A";
  if (variant === "B") return <OneSectionAtATime footer={footer} />;
  if (variant === "C") return <ThreeLevels footer={footer} />;
  if (variant === "D") return <IconRowWhenFolded footer={footer} />;
  return <IndependentSections footer={footer} />;
}

function IndependentSections({ footer }: { footer: React.ReactNode }) {
  const [siteOpen, setSiteOpen] = useStoredOpen("A-site", true);
  const [adminOpen, setAdminOpen] = useStoredOpen("A-admin", true);

  return (
    <Frame footer={footer}>
      <SidebarGroup>
        <SectionHeader label="Site public" icon={Globe} open={siteOpen} onOpenChange={setSiteOpen} />
        {siteOpen && (
          <SectionBody>
            <NavLinks links={siteLinks} />
          </SectionBody>
        )}
      </SidebarGroup>
      <SidebarSeparator className="mx-0" />
      <SidebarGroup>
        <SectionHeader label="Administration" icon={Settings} open={adminOpen} onOpenChange={setAdminOpen} />
        {adminOpen && (
          <SectionBody>
            <LabelledAdminGroups />
          </SectionBody>
        )}
      </SidebarGroup>
    </Frame>
  );
}

function OneSectionAtATime({ footer }: { footer: React.ReactNode }) {
  const pathname = usePathname();
  const [openSection, setOpenSection] = useState<"site" | "admin" | null>("admin");
  const adminActive = menuGroups.some((group) => group.sections.some((section) => isActiveLink(pathname, section.href)));

  return (
    <Frame footer={footer}>
      <SidebarGroup>
        <SectionHeader
          label="Site public"
          icon={Globe}
          open={openSection === "site"}
          holdsCurrentPage={!adminActive}
          onOpenChange={(open) => setOpenSection(open ? "site" : null)}
        />
        <Foldable open={openSection === "site"}>
          <SectionBody>
            <NavLinks links={siteLinks} />
          </SectionBody>
        </Foldable>
      </SidebarGroup>
      <SidebarSeparator className="mx-0" />
      <SidebarGroup>
        <SectionHeader
          label="Administration"
          icon={Settings}
          open={openSection === "admin"}
          holdsCurrentPage={adminActive}
          onOpenChange={(open) => setOpenSection(open ? "admin" : null)}
        />
        <Foldable open={openSection === "admin"}>
          <SectionBody>
            <LabelledAdminGroups />
          </SectionBody>
        </Foldable>
      </SidebarGroup>
    </Frame>
  );
}

// Animates the height between 0 and the content's own height, and leaves only the section
// icons in a folded sidebar.
function Foldable({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none group-data-[collapsible=icon]:hidden",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function ThreeLevels({ footer }: { footer: React.ReactNode }) {
  const pathname = usePathname();
  const [siteOpen, setSiteOpen] = useStoredOpen("C-site", false);
  const [adminOpen, setAdminOpen] = useStoredOpen("C-admin", true);
  // Only the group holding the current page starts unfolded.
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        menuGroups
          .filter((group) => group.sections.some((section) => isActiveLink(pathname, section.href)))
          .map((group) => group.label),
      ),
  );
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  function toggleGroup(label: string) {
    const next = new Set(openGroups);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    setOpenGroups(next);
  }

  return (
    <Frame footer={footer}>
      <SidebarGroup>
        <SectionHeader label="Site public" icon={Globe} open={siteOpen} onOpenChange={setSiteOpen} />
        {siteOpen && (
          <SectionBody>
            <NavLinks links={siteLinks} />
          </SectionBody>
        )}
      </SidebarGroup>
      <SidebarSeparator className="mx-0" />
      <SidebarGroup>
        <SectionHeader label="Administration" icon={Settings} open={adminOpen} onOpenChange={setAdminOpen} />
        {adminOpen && (
          <SectionBody>
            {menuGroups.map((group) => {
              const groupOpen = openGroups.has(group.label);
              return (
                <div key={group.label} className="flex flex-col">
                  <button
                    type="button"
                    aria-expanded={groupOpen}
                    onClick={() => toggleGroup(group.label)}
                    className="flex h-8 w-full items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden"
                  >
                    {group.label}
                    <ChevronDown className={cn("ml-auto size-3.5 transition-transform", groupOpen && "rotate-180")} />
                  </button>
                  {(groupOpen || collapsed) && <NavLinks links={group.sections} />}
                </div>
              );
            })}
          </SectionBody>
        )}
      </SidebarGroup>
    </Frame>
  );
}

function IconRowWhenFolded({ footer }: { footer: React.ReactNode }) {
  const [siteOpen, setSiteOpen] = useStoredOpen("D-site", false);
  const [adminOpen, setAdminOpen] = useStoredOpen("D-admin", true);
  const adminLinks = menuGroups.flatMap((group) => group.sections);

  return (
    <Frame footer={footer}>
      <SidebarGroup>
        <SectionHeader label="Site public" icon={Globe} open={siteOpen} onOpenChange={setSiteOpen} />
        {siteOpen ? (
          <SectionBody>
            <NavLinks links={siteLinks} />
          </SectionBody>
        ) : (
          <IconRow links={siteLinks} />
        )}
      </SidebarGroup>
      <SidebarSeparator className="mx-0" />
      <SidebarGroup>
        <SectionHeader label="Administration" icon={Settings} open={adminOpen} onOpenChange={setAdminOpen} />
        {adminOpen ? (
          <SectionBody>
            <LabelledAdminGroups />
          </SectionBody>
        ) : (
          <IconRow links={adminLinks} />
        )}
      </SidebarGroup>
    </Frame>
  );
}

function Frame({ footer, children }: { footer: React.ReactNode; children: React.ReactNode }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeading subtitle="Administration" />
      <SidebarContent className="gap-0">{children}</SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

// Folded sidebar: the section is one icon, and clicking it unfolds both the sidebar and the section.
function SectionHeader({
  label,
  icon: Icon,
  open,
  holdsCurrentPage = false,
  onOpenChange,
}: {
  label: string;
  icon: LucideIcon;
  open: boolean;
  holdsCurrentPage?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, setOpen: setSidebarOpen } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={label}
          aria-expanded={open}
          // Folded sidebar: the section holding the current page is the highlighted icon.
          isActive={state === "collapsed" && holdsCurrentPage}
          className="font-medium"
          onClick={() => {
            if (state === "collapsed") {
              setSidebarOpen(true);
              onOpenChange(true);
            } else {
              onOpenChange(!open);
            }
          }}
        >
          <Icon />
          <span>{label}</span>
          <ChevronDown className={cn("ml-auto transition-transform", open && "rotate-180")} />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function SectionBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1 ml-3 flex flex-col gap-1 border-l pl-1 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:pl-0">
      {children}
    </div>
  );
}

function LabelledAdminGroups() {
  return menuGroups.map((group) => (
    <div key={group.label} className="flex flex-col">
      <p className="px-2 pt-2 pb-1 text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
        {group.label}
      </p>
      <NavLinks links={group.sections} />
    </div>
  ));
}

function IconRow({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const variant = useSearchParams().get("variant");

  return (
    <div className="mt-1 flex flex-wrap gap-0.5 pl-7 group-data-[collapsible=icon]:hidden">
      {links.map((link) => {
        const active = isActiveLink(pathname, link.href);
        return (
          <Tooltip key={link.href}>
            <TooltipTrigger
              render={
                <Link
                  href={variant ? `${link.href}?variant=${variant}` : link.href}
                  aria-label={link.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md hover:bg-sidebar-accent [&_svg]:size-4",
                    active && "bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                />
              }
            >
              <link.icon />
            </TooltipTrigger>
            <TooltipContent>{link.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// Each section remembers whether it is unfolded, per variant, in this browser.
function useStoredOpen(key: string, initial: boolean): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(initial);

  useEffect(() => {
    const stored = localStorage.getItem(`prototype-navigation-${key}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored !== null) setOpen(stored === "1");
  }, [key]);

  function store(next: boolean) {
    setOpen(next);
    localStorage.setItem(`prototype-navigation-${key}`, next ? "1" : "0");
  }

  return [open, store];
}
