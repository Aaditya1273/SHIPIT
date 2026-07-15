import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function runCreate(
  name: string,
  description: string,
  pictureUrl: string,
  services: any[],
  chain: string = "ethereum"
): Promise<string> {
  try {
    const servicesJson = JSON.stringify(services).replace(/"/g, '\\"')
    const cmd = `onchainos agent create --role asp --name "${name}" --description "${description}" --picture "${pictureUrl}" --service "${servicesJson}" --chain "${chain}"`
    
    const { stdout } = await execAsync(cmd)
    // The CLI prints the new agentId upon success
    return stdout.trim()
  } catch (error: any) {
    throw new Error(`Failed to create agent: ${error.message}`)
  }
}
