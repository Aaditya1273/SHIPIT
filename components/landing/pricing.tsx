import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import Link from "next/link"
import { PLAN_TIERS } from "@/constants/pricing"

export function Pricing() {
  return (
    <section className="py-24 border-t">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Start with 3 free deployments. Upgrade when you need more.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4 items-start">
        {Object.entries(PLAN_TIERS).map(([key, plan]) => (
          <div
            key={key}
            className={`relative p-8 border rounded-3xl bg-card shadow-sm flex flex-col transition-all duration-200 hover:shadow-md ${
              plan.popular ? "border-primary/40 ring-2 ring-primary/20 scale-[1.02]" : ""
            }`}
          >
            {plan.badge && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4">
                {plan.badge}
              </Badge>
            )}
            
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-1">{plan.label}</h3>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-bold">${plan.price}</span>
              <span className="text-lg text-muted-foreground font-normal">/mo</span>
            </div>
            
            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 mr-3 shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            
            <Link href="/new">
              <Button
                className="w-full h-11"
                variant={plan.popular ? "default" : "outline"}
              >
                {plan.price === 0 ? "Get Started Free" : `Upgrade to ${plan.label}`}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
