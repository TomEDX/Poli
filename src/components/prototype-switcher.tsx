"use client";

// PROTOTYPE, throwaway: floating bar to flip between UI variants with ?variant=. Never shown in production.

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function PrototypeSwitcher({ variants }: { variants: { key: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentKey = searchParams.get("variant") ?? variants[0].key;
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === currentKey),
  );

  function show(step: number) {
    const next = variants[(index + step + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next.key);
    router.replace(pathname + "?" + params.toString().replaceAll("%2C", ","), { scroll: false });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "ArrowLeft") show(-1);
      if (event.key === "ArrowRight") show(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;
  const current = variants[index];
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-fuchsia-700 p-1 text-sm text-white shadow-xl ring-2 ring-white">
      <button type="button" onClick={() => show(-1)} aria-label="Variante précédente" className="rounded-full p-2 hover:bg-white/20">
        <ChevronLeftIcon className="size-4" />
      </button>
      <span className="px-2 font-medium whitespace-nowrap">
        {current.key} · {current.name}
      </span>
      <button type="button" onClick={() => show(1)} aria-label="Variante suivante" className="rounded-full p-2 hover:bg-white/20">
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}
