"use client";

import { BusinessSettings } from "@/components/settings/business-settings";

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <BusinessSettings />
      </div>
    </div>
  );
}
