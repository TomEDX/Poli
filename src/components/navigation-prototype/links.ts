import { BookOpen, CircleQuestionMark, Columns2, House, type LucideIcon, Scale, ScrollText, Settings } from "lucide-react";

// PROTOTYPE (navigation): throwaway, see the codex/prototype-navigation branch.

export type NavLink = { href: string; label: string; icon: LucideIcon };

export const rubriques: NavLink[] = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/quiz", label: "Quiz", icon: CircleQuestionMark },
  { href: "/comparateur", label: "Comparateur", icon: Columns2 },
  { href: "/textes", label: "Textes", icon: ScrollText },
];

export const transparencyPages: NavLink[] = [
  { href: "/methode", label: "Méthode", icon: Scale },
  { href: "/sources", label: "Sources", icon: BookOpen },
];

export const administration: NavLink = { href: "/admin", label: "Administration", icon: Settings };

export function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
