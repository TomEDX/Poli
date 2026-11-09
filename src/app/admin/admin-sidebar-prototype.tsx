"use client";

import { ChevronDown, Globe, Settings } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { menuGroups } from "./admin-sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

import { rubriques, transparencyPages } from "@/components/navigation-prototype/links";
import { NavLinks } from "@/components/navigation-prototype/nav-links";
import { PrototypeSwitcher } from "@/components/navigation-prototype/prototype-switcher";
import { SidebarHeading } from "@/components/navigation-prototype/sidebar-heading";

// PROTOTYPE (navigation): three ways to fit the public menu and the admin menu in one sidebar,
// switchable with ?variant= and the floating bar.
const variants = [
  { key: "A", name: "Site en haut, admin dessous" },
  { key: "B", name: "Admin d'abord, site replié en bas" },
  { key: "C", name: "Bascule Site / Administration" },
];

export function AdminSidebarPrototype({ footer }: { footer: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<SiteAboveAdmin footer={footer} />}>
        <ChosenVariant footer={footer} />
      </Suspense>
      {process.env.NODE_ENV !== "production" && <PrototypeSwitcher variants={variants} />}
    </>
  );
}

function ChosenVariant({ footer }: { footer: React.ReactNode }) {
  const variant = useSearchParams().get("variant") ?? "A";
  if (variant === "B") return <AdminFirst footer={footer} />;
  if (variant === "C") return <ModeSwitch footer={footer} />;
  return <SiteAboveAdmin footer={footer} />;
}

function SiteAboveAdmin({ footer }: { footer: React.ReactNode }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeading subtitle="Administration" />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Site</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavLinks links={rubriques} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="mx-0" />
        <AdminGroups />
      </SidebarContent>
      <SidebarFooter>
        <NavLinks links={transparencyPages} />
        <SidebarSeparator className="mx-0" />
        {footer}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function AdminFirst({ footer }: { footer: React.ReactNode }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeading subtitle="Administration" />
      <SidebarContent>
        <AdminGroups />
      </SidebarContent>
      <SidebarFooter>
        <FoldedPublicSite />
        <SidebarSeparator className="mx-0" />
        {footer}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function FoldedPublicSite() {
  const [unfolded, setUnfolded] = useState(false);
  const { state, setOpen } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <div className="flex flex-col gap-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Site public"
            aria-expanded={unfolded && !collapsed}
            onClick={() => {
              if (collapsed) {
                setOpen(true);
                setUnfolded(true);
              } else {
                setUnfolded(!unfolded);
              }
            }}
          >
            <Globe />
            <span>Site public</span>
            <ChevronDown className={`ml-auto transition-transform ${unfolded ? "rotate-180" : ""}`} />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      {unfolded && !collapsed && (
        <div className="ml-3 border-l pl-1">
          <NavLinks links={[...rubriques, ...transparencyPages]} />
        </div>
      )}
    </div>
  );
}

function ModeSwitch({ footer }: { footer: React.ReactNode }) {
  const [mode, setMode] = useState<"site" | "admin">("admin");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeading subtitle={mode === "admin" ? "Administration" : undefined} />
      <SidebarHeader className="pb-0">
        <SidebarMenu className="rounded-lg bg-sidebar-accent/60 p-0.5 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 md:flex-row md:group-data-[collapsible=icon]:flex-col">
          <ModeButton label="Site" icon={<Globe />} active={mode === "site"} onClick={() => setMode("site")} />
          <ModeButton
            label="Administration"
            icon={<Settings />}
            active={mode === "admin"}
            onClick={() => setMode("admin")}
          />
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {mode === "site" ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <NavLinks links={rubriques} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <AdminGroups />
        )}
      </SidebarContent>
      <SidebarFooter>
        {mode === "site" && <NavLinks links={transparencyPages} />}
        {mode === "site" && <SidebarSeparator className="mx-0" />}
        {footer}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function ModeButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <SidebarMenuItem className="flex-1">
      <SidebarMenuButton
        tooltip={label}
        isActive={active}
        aria-pressed={active}
        onClick={onClick}
        className="justify-center data-active:bg-background data-active:shadow-sm"
      >
        {icon}
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AdminGroups() {
  return menuGroups.map((group) => (
    <SidebarGroup key={group.label}>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <NavLinks links={group.sections} />
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}
