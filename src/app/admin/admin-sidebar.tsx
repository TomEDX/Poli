"use client";

import { ListTree, LogOut, type LucideIcon, Vote } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "@/modules/editors/actions";

type Section = { href: string; label: string; icon: LucideIcon };

// Each content section adds its entry here as it is built. Icons are what the collapsed
// menu shows: the tree for the topic tree, the ballot box for candidacies.
const referenceSections: Section[] = [
  { href: "/admin/topics", label: "Thématiques", icon: ListTree },
  { href: "/admin/parties", label: "Partis et candidatures", icon: Vote },
];

export function AdminSidebar({ footer }: { footer: React.ReactNode }) {
  const pathname = usePathname();
  // On phones the menu is a drawer: it closes once a link is followed.
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-12 justify-center border-b px-4 group-data-[collapsible=icon]:hidden">
        <Link
          href="/admin"
          className="w-fit rounded-sm font-heading font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() => setOpenMobile(false)}
        >
          Poli. <span className="font-normal text-muted-foreground">Administration</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Référentiel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {referenceSections.map((section) => {
                const active = pathname === section.href || pathname.startsWith(`${section.href}/`);
                return (
                  <SidebarMenuItem key={section.href}>
                    <SidebarMenuButton
                      tooltip={section.label}
                      isActive={active}
                      onClick={() => setOpenMobile(false)}
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
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

// Who is signed in, and the rare way out: at the bottom of the menu, out of the work area.
export function SignedInEditor({ email }: { email: string }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <p className="truncate px-2 pb-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          {email}
        </p>
        <form action={signOut}>
          <SidebarMenuButton type="submit" tooltip="Se déconnecter">
            <LogOut />
            <span>Se déconnecter</span>
          </SidebarMenuButton>
        </form>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
