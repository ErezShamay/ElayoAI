"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { ChevronDown } from "lucide-react";

import { useIsAdmin } from "@/hooks/useEffectiveRole";
import {
  getSystemNavLinks,
  isNavLinkActive,
  isSystemNavActive,
  SYSTEM_NAV_LABEL,
} from "@/lib/navigation";

type MenuPosition = {
  top: number;
  right: number;
};

export default function SystemNavDropdown({
  pathname,
}: {
  pathname: string;
}) {
  const isAdminUser = useIsAdmin();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const systemLinks = getSystemNavLinks(isAdminUser);
  const isActive = isSystemNavActive(pathname, isAdminUser);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();

    setMenuPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const inButton = buttonRef.current?.contains(target);
      const inMenu = menuRef.current?.contains(target);

      if (!inButton && !inMenu) {
        setIsOpen(false);
      }
    }

    function handleReposition() {
      updateMenuPosition();
    }

    const timeoutId = window.setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, updateMenuPosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`
          of-focus-ring
          inline-flex
          shrink-0
          items-center
          gap-1
          whitespace-nowrap
          rounded-xl
          px-3
          py-2
          text-sm
          font-medium
          transition-all
          ${
            isActive
              ? "of-nav-pill-active"
              : "of-nav-pill"
          }
        `}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {SYSTEM_NAV_LABEL}
        <ChevronDown
          size={16}
          className={`
            transition-transform
            ${isOpen ? "rotate-180" : ""}
          `}
        />
      </button>

      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="
                of-card
                fixed
                z-[100]
                min-w-[220px]
                overflow-hidden
                p-2
                shadow-2xl
              "
              style={{
                top: menuPosition.top,
                right: menuPosition.right,
              }}
              role="menu"
            >
              {systemLinks.map((link) => {
                const linkIsActive = isNavLinkActive(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    onClick={() => setIsOpen(false)}
                    className={
                      linkIsActive
                        ? "of-nav-link of-nav-link-active text-right text-sm"
                        : "of-nav-link text-right text-sm"
                    }
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
