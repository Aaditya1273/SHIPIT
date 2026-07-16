import { Check } from "lucide-react"
import Link from "next/link"
import { PLAN_TIERS } from "@/constants/pricing"

export function Pricing() {
  return (
    <section className="pt-10">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          Simple, transparent pricing
        </h2>
        <p className="text-gray-400 font-medium text-lg max-w-xl mx-auto">
          Start with 3 free deployments. Upgrade when you need more.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
        {Object.entries(PLAN_TIERS).map(([key, plan]) => (
          <div
            key={key}
            className={`relative p-8 rounded-[32px] flex flex-col transition-all duration-300 ${
              plan.popular
                ? "bg-[#141414] shadow-[0_20px_50px_rgba(91,62,255,0.2)] border border-[#5b3eff]/40 ring-1 ring-[#5b3eff]/20 scale-[1.02] z-10"
                : "bg-[#0f0f0f] hover:bg-[#141414] border border-[#222] hover:border-[#333] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-[#8a75ff] to-[#5b3eff] text-white text-[11px] font-bold tracking-wider uppercase rounded-full shadow-sm">
                {plan.badge}
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2 text-white">{plan.label}</h3>
              <p className="text-sm font-medium text-gray-400">{plan.description}</p>
            </div>

            <div className="mb-8 flex items-baseline gap-1">
              <span className="text-5xl font-extrabold tracking-tight text-white">${plan.price}</span>
              <span className="text-lg text-gray-500 font-medium">/mo</span>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start text-sm">
                  <div className="p-1 bg-[#222] rounded-full mr-3 mt-0.5">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </div>
                  <span className="font-medium text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto">
              <button
                className={`w-full h-12 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  plan.popular 
                    ? "bg-[#5b3eff] hover:bg-[#4b30e0] text-white shadow-[0_8px_20px_rgba(91,62,255,0.25)]" 
                    : "bg-[#222] border border-[#333] text-white hover:bg-[#333] hover:border-[#444] shadow-sm"
                }`}
              >
                {plan.price === 0 ? "Get Started Free" : `Upgrade to ${plan.label}`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
