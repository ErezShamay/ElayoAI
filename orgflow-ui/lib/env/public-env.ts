import { isCapacitorAndroid } from "@/lib/capacitor/platform";
import { getPublicEnv } from "@/lib/env/schema";

/**
 * Supabase ל-UI (anon בלבד).
 *
 * - בדפדפן Next.js חושף רק `NEXT_PUBLIC_*`.
 * - `SUPABASE_URL` / `SUPABASE_ANON_KEY` (בלי NEXT_PUBLIC) - fallback ל-SSR/build בלבד;
 *   לא מחליף את הצורך ב-NEXT_PUBLIC_* ב-Vercel ל-login בדפדפן.
 * - לעולם לא להשתמש ב-`SUPABASE_KEY` (service_role) כאן.
 *
 * הערכים עצמם מגיעים מ-getPublicEnv() (lib/env/schema.ts), שמאמת ומנרמל
 * (trim) את process.env דרך zod פעם אחת לכל תהליך - הפונקציה הזו רק
 * מיישמת את סדר-העדיפויות (NEXT_PUBLIC_* קודם, fallback אחריו).
 */
export function getSupabasePublicConfig() {
  const env = getPublicEnv();

  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "";
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "";

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabasePublicConfig();
  return Boolean(url && anonKey);
}

/**
 * כתובת API שנקלעת ל-bundle ב-build.
 * ב-Android: `localhost` → `10.0.2.2` (אמולטור); במכשיר פיזי השתמשו ב-IP של המחשב ב-.env.
 */
export function getApiBaseUrl(): string {
  const env = getPublicEnv();
  const configured =
    env.NEXT_PUBLIC_API_URL_ANDROID || env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  if (typeof window === "undefined" || !isCapacitorAndroid()) {
    return configured;
  }

  return configured
    .replace("://localhost", "://10.0.2.2")
    .replace("://127.0.0.1", "://10.0.2.2");
}

export function describeMobileAuthConfig(): string | null {
  const env = getPublicEnv();
  const problems: string[] = [];

  if (!isSupabaseConfigured()) {
    problems.push(
      "חסרים NEXT_PUBLIC_SUPABASE_URL ו-NEXT_PUBLIC_SUPABASE_ANON_KEY (או SUPABASE_URL + SUPABASE_ANON_KEY ל-build)"
    );
  }

  if (typeof window !== "undefined" && isCapacitorAndroid()) {
    const raw = env.NEXT_PUBLIC_API_URL_ANDROID || env.NEXT_PUBLIC_API_URL || "";

    if (!raw || /localhost|127\.0\.0\.1/.test(raw)) {
      problems.push(
        "הגדירו ב-.env.capacitor.local את NEXT_PUBLIC_API_URL ל-IP המחשב (למשל http://192.168.1.10:3000) ובנו APK מחדש"
      );
    }
  }

  return problems.length > 0 ? problems.join(". ") : null;
}
