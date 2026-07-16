import * as React from "react"
import { Loader2, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface PromptInputProps {
  onSubmit: (prompt: string) => void
  isGenerating: boolean
  placeholder?: string
}

export function PromptInput({
  onSubmit,
  isGenerating,
  placeholder = "Describe your AI application...\n\nExample:\n\"Build a crypto trading agent with DCA and Telegram alerts.\"",
}: PromptInputProps) {
  const [value, setValue] = React.useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isGenerating) {
        onSubmit(value)
        setValue("")
      }
    }
  }

  return (
    <div className="w-full relative group mx-auto">
      {/* Soft purple glow on focus */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-[#7C5CFC]/40 to-[#7C5CFC]/20 rounded-[34px] blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
      
      <div className="relative bg-white border border-[#ECECEC] rounded-[32px] flex flex-col p-8 shadow-sm transition-all duration-300">
        
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isGenerating}
          className="min-h-[180px] w-full resize-none bg-transparent border-0 focus-visible:ring-0 p-0 text-[#111827] text-[18px] leading-relaxed placeholder:text-gray-400 placeholder:leading-relaxed"
        />

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">Gemini 1.5 Pro</span>
          </div>

          <Button
            size="icon"
            variant="ghost"
            disabled={!value.trim() || isGenerating}
            onClick={() => {
              onSubmit(value)
              setValue("")
            }}
            className={cn(
              "rounded-full h-10 w-10 transition-all duration-200 flex items-center justify-center shadow-sm",
              !value.trim() ? "bg-gray-100 text-gray-400" : "bg-[#7C5CFC] hover:bg-[#6b4ce6] text-white hover:scale-105"
            )}
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
