export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import LoansClient from '@/components/LoansClient'
import type { Account, Loan } from '@/lib/types'

export default async function LoansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: loans }, { data: accounts }] = await Promise.all([
    supabase.from('loans').select('*, accounts(name)').eq('user_id', user!.id)
      .order('status').order('date', { ascending: false }),
    supabase.from('accounts').select('*').eq('user_id', user!.id).order('created_at'),
  ])

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
        Préstamos
      </h1>
      <LoansClient
        loans={loans as Loan[] ?? []}
        accounts={accounts as Account[] ?? []}
      />
    </div>
  )
}
