import type { ReactNode } from "react";

type KpiCardVariant = "default" | "warning" | "accent";

export default function KpiCard({
  label,
  value,
  variant = "default",
  className = "",
}: {
  label: string;
  value: ReactNode;
  variant?: KpiCardVariant;
  className?: string;
}) {
  const variantBorder =
    variant === "warning"
      ? "border-brand-gold/30 dark:border-brand-gold/40"
      : variant === "accent"
        ? "border-brand/25 dark:border-brand/35"
        : "";

  const labelClass =
    variant === "warning"
      ? "text-brand-gold-dark dark:text-brand-gold"
      : variant === "accent"
        ? "text-brand dark:text-brand-light"
        : "";

  const isLargeValue =
    typeof value === "string" && value.length <= 4;

  return (
    <div className={`of-kpi-card ${variantBorder} ${className}`}>
      <p className={`of-kpi-label ${labelClass}`}>
        {label}
      </p>

      <div className={isLargeValue ? "of-kpi-value" : "of-kpi-value-sm"}>
        {value}
      </div>
    </div>
  );
}
