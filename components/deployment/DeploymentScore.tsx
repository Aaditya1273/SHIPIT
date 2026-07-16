import * as React from "react"
import { Check, Loader2, Circle, AlertCircle, Rocket } from "lucide-react"
import { cn } from "@/lib/utils"

export type StepStatus = "pending" | "loading" | "success" | "error"

export interface DeploymentStep {
  id: string
  label: string
  status: StepStatus
  errorMessage?: string
}

interface DeploymentScoreProps {
  score: number // 0 to 100
  steps: DeploymentStep[]
}

export function DeploymentScore({ score, steps }: DeploymentScoreProps) {
  return (
    <div className="w-full flex flex-col h-full bg-transparent">
      {/* Sleek Progress Header */}
      <div className="pb-6 mb-2">
        <div className="flex justify-between items-end mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#e5e0ff]/50 rounded-lg">
              <Rocket className="w-4 h-4 text-[#5b3eff]" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Deployment Progress</span>
          </div>
          <span className="text-lg font-bold text-[#5b3eff] tabular-nums">{Math.round(score)}%</span>
        </div>
        
        {/* Ultra-thin progress bar */}
        <div className="h-1.5 w-full bg-gray-100 overflow-hidden rounded-full shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-[#8a75ff] to-[#5b3eff] transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(91,62,255,0.4)]"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Step List */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-2 scrollbar-on-hover">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "flex items-start gap-3 p-3.5 rounded-[14px] transition-all duration-300 ease-out",
              step.status === "loading" && "bg-white shadow-sm border border-gray-100/60 scale-[1.02]",
              step.status === "success" && "bg-transparent opacity-60 hover:opacity-100",
              step.status === "error" && "bg-red-50 border border-red-100",
              step.status === "pending" && "opacity-40"
            )}
          >
            <div className="mt-0.5 shrink-0 flex items-center justify-center">
              {step.status === "success" && (
                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </div>
              )}
              {step.status === "loading" && (
                <div className="relative flex items-center justify-center w-6 h-6">
                  {/* Outer pulsing ring */}
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#5b3eff] opacity-20 animate-ping" />
                  <Loader2 className="w-4 h-4 text-[#5b3eff] animate-spin relative z-10" />
                </div>
              )}
              {step.status === "error" && (
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              {step.status === "pending" && (
                <div className="w-6 h-6 rounded-full border-2 border-gray-200 bg-transparent flex items-center justify-center text-gray-300">
                  <Circle className="w-2 h-2 fill-current" />
                </div>
              )}
            </div>
            
            <div className="flex flex-col min-w-0 pt-0.5">
              <span className={cn(
                "text-[14px] font-medium transition-colors duration-300",
                step.status === "success" ? "text-gray-600" :
                step.status === "error" ? "text-red-700" :
                step.status === "loading" ? "text-gray-900 font-semibold" :
                "text-gray-400"
              )}>
                {step.label}
              </span>
              
              {/* Optional sub-message/error */}
              {step.errorMessage && (
                <span className="text-xs text-red-600/80 mt-1 font-[family-name:var(--font-geist-mono)] bg-red-100/50 p-2 rounded-md break-words">
                  {step.errorMessage}
                </span>
              )}
              {step.status === "loading" && !step.errorMessage && (
                <span className="text-[11px] text-gray-400 mt-0.5 animate-pulse">Processing...</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
