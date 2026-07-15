import { GeneratedPayload } from "@/stores/shipit.store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Server, Tags } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function ServiceList({ payload }: { payload: GeneratedPayload }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" /> Services & Metadata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">{payload.name} Service</h4>
                <Badge variant="secondary" className="mt-1">A2MCP</Badge>
              </div>
              <div className="text-right">
                <div className="font-semibold">{payload.fee} USDT</div>
                <div className="text-xs text-muted-foreground">Base Fee</div>
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-1">Description</div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{payload.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-1 flex items-center gap-2"><Tags className="h-3 w-3"/> Categories</div>
                <div className="flex flex-wrap gap-1">
                  {payload.categories?.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Keywords</div>
                <div className="flex flex-wrap gap-1">
                  {payload.keywords?.map(k => <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" /> Pricing Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Subscription Plans</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {payload.pricing?.subscriptionPlans?.map((p, i) => <li key={i}>• {p}</li>)}
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Usage Tiers</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {payload.pricing?.usageTiers?.map((t, i) => <li key={i}>• {t}</li>)}
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Premium Upgrades</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {payload.pricing?.premiumUpgrades?.map((u, i) => <li key={i}>• {u}</li>)}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
