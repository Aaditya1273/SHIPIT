import * as React from "react"
import { Key, Save, AlertCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

export function ProviderSettings() {
  const [apiKey, setApiKey] = React.useState("")
  const [secretKey, setSecretKey] = React.useState("")
  const [passphrase, setPassphrase] = React.useState("")
  const [geminiApiKey, setGeminiApiKey] = React.useState("")
  const [isSaved, setIsSaved] = React.useState(false)

  const handleSave = () => {
    localStorage.setItem("OKX_API_KEY", apiKey)
    localStorage.setItem("OKX_SECRET_KEY", secretKey)
    localStorage.setItem("OKX_PASSPHRASE", passphrase)
    localStorage.setItem("GEMINI_API_KEY", geminiApiKey)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  React.useEffect(() => {
    setApiKey(localStorage.getItem("OKX_API_KEY") || "")
    setSecretKey(localStorage.getItem("OKX_SECRET_KEY") || "")
    setPassphrase(localStorage.getItem("OKX_PASSPHRASE") || "")
    setGeminiApiKey(localStorage.getItem("GEMINI_API_KEY") || "")
  }, [])

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Key className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">API Credentials</h3>
          <p className="text-sm text-muted-foreground">
            Configure your OKX.AI and Gemini API keys. Stored locally in your browser.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Alert className="bg-muted/50 border-border/60 rounded-xl">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-sm font-medium">Security Warning</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            These credentials grant access to on-chain identities and AI services. Keep them secure.
          </AlertDescription>
        </Alert>

        {/* OKX Credentials */}
        <div>
          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Key className="w-4 h-5 text-muted-foreground" />
            OKX.AI Credentials
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-sm font-medium">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="okx-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-[family-name:var(--font-geist-mono)] bg-background border-border/60 focus:border-primary/40 rounded-xl h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretKey" className="text-sm font-medium">Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="Enter your secret key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="font-[family-name:var(--font-geist-mono)] bg-background border-border/60 focus:border-primary/40 rounded-xl h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passphrase" className="text-sm font-medium">Passphrase</Label>
              <Input
                id="passphrase"
                type="password"
                placeholder="Enter your passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="font-[family-name:var(--font-geist-mono)] bg-background border-border/60 focus:border-primary/40 rounded-xl h-10"
              />
            </div>
          </div>
        </div>

        <Separator className="bg-border/40" />

        {/* Gemini AI Key */}
        <div>
          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-5 text-blue-500" />
            Smart Fix&trade; AI (Gemini + Groq Fallback)
          </h4>
          <div className="space-y-2">
            <Label htmlFor="geminiApiKey" className="text-sm font-medium">Gemini API Key</Label>
            <Input
              id="geminiApiKey"
              type="password"
              placeholder="AIza..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="font-[family-name:var(--font-geist-mono)] bg-background border-border/60 focus:border-primary/40 rounded-xl h-10"
            />
            <p className="text-xs text-muted-foreground/70 mt-2 leading-relaxed">
              Optional. Used by Smart Fix&trade; to auto-repair validation errors during deployment.
              If Gemini daily credits run out, it automatically falls back to Groq Mixtral.
              Get a key from the Google AI Studio.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-border/60 bg-muted/20 -mx-6 -mb-6 px-6 pb-6 rounded-b-2xl">
        <p className="text-sm text-muted-foreground/70">
          All keys stored locally in your browser.
        </p>
        <Button onClick={handleSave} className="min-w-[120px] rounded-xl">
          {isSaved ? "Saved!" : <><Save className="w-4 h-4 mr-2" /> Save Keys</>}
        </Button>
      </div>
    </div>
  )
}
