import { create } from "zustand"
import { persist } from "zustand/middleware"
import { DeploymentStep } from "@/components/deployment/DeploymentScore"
import { ASPData } from "@/components/dashboard/AppShowcaseCard"

export interface GeneratedPayload {
  name: string
  description: string
  fee: string
  avatarUrl: string
  categories: string[]
  keywords: string[]
  capabilities: string[]
  featuresList: string[]
  routingMetadata: string
  pricing: {
    subscriptionPlans: string[]
    usageTiers: string[]
    premiumUpgrades: string[]
  }
  docs: {
    installationGuide: string
    usageExamples: string
    apiDocumentation: string
    faq: string
  }
  marketing: {
    productPitch: string
    launchAnnouncement: string
  }
}

interface ShipitState {
  // Current pipeline state
  currentIdea: string
  generatedPayload: GeneratedPayload | null
  deploymentSteps: DeploymentStep[]
  apiKey: string
  
  // Tier / subscription
  planTier: "free" | "pro" | "team"
  
  // History
  deployedAgents: ASPData[]
  
  // Actions
  setCurrentIdea: (idea: string) => void
  setGeneratedPayload: (payload: GeneratedPayload | null) => void
  setDeploymentSteps: (steps: DeploymentStep[] | ((prev: DeploymentStep[]) => DeploymentStep[])) => void
  updateDeploymentStep: (id: string, status: DeploymentStep["status"], label?: string, error?: string) => void
  setApiKey: (key: string) => void
  setPlanTier: (tier: "free" | "pro" | "team") => void
  addDeployedAgent: (agent: ASPData) => void
  resetPipeline: () => void
  clearDeploymentHistory: () => void
}

const INITIAL_STEPS: DeploymentStep[] = [
  { id: "1", label: "Generating Brand Name", status: "pending" },
  { id: "2", label: "Generating Service Description", status: "pending" },
  { id: "3", label: "Analyzing Pricing Model", status: "pending" },
  { id: "4", label: "Generating Identity Avatar", status: "pending" },
]

const DEPLOY_STEPS: DeploymentStep[] = [
  { id: "5", label: "Running OKX Validations", status: "pending" },
  { id: "6", label: "Registering Identity On-Chain", status: "pending" },
]

export const useShipitStore = create<ShipitState>()(
  persist(
    (set) => ({
      currentIdea: "",
      generatedPayload: null,
      deploymentSteps: INITIAL_STEPS,
      apiKey: "",
      planTier: "free",
      deployedAgents: [],
      
      setCurrentIdea: (idea) => set({ currentIdea: idea }),
      
      setGeneratedPayload: (payload) => set({ generatedPayload: payload }),
      
      setDeploymentSteps: (steps) => set((state) => ({
        deploymentSteps: typeof steps === "function" ? steps(state.deploymentSteps) : steps
      })),
      
      updateDeploymentStep: (id, status, label, error) => set((state) => ({
        deploymentSteps: state.deploymentSteps.map((step) =>
          step.id === id ? { ...step, status, ...(label && { label }), ...(error && { errorMessage: error }) } : step
        )
      })),
      
      setApiKey: (key) => set({ apiKey: key }),
      
      setPlanTier: (tier) => set({ planTier: tier }),
      
      addDeployedAgent: (agent) => set((state) => ({
        deployedAgents: [agent, ...state.deployedAgents]
      })),
      
      resetPipeline: () => set({
        currentIdea: "",
        generatedPayload: null,
        deploymentSteps: INITIAL_STEPS
      }),
      
      clearDeploymentHistory: () => set({ deployedAgents: [] })
    }),
    {
      name: "shipit-storage",
      partialize: (state) => ({
        apiKey: state.apiKey,
        planTier: state.planTier,
        deployedAgents: state.deployedAgents,
        generatedPayload: state.generatedPayload,
        deploymentSteps: state.deploymentSteps,
      }),
    }
  )
)

export { INITIAL_STEPS, DEPLOY_STEPS }
