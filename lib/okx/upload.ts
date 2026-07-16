import { execWithProxy } from "./exec"
import path from "path"

/**
 * Resolves an avatar for OKX agent registration.
 *
 * Strategy:
 * 1. Already an HTTPS URL → return immediately (no upload needed).
 * 2. Local file path → try onchainos CLI upload.
 * 3. CLI fails or file missing → return a deterministic DiceBear URL as fallback.
 *    OKX `create` accepts any publicly accessible HTTPS image URL.
 */
export async function runUpload(input: string, chain: string = "ethereum"): Promise<string> {
  // Already a public URL — skip upload entirely
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input
  }

  // Local file path: try the onchainos CLI
  try {
    const stdout = await execWithProxy(`onchainos agent upload --file "${input}" --chain "${chain}"`)
    const urlMatch = stdout.match(/"url"\s*:\s*"([^"]+)"/)
    if (urlMatch?.[1]) return urlMatch[1]
  } catch (cliErr: any) {
    console.warn("[upload] CLI failed, using DiceBear fallback:", cliErr.message?.slice(0, 100))
  }

  // Fallback: derive a deterministic DiceBear URL from the filename seed
  // OKX agent create accepts any valid https:// image URL for --picture
  const seed = path.basename(input).replace(/[^a-zA-Z0-9]/g, "").slice(0, 32) || "agent"
  return `https://api.dicebear.com/7.x/shapes/png?seed=${seed}&size=400`
}
