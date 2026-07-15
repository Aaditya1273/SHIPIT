"use client"

import { ProviderSettings } from "@/components/settings/ProviderSettings"
import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Sparkles, RefreshCw } from "lucide-react"
import { useShipitStore } from "@/stores/shipit.store"
import { PLAN_TIERS, type PlanTier } from "@/constants/pricing"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { planTier, setPlanTier, deployedAgents, clearDeploymentHistory } = useShipitStore()

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your plan, API keys, and preferences.</p>
      </div>

      {/* Plan & Billing Section */}
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Plan & Billing</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;re on the <Badge variant="secondary" className="ml-1">{PLAN_TIERS[planTier].label}</Badge> plan
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {(Object.entries(PLAN_TIERS) as [PlanTier, typeof PLAN_TIERS.free][]).map(([key, plan]) => {
            const isActive = planTier === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPlanTier(key)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isActive 
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" 
                    : "hover:border-border/80 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isActive ? "border-primary" : "border-muted-foreground/30"
                    }`}>
                      {isActive && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{plan.label}</span>
                        {plan.badge && <Badge variant="secondary" className="text-xs">{plan.badge}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">${plan.price}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                </div>

                {isActive && (
                  <div className="mt-3 ml-8 grid grid-cols-2 gap-2">
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        {feat}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="text-sm">
            <span className="font-medium">Deployments used: </span>
            <span className="text-muted-foreground">
              {deployedAgents.length} / {PLAN_TIERS[planTier].maxDeployments === -1 ? "∞" : PLAN_TIERS[planTier].maxDeployments}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearDeploymentHistory}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Reset History
          </Button>
        </div>
      </div>
      
      <ProviderSettings />
      
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-lg border-b pb-4">Appearance</h3>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Dark Mode</Label>
            <p className="text-sm text-muted-foreground">Toggle between light and dark theme.</p>
          </div>
          <Switch 
            checked={theme === "dark"} 
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} 
          />
        </div>
      </div>
    </div>
  )
}
