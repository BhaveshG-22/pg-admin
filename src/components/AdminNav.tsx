'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Image, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    name: 'Presets',
    href: '/admin/presets',
    icon: LayoutDashboard,
  },
  {
    name: 'Generations',
    href: '/admin/generations',
    icon: Image,
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
  },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b">
      <div className="container mx-auto">
        <div className="flex items-center justify-between py-4">
          <Link href="/admin/presets" className="text-xl font-bold">
            PixelGlow Admin
          </Link>
          <div className="flex gap-6">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
