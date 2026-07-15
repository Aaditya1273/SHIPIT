import { NextRequest } from "next/server"
import { generateBrandName } from "@/lib/generator/brand"
import { generateDescription } from "@/lib/generator/description"
import { generatePricing } from "@/lib/generator/pricing"
import { generateAvatar } from "@/lib/generator/avatar"
import { validateName } from "@/lib/validator/name"
import { validateDescription } from "@/lib/validator/description"
import { validateFee } from "@/lib/validator/fee"

export async function POST(req: NextRequest) {
  const { idea, apiKey } = await req.json()
  
  if (!idea) {
    return new Response(JSON.stringify({ error: "Idea is required" }), { status: 400 })
  }
  
  if (apiKey) {
    process.env.OKX_API_KEY = apiKey
  }

  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  
  const sendEvent = async (event: string, data: any) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  const executeGeneration = async () => {
    try {
      // 1. Generate & Validate Name
      await sendEvent("step", { id: "1", label: "Generating Brand Name", status: "loading" })
      const name = await generateBrandName(idea)
      const nameVal = validateName(name)
      if (!nameVal.success) throw new Error(`Name validation failed: ${nameVal.error.errors[0].message}`)
      await sendEvent("step", { id: "1", label: `Name: ${name}`, status: "success" })

      // 2. Generate & Validate Description
      await sendEvent("step", { id: "2", label: "Generating Service Description", status: "loading" })
      const desc = await generateDescription(idea)
      const descVal = validateDescription(desc)
      if (!descVal.success) throw new Error(`Description validation failed: ${descVal.error.errors[0].message}`)
      await sendEvent("step", { id: "2", label: "Description generated & validated", status: "success" })

      // 3. Generate & Validate Pricing
      await sendEvent("step", { id: "3", label: "Analyzing Pricing Model", status: "loading" })
      const fee = await generatePricing(idea)
      const feeVal = validateFee(fee)
      if (!feeVal.success) throw new Error(`Fee validation failed: ${feeVal.error.errors[0].message}`)
      await sendEvent("step", { id: "3", label: `Fee: ${fee} USDT`, status: "success" })
      
      // 4. Generate Avatar
      await sendEvent("step", { id: "4", label: "Generating Identity Avatar", status: "loading" })
      const avatarPath = await generateAvatar(name)
      await sendEvent("step", { id: "4", label: "Avatar Generated", status: "success" })

      // Final signal for generation complete
      await sendEvent("done", { name, description: desc, fee, avatarUrl: avatarPath })
    } catch (error: any) {
      await sendEvent("error", { message: error.message || "Generation failed" })
    } finally {
      await writer.close()
    }
  }

  executeGeneration()

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  })
}
