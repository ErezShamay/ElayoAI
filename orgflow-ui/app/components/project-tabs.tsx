"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

type Props = {
  projectId: string;
};

export default function ProjectTabs({
  projectId,
}: Props) {

  const pathname =
    usePathname();

  const tabs = [
    {
      href: `/projects/${projectId}`,
      label: "סקירה",
    },
    {
      href: `/projects/${projectId}/reviews`,
      label: "ביקורות AI",
    },
    {
      href: `/projects/${projectId}/actions`,
      label: "פעולות",
    },
    {
      href: `/projects/${projectId}/escalations`,
      label: "הסלמות",
    },
  ];

  return (
    <div
      className="
        flex
        gap-3
        mb-8
        overflow-x-auto
      "
    >

      {tabs.map((tab) => {

        const isActive =
          pathname === tab.href;

        return (

          <Link
            key={tab.href}
            href={tab.href}
            className={`
              px-5
              py-3
              rounded-2xl
              whitespace-nowrap
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
                    bg-white
                    dark:bg-zinc-900
                    border
                    border-zinc-200
                    dark:border-zinc-800
                    hover:bg-zinc-100
                    dark:hover:bg-zinc-800
                  `
              }
            `}
          >
            {tab.label}
          </Link>

        );
      })}

    </div>
  );
}