import {
  BookOpen,
  CircleQuestionMark,
  Columns2,
  House,
  Landmark,
  ListTree,
  type LucideIcon,
  Scale,
  ScrollText,
  TextQuote,
  Vote,
} from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };

/** A section of the editor's navigation: the public site or the administration. */
export type NavSection = "site" | "admin";

export const homeLink: NavLink = { href: "/", label: "Accueil", icon: House };

export const rubriques: NavLink[] = [
  { href: "/quiz", label: "Quiz", icon: CircleQuestionMark },
  { href: "/comparateur", label: "Comparateur", icon: Columns2 },
  { href: "/textes", label: "Textes", icon: ScrollText },
];

export const transparencyLinks: NavLink[] = [
  { href: "/methode", label: "Méthode", icon: Scale },
  { href: "/sources", label: "Sources", icon: BookOpen },
];

// Each content section adds its entry here as it is built: the tree for the topic tree, the
// ballot box for candidacies, the Assemblée for its groups, the open book for sources, the scroll
// for texts, the quote for programmes, the question mark for the quiz, the scales for the method page.
export const adminGroups: { label: string; links: NavLink[] }[] = [
  {
    label: "Référentiel",
    links: [
      { href: "/admin/topics", label: "Thématiques", icon: ListTree },
      { href: "/admin/parties", label: "Partis et candidatures", icon: Vote },
      { href: "/admin/parliamentary-groups", label: "Groupes parlementaires", icon: Landmark },
      { href: "/admin/sources", label: "Sources", icon: BookOpen },
    ],
  },
  {
    label: "Législatif",
    links: [{ href: "/admin/texts", label: "Textes", icon: ScrollText }],
  },
  {
    label: "Programmes",
    links: [{ href: "/admin/programmes", label: "Extraits", icon: TextQuote }],
  },
  {
    label: "Quiz",
    links: [{ href: "/admin/quiz", label: "Questions", icon: CircleQuestionMark }],
  },
  {
    label: "Transparence",
    links: [{ href: "/admin/method", label: "Page Méthode", icon: Scale }],
  },
];

/** The home page is active on itself only; any other entry also on the pages below it. */
export function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The section holding a page, which is the one open when the editor arrives on it. */
export function sectionOf(pathname: string): NavSection {
  return isActiveLink(pathname, "/admin") ? "admin" : "site";
}
