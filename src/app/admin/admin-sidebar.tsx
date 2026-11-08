"use client";

import {
  BookOpen,
  CircleQuestionMark,
  Landmark,
  ListTree,
  LogOut,
  type LucideIcon,
  Scale,
  ScrollText,
  TextQuote,
  Vote,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

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
// menu shows: the tree for the topic tree, the ballot box for candidacies, the Assemblée
// for its groups, the open book for sources, the scroll for texts, the quote for programmes,
// the question mark for the quiz, the scales for the method page.
const menuGroups: { label: string; sections: Section[] }[] = [
  {
    label: "Référentiel",
    sections: [
      { href: "/admin/topics", label: "Thématiques", icon: ListTree },
      { href: "/admin/parties", label: "Partis et candidatures", icon: Vote },
      { href: "/admin/parliamentary-groups", label: "Groupes parlementaires", icon: Landmark },
      { href: "/admin/sources", label: "Sources", icon: BookOpen },
    ],
  },
  {
    label: "Législatif",
    sections: [{ href: "/admin/texts", label: "Textes", icon: ScrollText }],
  },
  {
    label: "Programmes",
    sections: [{ href: "/admin/programmes", label: "Extraits", icon: TextQuote }],
  },
  {
    label: "Quiz",
    sections: [{ href: "/admin/quiz", label: "Questions", icon: CircleQuestionMark }],
  },
  {
    label: "Transparence",
    sections: [{ href: "/admin/method", label: "Page Méthode", icon: Scale }],
  },
];

export function AdminSidebar({ footer }: { footer: React.ReactNode }) {
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
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              {/* Below a route with an id, the path is only known at request time: the links are
                  prerendered without the active one, which streams in. */}
              <Suspense fallback={<SectionLinks sections={group.sections} pathname={null} />}>
                <ActiveSectionLinks sections={group.sections} />
              </Suspense>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function ActiveSectionLinks({ sections }: { sections: Section[] }) {
  return <SectionLinks sections={sections} pathname={usePathname()} />;
}

function SectionLinks({ sections, pathname }: { sections: Section[]; pathname: string | null }) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {sections.map((section) => {
        const active = pathname !== null && (pathname === section.href || pathname.startsWith(`${section.href}/`));
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
