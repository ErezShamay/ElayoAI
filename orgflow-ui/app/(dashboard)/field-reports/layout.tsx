export default function FieldReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-zinc-50/50 dark:bg-zinc-950/40">
      {children}
    </div>
  );
}
