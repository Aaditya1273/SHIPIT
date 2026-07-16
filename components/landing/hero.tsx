"use client"

import { Sparkles, Send } from "lucide-react"
import { useUIStore } from "@/stores/ui.store"

export function Hero() {
  const { openAuthModal } = useUIStore()

  return (
    <section className="text-center relative z-10 flex flex-col items-center">
      
      {/* Massive Typography */}
      <h1 className="text-5xl md:text-[64px] font-bold tracking-tight leading-[1.1] text-white max-w-4xl mb-4">
        Build something incredible
      </h1>

      <p className="text-[20px] text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed mb-16">
        Create compliant OKX.AI Agent Service Providers by chatting with AI
      </p>

      {/* Lovable Dark Pill Input */}
      <div className="w-full max-w-[800px] relative group cursor-text mb-20" onClick={openAuthModal}>
        <div className="block relative bg-[#1c1c1c] border border-[#333] rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-4 group-hover:border-[#555] transition-all duration-300 text-left cursor-text">
          
          <div className="min-h-[80px] w-full text-gray-400 text-[18px] font-medium pt-3 pl-3">
            Ask SHIPIT to create a prototype...
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 px-3 pl-1">
              <div className="w-8 h-8 rounded-full bg-[#2a2a2a] hover:bg-[#333] flex items-center justify-center transition-colors cursor-pointer text-gray-400 hover:text-white">
                +
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[13px] font-medium text-gray-500 flex items-center gap-1 cursor-pointer hover:text-gray-300 transition-colors">
                Build <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </span>
              <div className="rounded-full h-9 w-9 bg-white flex items-center justify-center hover:bg-gray-200 transition-colors duration-300 cursor-pointer">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="black" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="flex flex-col items-center gap-6 mt-10">
        <p className="text-sm font-medium text-gray-400">Teams from top companies build with SHIPIT</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale">
           <span className="font-bold text-xl tracking-tight text-white flex items-center gap-1"><Sparkles className="w-4 h-4"/>OKX</span>
           <span className="font-bold text-xl tracking-tight text-white">Binance</span>
           <span className="font-bold text-xl tracking-tight text-white">Coinbase</span>
           <span className="font-bold text-xl tracking-tight text-white">Bybit</span>
        </div>
      </div>

    </section>
  )
}
