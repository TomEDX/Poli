"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarRail,
} from "@/components/ui/sidebar";

import { rubriques, transparencyPages } from "./links";
import { NavLinks } from "./nav-links";
import { SidebarHeading } from "./sidebar-heading";

// PROTOTYPE (navigation). The public sidebar, identical in every variant.
export function SiteSidebar({ editorLink }: { editorLink: React.ReactNode }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeading />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavLinks links={rubriques} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavLinks links={transparencyPages} />
        {editorLink}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
