import { GoogleGenerativeAI } from "@google/generative-ai"

export async function generateDocs(idea: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const prompt = `You are an OKX.AI expert. Based on this agent idea: "${idea}", generate comprehensive documentation.
Return JSON ONLY. Format:
{
  "installationGuide": "markdown string",
  "usageExamples": "markdown string",
  "apiDocumentation": "markdown string",
  "faq": "markdown string"
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  
  try {
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch (e) {
    return {
      installationGuide: "No guide available.",
      usageExamples: "No examples available.",
      apiDocumentation: "No API docs.",
      faq: "No FAQs."
    }
  }
}
