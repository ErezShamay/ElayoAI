"use client";

import BrandLogo from "@/components/ui/BrandLogo";
import SidebarNavContent from "@/components/layout/SidebarNavContent";

export default function Sidebar() {
  return (
    <aside
      className="
        of-glass-sidebar
        hidden
        w-72
        shrink-0
        border-l
        p-6
        lg:block
        lg:min-h-screen
      "
    >
      <div className="mb-10">
        <BrandLogo size="lg" />
      </div>

      <SidebarNavContent />
    </aside>
  );
}
