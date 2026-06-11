/** Shared classes for touch-friendly controls in field reports (3E.1). */
export const FR_TOUCH_INPUT =
  "of-input w-full min-h-12 text-base touch-manipulation lg:min-h-0 lg:text-sm";

export const FR_TOUCH_SELECT = `${FR_TOUCH_INPUT}`;

export const FR_TOUCH_TEXTAREA = `${FR_TOUCH_INPUT} min-h-32 lg:min-h-28`;

export const FR_TOUCH_NOTES = `${FR_TOUCH_INPUT} min-h-28 lg:min-h-24`;

export const FR_TOUCH_BUTTON =
  "min-h-12 touch-manipulation lg:min-h-0";

/** Primary action control on field-reports hub (matches «דוח ביקור חדש»). */
export const FR_PRIMARY_ACTION_BUTTON =
  "of-focus-ring inline-flex min-h-12 touch-manipulation items-center justify-center rounded-2xl bg-brand px-5 py-2.5 text-base font-semibold text-white transition-all hover:bg-brand-dark dark:bg-brand-light dark:text-brand-dark lg:min-h-0 lg:px-4 lg:py-2 lg:text-sm";

export const FR_FILTER_BUTTON_ACTIVE = FR_PRIMARY_ACTION_BUTTON;

export const FR_FILTER_BUTTON_INACTIVE =
  "of-focus-ring inline-flex min-h-12 touch-manipulation items-center justify-center rounded-2xl border border-zinc-300 bg-white px-5 py-2.5 text-base font-semibold text-zinc-900 transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900 lg:min-h-0 lg:px-4 lg:py-2 lg:text-sm";

export const FR_TOUCH_LIST_BUTTON =
  "w-full min-h-12 touch-manipulation rounded-xl border px-4 py-3 text-right text-base transition-colors lg:min-h-0 lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm";
