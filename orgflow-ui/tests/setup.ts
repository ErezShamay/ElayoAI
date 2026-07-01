// הגדרות גלובליות ל-Vitest. רץ לפני כל קובץ בדיקה (ראו setupFiles ב-
// vitest.config.ts). בטוח לייבוא גם עבור קבצי בדיקה בסביבת "node" וגם
// "jsdom" - ה-matchers של jest-dom לא עושים כלום עד שבדיקה בפועל מבצעת
// assert מול DOM node.
import "@testing-library/jest-dom/vitest";
