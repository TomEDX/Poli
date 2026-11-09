"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

// PROTOTYPE (navigation): floating bar to flip between variants, never shown in production.
export function PrototypeSwitcher({ variants }: { variants: { key: string; name: string }[] }) {
  return (
    <Suspense fallback={null}>
      <Switcher variants={variants} />
    </Suspense>
  );
}

function Switcher({ variants }: { variants: { key: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === (params.get("variant") ?? variants[0].key)),
  );

  function go(step: number) {
    const next = new URLSearchParams(params);
    next.set("variant", variants[(index + step + variants.length) % variants.length].key);
    router.replace(`${pathname}?${next}`);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-zinc-900 px-1.5 py-1 text-sm text-white shadow-xl ring-1 ring-white/20">
      <button type="button" aria-label="Variante précédente" className="rounded-full p-1.5 hover:bg-white/15" onClick={() => go(-1)}>
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-2 tabular-nums">
        {variants[index].key} · {variants[index].name}
      </span>
      <button type="button" aria-label="Variante suivante" className="rounded-full p-1.5 hover:bg-white/15" onClick={() => go(1)}>
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
