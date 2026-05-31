"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import BrandLogo from "@/components/ui/BrandLogo";
import Button from "@/components/ui/Button";
import {
  getPasswordRuleStates,
  isPasswordValid,
} from "@/lib/auth/passwordPolicy";
import { supabase } from "@/lib/supabase";

export default function SetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session));
      setCheckingSession(false);
    }

    void checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isPasswordValid(password)) {
      setError("הסיסמה אינה עומדת בדרישות האבטחה");
      return;
    }

    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      router.push("/");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "הגדרת הסיסמה נכשלה"
      );
    } finally {
      setLoading(false);
    }
  }

  const ruleStates = getPasswordRuleStates(password);

  if (checkingSession) {
    return (
      <main className="of-auth-page">
        <div className="of-auth-card mx-auto w-full max-w-md text-center">
          <p className="text-sm text-zinc-500">טוען...</p>
        </div>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="of-auth-page">
        <div className="of-auth-card of-animate-fade-up mx-auto w-full max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <BrandLogo size="lg" href="/" />
          </div>
          <h1 className="text-2xl font-black">קישור ההזמנה אינו תקף</h1>
          <p className="mt-4 text-sm text-zinc-500">
            פתחו שוב את הקישור מהמייל, או פנו למנהל המערכת לקבלת הזמנה חדשה.
          </p>
          <Link
            href="/auth/login"
            className="mt-8 inline-block font-medium text-brand hover:underline dark:text-brand-light"
          >
            מעבר להתחברות
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="of-auth-page">
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          overflow-hidden
        "
        aria-hidden
      >
        <div className="of-landing-orb of-landing-orb-1 absolute" />
        <div className="of-landing-orb of-landing-orb-2 absolute" />
      </div>

      <div className="of-auth-card of-animate-fade-up mx-auto w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandLogo size="lg" href="/" />
        </div>

        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-medium text-brand dark:text-brand-light">
            ברוכים הבאים
          </p>
          <h1 className="text-3xl font-black tracking-tight">
            הגדרת סיסמה
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            בחרו סיסמה חזקה לכניסה למערכת
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block font-medium">
              סיסמה חדשה
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="of-input of-focus-ring"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              אימות סיסמה
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="of-input of-focus-ring"
            />
          </div>

          <ul className="space-y-2 rounded-2xl border border-zinc-200/80 p-4 text-sm dark:border-zinc-700">
            {ruleStates.map((rule) => (
              <li
                key={rule.id}
                className={
                  rule.passed
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-500"
                }
              >
                {rule.passed ? "✓" : "○"} {rule.label}
              </li>
            ))}
          </ul>

          {error ? (
            <div className="of-card of-card-p6 of-badge-danger rounded-2xl text-sm">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            variant="accent"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? "שומר..." : "שמירת סיסמה והמשך"}
          </Button>
        </form>
      </div>
    </main>
  );
}
