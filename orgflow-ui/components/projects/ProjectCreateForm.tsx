"use client";

import { useState } from "react";

import ProjectSchemeSelect from "@/components/projects/ProjectSchemeSelect";
import Button from "@/components/ui/Button";
import type { ProjectScheme } from "@/lib/field-reports/schema/types";
import {
  EMPTY_PROJECT_CREATE_FORM,
  validateProjectCreateForm,
  type ProjectCreateFormState,
  type ProjectCreatePayload,
} from "@/lib/projects/create-project-form";
import { showToast } from "@/lib/ui/toast";

type ProjectCreateFormProps = {
  initialProjectName?: string;
  creating: boolean;
  onCancel: () => void;
  onSubmit: (payload: ProjectCreatePayload) => Promise<void>;
};

const inputClassName =
  "w-full rounded-2xl border border-zinc-200 bg-transparent p-4 dark:border-zinc-700";

const sectionClassName =
  "rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 dark:border-zinc-700/80 dark:bg-zinc-900/30";

const sectionGridClassName =
  "grid grid-cols-1 gap-4 md:grid-cols-2";

export default function ProjectCreateForm({
  initialProjectName = "",
  creating,
  onCancel,
  onSubmit,
}: ProjectCreateFormProps) {
  const [form, setForm] = useState<ProjectCreateFormState>(() => ({
    ...EMPTY_PROJECT_CREATE_FORM,
    project_name: initialProjectName,
  }));

  function updateField<K extends keyof ProjectCreateFormState>(
    field: K,
    value: ProjectCreateFormState[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result = validateProjectCreateForm(form);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }

    await onSubmit(result.payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <DetailsSection title="פרטים כלליים">
        <Field
          label="שם הפרויקט"
          value={form.project_name}
          onChange={(value) => updateField("project_name", value)}
          required
          className="md:col-span-2"
        />
        <div className="md:col-span-2">
          <label
            htmlFor="new-project-scheme"
            className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-400"
          >
            סוג פרויקט *
          </label>
          <ProjectSchemeSelect
            id="new-project-scheme"
            value={form.scheme}
            onChange={(scheme: ProjectScheme) => updateField("scheme", scheme)}
            required
            className={inputClassName}
          />
        </div>
        <Field
          label="עיר"
          value={form.city}
          onChange={(value) => updateField("city", value)}
          required
        />
        <Field
          label="מספר קומות"
          value={form.floors_count}
          onChange={(value) => updateField("floors_count", value)}
          type="number"
          min={1}
          required
        />
        <Field
          label="יחידות דיור"
          value={form.housing_units_count}
          onChange={(value) => updateField("housing_units_count", value)}
          type="number"
          min={1}
          required
        />
        <Field
          label="תאריך תחילת פרויקט"
          value={form.project_start_date}
          onChange={(value) => updateField("project_start_date", value)}
          type="date"
          required
        />
        <Field
          label="תאריך סיום פרויקט"
          value={form.project_end_date}
          onChange={(value) => updateField("project_end_date", value)}
          type="date"
          required
        />
        <Field
          label="תאריך סיום תקופת חסד"
          value={form.project_grace_end_date}
          onChange={(value) => updateField("project_grace_end_date", value)}
          type="date"
          required
        />
        <Field
          label="תאריך תיעוד מבנה"
          value={form.structure_documentation_date}
          onChange={(value) =>
            updateField("structure_documentation_date", value)
          }
          type="date"
          required
        />
      </DetailsSection>

      <DetailsSection title="יזם וקבלן">
        <Field
          label="שם היזם"
          value={form.developer_name}
          onChange={(value) => updateField("developer_name", value)}
          required
        />
        <Field
          label="אימייל יזם"
          value={form.developer_email}
          onChange={(value) => updateField("developer_email", value)}
          type="email"
          required
        />
        <Field
          label="שם הקבלן"
          value={form.contractor_name}
          onChange={(value) => updateField("contractor_name", value)}
          required
        />
        <Field
          label="אימייל קבלן"
          value={form.contractor_email}
          onChange={(value) => updateField("contractor_email", value)}
          type="email"
          required
        />
        <Field
          label="מנהל פרויקט מטעם יזם"
          value={form.developer_pm_name}
          onChange={(value) => updateField("developer_pm_name", value)}
          required
        />
        <Field
          label="אימייל מנהל פרויקט (יזם)"
          value={form.developer_pm_email}
          onChange={(value) => updateField("developer_pm_email", value)}
          type="email"
          required
        />
      </DetailsSection>

      <DetailsSection title="ייעוץ משפטי">
        <Field
          label="עו״ד מלווה"
          value={form.lawyer_name}
          onChange={(value) => updateField("lawyer_name", value)}
          required
        />
        <Field
          label="אימייל עו״ד מלווה"
          value={form.lawyer_email}
          onChange={(value) => updateField("lawyer_email", value)}
          type="email"
          required
        />
        <Field
          label="עו״ד מלווה (נוסף)"
          value={form.accompanying_lawyer}
          onChange={(value) => updateField("accompanying_lawyer", value)}
          required
        />
        <Field
          label="אימייל עו״ד מלווה (נוסף)"
          value={form.accompanying_lawyer_email}
          onChange={(value) =>
            updateField("accompanying_lawyer_email", value)
          }
          type="email"
          required
        />
      </DetailsSection>

      <DetailsSection title="פיקוח וניהול">
        <Field
          label="מפקח מלווה"
          value={form.supervisor_name}
          onChange={(value) => updateField("supervisor_name", value)}
          required
        />
        <Field
          label="אימייל מפקח מלווה"
          value={form.supervisor_email}
          onChange={(value) => updateField("supervisor_email", value)}
          type="email"
          required
        />
        <Field
          label="אדריכל"
          value={form.architect_name}
          onChange={(value) => updateField("architect_name", value)}
          required
        />
        <Field
          label="אימייל אדריכל"
          value={form.architect_email}
          onChange={(value) => updateField("architect_email", value)}
          type="email"
          required
        />
        <Field
          label="מנהל עבודה"
          value={form.site_manager_name}
          onChange={(value) => updateField("site_manager_name", value)}
          required
        />
        <Field
          label="אימייל מנהל עבודה"
          value={form.site_manager_email}
          onChange={(value) => updateField("site_manager_email", value)}
          type="email"
          required
        />
      </DetailsSection>

      <div className="flex flex-wrap gap-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={creating}
        >
          {creating ? "יוצר פרויקט..." : "צור פרויקט"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={creating}
          onClick={onCancel}
        >
          ביטול
        </Button>
      </div>
    </form>
  );
}

type DetailsSectionProps = {
  title: string;
  children: React.ReactNode;
};

function DetailsSection({ title, children }: DetailsSectionProps) {
  return (
    <section className={sectionClassName}>
      <h3 className="mb-4 text-lg font-semibold text-zinc-800 dark:text-zinc-100">
        {title}
      </h3>
      <div className={sectionGridClassName}>{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  min?: number;
  className?: string;
};

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  min,
  className = "",
}: FieldProps) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="block text-sm font-medium text-zinc-600 dark:text-zinc-300">
        {label}
        {required ? (
          <span className="ms-1 text-red-500" aria-hidden>
            *
          </span>
        ) : null}
      </span>
      <input
        className={inputClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        min={min}
      />
    </label>
  );
}
