import { GoogleGenerativeAI } from "@google/generative-ai"

export async function generateMarketing(idea: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const prompt = `You are an OKX.AI expert. Based on this agent idea: "${idea}", generate a marketing kit.
Return JSON ONLY. Format:
{
  "productPitch": "string",
  "launchAnnouncement": "string"
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  
  try {
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch (e) {
    return {
      productPitch: "The best agent on OKX.",
      launchAnnouncement: "We are live on OKX!"
    }
  }
}
