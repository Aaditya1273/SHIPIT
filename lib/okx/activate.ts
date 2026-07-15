import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function runActivate(
  agentId: string,
  chain: string = "ethereum",
  preferredLanguage: string = "en-US"
): Promise<void> {
  try {
    await execAsync(`onchainos agent activate --agent-id "${agentId}" --chain "${chain}" --preferred-language "${preferredLanguage}"`)
  } catch (error: any) {
    throw new Error(`Failed to activate agent: ${error.message}`)
  }
}
