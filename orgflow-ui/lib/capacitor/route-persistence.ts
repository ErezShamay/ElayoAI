import { isCapacitorNativePlatform } from "@/lib/capacitor/platform";

const STORAGE_KEY = "elayoai-capacitor-last-route";

function routeStorage(): Storage | null {
  if (!isCapacitorNativePlatform() || typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

/** נתיב מלא כולל query — לשחזור אחרי מצלמה / reload של WebView. */
export function readCapacitorPersistedRoute(): string | null {
  const storage = routeStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(STORAGE_KEY)?.trim();
  if (!raw || raw === "/") {
    return null;
  }

  return raw;
}

export function writeCapacitorPersistedRoute(path: string): void {
  const storage = routeStorage();
  if (!storage) {
    return;
  }

  const normalized = path.trim();
  if (!normalized || normalized === "/") {
    return;
  }

  storage.setItem(STORAGE_KEY, normalized);
}

export function clearCapacitorPersistedRoute(): void {
  const storage = routeStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(STORAGE_KEY);
}

export function currentDocumentPath(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.pathname}${window.location.search}`;
}

/** האם לשחזר נתיב שמור במקום להישאר בדף הבית הציבורי. */
export function shouldRestoreCapacitorRoute(pathname: string): boolean {
  if (!routeStorage()) {
    return false;
  }

  const saved = readCapacitorPersistedRoute();
  if (!saved) {
    return false;
  }

  const normalizedPath = pathname.replace(/\/index\.html$/i, "") || "/";

  if (normalizedPath !== "/" && normalizedPath !== "") {
    return false;
  }

  return (
    saved.startsWith("/field-reports")
    || saved.startsWith("/portfolio")
    || saved.startsWith("/projects")
  );
}
