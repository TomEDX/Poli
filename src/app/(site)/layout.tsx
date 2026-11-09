import { Suspense } from "react";

import { AdministrationLink } from "@/components/navigation-prototype/nav-links";
import { PersistentSidebarProvider } from "@/components/navigation-prototype/persistent-sidebar-provider";
import { MobileBar } from "@/components/navigation-prototype/sidebar-heading";
import { SiteSidebar } from "@/components/navigation-prototype/site-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentEditor } from "@/modules/editors/authorization";

// PROTOTYPE (navigation): the public pages share the sidebar. The administration link is the only
// part computed per visit, so the pages stay prerendered (ADR 0005).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <PersistentSidebarProvider>
        <SiteSidebar
          editorLink={
            <Suspense fallback={null}>
              <EditorsOnly>
                <AdministrationLink />
              </EditorsOnly>
            </Suspense>
          }
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileBar />
          {children}
        </div>
      </PersistentSidebarProvider>
    </TooltipProvider>
  );
}

async function EditorsOnly({ children }: { children: React.ReactNode }) {
  return (await getCurrentEditor()) ? children : null;
}
