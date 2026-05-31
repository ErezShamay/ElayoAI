"use client";

import ThemeSettings from "@/components/settings/ThemeSettings";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";

export default function SettingsPage() {
  return (
    <div className="of-dashboard-page of-container mx-auto max-w-3xl">
      <PageHeader
        title="הגדרות"
        description="התאימו את חוויית השימוש במערכת לפי העדפותיכם"
        eyebrow="Supervisor AI"
      />

      <Card padding="lg">
        <ThemeSettings />
      </Card>
    </div>
  );
}
