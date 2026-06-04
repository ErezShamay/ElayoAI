import Spinner from "@/components/ui/Spinner";

export default function PageLoadingOverlay({
  label = "מרענן...",
}: {
  label?: string;
}) {
  return (
    <div
      className="
        pointer-events-none
        fixed
        top-20
        start-6
        z-30
        flex
        items-center
        gap-2
        rounded-full
        border
        border-zinc-200/80
        bg-white/90
        px-3
        py-1.5
        text-xs
        font-medium
        text-zinc-600
        shadow-sm
        backdrop-blur-sm
        dark:border-zinc-700/80
        dark:bg-zinc-900/90
        dark:text-zinc-300
      "
      role="status"
      aria-live="polite"
    >
      <Spinner label={label} size="sm" />
      <span>{label}</span>
    </div>
  );
}
