import { cn } from "cn";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentEditor } from "@/modules/editors/authorization";
import { SignOutButton } from "@/modules/editors/components/sign-out-button";

import { AdminBreadcrumb, AdminSidebar } from "./admin-navigation";

export const metadata: Metadata = {
  title: "Administration · Poli.",
  robots: { index: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <TooltipProvider>
      <Toaster>
        <SidebarProvider>
          <a
            href="#contenu"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:h-8 focus-visible:px-2.5",
            )}
          >
            Aller au contenu
          </a>
          <AdminSidebar />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-center" />
              <AdminBreadcrumb />
              <div className="ml-auto">
                <SignOutButton />
              </div>
            </header>
            <div id="contenu" tabIndex={-1} className="flex flex-1 flex-col px-4 py-6 outline-none md:px-6">
              <Suspense fallback={<ContentSkeleton />}>
                <EditorsOnly>{children}</EditorsOnly>
              </Suspense>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </Toaster>
    </TooltipProvider>
  );
}

async function EditorsOnly({ children }: { children: React.ReactNode }) {
  const editor = await getCurrentEditor();
  if (!editor) redirect("/sign-in");
  return children;
}

function ContentSkeleton() {
  return (
    <div aria-busy className="flex max-w-5xl flex-col gap-4">
      <span className="sr-only">Chargement…</span>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
