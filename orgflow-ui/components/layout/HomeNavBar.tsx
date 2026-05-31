"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import UserMenu from "@/components/auth/UserMenu";
import OrgSwitcher from "@/components/admin/OrgSwitcher";
import SystemNavDropdown from "@/components/layout/SystemNavDropdown";
import BrandLogo from "@/components/ui/BrandLogo";
import { HOME_NAVBAR_LINKS } from "@/lib/navigation";

export default function HomeNavBar() {
  const pathname = usePathname();

  return (
    <header className="of-glass-header sticky top-0 z-40">
      <div
        className="
          of-container
          flex
          flex-col
          gap-4
          py-4
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <BrandLogo />

          <div className="flex shrink-0 items-center gap-2">
            <OrgSwitcher />
            <UserMenu />
          </div>
        </div>

        <nav
          className="
            flex
            items-center
            gap-1
            overflow-x-auto
            pb-1
          "
        >
          {HOME_NAVBAR_LINKS.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  of-nav-pill
                  whitespace-nowrap
                  rounded-xl
                  px-3
                  py-2
                  text-sm
                  font-medium
                  ${isActive ? "of-nav-pill-active" : ""}
                `}
              >
                {link.label}
              </Link>
            );
          })}

          <SystemNavDropdown pathname={pathname} />
        </nav>
      </div>
    </header>
  );
}
