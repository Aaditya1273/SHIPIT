import { NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { runUpload } from "@/lib/okx/upload"
import { runCreate } from "@/lib/okx/create"
import { runActivate } from "@/lib/okx/activate"

export async function POST(req: NextRequest) {
  const { payload, apiKey, secretKey, passphrase, geminiApiKey } = await req.json()
  
  if (!payload) {
    return new Response(JSON.stringify({ error: "Payload is required" }), { status: 400 })
  }

  // Set OKX credentials for CLI
  if (apiKey) process.env.OKX_API_KEY = apiKey
  if (secretKey) process.env.OKX_SECRET_KEY = secretKey
  if (passphrase) process.env.OKX_PASSPHRASE = passphrase
  
  // Set Gemini key for Smart Fix™ — prefer request body, fall back to env
  if (geminiApiKey) process.env.GEMINI_API_KEY = geminiApiKey
  const geminiKey = process.env.GEMINI_API_KEY

  const chain = "ethereum"

  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  
  const sendEvent = async (event: string, data: any) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  const executeDeployment = async () => {
    try {
      const { name, description, fee, avatarUrl: avatarPath } = payload
      
      // Upload Avatar if it's a local file path
      let finalAvatarUrl = avatarPath
      if (avatarPath && avatarPath.startsWith("/")) {
        await sendEvent("step", { id: "5", label: "Uploading avatar to OKX CDN", status: "loading" })
        finalAvatarUrl = await runUpload(avatarPath, chain)
        await sendEvent("step", { id: "5", label: "Avatar uploaded", status: "success" })
      }

      // 6. Smart Fix™ Create — wraps create in an AI auto-repair loop
      let currentDesc = description
      const dynamicEndpoint = `https://api.${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com/v1`
      let agentId = ""
      let createAttempts = 0
      const MAX_ATTEMPTS = 3

      while (createAttempts < MAX_ATTEMPTS) {
        try {
          const services = [{ name: `${name} Service`, description: currentDesc, type: "A2MCP", fee, endpoint: dynamicEndpoint }]
          await sendEvent("step", { 
            id: "6", 
            label: `Registering Identity On-Chain${createAttempts > 0 ? ` (Attempt ${createAttempts + 1}/${MAX_ATTEMPTS})` : ""}`, 
            status: "loading" 
          })
          agentId = await runCreate(name, currentDesc, finalAvatarUrl, services, chain)
          break // Success
        } catch (e: any) {
          createAttempts++
          if (createAttempts >= MAX_ATTEMPTS) throw e
          
          // Check if this is a validation error we can fix
          const isValidationError = e.message?.toLowerCase().includes("description") || 
                                    e.message?.toLowerCase().includes("name") ||
                                    e.message?.toLowerCase().includes("fee") ||
                                    e.message?.toLowerCase().includes("service") ||
                                    e.message?.toLowerCase().includes("validation")
          
          if (!isValidationError || !geminiKey) {
            // Auth/network errors or no AI key — rethrow immediately
            throw e
          }

          // Smart Fix™: Use Gemini AI to fix the payload and retry
          await sendEvent("step", { id: "6", label: "Smart Fix™ repairing payload...", status: "loading" })
          
          try {
            const genAI = new GoogleGenerativeAI(geminiKey)
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
            const fixPrompt = `OKX CLI rejected ASP agent creation with this error:\n${e.message}\n\nAgent Name: ${name}\nCurrent Description:\n${currentDesc}\n\nFix the description to pass OKX validation. Rules:\n- Max 400 chars\n- 2 parts: capability summary + required inputs\n- No links, addresses, tech stack, or markdown\nReturn ONLY the fixed plain text.`
            const fixResult = await model.generateContent(fixPrompt)
            currentDesc = fixResult.response.text().trim()
          } catch {
            currentDesc = description // Fall back to original
          }
        }
      }
      
      await runActivate(agentId, chain)
      await sendEvent("step", { id: "6", label: `Activated Agent #${agentId}`, status: "success" })

      await sendEvent("done", { agentId, name, description: currentDesc, fee, avatarUrl: finalAvatarUrl })
    } catch (error: any) {
      await sendEvent("error", { message: error.message || "Deployment failed" })
    } finally {
      await writer.close()
    }
  }

  executeDeployment()

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  })
}
