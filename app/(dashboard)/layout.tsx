"use client"

import { Sidebar } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import { FileText, Plus, Rocket, Settings, History } from "lucide-react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const menuItems = [
    { label: "New Agent", href: "/new", icon: Plus },
    { label: "Deploy History", href: "/history", icon: History },
    { label: "Settings", href: "/settings", icon: Settings },
  ]
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar items={menuItems} activePath={pathname} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  )
}
