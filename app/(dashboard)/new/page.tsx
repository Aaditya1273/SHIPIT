"use client"

import { PromptInput } from "@/components/generator/PromptInput"
import { useGeneration } from "@/hooks/use-generation"
import { DeploymentScore } from "@/components/deployment/DeploymentScore"
import { useShipitStore } from "@/stores/shipit.store"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Lock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NewAgentPage() {
  const router = useRouter()
  const { generate, isGenerating } = useGeneration()
  const { deploymentSteps, deployedAgents, resetPipeline } = useShipitStore()

  useEffect(() => {
    resetPipeline()
  }, [resetPipeline])

  const activeSteps = deploymentSteps.filter(s => s.id === "1" || s.id === "2" || s.id === "3" || s.id === "4")
  const score = activeSteps.reduce((acc, step) => {
    if (step.status === "success") return acc + (100 / activeSteps.length)
    if (step.status === "loading") return acc + (50 / activeSteps.length)
    return acc
  }, 0)

  if (deployedAgents.length >= 3) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="p-4 bg-orange-100 text-orange-600 rounded-full">
          <Lock className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Free Tier Limit Reached</h2>
        <p className="text-muted-foreground max-w-md text-center">
          You have successfully deployed 3 ASPs using the Free Tier. Upgrade to Pro for unlimited deployments and premium features.
        </p>
        <Button size="lg" className="mt-4 gap-2">
          <Zap className="w-4 h-4" /> Upgrade to Pro - $19/mo
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Agent</h1>
        <p className="text-muted-foreground mt-2">Describe what you want to build and we'll generate the perfect OKX-compliant agent profile.</p>
      </div>
      
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <PromptInput onSubmit={generate} isGenerating={isGenerating} />
      </div>

      {isGenerating && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <DeploymentScore score={score} steps={activeSteps} />
        </div>
      )}
    </div>
  )
}
