'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, DollarSign } from 'lucide-react'

export default function TopBar({ email }: { email: string }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 safe-top"
      style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--accent)' }}>
          <DollarSign size={16} className="text-white" />
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          Finanzas
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
          {email}
        </span>
        <button onClick={handleLogout}
          className="p-2 rounded-xl active:opacity-70 transition-opacity"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
