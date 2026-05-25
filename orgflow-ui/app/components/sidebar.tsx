"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    {
      href: "/reviews",
      label: "ביקורות AI",
    },
    {
      href: "/actions",
      label: "פעולות תפעוליות",
    },
    {
      href: "/escalations",
      label: "נקודות סיכון",
    },
    {
      href: "/projects",
      label: "פרויקטים",
    },
  ];

  return (
    <aside
      className="
        w-72
        min-h-screen
        bg-white
        dark:bg-zinc-900
        border-l
        border-zinc-200
        dark:border-zinc-800
        p-6
      "
    >
      <div className="mb-10">

      <Link href="/">
        <h1 className="text-3xl font-bold cursor-pointer">
          Supervisor AI
        </h1>
      </Link>

        <p
          className="
            text-zinc-500
            dark:text-zinc-400
            mt-2
          "
        >
          שליטה ובקרה לפרויקטים
        </p>

      </div>

      <nav className="space-y-2">

        {links.map((link) => {

          const isActive =
            pathname === link.href;

          return (

            <Link
              key={link.href}
              href={link.href}
              className={`
                block
                px-4
                py-3
                rounded-2xl
                transition-colors
                font-medium

                ${
                  isActive
                    ? `
                      bg-zinc-900
                      text-white
                      dark:bg-white
                      dark:text-black
                    `
                    : `
                      hover:bg-zinc-100
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
    </aside>
  );
}