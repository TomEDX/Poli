import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";

/** The first stop of the keyboard, past the navigation, to the element with the id `contenu`. */
export function SkipLink() {
  return (
    <a
      href="#contenu"
      className={cn(
        buttonVariants({ variant: "outline" }),
        "sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:h-8 focus-visible:px-2.5",
      )}
    >
      Aller au contenu
    </a>
  );
}
