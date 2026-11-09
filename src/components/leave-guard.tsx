"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** What the visitor reads before leaving a page they could regret leaving. */
export type LeaveWarning = { title: string; description: string; stay: string; leave: string };

type LeaveGuard = {
  warning: LeaveWarning | null;
  setWarning: (warning: LeaveWarning | null) => void;
  askBeforeLeaving: (href: string, warning: LeaveWarning) => void;
};

const LeaveGuardContext = createContext<LeaveGuard | null>(null);

/** Lets a page hold back the navigation links that leave it, behind a confirmation. */
export function LeaveGuardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [warning, setWarning] = useState<LeaveWarning | null>(null);
  const [pending, setPending] = useState<{ href: string; warning: LeaveWarning } | null>(null);

  return (
    <LeaveGuardContext.Provider
      value={{ warning, setWarning, askBeforeLeaving: (href, shown) => setPending({ href, warning: shown }) }}
    >
      {children}
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        {pending && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{pending.warning.title}</AlertDialogTitle>
              <AlertDialogDescription>{pending.warning.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{pending.warning.stay}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setPending(null);
                  router.push(pending.href);
                }}
              >
                {pending.warning.leave}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </LeaveGuardContext.Provider>
  );
}

/** While `warning` is set, the navigation links that leave the page ask for confirmation first. */
export function useLeaveWarning(warning: LeaveWarning | null) {
  const setWarning = useContext(LeaveGuardContext)?.setWarning;

  useEffect(() => {
    if (!setWarning) return;
    setWarning(warning);
    return () => setWarning(null);
  }, [setWarning, warning]);
}

/** The click handler of a navigation link: holds the link back while the page has a warning. */
export function useLeaveGuard() {
  const guard = useContext(LeaveGuardContext);

  return function holdBack(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!guard?.warning || href === window.location.pathname) return;
    // A new tab or window leaves this page as it is.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    guard.askBeforeLeaving(href, guard.warning);
  };
}
