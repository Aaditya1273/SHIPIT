/**
 * ASP marketplace categories from OKX platform
 */
export const ASP_CATEGORIES = [
  { id: "data-analysis", label: "Data Analysis", icon: "BarChart3" },
  { id: "content-creation", label: "Content Creation", icon: "FileText" },
  { id: "development", label: "Development", icon: "Code2" },
  { id: "finance", label: "Finance & DeFi", icon: "Wallet" },
  { id: "marketing", label: "Marketing & SEO", icon: "TrendingUp" },
  { id: "research", label: "Research", icon: "Search" },
  { id: "security", label: "Security & Audit", icon: "Shield" },
  { id: "trading", label: "Trading & Signals", icon: "Activity" },
  { id: "education", label: "Education", icon: "GraduationCap" },
  { id: "legal", label: "Legal & Compliance", icon: "Scale" },
] as const;

export const SERVICE_TYPES = [
  {
    id: "A2MCP" as const,
    label: "API Service",
    description: "Pay-per-call, fixed price via x402 protocol",
    requiresEndpoint: true,
  },
  {
    id: "A2A" as const,
    label: "Agent to Agent",
    description: "Negotiated / off-chain pricing via escrow",
    requiresEndpoint: false,
  },
];
