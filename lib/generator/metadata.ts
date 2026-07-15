import { GoogleGenerativeAI } from "@google/generative-ai"

export async function generateMetadata(idea: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const prompt = `You are an OKX.AI expert. Based on this agent idea: "${idea}", generate marketplace metadata.
Return JSON ONLY. Format:
{
  "categories": ["string", "string"],
  "keywords": ["string", "string"],
  "capabilities": ["string", "string"],
  "featuresList": ["string", "string"],
  "routingMetadata": "string describing routing"
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  
  try {
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch (e) {
    return {
      categories: ["AI", "Utility"],
      keywords: ["agent", "bot"],
      capabilities: ["Text Generation"],
      featuresList: ["Fast", "Reliable"],
      routingMetadata: "Default HTTP Routing"
    }
  }
}
