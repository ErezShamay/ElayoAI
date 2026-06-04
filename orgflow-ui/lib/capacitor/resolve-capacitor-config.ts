import type { CapacitorConfig } from "@capacitor/cli";

import {
  ELAYO_AI_APP_ID,
  ELAYO_AI_APP_NAME,
} from "./app-branding";
import {
  defaultCapacitorDevServerUrl,
  getCapacitorBuildMode,
  getCapacitorServerUrl,
} from "./build-mode";

function configuredApiUrl(env: NodeJS.ProcessEnv): string {
  return (
    env.NEXT_PUBLIC_API_URL_ANDROID?.trim()
    || env.NEXT_PUBLIC_API_URL?.trim()
    || ""
  );
}

/** APK עם API ב-HTTP דורש WebView שמאפשר cleartext (לא https://localhost + http API). */
export function capacitorUsesHttpApi(env: NodeJS.ProcessEnv = process.env): boolean {
  if (
    env.ELAYOAI_CAPACITOR_ALLOW_CLEARTEXT === "1"
    || env.ORGFLOW_CAPACITOR_ALLOW_CLEARTEXT === "1"
  ) {
    return true;
  }

  const apiUrl = configuredApiUrl(env);
  if (!apiUrl) {
    return true;
  }

  return apiUrl.startsWith("http://");
}

/**
 * בונה `capacitor.config` לפי מצב build (FR-030).
 */
export function resolveCapacitorConfig(
  env: NodeJS.ProcessEnv = process.env
): CapacitorConfig {
  const mode = getCapacitorBuildMode(env);
  const httpApi = capacitorUsesHttpApi(env);
  const base: CapacitorConfig = {
    appId: ELAYO_AI_APP_ID,
    appName: ELAYO_AI_APP_NAME,
    webDir: "out",
    android: {
      allowMixedContent: httpApi,
    },
  };

  if (mode === "url") {
    const serverUrl =
      getCapacitorServerUrl(env) || defaultCapacitorDevServerUrl();
    const cleartext =
      httpApi
      || serverUrl.startsWith("http://");

    return {
      ...base,
      server: {
        url: serverUrl,
        cleartext,
        androidScheme: cleartext ? "http" : "https",
      },
    };
  }

  return {
    ...base,
    server: {
      androidScheme: httpApi ? "http" : "https",
    },
  };
}
