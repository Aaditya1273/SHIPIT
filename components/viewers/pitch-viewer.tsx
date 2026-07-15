import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Megaphone } from "lucide-react"
import { GeneratedPayload } from "@/stores/shipit.store"

export function PitchViewer({ payload }: { payload: GeneratedPayload }) {
  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Megaphone className="h-4 w-4" /> Product Pitch
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 bg-muted/50">
        <p className="text-sm whitespace-pre-wrap">{payload.marketing?.productPitch}</p>
      </CardContent>
    </Card>
  )
}
