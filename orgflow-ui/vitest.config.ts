import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // ברירת המחדל נשארת "node" - חבילת הבדיקות הקיימת תחת tests/lib/**
    // בודקת לוגיקה טהורה (בלי DOM), והרצתה תחת jsdom רק תוסיף תקורה.
    // בדיקות קומפוננטות מבקשות jsdom עצמאית עם פרגמת
    // `// @vitest-environment jsdom` בראש הקובץ (ראו
    // tests/components/Button.test.tsx לדוגמה) - זו הדרך הנתמכת של
    // Vitest לערבב סביבות בתוך project/config אחד.
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
