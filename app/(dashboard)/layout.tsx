"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus, History, Settings, Ship } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const menuItems = [
    { label: "New Agent", href: "/new", icon: Plus },
    { label: "Deploy History", href: "/history", icon: History },
    { label: "Settings", href: "/settings", icon: Settings },
  ]
  
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton as={Link} href="/" tooltip="SHIPIT">
                  <Ship className="size-5" />
                  <span className="font-bold">SHIPIT</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      as={Link} 
                      href={item.href}
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <item.icon className="size-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter>
            <SidebarTrigger />
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
