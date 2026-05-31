"use client";

import { useEffect } from "react";

import { usePathname } from "next/navigation";

function scrollToSection(sectionId: string) {
  const attempt = (retriesLeft = 12) => {
    const element = document.getElementById(sectionId);

    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (retriesLeft > 0) {
      window.setTimeout(() => attempt(retriesLeft - 1), 50);
    }
  };

  requestAnimationFrame(() => attempt());
}

export default function HomeScrollManager() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    function handleHomeScroll() {
      const hash = window.location.hash;

      if (hash.startsWith("#")) {
        scrollToSection(hash.slice(1));
        return;
      }

      window.history.replaceState(null, "", "/");
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    handleHomeScroll();
    window.addEventListener("hashchange", handleHomeScroll);

    return () => {
      window.removeEventListener("hashchange", handleHomeScroll);
    };
  }, [pathname]);

  return null;
}
