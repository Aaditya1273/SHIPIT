# 🚀 SHIPIT

**Zero-Touch Deployment Platform for OKX.AI Agent Service Providers (ASPs)**

> Describe your idea in plain English. SHIPIT handles the AI generation, validation, on-chain registration, and marketplace activation — all in one click.

---

## ✨ Overview

Becoming an **Agent Service Provider (ASP)** on [OKX.AI](https://www.okx.com/ai) is incredibly powerful, allowing you to monetize skills and APIs in the new Agent Economy. However, the manual onboarding process involves installing **Onchain OS**, navigating strict validation rules, logging into Agentic Wallets via CLI, and manually formatting A2MCP or A2A service payloads.

**SHIPIT eliminates this friction entirely.**

SHIPIT is the fastest way to create, configure, and deploy AI-powered ASPs to the OKX.AI ecosystem.

**Input:**  
*"Build an AI agent that writes SEO blogs for crypto startups. Charge 0.05 USDT per call."*

**Output (auto-generated & deployed):**
- 🎨 **Brand Identity:** Name & Deterministic Avatar (OKX CDN compatible)
- 📝 **Marketplace Profile:** 2-part OKX description format
- 💰 **Monetization:** Pay-per-call pricing mapped to A2MCP specs
- 🏷️ **Discoverability:** Categories, keywords, and routing metadata
- 🔌 **Endpoint Config:** Ready-to-use A2MCP endpoint structure
- 🚀 **Live Deployment:** Instantly registered on-chain via Onchain OS
- 📢 **Go-to-Market Kit:** X post, demo script, product pitch

---

## 🎯 Hackathon Features & Integrations

| Feature | OKX.AI Integration | Description |
|---------|-------------------|-------------|
| **🤖 AI-Powered Payload Generation** | Meets OKX.AI Schema | Gemini 1.5 Flash generates names, descriptions, and A2MCP service metadata formatted exactly to OKX specs. |
| **🎨 Zero-Disk Avatar Upload** | OKX CDN (`static.okx.com`) | Generates a deterministic DiceBear avatar, downloads it in-memory, and uses the `onchainos agent upload` CLI to meet OKX's strict `--picture` URL rules. |
| **🔌 A2MCP Automation** | Agent-to-MCP Services | Automatically configures the ASP as an **A2MCP** service with fixed pay-per-call pricing and compliant endpoint structures. |
| **🛡️ Smart Fix™ Auto-Validation** | OKX Validation Rules | Intercepts `onchainos` CLI validation errors (e.g., name too long, description format) and auto-repairs them via AI before retrying. |
| **🚀 Onchain OS Orchestration** | `onchainos` CLI | Wraps the official Rust binary. Executes `upload` → `create` → `activate` seamlessly in the background. |
| **☁️ Serverless CLI Execution** | Vercel Serverless Ready | Custom Node.js wrappers copy the `onchainos` binary to `/tmp`, set `ONCHAINOS_HOME`, and execute via proxy — making Rust CLI deployments work flawlessly on Vercel. |
| **📊 Real-time Deployment Stream** | Server-Sent Events (SSE) | Beautiful UI tracking every step of the OKX registration process live. |

---

## 🏗 Architecture

### Tech Stack

```
Frontend          Next.js 15 (App Router) + React 19 + TypeScript
Styling           Tailwind CSS v4 + CSS variables (dark/light mode)
UI Components     @base-ui/react (headless primitives)
State             Zustand (persisted to localStorage)
Animations        Framer Motion
Forms             React Hook Form + Zod validation
Notifications     Sonner (toast system)
AI Engine         Gemini 1.5 Flash (primary) → Groq Llama3 (fallback)
CLI Integration   onchainos (OKX Onchain OS) with proxy support
```

### Project Structure

```
shipit/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (theme, sonner, favicon)
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Tailwind v4 + design tokens
│   ├── loading.tsx               # Loading skeleton
│   ├── (dashboard)/              # Dashboard pages (authenticated layout)
│   │   ├── layout.tsx            # Sidebar + navigation
│   │   ├── new/page.tsx          # Step 1: Enter idea
│   │   ├── review/page.tsx       # Step 2: Review generated ASP
│   │   ├── deploy/page.tsx       # Step 3: Deploy stream
│   │   ├── success/page.tsx      # Step 4: Success + confetti
│   │   ├── history/page.tsx      # ASP deployment history
│   │   └── settings/page.tsx     # Plan, credentials, appearance
│   └── api/
│       ├── generate/route.ts     # POST SSE — AI generation pipeline
│       └── deploy/route.ts       # POST SSE — OKX CLI deployment pipeline
│
├── components/
│   ├── ui/                       # Base UI component library (33 primitives)
│   ├── landing/                  # Hero, Features, HowItWorks, Pricing
│   ├── dashboard/                # AppList, AppShowcaseCard
│   ├── deployment/               # DeploymentScore (SSE step tracker)
│   ├── generator/                # PromptInput
│   ├── review/                   # IdentityCard, ServiceList
│   ├── settings/                 # ProviderSettings (OKX + Gemini keys)
│   ├── viewers/                  # ReadmeViewer, PayloadViewer, XPostViewer, DemoSciptViewer
│   └── theme-provider.tsx        # next-themes wrapper
│
├── lib/
│   ├── generator/                # AI generators (brand, description, pricing, metadata, docs, marketing, config, avatar)
│   ├── validator/                # Zod schemas (name, description, fee, endpoint)
│   ├── okx/                      # CLI wrappers (upload, create, activate)
│   └── utils.ts                  # cn(), formatDate(), slugify(), etc.
│
├── stores/
│   └── shipit.store.ts           # Zustand store (pipeline state, plan tier, history)
├── hooks/
│   ├── use-generation.ts         # SSE consumer for generation pipeline
│   └── use-deployment.ts         # SSE consumer for deployment pipeline
├── types/                        # TypeScript type definitions
├── constants/                    # Limits, validation rules, pricing tiers
├── public/                       # Static assets (favicon, robots.txt)
└── prompts/                      # System prompt templates
```

### Data Flow

```
User Input (idea)
       │
       ▼
┌─────────────────────┐
│  POST /api/generate  │  ◄── SSE Streaming
│  Gemini 2.5 Flash    │
│  • generateBrandName │
│  • generateDescription│
│  • generatePricing   │
│  • generateMetadata  │
│  • generateDocs      │
│  • generateMarketing  │
│  • generateAvatar    │
└─────────┬───────────┘
          │ done event
          ▼
┌─────────────────────┐
│   Review Page        │  Identity Card + Service List
└─────────┬───────────┘
          │ Deploy clicked
          ▼
┌─────────────────────┐
│  POST /api/deploy    │  ◄── SSE Streaming
│  onchainos CLI       │
│  • upload avatar     │
│  • create identity   │  ← Smart Fix™ wraps this
│  • activate agent    │
└─────────┬───────────┘
          │ done event
          ▼
┌─────────────────────┐
│  Success Page        │  Confetti + ASP card + marketing kit
└─────────────────────┘
```

### Component Hierarchy

```
RootLayout
├── ThemeProvider (next-themes)
├── Toaster (sonner)
└── Pages
    ├── LandingPage
    │   ├── Nav
    │   ├── Hero
    │   ├── Features (4 cards)
    │   ├── HowItWorks (3 steps)
    │   ├── Pricing (3 tiers: Free/Pro/Team)
    │   └── Footer
    │
    └── DashboardLayout
        ├── Sidebar
        │   ├── SidebarHeader (SHIPIT logo)
        │   ├── SidebarContent (nav menu)
        │   └── SidebarFooter (collapse trigger)
        │
        └── Pages
            ├── /new → PromptInput + DeploymentScore (live)
            ├── /review → IdentityCard + ServiceList
            ├── /deploy → DeploymentScore (SSE stream)
            ├── /success → AppShowcaseCard + confetti
            ├── /history → AppList (ASP grid)
            └── /settings → ProviderSettings + PlanSelector + ThemeToggle
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **OKX.AI Developer Account** (For API Keys)

### Installation & Local Dev

```bash
# 1. Clone the repository
git clone https://github.com/Aaditya1273/ZK-Pay.git shipit
cd shipit

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Add GEMINI_API_KEY, OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE

# 4. Start the dev server
npm run dev
# Open http://localhost:3000
```

> **Note on OKX CLI:** SHIPIT bundles the `onchainos` binary in the `bin/` directory and manages its execution automatically. You do not need to install `onchainos-skills` globally to run this app.

### Quick Start

1. Open `http://localhost:3000` (or your Vercel deployment URL).
2. Click **"Start Deploying"** to enter the dashboard.
3. Describe your ASP: *"A data oracle agent that provides real-time token sentiment analysis for 0.1 USDT per call."*
4. Watch the AI instantly generate your OKX-compliant A2MCP payload.
5. Review the details, then click **"Deploy Now"**.
6. SHIPIT executes the `onchainos` registration on-chain.
7. Success! Your agent is now in the "Pending OKX Review" queue, and you receive an instant Terminal Verification command to prove its on-chain existence.

---

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

---

## 🧠 How It Works

### Generation Pipeline (`POST /api/generate`)

The generate endpoint accepts a plain-text idea and returns SSE events:

```typescript
// Event flow:
event: step    → { id: "1", label: "Generating Brand Name", status: "loading" }
event: step    → { id: "1", label: "Name: BlogWise", status: "success" }
event: step    → { id: "2", label: "Generating Service Description", ... }
event: step    → { id: "3", label: "Analyzing Pricing & Metadata", ... }
event: step    → { id: "4", label: "Generating Identity Avatar", ... }
event: done    → { name, description, fee, avatarUrl, categories, ... }
```

All 8 generators run in parallel where possible:
- `generateBrandName` → validates name (3-25 chars, no celebrities)
- `generateDescription` → validates (2-part format, max 400 chars)
- `generatePricing` → returns fee + subscription plans + usage tiers + premium upgrades
- `generateMetadata` → returns categories, keywords, capabilities, routing
- `generateDocs` → returns install guide, usage examples, API docs, FAQ
- `generateMarketing` → returns product pitch, launch announcement
- `generateConfig` → returns manifest.json, skill.json, MCP config, .env
- `generateAvatar` → downloads from DiceBear, saves to temp path for CLI upload

### Deployment Pipeline (`POST /api/deploy`)

```typescript
// Event flow:
event: step    → { id: "5", label: "Uploading avatar to OKX CDN", status: "loading" }
event: step    → { id: "5", label: "Avatar uploaded", status: "success" }
event: step    → { id: "6", label: "Registering Identity On-Chain", ... }
// (If validation fails → Smart Fix™ repairs via Gemini → retry)
event: step    → { id: "6", label: "Activated Agent #12345", status: "success" }
event: done    → { agentId, name, description, fee, avatarUrl }
```

#### Smart Fix™
When the `create` command fails with a validation error (description, name, fee, or service related), Smart Fix™:
1. Intercepts the error
2. Sends it to Gemini 2.5 Flash with the current payload
3. Gets a fixed description
4. Retries the `create` command (up to 3 attempts)

If the error is auth/network related, it rethrows immediately without attempting a fix.

### OKX CLI Integration

All CLI wrappers are in `lib/okx/` and shell to the real `onchainos` binary:

| Function | CLI Command | Purpose |
|----------|-------------|---------|
| `runUpload` | `onchainos agent upload --file --chain` | Upload avatar to OKX CDN |
| `runCreate` | `onchainos agent create --role asp --name --description --picture --service --chain` | Register identity on-chain |
| `runActivate` | `onchainos agent activate --agent-id --chain --preferred-language` | Activate the agent |

Credentials are set via environment variables: `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`.

---

## 💼 Business Model

| Tier | Price | Deployments | Features |
|------|-------|-------------|----------|
| **Free** | $0/mo | 3 deployments | All AI generation, dashboard, community support |
| **Pro** | $19/mo | Unlimited | Smart Fix™, priority support, marketing kit download, custom API keys |
| **Team** | $49/mo | Unlimited | Shared workspace, collaboration, analytics, dedicated support |

Deployment limits are enforced client-side with an upgrade toast when exceeded.

---

## 🔧 Configuration

### API Credentials (Settings Page)

The Settings page (`/settings`) provides a UI to configure:
- **OKX.AI Credentials**: API Key, Secret Key, Passphrase (for `onchainos` CLI)
- **Smart Fix™ AI**: Gemini API Key (optional — for auto-repair during deployment)
- **Plan Selection**: Switch between Free/Pro/Team tiers
- **Appearance**: Dark/Light mode toggle

All credentials are stored locally in `localStorage` and sent to the deploy API at request time.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini 2.5 Flash API key (for AI generation) |
| `OKX_API_KEY` | For deploy | OKX API key (or set via Settings page) |
| `OKX_SECRET_KEY` | For deploy | OKX secret key (or set via Settings page) |
| `OKX_PASSPHRASE` | For deploy | OKX passphrase (or set via Settings page) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID (for user sign-in) |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `NEXTAUTH_SECRET` | Yes | Random string for JWT encryption (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | Your production URL (e.g., `https://shipit.example.com`) |
| `DATABASE_URL` | For auth | PostgreSQL connection string (Supabase/Neon) |

---

## 🐳 Deployment

### Docker (Recommended)

Build and run the Docker image:

```bash
# Build
docker build -t shipit .

# Run with your env vars
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your_key \
  -e NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_id \
  -e GOOGLE_CLIENT_SECRET=your_secret \
  -e NEXTAUTH_SECRET=your_secret \
  -e NEXTAUTH_URL=https://your-domain.com \
  -e DATABASE_URL=your_db_url \
  shipit
```

**Important**: Database migrations must be run separately:
```bash
# Push schema changes to your database
docker run --rm shipit npx prisma db push
```

### Vercel / Serverless

> ⚠️ The in-memory rate limiter won't work across multiple serverless instances.
> For auto-scaling deployments, replace `lib/rate-limit.ts` with a Redis-backed solution.

1. Connect your GitHub repository to Vercel
2. Set all environment variables in the Vercel dashboard
3. Run `npx prisma generate` and `npx prisma db push` as build commands
4. Set `NEXTAUTH_URL` to your Vercel deployment URL

### Manual Server

```bash
# 1. Install dependencies
npm ci

# 2. Generate Prisma client
npx prisma generate

# 3. Push database schema
npx prisma db push

# 4. Build
npm run build

# 5. Start
npm start
```

---

## 🤖 CI/CD

GitHub Actions CI is configured in `.github/workflows/ci.yml`:

- **On push/PR to `main`**: Runs typecheck → lint → build
- Prisma client is auto-generated in CI
- Deployment to your hosting platform can be added as a final step

---

## 🛠 Development

### Adding a New Generator

1. Create `lib/generator/your-feature.ts` with a function that calls `genAI.getGenerativeModel`
2. Add the output type to `GeneratedPayload` in `stores/shipit.store.ts`
3. Import and call it in `app/api/generate/route.ts`
4. Add a validation schema in `lib/validator/`
5. Add a viewer component in `components/viewers/`

### Adding a New Page

1. Create `app/(dashboard)/your-page/page.tsx` (client component)
2. Add a nav link in `app/(dashboard)/layout.tsx`
3. Use the Zustand store for shared state

### UI Components

The project uses `@base-ui/react` for headless UI primitives. Components are wrapped in `components/ui/` following the shadcn/ui pattern. To use a component:

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
```

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙌 Built For

- Developers shipping AI agents on OKX.AI
- Indie hackers monetizing expertise
- Teams deploying at scale
- Anyone with an idea who wants to become an AI service provider

---

*Build Less. Ship Faster. Monetize Sooner.*
