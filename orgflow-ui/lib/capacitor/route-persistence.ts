import { isCapacitorNativePlatform } from "@/lib/capacitor/platform";

const STORAGE_KEY = "elayoai-capacitor-last-route";

function canPersistRoute(): boolean {
  return (
    isCapacitorNativePlatform()
    && typeof sessionStorage !== "undefined"
  );
}

/** נתיב מלא כולל query — לשחזור אחרי מצלמה / reload של WebView. */
export function readCapacitorPersistedRoute(): string | null {
  if (!canPersistRoute()) {
    return null;
  }

  const raw = sessionStorage.getItem(STORAGE_KEY)?.trim();
  if (!raw || raw === "/") {
    return null;
  }

  return raw;
}

export function writeCapacitorPersistedRoute(path: string): void {
  if (!canPersistRoute()) {
    return;
  }

  const normalized = path.trim();
  if (!normalized || normalized === "/") {
    return;
  }

  sessionStorage.setItem(STORAGE_KEY, normalized);
}

export function clearCapacitorPersistedRoute(): void {
  if (!canPersistRoute()) {
    return;
  }

  sessionStorage.removeItem(STORAGE_KEY);
}

/** האם לשחזר נתיב שמור במקום להישאר בדף הבית הציבורי. */
export function shouldRestoreCapacitorRoute(pathname: string): boolean {
  if (!canPersistRoute()) {
    return false;
  }

  const saved = readCapacitorPersistedRoute();
  if (!saved) {
    return false;
  }

  if (pathname !== "/" && pathname !== "/index.html") {
    return false;
  }

  return saved.startsWith("/field-reports")
    || saved.startsWith("/portfolio")
    || saved.startsWith("/projects");
}
