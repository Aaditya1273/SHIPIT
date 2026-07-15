"use client"

import { ProviderSettings } from "@/components/settings/ProviderSettings"

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your API keys and deployment preferences.</p>
      </div>
      
      <ProviderSettings />
    </div>
  )
}
