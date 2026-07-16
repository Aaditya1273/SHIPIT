"use client"

import { useUIStore } from "@/stores/ui.store"
import { motion, AnimatePresence } from "framer-motion"
import { X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signIn } from "next-auth/react"

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useUIStore()

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAuthModal}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-[400px]"
          >
            <div className="bg-[#1a1a1a] border border-[#333] rounded-[24px] shadow-2xl p-8 flex flex-col relative overflow-hidden">
              
              {/* Subtle top glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-[#5b3eff]/20 to-transparent pointer-events-none" />

              <button 
                onClick={closeAuthModal}
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8a75ff] to-[#5b3eff] flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-400 font-medium mb-1">Start building.</p>
                <h2 className="text-2xl font-bold text-white tracking-tight">Create free account</h2>
              </div>

              <div className="space-y-3 mb-6">
                <button 
                  onClick={() => {
                    closeAuthModal()
                    signIn("google", { callbackUrl: "/new" })
                  }}
                  className="w-full h-11 flex items-center justify-center gap-3 bg-[#2a2a2a] hover:bg-[#333] text-white border border-[#444] rounded-xl font-medium transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true"><path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335"></path><path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"></path><path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05"></path><path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26537 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853"></path></svg>
                  Sign in with Google
                </button>
              </div>

              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                By continuing, you agree to the{" "}
                <a href="#" className="underline hover:text-gray-300">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="underline hover:text-gray-300">Privacy Policy</a>.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
