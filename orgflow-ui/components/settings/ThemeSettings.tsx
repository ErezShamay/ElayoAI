"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import type { ThemeMode } from "@/providers/ThemeProvider";
import { useTheme } from "@/providers/ThemeProvider";

const THEME_OPTIONS: {
  value: ThemeMode;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "light",
    label: "מצב בהיר",
    description: "רקע בהיר וטקסט כהה",
    icon: Sun,
  },
  {
    value: "dark",
    label: "מצב כהה",
    description: "רקע כהה וטקסט בהיר",
    icon: Moon,
  },
  {
    value: "system",
    label: "לפי המערכת",
    description: "מתאים את עצמו להגדרות המכשיר",
    icon: Monitor,
  },
];

export default function ThemeSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold">
          מראה
        </h2>
        <p className="mt-1 text-sm text-[var(--of-color-text-muted)]">
          בחרו את ערכת הצבעים של הממשק
          {theme === "system" ? (
            <span>
              {" "}
              (כרגע: {resolvedTheme === "dark" ? "כהה" : "בהיר"})
            </span>
          ) : null}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map((option) => {
          const isActive = theme === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={`
                of-focus-ring
                rounded-2xl
                border
                p-4
                text-right
                transition-all
                ${
                  isActive
                    ? `
                      border-brand
                      bg-brand-muted
                      shadow-md
                      shadow-brand/10
                      dark:border-brand-light
                      dark:bg-brand/15
                    `
                    : `
                      border-[rgb(var(--of-color-accent-rgb)/0.14)]
                      bg-white/90
                      hover:border-[rgb(var(--of-color-accent-secondary-rgb)/0.35)]
                      hover:bg-brand-muted
                      dark:border-[rgb(var(--of-color-accent-rgb)/0.22)]
                      dark:bg-[rgb(26_31_35/0.9)]
                      dark:hover:bg-[rgb(var(--of-color-accent-rgb)/0.12)]
                    `
                }
              `}
              aria-pressed={isActive}
            >
              <div
                className={`
                  mb-3
                  inline-flex
                  rounded-xl
                  p-2.5
                  ${
                    isActive
                      ? "of-accent-gradient rounded-xl p-2.5"
                      : "bg-brand-muted text-brand dark:bg-brand/10 dark:text-brand-light rounded-xl p-2.5"
                  }
                `}
              >
                <Icon className="h-5 w-5" />
              </div>

              <p className="font-semibold">
                {option.label}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
