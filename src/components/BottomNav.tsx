'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PlusCircle, Handshake, Wallet } from 'lucide-react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/transactions/new', icon: PlusCircle, label: 'Nueva' },
  { href: '/loans', icon: Handshake, label: 'Préstamos' },
  { href: '/accounts', icon: Wallet, label: 'Cuentas' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
      <div className="flex items-center justify-around px-1 pt-2 pb-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95"
              style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
