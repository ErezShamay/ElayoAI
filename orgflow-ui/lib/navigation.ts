export type NavLink = {
  href: string;
  label: string;
};

export const SETTINGS_ROUTE = {
  href: "/settings",
  label: "הגדרות",
} as const;

export const ADMIN_USERS_ROUTE = {
  href: "/admin/users",
  label: "ניהול משתמשים",
} as const;

export const AUTOMATION_ROUTE = {
  href: "/automation",
  label: "אוטומציה",
} as const;

export const DEAD_LETTERS_ROUTE = {
  href: "/automation/dead-letters",
  label: "Dead Letters",
} as const;

export const SYSTEM_NAV_LABEL = "מערכת";

export const SYSTEM_NAV_LINKS: NavLink[] = [
  SETTINGS_ROUTE,
  DEAD_LETTERS_ROUTE,
  AUTOMATION_ROUTE,
];

export function getSystemNavLinks(isAdmin: boolean): NavLink[] {
  if (isAdmin) {
    return [ADMIN_USERS_ROUTE, ...SYSTEM_NAV_LINKS];
  }

  return SYSTEM_NAV_LINKS;
}

export function isNavLinkActive(pathname: string, href: string) {
  if (href === AUTOMATION_ROUTE.href) {
    return (
      pathname === href
      || (
        pathname.startsWith(`${href}/`)
        && !pathname.startsWith(DEAD_LETTERS_ROUTE.href)
      )
    );
  }

  if (href === DEAD_LETTERS_ROUTE.href) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return pathname === href;
}

export function isSystemNavActive(pathname: string, isAdmin: boolean) {
  return getSystemNavLinks(isAdmin).some((link) =>
    isNavLinkActive(pathname, link.href)
  );
}

export const LANDING_SECTION_LINKS = [
  { id: "features", label: "יכולות" },
  { id: "how-it-works", label: "איך זה עובד" },
  { id: "platform", label: "הפלטפורמה" },
] as const;

export function landingSectionHref(sectionId: string) {
  return `/#${sectionId}`;
}

export const PUBLIC_ROUTES = ["/"] as const;

export const POST_LOGIN_ROUTE = "/portfolio" as const;

export function isPublicRoute(pathname: string) {
  return (
    pathname === "/"
    || pathname.startsWith("/auth")
  );
}

export const FIELD_REPORTS_ROUTE = {
  href: "/field-reports",
  label: "הפקת דוחות",
} as const;

export const GLOBAL_NAV_LINKS: NavLink[] = [
  { href: "/", label: "דף הבית" },
  { href: "/portfolio", label: "תיק הפרויקטים" },
  { href: "/projects", label: "פרויקטים" },
  { href: "/tenants", label: "מנהל דיירים" },
  { href: "/upload", label: "העלאת דוח" },
  { href: "/reviews", label: "ביקורות AI" },
  { href: "/actions", label: "פעולות תפעוליות" },
  { href: "/escalations", label: "נקודות סיכון" },
];

export const HOME_NAVBAR_LINKS: NavLink[] = [...GLOBAL_NAV_LINKS];
