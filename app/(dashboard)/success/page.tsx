"use client"

import { useShipitStore } from "@/stores/shipit.store"
import { useRouter } from "next/navigation"
import { AppShowcaseCard } from "@/components/dashboard/AppShowcaseCard"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import confetti from "canvas-confetti"
import { useEffect } from "react"
import { ReadmeViewer } from "@/components/viewers/readme-viewer"
import { XPostViewer } from "@/components/viewers/xpost-viewer"
import { PayloadViewer } from "@/components/viewers/payload-viewer"
import { DemoScriptViewer } from "@/components/viewers/demo-script-viewer"
import { PitchViewer } from "@/components/viewers/pitch-viewer"
import { FullDocsViewer } from "@/components/viewers/docs-viewer"
import { ExportRepoButton } from "@/components/viewers/export-button"

export default function SuccessPage() {
  const router = useRouter()
  const { deployedAgents, resetPipeline, generatedPayload } = useShipitStore()
  
  const latestAgent = deployedAgents[0]

  useEffect(() => {
    if (latestAgent) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      })
    }
  }, [latestAgent])

  if (!latestAgent || !generatedPayload) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p>No recent deployments found.</p>
        <Button onClick={() => router.push("/new")} className="mt-4">Go to New</Button>
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-16">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-green-100 text-green-700 rounded-full mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Deployment Successful!</h1>
        <p className="text-xl text-muted-foreground">Your agent is now live and registered on-chain.</p>
      </div>
      
      <div className="max-w-md mx-auto">
        <AppShowcaseCard asp={latestAgent} />
      </div>

      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => { resetPipeline(); router.push("/history") }}>
          View Dashboard
        </Button>
        <Button onClick={() => { resetPipeline(); router.push("/new") }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Deploy Another
        </Button>
      </div>

      <div className="max-w-md mx-auto mt-4">
        <ExportRepoButton payload={generatedPayload} />
      </div>

      <div className="mt-16 space-y-8">
        <h3 className="text-2xl font-bold tracking-tight border-b pb-4">Deployment Assets</h3>
        
        <div className="grid md:grid-cols-2 gap-6 h-96">
          <DemoScriptViewer agentId={latestAgent.id} />
          <XPostViewer payload={generatedPayload} />
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 h-[500px]">
          <ReadmeViewer payload={generatedPayload} />
          <FullDocsViewer payload={generatedPayload} />
        </div>

        <div className="grid md:grid-cols-2 gap-6 h-96">
          <PitchViewer payload={generatedPayload} />
          <PayloadViewer payload={generatedPayload} />
        </div>
      </div>
    </div>
  )
}
