"use client";

import { Suspense, useEffect, type ReactNode } from "react";

import { migrateElayoAiStorage } from "@/lib/elayoai/migrate-storage";
import { I18nProvider } from "@/providers/I18nProvider";
import { OfflineProvider } from "@/providers/OfflineProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import CapacitorBootstrap from "@/components/capacitor/CapacitorBootstrap";
import CapacitorRoutePersistence from "@/components/capacitor/CapacitorRoutePersistence";
import PwaRegistration from "@/components/pwa/PwaRegistration";
import OfflineBanner from "@/components/ui/OfflineBanner";

export default function AppProviders({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    migrateElayoAiStorage();
  }, []);

  return (
    <ThemeProvider defaultTheme="light">
      <I18nProvider>
        <OfflineProvider>
          <CapacitorBootstrap />
          <Suspense fallback={null}>
            <CapacitorRoutePersistence />
          </Suspense>
          <PwaRegistration />
          <OfflineBanner />
          {children}
        </OfflineProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
