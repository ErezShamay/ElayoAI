"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="of-auth-page">
          <div className="of-auth-card mx-auto w-full max-w-md text-center">
            <p className="text-sm text-zinc-500">מאמתים את ההזמנה...</p>
          </div>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleCallback() {
      const nextPath = searchParams.get("next") || "/";
      const code = searchParams.get("code");

      try {
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }
        } else {
          const hash = window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash;
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (sessionError) {
              throw sessionError;
            }
          }
        }

        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          throw new Error("לא ניתן לאמת את ההזמנה. נסו שוב מהקישור במייל.");
        }

        router.replace(nextPath);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "אימות ההזמנה נכשל"
        );
      }
    }

    void handleCallback();
  }, [router, searchParams]);

  return (
    <main className="of-auth-page">
      <div className="of-auth-card of-animate-fade-up mx-auto w-full max-w-md text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-black">שגיאה באימות</h1>
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black">מאמתים את ההזמנה...</h1>
            <p className="mt-4 text-sm text-zinc-500">
              רק רגע, מכינים את החשבון שלך.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
