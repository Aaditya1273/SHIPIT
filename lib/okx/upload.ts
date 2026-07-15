import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function runUpload(filePath: string, chain: string = "ethereum"): Promise<string> {
  try {
    // The CLI uploads the image and returns a CDN URL
    const { stdout } = await execAsync(`onchainos agent upload --file "${filePath}" --chain "${chain}"`)
    // The CLI prints the CDN URL upon success
    return stdout.trim()
  } catch (error: any) {
    throw new Error(`Failed to upload avatar: ${error.message}`)
  }
}
