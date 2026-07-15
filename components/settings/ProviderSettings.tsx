import * as React from "react"
import { Key, Save, AlertCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
    <Card className="w-full max-w-2xl mx-auto border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <CardTitle>API Credentials</CardTitle>
        </div>
        <CardDescription>
          Configure your OKX.AI and Gemini API keys. Stored locally in your browser.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert variant="default" className="bg-muted border-border text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Security Warning</AlertTitle>
          <AlertDescription>
            These credentials grant access to on-chain identities and AI services. Keep them secure.
          </AlertDescription>
        </Alert>

        {/* OKX Credentials */}
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            OKX.AI Credentials
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input 
                id="apiKey"
                type="password"
                placeholder="okx-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input 
                id="secretKey"
                type="password"
                placeholder="Enter your secret key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="font-mono bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passphrase">Passphrase</Label>
              <Input 
                id="passphrase"
                type="password"
                placeholder="Enter your passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="font-mono bg-background"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Gemini AI Key */}
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Smart Fix™ AI (Gemini)
          </h4>
          <div className="space-y-2">
            <Label htmlFor="geminiApiKey">Gemini API Key</Label>
            <Input 
              id="geminiApiKey"
              type="password"
              placeholder="AIza..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="font-mono bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional. Used by Smart Fix™ to auto-repair validation errors during deployment. 
              Get a key from the Google AI Studio.
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between items-center border-t border-border pt-6 mt-2 bg-muted/50 rounded-b-xl">
        <p className="text-sm text-muted-foreground">
          All keys stored locally in your browser.
        </p>
        <Button onClick={handleSave} className="min-w-[120px]">
          {isSaved ? "Saved!" : <><Save className="w-4 h-4 mr-2" /> Save Keys</>}
        </Button>
      </CardFooter>
    </Card>
  )
}
