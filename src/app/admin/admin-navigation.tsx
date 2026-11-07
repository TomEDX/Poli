"use client";

import { ListTree, type LucideIcon, Vote } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

type Section = { href: string; label: string; icon: LucideIcon };

const homeHref = "/admin";

// Each content section adds its entry here as it is built.
const referenceSections: Section[] = [
  { href: "/admin/topics", label: "Thématiques", icon: ListTree },
  { href: "/admin/parties", label: "Partis et candidatures", icon: Vote },
];

export function AdminSidebar() {
  const pathname = usePathname();
  // On phones the menu is a drawer: it closes once a link is followed.
  const { setOpenMobile } = useSidebar();
  const closeOnPhone = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Accueil de l’administration"
              isActive={pathname === homeHref}
              onClick={closeOnPhone}
              render={<Link href={homeHref} aria-current={pathname === homeHref ? "page" : undefined} />}
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-heading font-semibold text-sidebar-primary-foreground"
              >
                P.
              </span>
              <span className="truncate font-heading font-semibold">
                Poli. <span className="font-normal text-muted-foreground">Administration</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Référentiel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {referenceSections.map((section) => {
                const active = isInSection(pathname, section);
                return (
                  <SidebarMenuItem key={section.href}>
                    <SidebarMenuButton
                      tooltip={section.label}
                      isActive={active}
                      onClick={closeOnPhone}
                      render={<Link href={section.href} aria-current={active ? "page" : undefined} />}
                    >
                      <section.icon />
                      <span>{section.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const section = referenceSections.find((candidate) => isInSection(pathname, candidate));

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {section ? (
          <>
            <BreadcrumbItem className="hidden md:inline-flex">
              <BreadcrumbLink render={<Link href={homeHref} />}>Administration</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">{section.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>Administration</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// A section stays active on its future sub-pages.
function isInSection(pathname: string, section: Section): boolean {
  return pathname === section.href || pathname.startsWith(`${section.href}/`);
}
