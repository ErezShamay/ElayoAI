export default function Spinner({
  size = "md",
  label = "Loading",
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const sizeClass =
    size === "sm"
      ? "h-4 w-4 border-2"
      : size === "lg"
        ? "h-10 w-10 border-4"
        : "h-6 w-6 border-2";

  return (
    <div
      role="status"
      aria-label={label}
      className="inline-flex items-center gap-3"
    >
      <span
        className={`
          inline-block
          animate-spin
          rounded-full
          border-[rgb(var(--of-color-accent-rgb)/0.22)]
          border-t-brand
          dark:border-t-brand-light
          ${sizeClass}
        `}
      />
      <span className="of-sr-only">{label}</span>
    </div>
  );
}
