"use client"

import { useShipitStore } from "@/stores/shipit.store"
import { useRouter } from "next/navigation"
import { IdentityCard } from "@/components/review/identity-card"
import { ServiceList } from "@/components/review/service-list"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft } from "lucide-react"

export default function ReviewPage() {
  const router = useRouter()
  const { generatedPayload } = useShipitStore()

  if (!generatedPayload) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">No payload generated yet.</p>
        <Button onClick={() => router.push("/new")}>Go Generate One</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Review Your Agent</h1>
        <p className="text-muted-foreground mt-2">Make sure everything looks perfect before we deploy it to OKX.</p>
      </div>
      
      <div className="grid gap-8">
        <IdentityCard payload={generatedPayload} />
        <ServiceList payload={generatedPayload} />
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="outline" onClick={() => router.push("/new")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Start Over
        </Button>
        <Button size="lg" onClick={() => router.push("/deploy")}>
          Looks Good, Deploy Now <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
