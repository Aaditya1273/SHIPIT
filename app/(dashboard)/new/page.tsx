"use client"

import { PromptInput } from "@/components/generator/PromptInput"
import { useGeneration } from "@/hooks/use-generation"

export default function NewAgentPage() {
  const { generate, isGenerating } = useGeneration()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Agent</h1>
        <p className="text-muted-foreground mt-2">Describe what you want to build and we'll generate the perfect OKX-compliant agent profile.</p>
      </div>
      
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <PromptInput onSubmit={generate} isGenerating={isGenerating} />
      </div>
    </div>
  )
}
