export type NavLink = {
  href: string;
  label: string;
};

export const GLOBAL_NAV_LINKS: NavLink[] = [
  { href: "/", label: "דף הבית" },
  { href: "/portfolio", label: "תיק פרויקטים" },
  { href: "/projects", label: "פרויקטים" },
  { href: "/upload", label: "העלאת דוח" },
  { href: "/reviews", label: "ביקורות AI" },
  { href: "/actions", label: "פעולות תפעוליות" },
  { href: "/escalations", label: "נקודות סיכון" },
  { href: "/automation", label: "אוטומציה" },
  { href: "/automation/dead-letters", label: "Dead Letters" },
];
