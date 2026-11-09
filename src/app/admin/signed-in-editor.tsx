import { LogOut } from "lucide-react";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { signOut } from "@/modules/editors/actions";

// Who is signed in, and the rare way out: at the bottom of the menu, out of the work area.
export function SignedInEditor({ email }: { email: string }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <p className="truncate px-2 pb-1 text-xs text-muted-foreground sidebar-folded:hidden">{email}</p>
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
