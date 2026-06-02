"use client";

import { useMemo, useState } from "react";

import Button from "@/components/ui/Button";

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
  categories,
  issues,
  disabled = false,
  onClose,
  onConfirm,
}: CatalogIssuePickerProps) {
  const [selectedFamily, setSelectedFamily] = useState<string | null>(
    null
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | null
  >(null);
  const [selectedIssue, setSelectedIssue] = useState<CatalogIssue | null>(
    null
  );
  const [search, setSearch] = useState("");

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return issues
      .filter((issue) => {
        const haystack = [
          issue.issue_id,
          issue.issue_name_he,
          issue.category_name_he,
          issue.standard_ref || "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 30);
  }, [issues, search]);

  const visibleCategories = useMemo(() => {
    if (!selectedFamily) {
      return [];
    }

    return categories.filter(
      (category) => category.top_family === selectedFamily
    );
  }, [categories, selectedFamily]);

  const visibleIssues = useMemo(() => {
    if (!selectedCategoryId) {
      return [];
    }

    return issues.filter(
      (issue) => issue.category_id === selectedCategoryId
    );
  }, [issues, selectedCategoryId]);

  function selectFamily(topFamily: string) {
    setSelectedFamily(topFamily);
    setSelectedCategoryId(null);
    setSelectedIssue(null);
    setSearch("");
  }

  function selectCategory(categoryId: string) {
    setSelectedCategoryId(categoryId);
    setSelectedIssue(null);
    setSearch("");
  }

  return (
    <div className="space-y-4 rounded-xl border border-brand/30 bg-brand/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">בחירת ממצא מהמפרט</h3>
        <Button variant="secondary" type="button" onClick={onClose}>
          סגור
        </Button>
      </div>

      <input
        className="of-input w-full"
        placeholder="חיפוש לפי מזהה, שם, קטגוריה או תקן"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          if (event.target.value.trim()) {
            setSelectedFamily(null);
            setSelectedCategoryId(null);
            setSelectedIssue(null);
          }
        }}
      />

      {search.trim() ? (
        <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
          {searchResults.length === 0 ? (
            <li className="text-zinc-500">לא נמצאו תוצאות.</li>
          ) : (
            searchResults.map((issue) => (
              <li key={issue.issue_id}>
                <IssueListButton
                  issue={issue}
                  active={selectedIssue?.issue_id === issue.issue_id}
                  disabled={disabled}
                  onSelect={() => setSelectedIssue(issue)}
                />
              </li>
            ))
          )}
        </ul>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-500">משפחה</p>
            <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
              {families.map((family) => {
                const active = selectedFamily === family.top_family;
                return (
                  <li key={family.top_family}>
                    <button
                      type="button"
                      className={
                        active
                          ? "w-full rounded-lg bg-brand px-3 py-2 text-right text-sm text-white"
                          : "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-right text-sm hover:border-brand"
                      }
                      onClick={() => selectFamily(family.top_family)}
                      disabled={disabled}
                    >
                      {family.label_he || family.top_family}
                      {family.issue_count != null ? (
                        <span className="block text-xs opacity-80">
                          {family.issue_count} ממצאים
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-500">קטגוריה</p>
            {!selectedFamily ? (
              <p className="text-sm text-zinc-500">בחר משפחה תחילה.</p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
                {visibleCategories.map((category) => {
                  const active =
                    selectedCategoryId === category.category_id;
                  return (
                    <li key={category.category_id}>
                      <button
                        type="button"
                        className={
                          active
                            ? "w-full rounded-lg bg-brand px-3 py-2 text-right text-sm text-white"
                            : "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-right text-sm hover:border-brand"
                        }
                        onClick={() =>
                          selectCategory(category.category_id)
                        }
                        disabled={disabled}
                      >
                        {category.category_name_he}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-500">ממצא</p>
            {!selectedCategoryId ? (
              <p className="text-sm text-zinc-500">בחר קטגוריה תחילה.</p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
                {visibleIssues.map((issue) => (
                  <li key={issue.issue_id}>
                    <IssueListButton
                      issue={issue}
                      active={selectedIssue?.issue_id === issue.issue_id}
                      disabled={disabled}
                      onSelect={() => setSelectedIssue(issue)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {selectedIssue ? (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:bg-zinc-900">
          <p className="font-medium">{selectedIssue.issue_name_he}</p>
          <p className="text-zinc-600">
            {selectedIssue.issue_id} · {selectedIssue.category_name_he}
          </p>
          {selectedIssue.standard_ref ? (
            <p>
              <span className="font-medium">תקן: </span>
              {selectedIssue.standard_ref}
            </p>
          ) : (
            <p className="text-zinc-500">ללא תקן במפרט</p>
          )}
          {selectedIssue.severity ? (
            <p>
              <span className="font-medium">חומרה: </span>
              {selectedIssue.severity}
            </p>
          ) : null}
          {selectedIssue.description ? (
            <p className="whitespace-pre-wrap text-zinc-700">
              {selectedIssue.description}
            </p>
          ) : null}
          <Button
            type="button"
            disabled={disabled}
            onClick={() => onConfirm(selectedIssue)}
          >
            אישור והוספה לדוח
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function IssueListButton({
  issue,
  active,
  disabled,
  onSelect,
}: {
  issue: CatalogIssue;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "w-full rounded-lg border border-brand bg-brand/10 px-3 py-2 text-right"
          : "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-right hover:border-brand"
      }
      onClick={onSelect}
      disabled={disabled}
    >
      <div className="font-medium">{issue.issue_name_he}</div>
      <div className="text-zinc-500">
        {issue.issue_id}
        {issue.standard_ref ? ` · ${issue.standard_ref}` : ""}
      </div>
    </button>
  );
}
