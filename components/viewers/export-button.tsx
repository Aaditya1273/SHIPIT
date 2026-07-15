"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { GeneratedPayload } from "@/stores/shipit.store"
import { generateManifest, generateEnv, generateSkillJson, generateMcpConfig } from "@/lib/generator/config"

export function ExportRepoButton({ payload }: { payload: GeneratedPayload }) {
  const handleExport = () => {
    const files = [
      { name: "package.json", content: generateManifest(payload) },
      { name: ".env.example", content: generateEnv() },
      { name: "skill.json", content: generateSkillJson(payload) },
      { name: "mcp.json", content: generateMcpConfig(payload) }
    ]

    files.forEach((file) => {
      const blob = new Blob([file.content], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <Button onClick={handleExport} className="w-full">
      <Download className="mr-2 h-4 w-4" /> Download Full ASP Repo
    </Button>
  )
}
