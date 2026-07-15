/**
 * Pricing models and defaults for ASP services
 */
export const PRICING_MODELS = {
  PAY_PER_CALL: {
    id: "pay_per_call",
    label: "Pay-per-call",
    description: "Fixed price per API call via x402",
    serviceType: "A2MCP" as const,
  },
  ESCROW: {
    id: "escrow",
    label: "Task-based",
    description: "Negotiated price via escrow for complex work",
    serviceType: "A2A" as const,
  },
  SUBSCRIPTION: {
    id: "subscription",
    label: "Subscription",
    description: "Recurring billing via permit2 subscription",
    serviceType: "A2MCP" as const,
  },
} as const;

export const DEFAULT_FEE = "0.05";
export const MIN_FEE = "0.01";
export const MAX_FEE = "10000";

export type PlanTier = "free" | "pro" | "team"

export const PLAN_TIERS: Record<PlanTier, {
  label: string
  description: string
  price: number
  maxDeployments: number // -1 = unlimited
  features: string[]
  badge?: string
  popular?: boolean
}> = {
  free: {
    label: "Free",
    description: "For developers getting started",
    price: 0,
    maxDeployments: 3,
    features: [
      "3 ASP deployments per month",
      "All AI generation features",
      "Dashboard & history",
      "Community support",
    ],
  },
  pro: {
    label: "Pro",
    description: "For serious ASP builders",
    price: 19,
    maxDeployments: -1,
    badge: "Popular",
    popular: true,
    features: [
      "Unlimited deployments",
      "All AI generation features",
      "Smart Fix™ auto-validation",
      "Priority support",
      "Custom API keys",
      "Marketing kit download",
    ],
  },
  team: {
    label: "Team",
    description: "For teams and agencies",
    price: 49,
    maxDeployments: -1,
    features: [
      "Everything in Pro",
      "Shared workspace",
      "Collaboration tools",
      "Organization dashboard",
      "Analytics & insights",
      "Dedicated support",
    ],
  },
} as const

export function canDeploy(tier: PlanTier, currentCount: number): { allowed: boolean; reason?: string } {
  const plan = PLAN_TIERS[tier]
  if (!plan) return { allowed: false, reason: "Unknown plan tier" }
  if (plan.maxDeployments === -1) return { allowed: true }
  if (currentCount >= plan.maxDeployments) {
    return {
      allowed: false,
      reason: `Free tier limited to ${plan.maxDeployments} deployments. Upgrade to Pro for unlimited deployments.`
    }
  }
  return { allowed: true }
}
