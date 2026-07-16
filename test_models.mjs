import { GoogleGenerativeAI } from "@google/generative-ai"
import { readFileSync } from "fs"

const envContent = readFileSync('/home/bajrangi/Wins/ZK-Pay/.env.local', 'utf8')
const geminiMatch = envContent.match(/^GEMINI_API_KEY=(.+)$/m)
const groqMatch = envContent.match(/^GROQ_API_KEY=(.+)$/m)
const geminiKey = geminiMatch?.[1]?.trim()
const groqKey = groqMatch?.[1]?.trim()

const models = ["gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-001", "gemini-pro"]
console.log("=== FINDING WORKING GEMINI MODEL ===")
for (const modelName of models) {
  try {
    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: modelName })
    const result = await model.generateContent('Say: OK')
    console.log("WORKS:", modelName, result.response.text().trim().substring(0,50))
    break
  } catch(e) {
    console.log("FAIL:", modelName, e.message.substring(0,120))
  }
}

console.log("\n=== TESTING GROQ MODELS ===")
const groqModels = ["llama3-8b-8192", "llama-3.1-8b-instant", "llama3-70b-8192", "llama-3.3-70b-versatile"]
for (const m of groqModels) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, messages: [{ role: "user", content: "Say: OK" }], temperature: 0.1, max_tokens: 10 })
    })
    const txt = await res.text()
    if (res.ok) {
      const d = JSON.parse(txt)
      console.log("WORKS:", m, d.choices[0].message.content.trim())
      break
    } else {
      console.log("FAIL:", m, res.status, txt.substring(0,100))
    }
  } catch(e) {
    console.log("FAIL:", m, e.message)
  }
}
