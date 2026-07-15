import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function generatePricing(idea: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  
  const prompt = `You are an expert OKX ASP pricing strategist.
  Given the user's idea, estimate a fair market fee in USDT and design a full pricing model.
  
  CRITICAL RULES:
  - Output MUST be a JSON object ONLY.
  - Format: { "fee": "0.05", "subscriptionPlans": ["Pro - $10/mo"], "usageTiers": ["0-100 req: Free", "101+: $0.05"], "premiumUpgrades": ["Priority Queue"] }
  - The "fee" MUST be a numeric string.
  
  User Idea: ${idea}`
  
  const result = await model.generateContent(prompt)
  const text = result.response.text()
  
  try {
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch (e) {
    return {
      fee: "1.0",
      subscriptionPlans: ["Pro Plan"],
      usageTiers: ["Base Tier"],
      premiumUpgrades: ["Support"]
    }
  }
}
