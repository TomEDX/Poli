import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getCurrentEditor } from "@/modules/editors/authorization";
import { SignOutButton } from "@/modules/editors/components/sign-out-button";

export const metadata: Metadata = {
  title: "Administration · Poli.",
  robots: { index: false },
};

// Each content section adds its entry here as it is built.
const sections: { href: string; label: string }[] = [
  { href: "/admin/topics", label: "Thématiques" },
  { href: "/admin/parties", label: "Partis et candidatures" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link href="/admin" className="font-heading font-semibold">
          Poli. <span className="font-normal text-muted-foreground">Administration</span>
        </Link>
        <SignOutButton />
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <nav aria-label="Administration" className="border-b px-6 py-4 md:w-56 md:border-r md:border-b-0">
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune rubrique pour l&apos;instant.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {sections.map((section) => (
                <li key={section.href}>
                  <Link href={section.href}>{section.label}</Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
        <main className="flex-1 px-6 py-6">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}>
            <EditorsOnly>{children}</EditorsOnly>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

async function EditorsOnly({ children }: { children: React.ReactNode }) {
  const editor = await getCurrentEditor();
  if (!editor) redirect("/sign-in");
  return children;
}
