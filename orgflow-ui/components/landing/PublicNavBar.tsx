"use client";

import Link from "next/link";

import BrandLogo from "@/components/ui/BrandLogo";
import LandingSectionLink from "@/components/ui/LandingSectionLink";
import { useAuth } from "@/contexts/AuthContext";
import { LANDING_SECTION_LINKS } from "@/lib/navigation";

export default function PublicNavBar() {
  const { user, loading } = useAuth();

  return (
    <header className="of-glass-header sticky top-0 z-50">
      <div
        className="
          of-container
          flex
          items-center
          justify-between
          gap-4
          py-4
        "
      >
        <BrandLogo />

        <nav
          className="
            hidden
            items-center
            gap-1
            md:flex
          "
          aria-label="ניווט ראשי"
        >
          {LANDING_SECTION_LINKS.map((link) => (
            <LandingSectionLink
              key={link.id}
              sectionId={link.id}
              label={link.label}
            />
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {!loading && user ? (
            <Link
              href="/portfolio"
              className="
                of-focus-ring
                of-accent-gradient
                inline-flex
                rounded-2xl
                px-4
                py-2.5
                text-sm
                font-semibold
                shadow-md
                shadow-brand/20
                transition-all
                hover:brightness-110
                sm:px-5
              "
            >
              כניסה למערכת
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="
                of-focus-ring
                of-accent-gradient
                inline-flex
                rounded-2xl
                px-4
                py-2.5
                text-sm
                font-semibold
                shadow-md
                shadow-brand/20
                transition-all
                hover:brightness-110
                sm:px-5
              "
            >
              התחברות
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
