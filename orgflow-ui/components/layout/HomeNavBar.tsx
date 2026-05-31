"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import UserMenu from "@/components/auth/UserMenu";
import OrgSwitcher from "@/components/admin/OrgSwitcher";
import BrandLogo from "@/components/ui/BrandLogo";
import { useIsAdmin } from "@/hooks/useEffectiveRole";
import {
  ADMIN_USERS_ROUTE,
  HOME_NAVBAR_LINKS,
} from "@/lib/navigation";

export default function HomeNavBar() {
  const pathname = usePathname();
  const isAdminUser = useIsAdmin();
  const navLinks = [
    ...HOME_NAVBAR_LINKS,
    ...(isAdminUser ? [ADMIN_USERS_ROUTE] : []),
  ];

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
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  whitespace-nowrap
                  rounded-xl
                  px-3
                  py-2
                  text-sm
                  font-medium
                  transition-all
                  ${
                    isActive
                      ? "bg-gradient-to-l from-blue-600 to-violet-600 text-white shadow-md shadow-blue-600/20"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }
                `}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
