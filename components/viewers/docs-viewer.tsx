import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen } from "lucide-react"
import { GeneratedPayload } from "@/stores/shipit.store"

export function FullDocsViewer({ payload }: { payload: GeneratedPayload }) {
  const content = `# Documentation: ${payload.name}

## Installation Guide
${payload.docs?.installationGuide}

## Usage Examples
${payload.docs?.usageExamples}

## API Documentation
${payload.docs?.apiDocumentation}

## FAQ
${payload.docs?.faq}`

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Full Documentation
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <pre className="p-4 text-xs font-mono overflow-auto bg-muted/50 h-full whitespace-pre-wrap">
          {content}
        </pre>
      </CardContent>
    </Card>
  )
}
