import Sidebar from "@/app/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <div
      className="
        flex
        min-h-screen
        bg-zinc-50
        dark:bg-black
      "
    >

      <Sidebar />

      <div className="flex-1">
        {children}
      </div>

    </div>
  );
}