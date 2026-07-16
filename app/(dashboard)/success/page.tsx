"use client"

import { useShipitStore } from "@/stores/shipit.store"
import { useRouter } from "next/navigation"
import { AppShowcaseCard } from "@/components/dashboard/AppShowcaseCard"
import { Button } from "@/components/ui/button"
import { PlusCircle, CheckCircle2, Sparkles, ExternalLink, MessageCircle } from "lucide-react"
import confetti from "canvas-confetti"
import { useEffect } from "react"
import { ReadmeViewer } from "@/components/viewers/readme-viewer"
import { XPostViewer } from "@/components/viewers/xpost-viewer"
import { PayloadViewer } from "@/components/viewers/payload-viewer"
import { DemoScriptViewer } from "@/components/viewers/demo-script-viewer"
import { PitchViewer } from "@/components/viewers/pitch-viewer"
import { FullDocsViewer } from "@/components/viewers/docs-viewer"
import { ExportRepoButton } from "@/components/viewers/export-button"
import { motion } from "framer-motion"

export default function SuccessPage() {
  const router = useRouter()
  const { deployedAgents, resetPipeline, generatedPayload } = useShipitStore()

  const latestAgent = deployedAgents[0]

  useEffect(() => {
    if (latestAgent) {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#6d28d9", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd"],
      })
    }
  }, [latestAgent])

  if (!latestAgent || !generatedPayload) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-muted-foreground">No recent deployments found.</p>
        <Button onClick={() => router.push("/new")} className="mt-2 rounded-xl">Go to New</Button>
      </div>
    )
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-12 pb-16"
    >
      {/* Success header */}
      <motion.div variants={item} className="text-center space-y-6">
        <div className="inline-flex items-center justify-center p-4 bg-green-500/10 text-green-500 rounded-2xl">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Deployment Successful!</h1>
          <p className="text-xl text-muted-foreground/80">Your agent is now live and registered on-chain.</p>
        </div>
      </motion.div>

      {/* Agent card + on-chain proof */}
      <motion.div variants={item} className="max-w-sm mx-auto space-y-3">
        <AppShowcaseCard asp={latestAgent} />

        {/* On-chain proof block */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Registration Proof</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Pending OKX Review
            </span>
          </div>

          {latestAgent.id && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Agent ID</span>
              <span className="font-mono font-semibold text-gray-700">#{latestAgent.id}</span>
            </div>
          )}

          {latestAgent.txHash && (
            <div className="space-y-1">
              <span className="text-xs text-gray-400">Registration Tx</span>
              <a
                href={`https://web3.okx.com/explorer/x-layer-testnet/tx/${latestAgent.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 hover:text-[#7C5CFC] hover:underline break-all"
              >
                {latestAgent.txHash.slice(0, 20)}...{latestAgent.txHash.slice(-8)}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}

          {latestAgent.id && (
            <div className="space-y-1 mt-2 border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-400">Terminal Verification (For Judges)</span>
              <div className="mt-1 flex items-center justify-between rounded-md bg-gray-900 px-3 py-2 text-xs font-mono text-gray-200">
                <span className="select-all">onchainos agent get --agent-ids {latestAgent.id}</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed pt-1">
                Since the public marketplace profile is pending OKX review, run this CLI command to instantly verify the on-chain registration.
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Chat on ChatGPT */}
      <motion.div variants={item} className="max-w-sm mx-auto w-full">
        <a
          href={`https://chatgpt.com/?q=${encodeURIComponent(`You are ${latestAgent.name}, an AI agent registered on OKX Onchain OS. Here is your profile:\n\nDescription: ${latestAgent.description}\nFee: ${latestAgent.fee} USDT per request\nAgent ID: #${latestAgent.id}\n\nA user wants to interact with you. Introduce yourself and offer your services.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full rounded-xl bg-[#10a37f] hover:bg-[#0d9070] text-white px-6 py-3 text-sm font-semibold transition-all shadow-sm"
        >
          <MessageCircle className="w-4 h-4" />
          Try Agent on ChatGPT — Free
        </a>
        <p className="text-center text-[11px] text-gray-400 mt-2">Opens ChatGPT with your agent&apos;s context pre-loaded. No API key needed.</p>
      </motion.div>

      {/* Actions */}
      <motion.div variants={item} className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => { resetPipeline(); router.push("/history") }}
          className="rounded-xl h-11 px-6"
        >
          View Dashboard
        </Button>
        <Button
          onClick={() => { resetPipeline(); router.push("/new") }}
          className="rounded-xl h-11 px-6 gap-2"
        >
          <PlusCircle className="mr-1 h-4 w-4" /> Deploy Another
        </Button>
      </motion.div>

      {/* Export repo */}
      <motion.div variants={item} className="max-w-sm mx-auto">
        <ExportRepoButton payload={generatedPayload} />
      </motion.div>

      {/* Deployment Assets */}
      <motion.div variants={item} className="mt-16 space-y-8">
        <div className="flex items-center gap-3 pb-4 border-b border-border/60">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-2xl font-bold tracking-tight">Deployment Assets</h3>
        </div>

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
      </motion.div>
    </motion.div>
  )
}
