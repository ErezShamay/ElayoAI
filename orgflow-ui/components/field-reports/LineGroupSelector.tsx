"use client";

import {
  LINE_GROUP_KIND_OPTIONS,
  type LineGroupSelection,
} from "@/lib/field-reports/line-grouping";
import { FR_TOUCH_INPUT } from "@/lib/field-reports/touch-input-class";

type LineGroupSelectorProps = {
  value: LineGroupSelection;
  disabled?: boolean;
  onChange: (value: LineGroupSelection) => void;
};

export default function LineGroupSelector({
  value,
  disabled = false,
  onChange,
}: LineGroupSelectorProps) {
  const showValueInput = value.kind !== "none";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">קיבוץ</span>
        <select
          className={FR_TOUCH_INPUT}
          value={value.kind}
          disabled={disabled}
          onChange={(event) => {
            const kind = event.target.value as LineGroupSelection["kind"];
            onChange({
              kind,
              value: kind === "none" ? "" : value.value,
            });
          }}
        >
          {LINE_GROUP_KIND_OPTIONS.map((option) => (
            <option key={option.kind} value={option.kind}>
              {option.label_he}
            </option>
          ))}
        </select>
      </label>
      {showValueInput ? (
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">
            {value.kind === "apartment"
              ? "מספר דירה"
              : value.kind === "floor"
                ? "מספר קומה"
                : "שם אזור"}
          </span>
          <input
            className={FR_TOUCH_INPUT}
            value={value.value}
            disabled={disabled}
            inputMode={value.kind === "area" ? "text" : "numeric"}
            placeholder={
              value.kind === "area" ? "למשל: חדרים רטובים" : "למשל: 3"
            }
            onChange={(event) =>
              onChange({ ...value, value: event.target.value })
            }
          />
        </label>
      ) : null}
    </div>
  );
}
