"use client";

import Button from "@/components/ui/Button";
import { COLUMN_PRESET_OPTIONS } from "@/lib/field-reports/block-kind-labels";
import { getColumnPreset } from "@/lib/field-reports/schema/column-presets";
import type {
  BlockColumnId,
  ColumnPresetKey,
  FindingRow,
  FindingsTableBlock,
} from "@/lib/field-reports/schema/types";
import {
  FR_TOUCH_BUTTON,
  FR_TOUCH_INPUT,
  FR_TOUCH_TEXTAREA,
} from "@/lib/field-reports/touch-input-class";

type ReportFindingsBlockEditorProps = {
  block: FindingsTableBlock;
  disabled: boolean;
  /** שורות נגזרות מ-report.lines — עריכה דרך «שורות ממצאים» (FR-2.1). */
  lineDerived?: boolean;
  onChange: (block: FindingsTableBlock) => void;
};

function newFindingRowId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `finding-row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyFindingRow(sortOrder: number): FindingRow {
  return {
    id: newFindingRowId(),
    location: "",
    trade: "",
    status: "",
    description: "",
    notes: "",
    sort_order: sortOrder,
  };
}

const FINDING_ROW_FIELDS: Partial<
  Record<BlockColumnId, keyof FindingRow>
> = {
  location: "location",
  trade: "trade",
  status: "status",
  description: "description",
  notes: "notes",
};

export default function ReportFindingsBlockEditor({
  block,
  disabled,
  lineDerived = false,
  onChange,
}: ReportFindingsBlockEditorProps) {
  const columns = getColumnPreset(block.column_preset);
  const readOnly = disabled || lineDerived;
  const tableRows = block.rows.length > 0 ? block.rows : [];

  function emitRows(rows: FindingRow[]) {
    onChange({
      ...block,
      rows: rows.map((row, index) => ({ ...row, sort_order: index })),
    });
  }

  function updateRow(
    index: number,
    field: keyof FindingRow,
    value: string
  ) {
    const next = [...tableRows];
    next[index] = { ...next[index], [field]: value };
    emitRows(next);
  }

  function addRow() {
    emitRows([...tableRows, emptyFindingRow(tableRows.length)]);
  }

  function removeRow(index: number) {
    emitRows(tableRows.filter((_, rowIndex) => rowIndex !== index));
  }

  function setColumnPreset(column_preset: ColumnPresetKey) {
    onChange({ ...block, column_preset });
  }

  if (lineDerived) {
    return (
      <div className="space-y-2 text-sm text-zinc-600">
        <p>
          {tableRows.length > 0
            ? `${tableRows.length} שורות מוצגות לפי «שורות ממצאים» למטה — עריכה שם נשמרת ב-API.`
            : "אין שורות ממצאים עדיין — הוסף שורות בסעיף «שורות ממצאים» למטה."}
        </p>
        {tableRows.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-100">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-right">
                  {columns
                    .filter((column) => column.id !== "photos")
                    .map((column) => (
                      <th key={column.id} className="px-2 py-2 font-medium">
                        {column.header_he}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 align-top"
                  >
                    {columns
                      .filter((column) => column.id !== "photos")
                      .map((column) => {
                        const field = FINDING_ROW_FIELDS[column.id];
                        const value =
                          field && field in row
                            ? String(row[field as keyof FindingRow] ?? "")
                            : "";
                        return (
                          <td key={column.id} className="px-2 py-2">
                            {value || "—"}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  }

  const editableRows =
    tableRows.length > 0 ? tableRows : [emptyFindingRow(0)];

  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">preset עמודות</span>
        <select
          className={FR_TOUCH_INPUT}
          value={block.column_preset}
          disabled={readOnly}
          onChange={(event) =>
            setColumnPreset(event.target.value as ColumnPresetKey)
          }
        >
          {COLUMN_PRESET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-right">
              {columns
                .filter((column) => column.id !== "photos")
                .map((column) => (
                  <th key={column.id} className="px-2 py-2 font-medium">
                    {column.header_he}
                  </th>
                ))}
              {readOnly ? null : <th className="w-16 px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {editableRows.map((row, index) => (
              <tr
                key={row.id}
                className="border-b border-zinc-100 align-top"
              >
                {columns
                  .filter((column) => column.id !== "photos")
                  .map((column) => {
                    const field = FINDING_ROW_FIELDS[column.id];
                    if (!field) {
                      return (
                        <td key={column.id} className="px-2 py-2">
                          —
                        </td>
                      );
                    }

                    const value = String(row[field] ?? "");
                    const isLong = field === "description" || field === "notes";

                    return (
                      <td key={column.id} className="px-2 py-2">
                        {isLong ? (
                          <textarea
                            className={FR_TOUCH_TEXTAREA}
                            rows={2}
                            value={value}
                            disabled={readOnly}
                            onChange={(event) =>
                              updateRow(index, field, event.target.value)
                            }
                          />
                        ) : (
                          <input
                            className={FR_TOUCH_INPUT}
                            value={value}
                            disabled={readOnly}
                            onChange={(event) =>
                              updateRow(index, field, event.target.value)
                            }
                          />
                        )}
                      </td>
                    );
                  })}
                {readOnly ? null : (
                  <td className="px-2 py-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className={FR_TOUCH_BUTTON}
                      onClick={() => removeRow(index)}
                    >
                      הסר
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {readOnly ? null : (
        <Button
          type="button"
          variant="secondary"
          className={FR_TOUCH_BUTTON}
          onClick={addRow}
        >
          הוסף שורה לבלוק
        </Button>
      )}
    </div>
  );
}
