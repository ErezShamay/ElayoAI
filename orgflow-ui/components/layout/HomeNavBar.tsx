"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import UserMenu from "@/components/auth/UserMenu";
import LocaleToggle from "@/components/ui/LocaleToggle";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { GLOBAL_NAV_LINKS } from "@/lib/navigation";

export default function HomeNavBar() {
  const pathname = usePathname();

  return (
    <header
      className="
        sticky
        top-0
        z-40
        border-b
        border-zinc-200
        bg-white/95
        backdrop-blur
        dark:border-zinc-800
        dark:bg-zinc-950/95
      "
    >
      <div
        className="
          mx-auto
          flex
          max-w-7xl
          flex-col
          gap-4
          px-4
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
          <Link href="/">
            <div>
              <h1 className="text-xl font-bold">
                Supervisor AI
              </h1>
              <p
                className="
                  text-sm
                  text-zinc-500
                  dark:text-zinc-400
                "
              >
                שליטה ובקרה לפרויקטים
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <LocaleToggle />
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
          {GLOBAL_NAV_LINKS.map((link) => {
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
                  transition-colors
                  ${
                    isActive
                      ? `
                        bg-zinc-900
                        text-white
                        dark:bg-white
                        dark:text-black
                      `
                      : `
                        text-zinc-700
                        hover:bg-zinc-100
                        dark:text-zinc-300
                        dark:hover:bg-zinc-800
                      `
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
