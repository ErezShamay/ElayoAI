"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { landingSectionHref } from "@/lib/navigation";

function scrollToSection(sectionId: string) {
  window.history.replaceState(null, "", landingSectionHref(sectionId));
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
  });
}

export default function LandingSectionLink({
  sectionId,
  label,
  className = "",
}: {
  sectionId: string;
  label: string;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const href = landingSectionHref(sectionId);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === "/") {
      event.preventDefault();
      scrollToSection(sectionId);
      return;
    }

    event.preventDefault();
    router.push(href);
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`
        of-nav-pill
        rounded-xl
        px-4
        py-2
        text-sm
        font-medium
        ${className}
      `}
    >
      {label}
    </Link>
  );
}
