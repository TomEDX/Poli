import { Suspense } from "react";

import { NavigationProvider } from "@/components/navigation/navigation-provider";
import {
  EditorNavigation,
  MobileBar,
  NavigationSidebar,
  VisitorNavigation,
} from "@/components/navigation/navigation-sidebar";
import { SkipLink } from "@/components/navigation/skip-link";
import { getCurrentEditor } from "@/modules/editors/authorization";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <SkipLink />
      <NavigationSidebar>
        {/* Whether the visitor is an editor depends on the request: only this part of the page is
            rendered per visit, so the pages stay prerendered (ADR 0005). */}
        <Suspense fallback={<VisitorNavigation />}>
          <ViewerNavigation />
        </Suspense>
      </NavigationSidebar>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar />
        <div id="contenu" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
      </div>
    </NavigationProvider>
  );
}

async function ViewerNavigation() {
  return (await getCurrentEditor()) ? <EditorNavigation area="site" /> : <VisitorNavigation />;
}
