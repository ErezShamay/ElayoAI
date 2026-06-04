import { App } from "@capacitor/app";

import {
  getCapacitorPlatform,
  isCapacitorNativePlatform,
} from "@/lib/capacitor/platform";

let initPromise: Promise<void> | null = null;

/**
 * אתחול Capacitor ב-native בלבד (FR-029).
 * מצלמה FR-031, PDF FR-032, רשת FR-033 (`field-report-network`).
 */
export async function initCapacitorApp(): Promise<void> {
  if (typeof window === "undefined" || !isCapacitorNativePlatform()) {
    return;
  }

  if (!initPromise) {
    initPromise = runNativeInit();
  }

  await initPromise;
}

async function runNativeInit(): Promise<void> {
  document.documentElement.classList.add("capacitor-native");
  document.documentElement.dataset.capacitorPlatform =
    getCapacitorPlatform();

  App.addListener("appStateChange", ({ isActive }) => {
    document.documentElement.dataset.capacitorAppActive = isActive
      ? "true"
      : "false";
  });
}

export function resetCapacitorInitForTests(): void {
  initPromise = null;
}
