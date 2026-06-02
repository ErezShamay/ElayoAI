"use client";

import {
  useParams,
  usePathname,
} from "next/navigation";

import BrandLogo from "@/components/ui/BrandLogo";
import NavLinkItem from "@/components/ui/NavLinkItem";
import { useIsAdmin } from "@/hooks/useEffectiveRole";
import { useFieldReportModule } from "@/hooks/useFieldReportModule";
import {
  FIELD_REPORTS_ROUTE,
  getSystemNavLinks,
  GLOBAL_NAV_LINKS,
  isNavLinkActive,
} from "@/lib/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const isAdminUser = useIsAdmin();
  const { isEnabled: fieldReportsEnabled } = useFieldReportModule();
  const projectId =
    typeof params?.id === "string"
      ? params.id
      : null;

  const systemLinks = getSystemNavLinks(isAdminUser);

  const projectLinks = projectId
    ? [
        {
          href: `/projects/${projectId}`,
          label: "סקירת הפרויקט",
        },
        {
          href: `/projects/${projectId}/reviews`,
          label: "ביקורות AI",
        },
        {
          href: `/projects/${projectId}/actions`,
          label: "פעולות תפעוליות",
        },
        {
          href: `/projects/${projectId}/escalations`,
          label: "נקודות סיכון",
        },
      ]
    : [];

  return (
    <aside
      className="
        of-glass-sidebar
        w-full
        border-b
        p-4
        lg:w-72
        lg:min-h-screen
        lg:border-b-0
        lg:border-l
        lg:p-6
      "
    >
      <div className="mb-10">
        <BrandLogo size="lg" />
      </div>

      <nav className="space-y-6">
        <div>
          <p className="of-nav-section-label">
            ניווט ראשי
          </p>

          <div className="space-y-1">
            {GLOBAL_NAV_LINKS.map((link) => (
              <NavLinkItem
                key={link.href}
                href={link.href}
                label={link.label}
                isActive={pathname === link.href}
              />
            ))}
            {fieldReportsEnabled ? (
              <NavLinkItem
                href={FIELD_REPORTS_ROUTE.href}
                label={FIELD_REPORTS_ROUTE.label}
                isActive={
                  pathname === FIELD_REPORTS_ROUTE.href
                  || pathname.startsWith(`${FIELD_REPORTS_ROUTE.href}/`)
                }
              />
            ) : null}
          </div>
        </div>

        {projectLinks.length > 0 ? (
          <div>
            <p className="of-nav-section-label">
              פרויקט נוכחי
            </p>

            <div className="space-y-1">
              {projectLinks.map((link) => (
                <NavLinkItem
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  isActive={pathname === link.href}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="of-nav-section-label">
            מערכת
          </p>

          <div className="space-y-1">
            {systemLinks.map((link) => (
              <NavLinkItem
                key={link.href}
                href={link.href}
                label={link.label}
                isActive={isNavLinkActive(pathname, link.href)}
              />
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
