"use client";

import { useEffect, useRef } from "react";

import { App } from "@capacitor/app";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import {
  readCapacitorPersistedRoute,
  shouldRestoreCapacitorRoute,
  writeCapacitorPersistedRoute,
} from "@/lib/capacitor/route-persistence";
import { isCapacitorNativePlatform } from "@/lib/capacitor/platform";

function buildPersistedPath(
  pathname: string,
  searchParams: URLSearchParams
): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * שומר את הנתיב הנוכחי ב-APK ומשחזר אחרי reload (למשל אחרי Camera).
 */
export default function CapacitorRoutePersistence() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!isCapacitorNativePlatform() || !pathname) {
      return;
    }

    writeCapacitorPersistedRoute(
      buildPersistedPath(pathname, searchParams)
    );
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isCapacitorNativePlatform()) {
      return;
    }

    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        return;
      }

      const saved = readCapacitorPersistedRoute();
      if (!saved) {
        return;
      }

      const currentPath = window.location.pathname;
      if (shouldRestoreCapacitorRoute(currentPath)) {
        router.replace(saved);
      }
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [router]);

  useEffect(() => {
    if (
      !isCapacitorNativePlatform()
      || loading
      || !user
      || restoredRef.current
    ) {
      return;
    }

    if (!shouldRestoreCapacitorRoute(pathname)) {
      return;
    }

    const saved = readCapacitorPersistedRoute();
    if (!saved) {
      return;
    }

    restoredRef.current = true;
    router.replace(saved);
  }, [loading, user, pathname, router]);

  return null;
}

/** לפני פתיחת מצלמה/גלריה — מבטיח שיש נתיב לשחזור. */
export function persistCapacitorRouteNow(): void {
  if (!isCapacitorNativePlatform() || typeof window === "undefined") {
    return;
  }

  writeCapacitorPersistedRoute(
    `${window.location.pathname}${window.location.search}`
  );
}
