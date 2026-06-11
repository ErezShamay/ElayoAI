"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import UserMenu from "@/components/auth/UserMenu";
import SystemNavDropdown from "@/components/layout/SystemNavDropdown";
import BrandLogo from "@/components/ui/BrandLogo";
import {
  HOME_NAVBAR_LINKS,
  isNavLinkActive,
} from "@/lib/navigation";

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

          <UserMenu />
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
            const isActive = isNavLinkActive(pathname, link.href);

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
