"use client"

import { useShipitStore } from "@/stores/shipit.store"
import { AppList } from "@/components/dashboard/AppList"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

export default function HistoryPage() {
  const router = useRouter()
  const { deployedAgents } = useShipitStore()

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deploy History</h1>
          <p className="text-muted-foreground mt-2">All your live agents managed by SHIPIT.</p>
        </div>
        <Button onClick={() => router.push("/new")}>
          <Plus className="w-4 h-4 mr-2" /> New Agent
        </Button>
      </div>
      
      {deployedAgents.length === 0 ? (
        <div className="text-center py-24 bg-card border rounded-xl shadow-sm">
          <h3 className="text-lg font-medium">No agents deployed yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">Start by deploying your first OKX agent.</p>
          <Button onClick={() => router.push("/new")}>Deploy Now</Button>
        </div>
      ) : (
        <AppList asps={deployedAgents} />
      )}
    </div>
  )
}
