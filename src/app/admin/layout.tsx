import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { NavigationProvider } from "@/components/navigation/navigation-provider";
import { EditorNavigation, MobileBar, NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { SkipLink } from "@/components/navigation/skip-link";
import { SidebarInset } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toast";
import { getCurrentEditor } from "@/modules/editors/authorization";

import { SignedInEditor } from "./signed-in-editor";

export const metadata: Metadata = {
  title: "Administration · Poli.",
  robots: { index: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Toaster>
      <NavigationProvider>
        <SkipLink />
        <NavigationSidebar subtitle="Administration">
          <EditorNavigation
            area="admin"
            footer={
              <Suspense fallback={null}>
                <EditorFooter />
              </Suspense>
            }
          />
        </NavigationSidebar>
        <SidebarInset>
          <MobileBar />
          <div id="contenu" tabIndex={-1} className="flex flex-1 flex-col px-4 py-8 outline-none md:px-8">
            <Suspense fallback={<ContentSkeleton />}>
              <EditorsOnly>{children}</EditorsOnly>
            </Suspense>
          </div>
        </SidebarInset>
      </NavigationProvider>
    </Toaster>
  );
}

async function EditorsOnly({ children }: { children: React.ReactNode }) {
  const editor = await getCurrentEditor();
  if (!editor) redirect("/sign-in");
  return children;
}

async function EditorFooter() {
  const editor = await getCurrentEditor();
  return editor ? <SignedInEditor email={editor.email} /> : null;
}

function ContentSkeleton() {
  return (
    <div aria-busy className="flex max-w-4xl flex-col gap-8">
      <span className="sr-only">Chargement…</span>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
