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

export const PRICING_TIERS = {
  free: { label: "Free", maxDeployments: 3, price: 0 },
  pro: { label: "Pro", maxDeployments: -1, price: 19 },
  team: { label: "Team", maxDeployments: -1, price: 49 },
} as const;
