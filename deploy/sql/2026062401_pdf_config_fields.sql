-- PDF config fields for multi-tenant report customization (v4 architecture).
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- organization_profile: per-org PDF overrides
ALTER TABLE public.organization_profiles
    ADD COLUMN IF NOT EXISTS report_title_he    text,
    ADD COLUMN IF NOT EXISTS header_margin_top  text;

COMMENT ON COLUMN public.organization_profiles.report_title_he   IS 'כותרת H1 מותאמת לדוח PDF — ברירת מחדל: "דוח מפקח/ת הנדסי מטעם בעלי הדירות"';
COMMENT ON COLUMN public.organization_profiles.header_margin_top IS 'גובה ה-margin-top של Puppeteer בפיקסלים — ברירת מחדל: "105px"';
