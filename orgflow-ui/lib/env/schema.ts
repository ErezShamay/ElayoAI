import { z } from "zod";

/**
 * סכמת ולידציה לכל משתני הסביבה הציבוריים (client-safe) שה-UI קורא אליהם.
 *
 * כל השדות אופציונליים ומחזירים "" כברירת מחדל בכוונה: הקוד הקורא
 * (public-env.ts) כבר יודע להתמודד עם ערכים חסרים בעדינות (למשל
 * isSupabaseConfigured() מחזיר false, describeMobileAuthConfig() מציג
 * הודעת בעיה בעברית) - הסכמה הזו לא אמורה לזרוק/להקריס את ה-build כשמשתנה
 * חסר, רק לתת נקודת אמת אחת, מתועדת וטיפוסית, לאילו משתנים קיימים ולאיזו
 * צורה (string, trimmed) הם אמורים להיות.
 *
 * חשוב: Next.js חושף לדפדפן אך ורק משתנים שמתחילים ב-`NEXT_PUBLIC_` -
 * לעולם אל תוסיפו לכאן משתנה סודי (כמו SUPABASE_KEY / service_role).
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().optional().default(""),
  // fallback ל-SSR/build בלבד (ראו הערה ב-public-env.ts) - לא נחשפים בפועל
  // לדפדפן אלא אם הוזרקו כ-build-time env של השרת.
  SUPABASE_URL: z.string().trim().optional().default(""),
  SUPABASE_ANON_KEY: z.string().trim().optional().default(""),
  NEXT_PUBLIC_API_URL: z.string().trim().optional().default(""),
  NEXT_PUBLIC_API_URL_ANDROID: z.string().trim().optional().default(""),
  NEXT_PUBLIC_FORCE_LOGIN: z.string().trim().optional().default(""),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cached: PublicEnv | null = null;

/**
 * מפרסר ומאמת את process.env מול publicEnvSchema, עם קאש בזיכרון (התוצאה
 * לא משתנה תוך כדי ריצה של אותו תהליך). כל שדה חסר/לא-string פשוט נופל
 * חזרה ל-"" בזכות `.optional().default("")` - שום דבר כאן לא זורק.
 */
export function getPublicEnv(): PublicEnv {
  if (cached) {
    return cached;
  }

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_API_URL_ANDROID: process.env.NEXT_PUBLIC_API_URL_ANDROID,
    NEXT_PUBLIC_FORCE_LOGIN: process.env.NEXT_PUBLIC_FORCE_LOGIN,
  });

  // safeParse עם כל השדות אופציונליים+default לא יכול להיכשל בפועל, אבל
  // אנחנו נשארים הגנתיים: אם בכל זאת ייכשל, נופלים חזרה לאובייקט ריק
  // תקני (כל השדות "") במקום להקריס את האפליקציה.
  cached = parsed.success ? parsed.data : publicEnvSchema.parse({});
  return cached;
}

/** לשימוש בבדיקות בלבד - מאפס את הקאש כדי לאלץ קריאה מחדש של process.env. */
export function __resetPublicEnvCacheForTests(): void {
  cached = null;
}
