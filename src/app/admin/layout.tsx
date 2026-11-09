import { cn } from "cn";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { AdminSidebarPrototype } from "./admin-sidebar-prototype";
import { PersistentSidebarProvider } from "@/components/navigation-prototype/persistent-sidebar-provider";
import { MobileBar } from "@/components/navigation-prototype/sidebar-heading";
import { SidebarInset } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentEditor } from "@/modules/editors/authorization";

import { SignedInEditor } from "./admin-sidebar";

export const metadata: Metadata = {
  title: "Administration · Poli.",
  robots: { index: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <TooltipProvider>
      <Toaster>
        <PersistentSidebarProvider>
          <a
            href="#contenu"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:h-8 focus-visible:px-2.5",
            )}
          >
            Aller au contenu
          </a>
          <AdminSidebarPrototype
            footer={
              <Suspense fallback={null}>
                <EditorFooter />
              </Suspense>
            }
          />
          <SidebarInset>
            <MobileBar />
            <div id="contenu" tabIndex={-1} className="flex flex-1 flex-col px-4 py-8 outline-none md:px-8">
              <Suspense fallback={<ContentSkeleton />}>
                <EditorsOnly>{children}</EditorsOnly>
              </Suspense>
            </div>
          </SidebarInset>
        </PersistentSidebarProvider>
      </Toaster>
    </TooltipProvider>
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
