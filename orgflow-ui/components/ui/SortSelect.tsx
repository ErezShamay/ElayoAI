"use client";

import type { SortOption } from "@/lib/ui/sorting";
import { useI18n } from "@/providers/I18nProvider";

export default function SortSelect<K extends string>({
  options,
  sortKey,
  direction,
  onChange,
}: {
  options: SortOption<K>[];
  sortKey: K;
  direction: "asc" | "desc";
  onChange: (key: K) => void;
}) {
  const { t } = useI18n();

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {t("common.sort")}
      </span>
      <select
        value={sortKey}
        onChange={(event) => onChange(event.target.value as K)}
        aria-label={`${t("common.sort")} (${direction === "asc" ? "עולה" : "יורד"})`}
        className="of-input of-focus-ring px-4 py-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
