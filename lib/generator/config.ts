import { GeneratedPayload } from "@/stores/shipit.store"

export function generateManifest(payload: GeneratedPayload) {
  return JSON.stringify({
    name: payload.name,
    version: "1.0.0",
    description: payload.description,
    author: "SHIPIT Generator",
    main: "index.js",
    scripts: {
      start: "node index.js"
    },
    dependencies: {
      "express": "^4.18.2",
      "cors": "^2.8.5",
      "dotenv": "^16.3.1"
    }
  }, null, 2)
}

export function generateEnv() {
  return `PORT=3000
OKX_API_KEY=your_okx_api_key_here
OKX_SECRET_KEY=your_okx_secret_key_here
OKX_PASSPHRASE=your_okx_passphrase_here`
}

export function generateSkillJson(payload: GeneratedPayload) {
  return JSON.stringify({
    skill: {
      name: `${payload.name} Core Skill`,
      description: payload.description,
      fee: payload.fee,
      categories: payload.categories || ["AI"],
      endpoints: [
        {
          path: "/api/v1/invoke",
          method: "POST"
        }
      ]
    }
  }, null, 2)
}

export function generateMcpConfig(payload: GeneratedPayload) {
  return JSON.stringify({
    mcpServers: {
      "core-service": {
        command: "node",
        args: ["index.js"],
        env: {
          NODE_ENV: "production"
        }
      }
    }
  }, null, 2)
}
