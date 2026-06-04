"use client";

import { useEffect, useRef } from "react";

import { App } from "@capacitor/app";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { readLinePhotoCaptureContext } from "@/lib/capacitor/line-photo-capture-context";
import { isCapacitorNativePlatform } from "@/lib/capacitor/platform";
import {
  currentDocumentPath,
  readCapacitorPersistedRoute,
  shouldRestoreCapacitorRoute,
  writeCapacitorPersistedRoute,
} from "@/lib/capacitor/route-persistence";

function buildPersistedPath(
  pathname: string,
  searchParams: URLSearchParams
): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function resolveRestoreTarget(): string | null {
  const saved = readCapacitorPersistedRoute();
  if (saved) {
    return saved;
  }

  const pendingPhoto = readLinePhotoCaptureContext();
  return pendingPhoto?.returnPath?.trim() || null;
}

function navigateToRestoreTarget(target: string, router: ReturnType<typeof useRouter>) {
  if (currentDocumentPath() === target) {
    return;
  }

  if (isCapacitorNativePlatform()) {
    window.location.assign(target);
    return;
  }

  router.replace(target);
}

function tryRestoreRoute(
  pathname: string,
  router: ReturnType<typeof useRouter>
): boolean {
  if (!shouldRestoreCapacitorRoute(pathname)) {
    return false;
  }

  const target = resolveRestoreTarget();
  if (!target) {
    return false;
  }

  navigateToRestoreTarget(target, router);
  return true;
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

      tryRestoreRoute(window.location.pathname, router);
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

    const target = resolveRestoreTarget();
    if (!target) {
      return;
    }

    restoredRef.current = true;
    navigateToRestoreTarget(target, router);
  }, [loading, user, pathname, router]);

  return null;
}

/** לפני פתיחת מצלמה/גלריה — מבטיח שיש נתיב לשחזור. */
export function persistCapacitorRouteNow(): void {
  if (!isCapacitorNativePlatform() || typeof window === "undefined") {
    return;
  }

  writeCapacitorPersistedRoute(currentDocumentPath());
}
