"use client";

import Button from "@/components/ui/Button";
import { DEFAULT_WINTER_RECOMMENDATIONS_HE } from "@/lib/field-reports/pdf-block-defaults";
import type { ReportHeaderFields } from "@/lib/field-reports/header-fields";

type ReportFixedBlocksSectionProps = {
  fields: ReportHeaderFields;
  disabled: boolean;
  onChange: (fields: ReportHeaderFields) => void;
};

export default function ReportFixedBlocksSection({
  fields,
  disabled,
  onChange,
}: ReportFixedBlocksSectionProps) {
  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 p-4">
      <div>
        <h2 className="text-lg font-semibold">בלוקים לדוח (PDF)</h2>
        <p className="mt-1 text-sm text-zinc-500">
          עדכונים לפרויקט, המלצות חורף, הערות לקבלן ופרטי חתימה — יופיעו ב-PDF
          לפי נספח 0.2.
        </p>
      </div>

      <StringListEditor
        label="עדכונים לפרויקט"
        items={fields.project_updates}
        disabled={disabled}
        placeholder="עדכון לפרויקט"
        onChange={(project_updates) =>
          onChange({ ...fields, project_updates })
        }
      />

      <label className="block space-y-1 text-sm">
        <span className="font-medium">המלצות חורף / עונת גשמים</span>
        <textarea
          className="of-input min-h-36 w-full"
          value={fields.winter_recommendations}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...fields,
              winter_recommendations: event.target.value,
            })
          }
        />
        {disabled ? null : (
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            onClick={() =>
              onChange({
                ...fields,
                winter_recommendations: DEFAULT_WINTER_RECOMMENDATIONS_HE,
              })
            }
          >
            שחזר תבנית ברירת מחדל
          </Button>
        )}
      </label>

      <StringListEditor
        label="הערות נוספות לקבלן"
        items={fields.contractor_notes}
        disabled={disabled}
        placeholder="הערה לקבלן"
        onChange={(contractor_notes) =>
          onChange({ ...fields, contractor_notes })
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">תואר מפקח (בחתימה)</span>
          <input
            className="of-input w-full"
            value={fields.inspector_title}
            disabled={disabled}
            placeholder="למשל: מפקח בכיר"
            onChange={(event) =>
              onChange({
                ...fields,
                inspector_title: event.target.value,
              })
            }
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">מספר רישוי (בחתימה)</span>
          <input
            className="of-input w-full"
            value={fields.inspector_license}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...fields,
                inspector_license: event.target.value,
              })
            }
          />
        </label>
      </div>
    </section>
  );
}

function StringListEditor({
  label,
  items,
  disabled,
  placeholder,
  onChange,
}: {
  label: string;
  items: string[];
  disabled: boolean;
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  const rows = items.length ? items : [""];

  function updateItem(index: number, value: string) {
    const next = [...rows];
    next[index] = value;
    onChange(next);
  }

  function addItem() {
    onChange([...rows, ""]);
  }

  function removeItem(index: number) {
    const next = rows.filter((_, itemIndex) => itemIndex !== index);
    onChange(next.length ? next : [""]);
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <ul className="space-y-2">
        {rows.map((item, index) => (
          <li
            key={`${label}-${index}`}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="w-6 text-sm text-zinc-500">{index + 1}.</span>
            <input
              className="of-input min-w-0 flex-1"
              value={item}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(event) => updateItem(index, event.target.value)}
            />
            {disabled ? null : (
              <Button
                type="button"
                variant="secondary"
                disabled={rows.length === 1 && !item.trim()}
                onClick={() => removeItem(index)}
              >
                הסר
              </Button>
            )}
          </li>
        ))}
      </ul>
      {disabled ? null : (
        <Button type="button" variant="secondary" onClick={addItem}>
          הוסף שורה
        </Button>
      )}
    </div>
  );
}
