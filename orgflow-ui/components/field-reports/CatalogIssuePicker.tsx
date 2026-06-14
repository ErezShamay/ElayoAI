"use client";

import { useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import Button from "@/components/ui/Button";
import { useLockBackgroundScrollWhileOverlay } from "@/hooks/useLockBodyScroll";
import {
  CATALOG_FAST_PATH_AUTO_CONFIRM,
  filterIssuesForSupervisionCategory,
  listSupervisionCategories,
  supervisionCategoryLabelHe,
} from "@/lib/field-reports/catalog-fast-path";
import { catalogSeverityLabelHe } from "@/lib/field-reports/catalog-labels";
import {
  FR_TOUCH_BUTTON,
  FR_TOUCH_INPUT,
  FR_TOUCH_LIST_BUTTON,
} from "@/lib/field-reports/touch-input-class";

export type CatalogFamily = {
  top_family: string;
  label_he?: string;
  issue_count?: number;
};

export type CatalogCategory = {
  top_family: string;
  category_id: string;
  category_name_he: string;
};

export type CatalogIssue = {
  issue_id: string;
  issue_name_he: string;
  standard_ref?: string | null;
  catalog_reference_id?: string | null;
  top_family: string;
  category_id: string;
  category_name_he: string;
  severity?: string | null;
  description?: string | null;
};

type CatalogIssuePickerProps = {
  families: CatalogFamily[];
  categories: CatalogCategory[];
  issues: CatalogIssue[];
  disabled?: boolean;
  onClose: () => void;
  onConfirm: (issue: CatalogIssue) => void;
};

export default function CatalogIssuePicker({
  families,
  issues,
  disabled = false,
  onClose,
  onConfirm,
}: CatalogIssuePickerProps) {
  const [selectedFamily, setSelectedFamily] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState("");

  useLockBackgroundScrollWhileOverlay(true);

  const supervisionCategories = useMemo(
    () => listSupervisionCategories(families),
    [families]
  );

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return issues
      .filter((issue) => {
        const haystack = [
          issue.issue_id,
          issue.catalog_reference_id || "",
          issue.issue_name_he,
          issue.category_name_he,
          supervisionCategoryLabelHe(issue.top_family),
          issue.standard_ref || "",
          catalogSeverityLabelHe(issue.severity),
          issue.severity || "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 30);
  }, [issues, search]);

  const visibleIssues = useMemo(() => {
    if (!selectedFamily) {
      return [];
    }

    return filterIssuesForSupervisionCategory(issues, selectedFamily);
  }, [issues, selectedFamily]);

  function selectFamily(topFamily: string) {
    setSelectedFamily(topFamily);
    setSearch("");
  }

  function handleIssueSelect(issue: CatalogIssue) {
    if (disabled) {
      return;
    }

    if (CATALOG_FAST_PATH_AUTO_CONFIRM) {
      onConfirm(issue);
      return;
    }

    onConfirm(issue);
  }

  const pickerBody = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <input
        className={FR_TOUCH_INPUT}
        placeholder="חיפוש לפי שם, קטגוריה, תקן או מזהה"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          if (event.target.value.trim()) {
            setSelectedFamily(null);
          }
        }}
      />

      {search.trim() ? (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain text-sm">
          {searchResults.length === 0 ? (
            <li className="text-zinc-500">לא נמצאו תוצאות.</li>
          ) : (
            searchResults.map((issue) => (
              <li key={issue.issue_id}>
                <IssueListButton
                  issue={issue}
                  disabled={disabled}
                  onSelect={() => handleIssueSelect(issue)}
                />
              </li>
            ))
          )}
        </ul>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain md:grid-cols-2">
          <PickerColumn title="קטגוריה">
            {supervisionCategories.map((category) => {
              const active = selectedFamily === category.top_family;
              return (
                <div key={category.top_family}>
                  <button
                    type="button"
                    className={
                      active
                        ? `${FR_TOUCH_LIST_BUTTON} border-brand bg-brand text-white`
                        : `${FR_TOUCH_LIST_BUTTON} border-zinc-200 bg-white hover:border-brand dark:border-zinc-700 dark:bg-zinc-900`
                    }
                    onClick={() => selectFamily(category.top_family)}
                    disabled={disabled}
                  >
                    {category.label_he}
                    <span className="block text-xs opacity-80">
                      {category.issue_count} ממצאים
                    </span>
                  </button>
                </div>
              );
            })}
          </PickerColumn>

          <PickerColumn title="ממצא">
            {!selectedFamily ? (
              <p className="text-sm text-zinc-500">בחר קטגוריה תחילה.</p>
            ) : (
              visibleIssues.map((issue) => (
                <div key={issue.issue_id}>
                  <IssueListButton
                    issue={issue}
                    disabled={disabled}
                    onSelect={() => handleIssueSelect(issue)}
                  />
                </div>
              ))
            )}
          </PickerColumn>
        </div>
      )}
    </div>
  );

  const desktopPanel = (
    <div className="hidden space-y-4 rounded-xl border border-brand/30 bg-brand/5 p-4 lg:block">
      <PickerHeader disabled={disabled} onClose={onClose} />
      {pickerBody}
    </div>
  );

  const tabletPanel =
    typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[60] flex h-dvh max-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="בחירת ממצא מהקטלוג"
          >
            <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-zinc-800 dark:bg-zinc-900">
              <PickerHeader disabled={disabled} onClose={onClose} />
            </header>
            <div className="flex min-h-0 flex-1 flex-col px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {pickerBody}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {desktopPanel}
      {tabletPanel}
    </>
  );
}

function PickerHeader({
  disabled,
  onClose,
}: {
  disabled: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-semibold lg:text-base lg:font-medium">
        בחירת ממצא מהקטלוג
      </h3>
      <Button
        variant="secondary"
        size="lg"
        className={FR_TOUCH_BUTTON}
        type="button"
        disabled={disabled}
        onClick={onClose}
      >
        סגור
      </Button>
    </div>
  );
}

function PickerColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <p className="text-xs font-medium text-zinc-500">{title}</p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}

function IssueListButton({
  issue,
  disabled,
  onSelect,
}: {
  issue: CatalogIssue;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`${FR_TOUCH_LIST_BUTTON} border-zinc-200 bg-white hover:border-brand dark:border-zinc-700 dark:bg-zinc-900`}
      onClick={onSelect}
      disabled={disabled}
    >
      <div className="font-medium">{issue.issue_name_he}</div>
      <div className="text-zinc-500">
        {issue.category_name_he}
        {issue.severity
          ? ` · חומרה: ${catalogSeverityLabelHe(issue.severity)}`
          : ""}
        {issue.standard_ref ? ` · תקן: ${issue.standard_ref}` : ""}
      </div>
    </button>
  );
}
