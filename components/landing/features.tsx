import { Sparkles, Zap, Shield } from "lucide-react"

export function Features() {
  return (
    <section className="pt-32">
      <h2 className="text-4xl font-bold tracking-tight text-white mb-16">
        Meet SHIPIT
      </h2>

      <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
        
        {/* Left Side: Dark Presentation Box */}
        <div className="relative w-full aspect-square md:aspect-[4/3] bg-[#141414] rounded-[32px] border border-[#222] overflow-hidden flex items-center justify-center p-8">
          
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]" />
          
          {/* Mock UI inside the box */}
          <div className="relative z-10 w-full max-w-[400px] bg-[#1c1c1c] rounded-2xl border border-[#333] shadow-2xl p-6 flex flex-col items-center">
            <div className="w-full h-32 rounded-xl bg-gradient-to-r from-pink-500/80 via-orange-400/80 to-blue-600/80 blur-sm absolute top-4 opacity-40" />
            <div className="w-full h-32 rounded-xl bg-gradient-to-r from-pink-500 via-orange-400 to-blue-600 relative z-10 mb-8" />
            
            <div className="w-full flex flex-col gap-3">
               <div className="flex gap-2">
                 <div className="w-8 h-8 rounded-full bg-[#333]" />
                 <div className="flex-1 h-8 rounded-md bg-[#222]" />
               </div>
               <div className="flex gap-2 opacity-50">
                 <div className="w-8 h-8 rounded-full bg-[#333]" />
                 <div className="flex-1 h-8 rounded-md bg-[#222]" />
               </div>
            </div>

            <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-3 bg-[#3b82f6] text-white font-bold rounded-xl shadow-[0_0_40px_rgba(59,130,246,0.5)] z-20 hover:scale-105 transition-transform cursor-default">
              Publish Agent
            </button>
          </div>

        </div>

        {/* Right Side: Step Text */}
        <div className="space-y-12">
          
          <div>
            <h3 className="text-2xl font-bold text-gray-300 mb-3 flex items-center gap-3">
              Start with an idea
            </h3>
            <p className="text-gray-500 text-lg leading-relaxed">
              Describe the AI agent you want to create or drop in OKX.AI documentation. SHIPIT understands exactly what you need.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
              Watch it come to life
            </h3>
            <p className="text-gray-400 text-lg leading-relaxed">
              See your vision transform into a working deployment payload in real-time as the AI builds, validates, and scopes it for you.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-gray-300 mb-3 flex items-center gap-3">
              Refine and ship
            </h3>
            <p className="text-gray-500 text-lg leading-relaxed">
              Iterate on your creation with simple feedback in the chat, and deploy it to the OKX blockchain with one click.
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
